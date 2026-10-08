/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Greenbrook3D — 第一人称 3D 引擎（仅主角的房间）
 * ------------------------------------------------
 * 只做一件事：把爱德华·班克斯在格林布鲁克研习院二楼的那个房间，
 * 做成一个细节尽量丰富、可第一人称走动探索的空间。叙事仍由「阅读层」
 * （原日记 / 《玻璃侦探》/ 报告界面）承载——桌上的日记一翻开，整部分支
 * 剧情就从头开始。房间里其它物件（父亲的皮箱、母亲的润喉糖、《荒原》、
 * 外侧上锁的窗、衣柜、镜子、日历……）都能查看，落到原作的细节上。
 *
 * 主题落点：随着剧情推进（decay 越大），房间一寸寸变冷、变暗、灯闪得更频，
 * 呼应文字从繁复坍缩到「吃。睡。冷。」的过程。
 */

import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries, toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type ReadingDoc = "diary" | "nested" | "report";

export interface WorldCallbacks {
  /** 准星指到可交互物时给出提示文字；移开时传 null。 */
  onPrompt: (text: string | null) => void;
  /** 第一人称旁白（短句），淡入淡出。 */
  onCaption: (text: string, durationMs?: number) => void;
  /** 玩家打开了某份档案 → 由 React 挂载阅读层。 */
  onOpenReading: (doc: ReadingDoc) => void;
  /** 引擎就绪。 */
  onReady: () => void;
  /** 指针锁定状态变化（用于显示「点击环顾」提示）。 */
  onLockChange: (locked: boolean) => void;
}

export interface WorldOptions {
  /** 0..1，剧情推进度，越大房间越冷越暗。 */
  decay?: number;
  /** 音效开关。 */
  sfx?: boolean;
  /** 续档时为 true：开场旁白略不同。 */
  continuing?: boolean;
}

interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

interface Interactable {
  root: THREE.Object3D;
  type: string;
  label: string;
  onPick: () => void;
  oneShot?: boolean;
  done?: boolean;
  highlight?: (on: boolean) => void;
  /** 准星对准时要微微发亮的物件（默认就是 root 本身）。 */
  glow?: THREE.Object3D[];
}

const EYE = 1.62; // 视点高度（米）
const PLAYER_R = 0.3; // 碰撞半径
const SPEED = 1.9; // 室内放慢一点
const REACH = 3.2; // 可交互距离
export const CHAR_MS = 12; // 旁白逐字显示的速度（毫秒/字符），写字声与之同步。英文字符数约为中文的 3.5 倍，按比例从 42 调到 12，整句显示时长与中文版相当

// ——— 房间尺寸（米，Y 向上）。北墙在 -Z（书桌+窗），南墙在 +Z（门）———
const RX = 2.5; // 半宽：x ∈ [-2.5, 2.5]
const ZN = -3.0; // 北墙
const ZS = 3.0; // 南墙
const H = 3.05; // 层高
// 北墙上的窗洞（书桌偏左，窗偏右）
const WIN_CX = 0.85;
const WIN_CY = 1.75;
const WIN_HW = 0.66; // 半宽
const WIN_HH = 0.78; // 半高

const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);
const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
/** 冲过头一点再回来（箱盖开到头被拉带拽住的那一下）。 */
const easeOutBack = (k: number) => {
  const c = 1.2, u = k - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
};
const GLOW = new THREE.Color(0xffc27a); // 准星对准时物件泛起的暖光

export class Greenbrook3D {
  private container: HTMLElement;
  private cb: WorldCallbacks;
  private opts: Required<WorldOptions>;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private raf = 0;
  private running = false;
  private disposed = false;

  // 朝向 / 输入（yaw=0 时相机看向 -Z，也就是正对书桌那面墙）
  private euler = new THREE.Euler(0, 0, 0, "YXZ");
  private keys = new Set<string>();
  private locked = false;
  private pos = new THREE.Vector3(0.4, EYE, 1.6);
  private bob = 0;

  // 拾取
  private raycaster = new THREE.Raycaster();
  private interactables: Interactable[] = [];
  private hovered: Interactable | null = null;

  // 灯
  private flickerLights: { light: THREE.Light; base: number; seed: number }[] = [];
  private fog!: THREE.FogExp2;
  private hemi!: THREE.HemisphereLight;
  private windowLight!: THREE.Light;
  private curtain?: THREE.Object3D;
  // 台灯（可点击开关）
  private deskLamp?: THREE.PointLight;
  private deskLampShade?: THREE.MeshStandardMaterial;
  private lampOn = true;
  // 窗外的雨
  private rain?: THREE.LineSegments;
  private rainPos?: Float32Array;
  private skyMat?: THREE.MeshBasicMaterial;
  private flash = 0; // 闪电亮度，0..1，逐帧衰减
  private nextLightning = 6;

  // 区域 / 碰撞
  private walk: Rect[] = [];
  private block: Rect[] = [];

  // 音频（用 <audio> 元素：file:// 与 http 下都能放，且独立于背景音乐层）
  private audioStarted = false;
  private loopEls: Record<string, HTMLAudioElement> = {};
  private loopCur: Record<string, number> = { walk: 0, window: 0 };
  private oneShotUrls: Record<string, string> = { door: "./door.mp3", case: "./case.mp3", drug: "./drug.wav", book: "./booksound.mp3" };
  private windowPos = new THREE.Vector3(0.85, 1.5, -3.0); // 窗外声声源
  private penEl?: HTMLAudioElement; // 写字声（文字逐字显示时循环）
  private penUntil = 0; // 写字声响到这个时刻为止（= 文字显示完毕）
  private openingShown = false; // 开场旁白是否已触发

  // 交互小动画 / 悬停高光 / 氛围细节（只是看得见的东西，不碰逻辑）
  private tweens: { t: number; dur: number; step: (k: number) => void; done?: () => void; still?: boolean }[] = [];
  private glows: { mats: THREE.MeshStandardMaterial[]; level: number; target: number }[] = [];
  private lampLevel = 1; // 台灯实际亮度 0..1，开关时平滑过渡
  private lampBulbMat?: THREE.MeshStandardMaterial;
  private lampChain?: THREE.Object3D;
  private shadowDirty = true; // 阴影图只在有东西动过之后才重算
  private dust?: THREE.Points;
  private dustSeed?: Float32Array;
  private dustMat?: THREE.PointsMaterial;
  private dropLayers: THREE.Texture[] = [];
  private curtainGeo?: THREE.BufferGeometry;
  private curtainRest?: Float32Array;
  private secondHand?: THREE.Object3D;
  private mirror?: Reflector;
  private tarnishMat?: THREE.MeshBasicMaterial;
  private doorSlitMat?: THREE.MeshBasicMaterial;
  private spotTex?: THREE.Texture;

  // 资源回收
  private textures: THREE.Texture[] = [];
  private geoms: THREE.BufferGeometry[] = [];
  private mats: THREE.Material[] = [];
  private onResize = () => this.resize();

  constructor(container: HTMLElement, cb: WorldCallbacks, options: WorldOptions = {}) {
    this.container = container;
    this.cb = cb;
    this.opts = {
      decay: options.decay ?? 0,
      sfx: options.sfx ?? true,
      continuing: options.continuing ?? false,
    };
    this.init();
  }

  // ====================================================================
  // 初始化
  // ====================================================================
  private init() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    // three r184 已弃用 PCFSoftShadowMap，第一次画阴影时会自动改成 PCFShadowMap（效果一样），直接用 PCF。
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // 房间里的东西大多不动：阴影图画一次就够，有物件动起来（开门、提箱子……）时再重算
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.renderer.domElement.style.cursor = "none";
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c0907);
    this.fog = new THREE.FogExp2(0x140d08, 0.026);
    this.scene.fog = this.fog;

    this.camera = new THREE.PerspectiveCamera(72, w / h, 0.04, 60);
    this.scene.add(this.camera);

    this.buildLighting();
    this.buildShell(); // 地板、墙、天花、踢脚、画镜线
    this.buildDeskArea(); // 书桌、台灯、日记、钢笔、墨水、《荒原》、纸
    this.buildBed(); // 床、《玻璃侦探》、床头柜、润喉糖、闹钟、水杯
    this.buildWardrobeAndCase(); // 衣柜、父亲的皮箱
    this.buildWashstand(); // 脸盆架、镜子、水壶
    this.buildWindow(); // 窗（插销在外侧）、窗帘、暖气片
    this.buildDoorAndDetails(); // 门、日历、十字架、画、开关、吊灯
    this.defineCollision();
    this.applyDecay(this.opts.decay);

    this.initAudioElements();
    this.bindInput();
    window.addEventListener("resize", this.onResize);

    // 开场旁白改到「第一次点击进入（指针锁定）」时触发——那时音频已解锁，
    // 才能在文字逐字显示的同时听到写字声。见 onPointerLockChange。

    this.cb.onReady();
    this.running = true;
    this.clock.start();
    this.loop();
  }

  // ====================================================================
  // 程序化贴图（不依赖任何外部图片，离线可用）
  // ====================================================================
  private makeCanvasTexture(
    draw: (ctx: CanvasRenderingContext2D, s: number) => void,
    size = 512,
    repeat: [number, number] = [1, 1]
  ): THREE.Texture {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d", { willReadFrequently: true })!; // 要逐像素加噪点：用 CPU 画布，读回像素快得多
    draw(ctx, size);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    this.textures.push(t);
    return t;
  }

  private noiseInto(ctx: CanvasRenderingContext2D, s: number, alpha: number) {
    const img = ctx.getImageData(0, 0, s, s);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 255 * alpha;
      d[i] = Math.max(0, Math.min(255, d[i] + n));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
    }
    ctx.putImageData(img, 0, 0);
  }

  private floorTex() {
    // 老木地板：一条条板，缝隙发暗
    return this.makeCanvasTexture(
      (ctx, s) => {
        ctx.fillStyle = "#6b4a2e";
        ctx.fillRect(0, 0, s, s);
        const planks = 6;
        for (let i = 0; i < planks; i++) {
          const y = (i / planks) * s;
          ctx.fillStyle = `rgb(${90 + Math.random() * 30},${62 + Math.random() * 20},${38 + Math.random() * 16})`;
          ctx.fillRect(0, y + 1, s, s / planks - 2);
          ctx.strokeStyle = "rgba(20,12,6,0.6)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(s, y);
          ctx.stroke();
          // 木纹
          for (let k = 0; k < 6; k++) {
            ctx.strokeStyle = `rgba(30,18,10,${0.05 + Math.random() * 0.08})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            const yy = y + Math.random() * (s / planks);
            ctx.moveTo(0, yy);
            ctx.bezierCurveTo(s * 0.3, yy + 3, s * 0.6, yy - 3, s, yy);
            ctx.stroke();
          }
        }
        this.noiseInto(ctx, s, 0.05);
      },
      512,
      [3, 3]
    );
  }

  private wallTex(base: string) {
    return this.makeCanvasTexture(
      (ctx, s) => {
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, s, s);
        // 竖条暗纹（旧墙纸）
        for (let x = 0; x < s; x += 26) {
          ctx.fillStyle = `rgba(40,30,20,${0.03 + Math.random() * 0.03})`;
          ctx.fillRect(x, 0, 12, s);
        }
        // 水渍
        for (let i = 0; i < 14; i++) {
          const x = Math.random() * s,
            y = Math.random() * s;
          const r = 30 + Math.random() * 110;
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, `rgba(60,46,30,${0.04 + Math.random() * 0.05})`);
          g.addColorStop(1, "rgba(60,46,30,0)");
          ctx.fillStyle = g;
          ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
        this.noiseInto(ctx, s, 0.04);
      },
      512,
      [2, 1]
    );
  }

  private woodTex() {
    return this.makeCanvasTexture((ctx, s) => {
      ctx.fillStyle = "#3a2616";
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 40; i++) {
        ctx.strokeStyle = `rgba(20,12,6,${0.15 + Math.random() * 0.2})`;
        ctx.lineWidth = 1 + Math.random() * 2;
        ctx.beginPath();
        const x = (i / 40) * s + (Math.random() - 0.5) * 6;
        ctx.moveTo(x, 0);
        ctx.bezierCurveTo(x + 8, s * 0.3, x - 8, s * 0.7, x + 4, s);
        ctx.stroke();
      }
      this.noiseInto(ctx, s, 0.04);
    });
  }

  /** 褪色的旧照片/肖像（抽象，不依赖具体内容）。 */
  private portraitTex(seed: number) {
    return this.makeCanvasTexture((ctx, s) => {
      ctx.fillStyle = "#ccc0a4";
      ctx.fillRect(0, 0, s, s);
      const cx = s * (0.42 + ((seed * 7) % 16) / 100);
      const cy = s * 0.44;
      const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, s * 0.45);
      g.addColorStop(0, "rgba(40,30,22,0.5)");
      g.addColorStop(0.5, "rgba(60,48,34,0.28)");
      g.addColorStop(1, "rgba(120,104,78,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = "rgba(35,26,18,0.45)";
      ctx.beginPath();
      ctx.ellipse(cx, cy - s * 0.05, s * 0.1, s * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx, cy + s * 0.2, s * 0.2, s * 0.15, 0, Math.PI, 0);
      ctx.fill();
      const vg = ctx.createRadialGradient(s / 2, s / 2, s * 0.2, s / 2, s / 2, s * 0.7);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(30,20,10,0.45)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, s, s);
      this.noiseInto(ctx, s, 0.07);
    });
  }

  /** 一九五三年九月的日历页。 */
  private calendarTex() {
    return this.makeCanvasTexture((ctx, s) => {
      ctx.fillStyle = "#efe6cf";
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = "#7a1c1c";
      ctx.fillRect(0, 0, s, s * 0.2);
      ctx.fillStyle = "#efe6cf";
      ctx.font = `bold ${s * 0.1}px Georgia, serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("SEPTEMBER 1953", s / 2, s * 0.1);
      ctx.fillStyle = "#2c241b";
      ctx.font = `${s * 0.058}px Georgia, serif`;
      const days = ["S", "M", "T", "W", "T", "F", "S"];
      for (let c = 0; c < 7; c++) ctx.fillText(days[c], (c + 0.5) * (s / 7), s * 0.28);
      let day = 1;
      const startCol = 2; // 9/1 = 周二
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 7; col++) {
          const idx = row * 7 + col;
          if (idx < startCol || day > 30) continue;
          const x = (col + 0.5) * (s / 7);
          const y = s * 0.4 + row * s * 0.12;
          if (day === 7) {
            ctx.fillStyle = "#7a1c1c";
            ctx.beginPath();
            ctx.arc(x, y, s * 0.045, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = "#7a1c1c";
          } else ctx.fillStyle = "#2c241b";
          ctx.fillText(String(day), x, y);
          day++;
        }
      }
      this.noiseInto(ctx, s, 0.03);
    }, 256);
  }

  /** 任意宽高的画布贴图（书封、标签之类）。 */
  private canvasTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): THREE.Texture {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    draw(ctx, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    this.textures.push(t);
    return t;
  }

  private noiseRect(ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number) {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 255 * alpha;
      d[i] = Math.max(0, Math.min(255, d[i] + n));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
    }
    ctx.putImageData(img, 0, 0);
  }

  /** 墙裙护墙板（竖条企口板）。 */
  private wainscotTex() {
    return this.makeCanvasTexture((ctx, s) => {
      ctx.fillStyle = "#4b3522";
      ctx.fillRect(0, 0, s, s);
      const boards = 8;
      for (let i = 0; i < boards; i++) {
        const x = (i / boards) * s;
        ctx.fillStyle = `rgb(${70 + Math.random() * 16},${48 + Math.random() * 10},${30 + Math.random() * 8})`;
        ctx.fillRect(x + 2, 0, s / boards - 4, s);
        ctx.fillStyle = "rgba(15,9,4,0.7)";
        ctx.fillRect(x, 0, 2, s);
        ctx.fillStyle = "rgba(255,220,170,0.07)";
        ctx.fillRect(x + 2, 0, 2, s);
        for (let k = 0; k < 5; k++) {
          ctx.strokeStyle = `rgba(25,14,6,${0.06 + Math.random() * 0.08})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          const xx = x + 4 + Math.random() * (s / boards - 8);
          ctx.moveTo(xx, 0);
          ctx.bezierCurveTo(xx + 3, s * 0.3, xx - 3, s * 0.7, xx + 1, s);
          ctx.stroke();
        }
      }
      // 靠近地面的一截更旧、更暗（被鞋尖和拖把蹭的）
      const g = ctx.createLinearGradient(0, s * 0.7, 0, s);
      g.addColorStop(0, "rgba(20,12,6,0)");
      g.addColorStop(1, "rgba(20,12,6,0.35)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
      this.noiseInto(ctx, s, 0.05);
    }, 256);
  }

  /** 天花：旧灰泥，几块水渍和细裂纹。 */
  private ceilTex() {
    return this.makeCanvasTexture((ctx, s) => {
      ctx.fillStyle = "#2b241c";
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 7; i++) {
        const x = Math.random() * s,
          y = Math.random() * s;
        const r = 40 + Math.random() * 120;
        const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
        g.addColorStop(0, `rgba(90,70,40,${0.08 + Math.random() * 0.1})`);
        g.addColorStop(0.8, `rgba(60,44,24,${0.06 + Math.random() * 0.06})`);
        g.addColorStop(1, "rgba(60,44,24,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ctx.strokeStyle = "rgba(10,7,4,0.35)";
      for (let i = 0; i < 5; i++) {
        ctx.lineWidth = 0.6 + Math.random();
        ctx.beginPath();
        let x = Math.random() * s,
          y = Math.random() * s;
        ctx.moveTo(x, y);
        for (let k = 0; k < 9; k++) {
          x += (Math.random() - 0.5) * 50;
          y += (Math.random() - 0.3) * 40;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      this.noiseInto(ctx, s, 0.05);
    }, 512, [2, 3]);
  }

  /** 一块褪了色的旧地毯。 */
  private rugTex() {
    return this.canvasTex(384, 512, (ctx, w, h) => {
      ctx.fillStyle = "#5b2b23";
      ctx.fillRect(0, 0, w, h);
      const frame = (inset: number, lw: number, col: string) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
      };
      frame(10, 14, "#23243a");
      frame(26, 4, "#a8834e");
      frame(44, 22, "#2a2030");
      frame(60, 3, "#a8834e");
      // 边带上的一串小菱形
      ctx.fillStyle = "#b8925a";
      for (let x = 50; x < w - 44; x += 22) {
        for (const y of [44, h - 44]) {
          ctx.beginPath();
          ctx.moveTo(x, y - 6);
          ctx.lineTo(x + 6, y);
          ctx.lineTo(x, y + 6);
          ctx.lineTo(x - 6, y);
          ctx.fill();
        }
      }
      for (let y = 66; y < h - 44; y += 22) {
        for (const x of [44, w - 44]) {
          ctx.beginPath();
          ctx.moveTo(x, y - 6);
          ctx.lineTo(x + 6, y);
          ctx.lineTo(x, y + 6);
          ctx.lineTo(x - 6, y);
          ctx.fill();
        }
      }
      // 中央的大菱形纹章
      ctx.save();
      ctx.translate(w / 2, h / 2);
      const layers: [number, number, string][] = [
        [130, 170, "#22263a"],
        [110, 148, "#a8834e"],
        [96, 132, "#6b2f25"],
        [60, 84, "#2a3a3a"],
        [34, 46, "#b8925a"],
      ];
      for (const [rx, ry, col] of layers) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(0, -ry);
        ctx.lineTo(rx, 0);
        ctx.lineTo(0, ry);
        ctx.lineTo(-rx, 0);
        ctx.fill();
      }
      ctx.restore();
      // 走得最多的那条路磨得发白
      const g = ctx.createRadialGradient(w * 0.5, h * 0.6, 10, w * 0.5, h * 0.6, h * 0.55);
      g.addColorStop(0, "rgba(210,190,160,0.22)");
      g.addColorStop(1, "rgba(210,190,160,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      const img = ctx.getImageData(0, 0, w, h);
      for (let i = 0; i < img.data.length; i += 4) {
        const n = (Math.random() - 0.5) * 40;
        img.data[i] = Math.max(0, Math.min(255, img.data[i] + n));
        img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n));
        img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n));
      }
      ctx.putImageData(img, 0, 0);
    });
  }

  /** 摊开的日记：左页写了几行，右页只有横线。 */
  private diaryPagesTex() {
    return this.canvasTex(512, 384, (ctx, w, h) => {
      ctx.fillStyle = "#f1e6cb";
      ctx.fillRect(0, 0, w, h);
      // 书脊处的阴影
      const g = ctx.createLinearGradient(w / 2 - 40, 0, w / 2 + 40, 0);
      g.addColorStop(0, "rgba(60,40,20,0)");
      g.addColorStop(0.5, "rgba(60,40,20,0.35)");
      g.addColorStop(1, "rgba(60,40,20,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (const x0 of [24, w / 2 + 24]) {
        for (let y = 48; y < h - 20; y += 22) {
          ctx.strokeStyle = "rgba(110,130,160,0.28)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x0, y);
          ctx.lineTo(x0 + w / 2 - 48, y);
          ctx.stroke();
        }
      }
      // 左页：几行潦草的字
      ctx.strokeStyle = "rgba(38,28,24,0.75)";
      ctx.lineWidth = 1.3;
      for (let row = 0; row < 8; row++) {
        const y = 46 + row * 22;
        let x = 28;
        const end = row === 7 ? 120 : w / 2 - 30 - Math.random() * 40;
        while (x < end) {
          const ww = 10 + Math.random() * 26;
          ctx.beginPath();
          ctx.moveTo(x, y - 2);
          for (let k = 0; k < ww; k += 3) ctx.lineTo(x + k, y - 2 - Math.random() * 7);
          ctx.stroke();
          x += ww + 6;
        }
      }
      this.noiseRect(ctx, w, h, 0.03);
    });
  }

  /** 书封：底色、书名、作者。 */
  private coverTex(bg: string, fg: string, title: string[], author: string | null, ornament: string) {
    return this.canvasTex(256, 384, (ctx, w, h) => {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = ornament;
      ctx.lineWidth = 3;
      ctx.strokeRect(14, 14, w - 28, h - 28);
      ctx.lineWidth = 1;
      ctx.strokeRect(22, 22, w - 44, h - 44);
      ctx.fillStyle = fg;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 34px Georgia, 'Times New Roman', serif";
      title.forEach((line, i) => ctx.fillText(line, w / 2, 120 + i * 44));
      ctx.fillStyle = ornament;
      ctx.fillRect(w / 2 - 30, 120 + title.length * 44, 60, 2);
      if (author) {
        ctx.fillStyle = fg;
        ctx.font = "italic 20px Georgia, 'Times New Roman', serif";
        ctx.fillText(author, w / 2, 160 + title.length * 44);
      }
      this.noiseRect(ctx, w, h, 0.06);
    });
  }

  /** 闹钟表盘。 */
  private clockFaceTex() {
    return this.makeCanvasTexture((ctx, s) => {
      ctx.fillStyle = "#e9dfc8";
      ctx.fillRect(0, 0, s, s);
      ctx.translate(s / 2, s / 2);
      ctx.strokeStyle = "#2a2118";
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * Math.PI * 2;
        const r0 = i % 5 === 0 ? s * 0.38 : s * 0.42;
        ctx.lineWidth = i % 5 === 0 ? 3 : 1;
        ctx.beginPath();
        ctx.moveTo(Math.sin(a) * r0, -Math.cos(a) * r0);
        ctx.lineTo(Math.sin(a) * s * 0.45, -Math.cos(a) * s * 0.45);
        ctx.stroke();
      }
      ctx.fillStyle = "#2a2118";
      ctx.font = `${s * 0.11}px Georgia, serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let i = 1; i <= 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ctx.fillText(String(i), Math.sin(a) * s * 0.3, -Math.cos(a) * s * 0.3);
      }
      // 时针、分针：停在快九点
      const hand = (a: number, len: number, wdt: number) => {
        ctx.lineWidth = wdt;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.sin(a) * len, -Math.cos(a) * len);
        ctx.stroke();
      };
      hand(((8 + 52 / 60) / 12) * Math.PI * 2, s * 0.2, 6);
      hand((52 / 60) * Math.PI * 2, s * 0.32, 4);
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.025, 0, Math.PI * 2);
      ctx.fill();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const vg = ctx.createRadialGradient(s / 2, s / 2, s * 0.3, s / 2, s / 2, s * 0.5);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(60,40,20,0.35)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, s, s);
    }, 256);
  }

  /** 润喉糖瓶的纸标签。 */
  private lozengeLabelTex() {
    return this.canvasTex(512, 128, (ctx, w, h) => {
      ctx.fillStyle = "#efe4c4";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#8a1e1e";
      ctx.fillRect(0, 0, w, 16);
      ctx.fillRect(0, h - 16, w, 16);
      // 一片小枫叶
      ctx.save();
      ctx.translate(w * 0.5, h * 0.36);
      ctx.fillStyle = "#a82a1e";
      ctx.beginPath();
      const pts = [0, -22, 6, -10, 18, -14, 13, -2, 24, 4, 10, 8, 12, 20, 0, 12, -12, 20, -10, 8, -24, 4, -13, -2, -18, -14, -6, -10];
      ctx.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-1.5, 12, 3, 12);
      ctx.restore();
      ctx.fillStyle = "#2a2118";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 22px Georgia, serif";
      ctx.fillText("MAPLE LEAF", w * 0.5, h * 0.66);
      ctx.font = "13px Georgia, serif";
      ctx.fillText("THROAT LOZENGES · PEPPERMINT", w * 0.5, h * 0.82);
      this.noiseRect(ctx, w, h, 0.05);
    });
  }

  /** 窗外夜空：越往下越亮一点，一棵秃树和远处的屋脊（闪电时才看得清）。 */
  private skyTex() {
    return this.canvasTex(512, 512, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#9aa8b8");
      g.addColorStop(0.75, "#dde4ea");
      g.addColorStop(1, "#c8d0d8");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#06070a";
      // 远处的屋脊和烟囱
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, h * 0.8);
      ctx.lineTo(w * 0.18, h * 0.74);
      ctx.lineTo(w * 0.36, h * 0.8);
      ctx.lineTo(w * 0.36, h * 0.78);
      ctx.lineTo(w * 0.62, h * 0.78);
      ctx.lineTo(w * 0.62, h * 0.7);
      ctx.lineTo(w * 0.66, h * 0.7);
      ctx.lineTo(w * 0.66, h * 0.78);
      ctx.lineTo(w, h * 0.76);
      ctx.lineTo(w, h);
      ctx.fill();
      // 秃树：递归分叉
      const branch = (x: number, y: number, a: number, len: number, wdt: number, depth: number) => {
        const x2 = x + Math.sin(a) * len;
        const y2 = y - Math.cos(a) * len;
        ctx.strokeStyle = "#06070a";
        ctx.lineWidth = wdt;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        if (depth <= 0) return;
        const n = 2 + (Math.random() < 0.4 ? 1 : 0);
        for (let i = 0; i < n; i++) {
          branch(x2, y2, a + (Math.random() - 0.5) * 1.1, len * (0.62 + Math.random() * 0.2), wdt * 0.66, depth - 1);
        }
      };
      branch(w * 0.7, h * 0.95, -0.05, h * 0.22, 14, 7);
      branch(w * 0.12, h * 0.98, 0.1, h * 0.14, 8, 6);
    });
  }

  /** 玻璃上的雨：streak=false 是静止的水珠，true 是往下淌的水痕。 */
  private glassRainTex(streak: boolean) {
    const t = this.canvasTex(256, 512, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      if (!streak) {
        for (let i = 0; i < 260; i++) {
          const x = Math.random() * w,
            y = Math.random() * h;
          const r = 0.8 + Math.random() * Math.random() * 3.2;
          ctx.fillStyle = `rgba(190,210,230,${0.25 + Math.random() * 0.35})`;
          ctx.beginPath();
          ctx.ellipse(x, y, r, r * 1.15, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.55)";
          ctx.beginPath();
          ctx.arc(x - r * 0.3, y - r * 0.35, Math.max(0.4, r * 0.3), 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        for (let i = 0; i < 22; i++) {
          let x = Math.random() * w;
          let y = Math.random() * h;
          const len = 40 + Math.random() * 140;
          ctx.strokeStyle = `rgba(200,218,236,${0.18 + Math.random() * 0.22})`;
          ctx.lineWidth = 1 + Math.random() * 1.6;
          ctx.beginPath();
          ctx.moveTo(x, y);
          for (let k = 0; k < len; k += 6) {
            x += (Math.random() - 0.5) * 2.2;
            y += 6;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.fillStyle = "rgba(220,235,250,0.6)";
          ctx.beginPath();
          ctx.arc(x, y, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  /** 旧镜子的锈斑与暗边（叠在反射上）。 */
  private tarnishTex() {
    return this.canvasTex(256, 384, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.62);
      vg.addColorStop(0, "rgba(20,16,10,0)");
      vg.addColorStop(1, "rgba(20,16,10,0.95)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) {
        const x = Math.random() * w,
          y = Math.random() * h;
        const r = 1 + Math.random() * 7;
        ctx.fillStyle = `rgba(${40 + Math.random() * 30},${34 + Math.random() * 20},${20},${0.2 + Math.random() * 0.4})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      // 从边角往里爬的银层剥落
      for (let i = 0; i < 6; i++) {
        const x = Math.random() < 0.5 ? Math.random() * 30 : w - Math.random() * 30;
        const y = Math.random() * h;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 40 + Math.random() * 40);
        g.addColorStop(0, "rgba(30,24,16,0.7)");
        g.addColorStop(1, "rgba(30,24,16,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
    });
  }

  /** 柔和的圆形暗影 / 光斑（贴在地上，压住家具的「漂浮感」）。 */
  private softSpotTex() {
    if (this.spotTex) return this.spotTex;
    const t = this.makeCanvasTexture((ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.5, "rgba(255,255,255,0.55)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    }, 128);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    this.spotTex = t;
    return t;
  }

  /** 皮箱里衬的布纹：细细的竖条纹（颜色由材质给，准星对准时泛的光才跟着布的颜色走）。 */
  private liningTex() {
    return this.makeCanvasTexture(
      (ctx, s) => {
        ctx.fillStyle = "#dcd2ca";
        ctx.fillRect(0, 0, s, s);
        for (let x = 0; x < s; x += 16) {
          ctx.fillStyle = "rgba(255,246,232,0.3)";
          ctx.fillRect(x, 0, 2, s);
          ctx.fillStyle = "rgba(40,20,14,0.22)";
          ctx.fillRect(x + 8, 0, 1, s);
        }
        this.noiseRect(ctx, s, s, 0.1);
      },
      128,
      [7, 7]
    );
  }

  /** 叠起来的入院文件：发黄的纸，几行打字机字迹。 */
  private docTex() {
    return this.makeCanvasTexture((ctx, s) => {
      ctx.fillStyle = "#e9dfc7";
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = "rgba(55,45,35,0.6)";
      ctx.fillRect(s * 0.22, s * 0.08, s * 0.56, s * 0.045);
      for (let y = s * 0.2; y < s * 0.92; y += s * 0.065) ctx.fillRect(s * 0.1, y, s * (0.5 + Math.random() * 0.32), s * 0.016);
      this.noiseRect(ctx, s, s, 0.05);
    }, 128);
  }

  /** 竖向渐变（墙根/天花角的暗影）。 */
  private fadeTex() {
    const t = this.makeCanvasTexture((ctx, s) => {
      const g = ctx.createLinearGradient(0, 0, 0, s);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(1, "rgba(255,255,255,1)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    }, 64);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  }

  private track<T extends THREE.Material | THREE.BufferGeometry>(x: T): T {
    if ((x as THREE.Material).isMaterial) this.mats.push(x as THREE.Material);
    else this.geoms.push(x as THREE.BufferGeometry);
    return x;
  }

  private box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) {
    const g = this.track(new THREE.BoxGeometry(w, h, d));
    const m = new THREE.Mesh(g, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  private std(opts: THREE.MeshStandardMaterialParameters) {
    return this.track(new THREE.MeshStandardMaterial(opts));
  }

  /** 不投影的小件（点光源阴影是 6 面立方体贴图，小东西就别投了）。 */
  private boxNS(w: number, h: number, d: number, mat: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0) {
    const m = this.box(w, h, d, mat as THREE.Material, x, y, z);
    m.castShadow = false;
    return m;
  }

  private mesh(geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0, cast = false) {
    const m = new THREE.Mesh(this.track(geo), mat);
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = true;
    return m;
  }

  /** 圆角方块（床垫、枕头、皮箱……）。 */
  private rbox(w: number, h: number, d: number, r: number, mat: THREE.Material, x = 0, y = 0, z = 0, cast = true) {
    return this.mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)), mat, x, y, z, cast);
  }

  /** 圆角矩形轮廓（以原点为中心，半长 hw、半宽 hd、圆角 r）。 */
  private rrect<T extends THREE.Path>(p: T, hw: number, hd: number, r: number): T {
    p.moveTo(-hw + r, -hd);
    p.lineTo(hw - r, -hd);
    p.absarc(hw - r, -hd + r, r, -Math.PI / 2, 0, false);
    p.lineTo(hw, hd - r);
    p.absarc(hw - r, hd - r, r, 0, Math.PI / 2, false);
    p.lineTo(-hw + r, hd);
    p.absarc(-hw + r, hd - r, r, Math.PI / 2, Math.PI, false);
    p.lineTo(-hw, -hd + r);
    p.absarc(-hw + r, -hd + r, r, Math.PI, Math.PI * 1.5, false);
    return p;
  }

  /**
   * 空心的圆角托盘（皮箱的箱底 / 箱盖 / 里衬 / 包边）：四壁 + 底板，从 y=0 往上长到 h，口沿倒一道小斜角。
   * 内壁圆角 rIn 可以比外面大——四个角因此更厚实，铜包角嵌在里面，不会从箱子里头冒出来。floor=0 就只有一圈壁。
   */
  private trayGeo(hw: number, hd: number, r: number, wall: number, rIn: number, h: number, floor: number, bevel: number) {
    const b = bevel;
    const opts = (depth: number): THREE.ExtrudeGeometryOptions => ({ depth, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: 6 });
    const ring = this.rrect(new THREE.Shape(), hw - b, hd - b, r - b);
    ring.holes.push(this.rrect(new THREE.Path(), hw - wall + b, hd - wall + b, rIn + b));
    const parts: THREE.BufferGeometry[] = [new THREE.ExtrudeGeometry(ring, opts(h - 2 * b))];
    if (floor > 0) parts.push(new THREE.ExtrudeGeometry(this.rrect(new THREE.Shape(), hw - b - 0.001, hd - b - 0.001, r - b), opts(floor - 2 * b)));
    const g = parts.length > 1 ? mergeGeometries(parts)! : parts[0];
    if (g !== parts[0]) parts.forEach((x) => x.dispose());
    g.rotateX(-Math.PI / 2);
    g.translate(0, b, 0);
    // 圆角处要圆滑、倒角处要利落：按折角分开算法线（先放大再算——那个工具按厘米合并顶点，皮箱上的细节比厘米还小）
    g.scale(100, 100, 100);
    const out = toCreasedNormals(g, 0.5);
    out.scale(0.01, 0.01, 0.01);
    return out;
  }

  /** 贴在地上的柔和暗影，让家具「落地」。 */
  private blob(x: number, z: number, w: number, d: number, opacity = 0.5, rotY = 0) {
    const mat = this.track(
      new THREE.MeshBasicMaterial({
        map: this.softSpotTex(),
        color: 0x000000,
        transparent: true,
        opacity,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    );
    // 黑色 × 贴图 alpha：用 alphaMap 才能让「黑」带上渐变透明
    mat.alphaMap = mat.map;
    mat.map = null;
    const m = new THREE.Mesh(this.track(new THREE.PlaneGeometry(w, d)), mat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = rotY;
    m.position.set(x, 0.006, z);
    this.scene.add(m);
    return m;
  }

  /** 交互小动画：dur 秒内每帧回调 step(k)，k 从 0 到 1。still：这段时间里没有会投影的东西在动（不必重算阴影）。 */
  private tween(dur: number, step: (k: number) => void, done?: () => void, still = false) {
    this.tweens.push({ t: 0, dur, step, done, still });
  }

  /** 什么也不动，只是等一会儿。 */
  private wait(dur: number, done: () => void) {
    this.tween(dur, () => {}, done, true);
  }

  // ====================================================================
  // 光
  // ====================================================================
  private buildLighting() {
    this.hemi = new THREE.HemisphereLight(0x6b5436, 0x140c06, 0.5);
    this.scene.add(this.hemi);
  }

  // ====================================================================
  // 房间外壳：地板 / 墙 / 天花 / 踢脚 / 画镜线
  // ====================================================================
  private buildShell() {
    const floorT = this.floorTex();
    const floorMat = this.std({ map: floorT, roughness: 0.8, bumpMap: floorT, bumpScale: 1.4 });
    const wallT = this.wallTex("#8d8466");
    const wallMat = this.std({ map: wallT, roughness: 0.97 });
    const ceilMat = this.std({ map: this.ceilTex(), roughness: 1 });
    const trimMat = this.std({ color: 0x4a3624, roughness: 0.7, map: this.woodTex() });

    const w = RX * 2;
    const d = ZS - ZN;
    const midZ = (ZN + ZS) / 2;

    const floor = new THREE.Mesh(this.track(new THREE.PlaneGeometry(w, d)), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, midZ);
    floor.receiveShadow = true;
    this.scene.add(floor);

    const ceil = new THREE.Mesh(this.track(new THREE.PlaneGeometry(w, d)), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, H, midZ);
    this.scene.add(ceil);

    // 四面墙（向内）
    const mkWall = (pw: number, rotY: number, x: number, z: number) => {
      const wall = new THREE.Mesh(this.track(new THREE.PlaneGeometry(pw, H)), wallMat);
      wall.rotation.y = rotY;
      wall.position.set(x, H / 2, z);
      wall.receiveShadow = true;
      this.scene.add(wall);
    };
    mkWall(w, Math.PI, 0, ZS); // 南
    mkWall(d, -Math.PI / 2, RX, midZ); // 东
    mkWall(d, Math.PI / 2, -RX, midZ); // 西

    // 北墙：留一个窗洞（这样能透过玻璃看到外面的雨），用四段拼成
    const northSeg = (pw: number, ph: number, cx: number, cy: number) => {
      const m = new THREE.Mesh(this.track(new THREE.PlaneGeometry(pw, ph)), wallMat);
      m.position.set(cx, cy, ZN);
      m.receiveShadow = true;
      this.scene.add(m);
    };
    const holeL = WIN_CX - WIN_HW, holeR = WIN_CX + WIN_HW;
    const holeB = WIN_CY - WIN_HH, holeT = WIN_CY + WIN_HH;
    northSeg(holeL - -RX, H, (-RX + holeL) / 2, H / 2); // 左
    northSeg(RX - holeR, H, (holeR + RX) / 2, H / 2); // 右
    northSeg(holeR - holeL, H - holeT, WIN_CX, (holeT + H) / 2); // 上
    northSeg(holeR - holeL, holeB, WIN_CX, holeB / 2); // 下

    // 踢脚线 + 画镜线 + 檐口（四周一圈）
    const ring = (y: number, hgt: number, dep = 0.04) => {
      this.scene.add(this.box(w, hgt, dep, trimMat, 0, y, ZN + dep / 2));
      this.scene.add(this.box(w, hgt, dep, trimMat, 0, y, ZS - dep / 2));
      this.scene.add(this.box(dep, hgt, d, trimMat, RX - dep / 2, y, midZ));
      this.scene.add(this.box(dep, hgt, d, trimMat, -RX + dep / 2, y, midZ));
    };
    ring(0.09, 0.18); // 踢脚
    ring(2.15, 0.05); // 画镜线
    ring(H - 0.06, 0.12, 0.07); // 檐口

    // 墙裙：下半截一圈竖条护墙板，顶上压一道腰线（门洞处断开）。一八八七年的老楼该有的样子。
    const wsT = this.wainscotTex();
    const WH = 0.95;
    const wainscot = (len: number, cx: number, cz: number, rotY: number) => {
      const t = wsT.clone();
      t.repeat.set(len / 1.0, 1);
      t.needsUpdate = true;
      this.textures.push(t);
      const m = new THREE.Mesh(this.track(new THREE.PlaneGeometry(len, WH)), this.std({ map: t, roughness: 0.72 }));
      m.rotation.y = rotY;
      m.position.set(cx, WH / 2, cz);
      m.receiveShadow = true;
      this.scene.add(m);
      const rail = this.boxNS(len, 0.05, 0.035, trimMat, cx, WH + 0.02, cz);
      rail.rotation.y = rotY;
      this.scene.add(rail);
    };
    wainscot(w, 0, ZN + 0.008, 0); // 北
    wainscot(RX + 0.1, (-RX + 0.1) / 2, ZS - 0.008, Math.PI); // 南（门左）
    wainscot(RX - 1.3, (1.3 + RX) / 2, ZS - 0.008, Math.PI); // 南（门右）
    wainscot(d, RX - 0.008, midZ, -Math.PI / 2); // 东
    wainscot(d, -RX + 0.008, midZ, Math.PI / 2); // 西

    // 墙根与天花角的柔和暗影（便宜的「环境光遮蔽」），房间更有体积
    const fade = this.fadeTex();
    const aoMat = (op: number) => {
      const m = this.track(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: op, depthWrite: false }));
      m.alphaMap = fade;
      return m;
    };
    const floorAO = aoMat(0.55);
    const ceilAO = aoMat(0.6);
    const edge = (len: number, x: number, z: number, yaw: number) => {
      // 地上：从墙根往屋里淡出
      const g = new THREE.Group();
      const f = new THREE.Mesh(this.track(new THREE.PlaneGeometry(len, 0.45)), floorAO);
      f.rotation.x = -Math.PI / 2;
      f.position.set(0, 0.003, -0.225);
      g.add(f);
      // 墙上：天花角往下淡出
      const c = new THREE.Mesh(this.track(new THREE.PlaneGeometry(len, 0.5)), ceilAO);
      c.rotation.z = Math.PI;
      c.position.set(0, H - 0.25, -0.012);
      c.rotation.y = Math.PI;
      g.add(c);
      g.position.set(x, 0, z);
      g.rotation.y = yaw;
      this.scene.add(g);
    };
    edge(w, 0, ZS, 0); // 南
    edge(w, 0, ZN, Math.PI); // 北
    edge(d, RX, midZ, Math.PI / 2); // 东
    edge(d, -RX, midZ, -Math.PI / 2); // 西

    // 一块褪了色的旧地毯（地板中央，走得最多的地方磨白了）
    const rug = new THREE.Mesh(
      this.track(new THREE.PlaneGeometry(1.5, 2.1)),
      this.std({ map: this.rugTex(), roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })
    );
    rug.rotation.x = -Math.PI / 2;
    rug.rotation.z = 0.04;
    rug.position.set(0.25, 0.004, 0.25);
    rug.receiveShadow = true;
    this.scene.add(rug);
  }

  // ====================================================================
  // 书桌区
  // ====================================================================
  private buildDeskArea() {
    const woodT = this.woodTex();
    const wood = this.std({ color: 0x5a3d22, roughness: 0.6, map: woodT, bumpMap: woodT, bumpScale: 0.8 });
    const darkWood = this.std({ color: 0x3e2914, roughness: 0.55, map: woodT });
    const brass = this.std({ color: 0x9a7a44, roughness: 0.35, metalness: 0.75 });
    const deskX = -0.75;
    const deskTopZ = ZN + 0.42;
    const deskY = 0.76;

    // 桌面（圆角）+ 四条收分方腿 + 抽屉箱 + 两只抽屉（黄铜拉手）
    const desk = new THREE.Group();
    desk.add(this.rbox(1.74, 0.06, 0.8, 0.012, wood, 0, deskY, 0, true));
    for (const dx of [-0.78, 0.78]) {
      for (const dz of [-0.3, 0.3]) {
        const leg = this.mesh(new THREE.CylinderGeometry(0.038, 0.026, deskY - 0.03, 4), wood, dx, (deskY - 0.03) / 2, dz, true);
        leg.rotation.y = Math.PI / 4;
        desk.add(leg);
      }
    }
    desk.add(this.box(1.5, 0.2, 0.7, wood, 0, deskY - 0.16, -0.02)); // 抽屉箱
    for (const hx of [-0.38, 0.38]) {
      desk.add(this.boxNS(0.68, 0.15, 0.016, darkWood, hx, deskY - 0.16, 0.338));
      const pull = this.mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.11, 8), brass, hx, deskY - 0.16, 0.37);
      pull.rotation.z = Math.PI / 2;
      desk.add(pull);
      for (const px of [-0.05, 0.05]) {
        const post = this.mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.03, 6), brass, hx + px, deskY - 0.16, 0.356);
        post.rotation.x = Math.PI / 2;
        desk.add(post);
      }
    }
    desk.position.set(deskX, 0, deskTopZ);
    this.scene.add(desk);
    this.blob(deskX, deskTopZ, 2.1, 1.15, 0.55);

    // 废纸篓（桌下），几团揉皱的纸
    const basket = new THREE.Group();
    const wicker = this.std({ color: 0x6a5232, roughness: 0.95, side: THREE.DoubleSide });
    basket.add(this.mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.3, 18, 1, true), wicker, 0, 0.15, 0, true));
    basket.add(this.mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.01, 18), wicker, 0, 0.005, 0));
    const paper = this.std({ color: 0xe6dcc4, roughness: 1 });
    for (const [px, py, pz] of [[0.02, 0.27, 0.01], [-0.05, 0.25, -0.03], [0.05, 0.31, -0.04]]) {
      const ball = this.mesh(new THREE.IcosahedronGeometry(0.04, 0), paper, px, py, pz);
      ball.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      basket.add(ball);
    }
    basket.position.set(deskX + 0.52, 0, deskTopZ + 0.08);
    this.scene.add(basket);

    // 椅子（曲木椅；靠背在南侧，坐下的人面朝书桌 -Z）
    const chair = new THREE.Group();
    chair.add(this.mesh(new THREE.CylinderGeometry(0.215, 0.215, 0.04, 24), wood, 0, 0.46, 0, true));
    for (const [cx, cz] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) {
      const leg = this.mesh(new THREE.CylinderGeometry(0.017, 0.013, 0.46, 8), wood, cx * 1.06, 0.23, cz * 1.06, true);
      leg.rotation.set(-Math.sign(cz) * 0.06, 0, Math.sign(cx) * 0.06); // 四腿略向外撇
      chair.add(leg);
    }
    const stretcher = this.mesh(new THREE.TorusGeometry(0.17, 0.008, 6, 28), wood, 0, 0.17, 0);
    stretcher.rotation.x = Math.PI / 2;
    chair.add(stretcher);
    for (const ux of [-0.16, 0.16]) chair.add(this.mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.5, 8), wood, ux, 0.71, 0.19, true));
    const arch = this.mesh(new THREE.TorusGeometry(0.16, 0.016, 8, 24, Math.PI), wood, 0, 0.95, 0.19, true);
    chair.add(arch);
    for (const sx of [-0.07, 0, 0.07]) chair.add(this.mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.56, 6), wood, sx, 0.76, 0.19));
    chair.position.set(deskX, 0, deskTopZ + 0.62);
    this.scene.add(chair);
    this.blob(deskX, deskTopZ + 0.62, 0.7, 0.7, 0.45);

    // 台灯（房间主光源，会闪；可点击开关）：铜座、铜杆、绿灯罩、灯泡、一根拉链
    const lampX = deskX + 0.62,
      lampZ = deskTopZ - 0.1;
    const lampParts = new THREE.Group();
    lampParts.add(this.mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.03, 28), brass, lampX, deskY + 0.045, lampZ, true));
    lampParts.add(this.mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.44, 10), brass, lampX, deskY + 0.27, lampZ, true));
    lampParts.add(this.mesh(new THREE.SphereGeometry(0.02, 12, 10), brass, lampX, deskY + 0.5, lampZ));
    this.scene.add(lampParts);
    const shadeMat = this.std({ color: 0x3c5a3a, emissive: 0xffb14e, emissiveIntensity: 1.4, roughness: 0.6, side: THREE.DoubleSide });
    const shade = new THREE.Mesh(this.track(new THREE.ConeGeometry(0.17, 0.2, 28, 1, true)), shadeMat);
    shade.position.set(lampX, deskY + 0.52, lampZ);
    this.scene.add(shade);
    const rim = this.mesh(new THREE.TorusGeometry(0.17, 0.006, 6, 36), brass, lampX, deskY + 0.42, lampZ);
    rim.rotation.x = Math.PI / 2;
    this.scene.add(rim);
    const bulbMat = this.std({ color: 0xfff1d0, emissive: 0xffd08a, emissiveIntensity: 2.2, roughness: 0.3 });
    this.lampBulbMat = bulbMat;
    this.scene.add(this.mesh(new THREE.SphereGeometry(0.033, 16, 12), bulbMat, lampX, deskY + 0.45, lampZ));
    const chain = new THREE.Group();
    const beadMat = this.std({ color: 0xb08f55, roughness: 0.3, metalness: 0.8 });
    const beadGeo = this.track(new THREE.SphereGeometry(0.0045, 6, 5));
    for (let i = 0; i < 8; i++) {
      const b = new THREE.Mesh(beadGeo, beadMat);
      b.position.y = -i * 0.012;
      chain.add(b);
    }
    chain.add(this.mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.022, 8), beadMat, 0, -0.105, 0));
    chain.position.set(lampX + 0.1, deskY + 0.43, lampZ + 0.08);
    this.scene.add(chain);
    this.lampChain = chain;
    const lamp = new THREE.PointLight(0xffb255, 6.5, 7, 2);
    lamp.position.set(lampX, deskY + 0.46, lampZ);
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(1024, 1024);
    lamp.shadow.bias = -0.0008;
    this.scene.add(lamp);
    this.flickerLights.push({ light: lamp, base: 6.5, seed: 7 });
    this.deskLamp = lamp;
    this.deskLampShade = shadeMat;
    // 点击灯罩/灯杆开关台灯
    const lampPick = new THREE.Mesh(this.track(new THREE.BoxGeometry(0.4, 0.7, 0.4)), this.track(new THREE.MeshBasicMaterial({ visible: false })));
    lampPick.position.set(lampX, deskY + 0.35, lampZ);
    this.scene.add(lampPick);
    this.registerInteractable({
      root: lampPick,
      type: "lamp",
      label: "Desk lamp · On / Off",
      onPick: () => {
        this.lampOn = !this.lampOn; // 亮度在 update() 里平滑过渡
        this.playOneShot("door", 0.35); // 借用一下「咔哒」声当开关声
        // 拉了一下灯链：晃两下停住
        this.tween(1.1, (k) => {
          if (this.lampChain) this.lampChain.rotation.z = Math.sin(k * Math.PI * 5) * 0.32 * (1 - k);
        });
      },
      glow: [lampParts, rim],
    });

    // 绿色皮面的吸墨垫（日记压在上面）
    const blotter = new THREE.Group();
    blotter.add(this.boxNS(0.66, 0.004, 0.46, this.std({ color: 0x22402c, roughness: 0.85 }), 0, deskY + 0.032, 0));
    const blotLeather = this.std({ color: 0x3a2412, roughness: 0.6 });
    for (const sx of [-1, 1]) blotter.add(this.boxNS(0.07, 0.006, 0.462, blotLeather, sx * 0.3, deskY + 0.033, 0));
    blotter.position.set(deskX - 0.19, 0, deskTopZ + 0.05);
    blotter.rotation.y = 0.1;
    this.scene.add(blotter);

    // 日记（红封皮，摊开；左页写了几行）
    const diary = new THREE.Group();
    const cover = this.std({ color: 0x431414, roughness: 0.55 });
    const pageSide = this.std({ color: 0xe6d9bc, roughness: 0.95 });
    const pageTop = this.std({ map: this.diaryPagesTex(), roughness: 0.9, emissive: 0x3a2f18, emissiveIntensity: 0.18 });
    diary.add(this.rbox(0.44, 0.025, 0.32, 0.006, cover, 0, deskY + 0.045, 0, true));
    const pages = this.mesh(new THREE.BoxGeometry(0.41, 0.014, 0.3), [pageSide, pageSide, pageTop, pageSide, pageSide, pageSide], 0, deskY + 0.062, 0, true);
    diary.add(pages);
    diary.add(this.boxNS(0.004, 0.015, 0.3, this.std({ color: 0x8a1c1c, roughness: 0.6 }), 0, deskY + 0.064, 0)); // 中缝
    // 丝带书签：从书缝里垂出书口
    const ribbonMat = this.std({ color: 0x7a1010, roughness: 0.7 });
    diary.add(this.boxNS(0.01, 0.002, 0.08, ribbonMat, 0.012, deskY + 0.0705, 0.12));
    diary.add(this.boxNS(0.01, 0.05, 0.002, ribbonMat, 0.012, deskY + 0.048, 0.161));
    diary.position.set(deskX - 0.2, 0.002, deskTopZ + 0.06);
    diary.rotation.y = 0.12;
    this.scene.add(diary);
    const haloMat = this.track(new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0 }));
    const halo = new THREE.Mesh(this.track(new THREE.PlaneGeometry(0.6, 0.5)), haloMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.set(deskX - 0.2, deskY + 0.08, deskTopZ + 0.06);
    this.scene.add(halo);
    this.registerInteractable({
      root: diary,
      type: "diary",
      label: "Open the diary on the desk — begin writing",
      onPick: () => {
        this.playOneShot("book", 0.8); // 翻开/进入桌面的翻页声
        this.cb.onOpenReading("diary");
      },
      highlight: (on) => (haloMat.opacity = on ? 0.5 : 0),
    });

    // 钢笔（黑杆、金箍、笔尖）+ 笔帽
    const pen = new THREE.Group();
    const penBlack = this.std({ color: 0x15100b, roughness: 0.3 });
    const gold = this.std({ color: 0xb8924c, roughness: 0.3, metalness: 0.8 });
    const barrel = this.mesh(new THREE.CylinderGeometry(0.0065, 0.0055, 0.12, 12), penBlack, 0, 0, 0);
    barrel.rotation.x = Math.PI / 2;
    pen.add(barrel);
    const band = this.mesh(new THREE.CylinderGeometry(0.0068, 0.0068, 0.008, 12), gold, 0, 0, 0.045);
    band.rotation.x = Math.PI / 2;
    pen.add(band);
    const nib = this.mesh(new THREE.ConeGeometry(0.005, 0.025, 10), gold, 0, 0, 0.072);
    nib.rotation.x = Math.PI / 2;
    pen.add(nib);
    pen.position.set(deskX + 0.17, deskY + 0.037, deskTopZ + 0.12);
    pen.rotation.y = -0.5;
    this.scene.add(pen);
    const penCap = this.mesh(new THREE.CylinderGeometry(0.0075, 0.007, 0.06, 12), penBlack, deskX + 0.23, deskY + 0.038, deskTopZ + 0.2);
    penCap.rotation.set(Math.PI / 2, 0, 0.9);
    this.scene.add(penCap);

    // 墨水瓶：方玻璃瓶 + 黑盖
    const inkGlass = this.std({ color: 0x1a2430, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.85 });
    this.scene.add(this.rbox(0.065, 0.055, 0.065, 0.008, inkGlass, deskX + 0.34, deskY + 0.0575, deskTopZ + 0.04, true));
    this.scene.add(this.mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.022, 14), penBlack, deskX + 0.34, deskY + 0.096, deskTopZ + 0.04));

    // 一摞纸
    const page = this.std({ color: 0xf2e8cf, roughness: 0.9, emissive: 0x3a2f18, emissiveIntensity: 0.18 });
    this.scene.add(this.box(0.28, 0.03, 0.36, page, deskX + 0.45, deskY + 0.045, deskTopZ - 0.18));
    // 几封用细绳捆着的信
    const letters = new THREE.Group();
    const env = this.std({ color: 0xd9c9a4, roughness: 0.9 });
    for (let i = 0; i < 3; i++) {
      const e = this.boxNS(0.17, 0.004, 0.1, env, (Math.random() - 0.5) * 0.01, deskY + 0.032 + i * 0.0045, (Math.random() - 0.5) * 0.01);
      e.rotation.y = (Math.random() - 0.5) * 0.08;
      letters.add(e);
    }
    const string = this.std({ color: 0x8a7350, roughness: 1 });
    letters.add(this.boxNS(0.004, 0.016, 0.104, string, 0.02, deskY + 0.038, 0));
    letters.add(this.boxNS(0.174, 0.016, 0.004, string, 0, deskY + 0.038, 0.01));
    letters.position.set(deskX + 0.62, 0, deskTopZ + 0.24);
    letters.rotation.y = -0.25;
    this.scene.add(letters);

    // 《荒原》平装本（搁桌角）
    const wl = new THREE.Group();
    wl.add(this.box(0.16, 0.03, 0.24, this.std({ color: 0x9a7b3e, roughness: 0.7 }), 0, deskY + 0.045, 0));
    const wlCover = this.mesh(
      new THREE.PlaneGeometry(0.156, 0.236),
      this.std({ map: this.coverTex("#d9cba4", "#2a2118", ["THE", "WASTE", "LAND"], "T. S. Eliot", "#7a1c1c"), roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
      0,
      deskY + 0.0605,
      0
    );
    wlCover.rotation.x = -Math.PI / 2;
    wl.add(wlCover);
    wl.position.set(deskX - 0.62, 0, deskTopZ - 0.16);
    wl.rotation.y = 0.3;
    this.scene.add(wl);
    this.registerInteractable({
      root: wl,
      type: "wasteland",
      label: "T. S. Eliot, The Waste Land",
      onPick: () => {
        // 拿起来看一眼，又放下
        this.tween(0.9, (k) => {
          wl.position.y = Math.sin(k * Math.PI) * 0.035;
        });
        this.emitCaption(
          "A long poem about how people lose their words. “April is the cruellest month.”\nI set it beside the lozenges Mother gave me: a long poem on the collapse of civilization, and lying next to it a bottle of sweets for the throat. Irony, or mercy, or only a mother afraid her son’s throat will hurt?",
          11300
        );
      },
    });

    // 桌上的小相框（带支架）
    const frame = this.box(0.16, 0.2, 0.02, wood, deskX - 0.55, deskY + 0.13, deskTopZ + 0.2);
    frame.rotation.y = 0.4;
    this.scene.add(frame);
    const photo = new THREE.Mesh(this.track(new THREE.PlaneGeometry(0.12, 0.16)), this.std({ map: this.portraitTex(2), roughness: 0.9 }));
    photo.position.set(deskX - 0.55 + Math.sin(0.4) * 0.012, deskY + 0.13, deskTopZ + 0.2 + Math.cos(0.4) * 0.012);
    photo.rotation.y = 0.4;
    this.scene.add(photo);

    // 书桌上方的一块搁板，一排旧书（台灯从下往上照，书影落在墙上）
    const shelfX = deskX - 0.25;
    const shelfY = 1.95;
    const shelfZ = ZN + 0.11;
    this.scene.add(this.boxNS(1.1, 0.03, 0.2, darkWood, shelfX, shelfY, shelfZ));
    for (const bx of [-0.45, 0.45]) {
      this.scene.add(this.boxNS(0.03, 0.14, 0.03, darkWood, shelfX + bx, shelfY - 0.085, ZN + 0.03));
      const brace = this.boxNS(0.03, 0.03, 0.18, darkWood, shelfX + bx, shelfY - 0.07, shelfZ - 0.01);
      brace.rotation.x = -0.6;
      this.scene.add(brace);
    }
    const spines = [0x5a1d1d, 0x1f2b44, 0x4a4a2a, 0x7a5a2a, 0x1a1a1a, 0x5c3a24, 0x2e4033, 0x6b2a20, 0x3a3048, 0x8a7350, 0x24323a, 0x553322];
    let bx = shelfX - 0.5;
    spines.forEach((col, i) => {
      const bw = 0.028 + Math.random() * 0.026;
      const bh = 0.17 + Math.random() * 0.08;
      const bd = 0.13 + Math.random() * 0.03;
      const b = this.boxNS(bw, bh, bd, this.std({ color: col, roughness: 0.7 }), bx + bw / 2, shelfY + 0.015 + bh / 2, shelfZ + 0.01);
      if (i === 9) b.rotation.z = 0.18; // 一本斜靠着
      this.scene.add(b);
      bx += bw + 0.004 + (i === 8 ? 0.03 : 0);
    });
    // 最右头平放的两本
    this.scene.add(this.boxNS(0.17, 0.035, 0.13, this.std({ color: 0x3b2a1a, roughness: 0.7 }), shelfX + 0.38, shelfY + 0.033, shelfZ + 0.01));
    this.scene.add(this.boxNS(0.15, 0.03, 0.12, this.std({ color: 0x6a1f1f, roughness: 0.7 }), shelfX + 0.38, shelfY + 0.066, shelfZ + 0.01));
  }

  // ====================================================================
  // 床 + 床头柜
  // ====================================================================
  private buildBed() {
    const wood = this.std({ color: 0x40342a, roughness: 0.7 });
    const metal = this.std({ color: 0x1d1d22, roughness: 0.4, metalness: 0.6 });
    const sheet = this.std({ color: 0xb9b09a, roughness: 1 });
    const blanket = this.std({ color: 0x4a5443, roughness: 1 });

    const bedX = RX - 0.55;
    const headZ = ZN + 0.55;
    const bed = new THREE.Group();
    // 铁床架：床头高、床尾矮；立柱顶上一颗圆球，中间一排细竖栏
    const ironEnd = (z: number, h: number) => {
      for (const px of [-0.47, 0.47]) {
        bed.add(this.mesh(new THREE.CylinderGeometry(0.026, 0.026, h, 12), metal, px, h / 2, z, true));
        bed.add(this.mesh(new THREE.SphereGeometry(0.038, 14, 10), metal, px, h + 0.025, z, true));
      }
      for (const ry of [h - 0.05, 0.36]) {
        const r = this.mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.94, 10), metal, 0, ry, z, true);
        r.rotation.z = Math.PI / 2;
        bed.add(r);
      }
      const n = 7;
      const barH = h - 0.05 - 0.36;
      for (let i = 0; i < n; i++) {
        const x = -0.36 + (i * 0.72) / (n - 1);
        bed.add(this.mesh(new THREE.CylinderGeometry(0.009, 0.009, barH, 8), metal, x, 0.36 + barH / 2, z, false));
      }
    };
    ironEnd(-0.97, 1.05); // 床头
    ironEnd(0.97, 0.7); // 床尾
    for (const sx of [-0.47, 0.47]) bed.add(this.boxNS(0.03, 0.05, 1.92, metal, sx, 0.33, 0));
    // 床垫 + 毯子（两边垂下）+ 翻出的被头 + 枕头
    bed.add(this.rbox(0.94, 0.17, 1.88, 0.05, sheet, 0, 0.43, 0, true));
    bed.add(this.rbox(0.98, 0.05, 1.25, 0.02, blanket, 0, 0.53, 0.3, true));
    for (const sx of [-0.49, 0.49]) bed.add(this.boxNS(0.02, 0.2, 1.25, blanket, sx, 0.45, 0.3));
    bed.add(this.rbox(0.99, 0.035, 0.15, 0.015, sheet, 0, 0.56, -0.3, false));
    bed.add(this.rbox(0.5, 0.13, 0.34, 0.06, this.std({ color: 0xcfc6b0, roughness: 1 }), 0.16, 0.565, -0.72, true));
    bed.position.set(bedX, 0, headZ + 0.95);
    this.scene.add(bed);
    this.blob(bedX, headZ + 0.95, 1.3, 2.3, 0.5);

    // 《玻璃侦探》：床头那本没有作者署名的小说（搁在枕边）
    const book = new THREE.Group();
    book.add(this.box(0.2, 0.035, 0.28, this.std({ color: 0x163025, roughness: 0.55 }), 0, 0, 0));
    const gdCover = this.mesh(
      new THREE.PlaneGeometry(0.196, 0.276),
      this.std({ map: this.coverTex("#163025", "#d8c79a", ["THE GLASS", "DETECTIVE"], null, "#b89a5a"), roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
      0,
      0.0182,
      0
    );
    gdCover.rotation.x = -Math.PI / 2;
    book.add(gdCover);
    book.position.set(bedX - 0.28, 0.535, headZ + 0.1);
    book.rotation.y = -0.4;
    this.scene.add(book);
    const bHaloMat = this.track(new THREE.MeshBasicMaterial({ color: 0x7ad0c0, transparent: true, opacity: 0 }));
    const bHalo = new THREE.Mesh(this.track(new THREE.PlaneGeometry(0.4, 0.46)), bHaloMat);
    bHalo.rotation.x = -Math.PI / 2;
    bHalo.position.set(bedX - 0.28, 0.56, headZ + 0.1);
    this.scene.add(bHalo);
    this.registerInteractable({
      root: book,
      type: "books",
      label: "The Glass Detective on the nightstand — a novel with no author’s name",
      onPick: () => {
        this.playOneShot("book", 0.8);
        this.cb.onOpenReading("nested");
      },
      highlight: (on) => (bHaloMat.opacity = on ? 0.5 : 0),
    });

    // 床头柜（在床与房间中央之间）：柜身、抽屉、小门、四只矮脚
    const nsX = bedX - 0.85;
    const nsZ = headZ;
    const ns = new THREE.Group();
    ns.add(this.box(0.44, 0.42, 0.4, wood, 0, 0.27, 0));
    ns.add(this.rbox(0.48, 0.035, 0.44, 0.008, wood, 0, 0.5025, 0, true));
    for (const lx of [-0.19, 0.19]) for (const lz of [-0.17, 0.17]) ns.add(this.boxNS(0.04, 0.07, 0.04, wood, lx, 0.035, lz));
    const nsFace = this.std({ color: 0x33291f, roughness: 0.7 });
    ns.add(this.boxNS(0.38, 0.11, 0.012, nsFace, 0, 0.41, 0.204));
    ns.add(this.boxNS(0.38, 0.22, 0.012, nsFace, 0, 0.21, 0.204));
    for (const ky of [0.41, 0.24]) {
      const nsKnob = new THREE.Mesh(this.track(new THREE.SphereGeometry(0.018, 10, 10)), metal);
      nsKnob.position.set(ky === 0.41 ? 0 : 0.15, ky, 0.22);
      ns.add(nsKnob);
    }
    ns.position.set(nsX, 0, nsZ);
    this.scene.add(ns);
    this.blob(nsX, nsZ, 0.7, 0.65, 0.45);

    // 润喉糖瓶（母亲给的）：玻璃瓶、纸标签、红盖，里面一把白色小圆片
    const bottle = new THREE.Group();
    const glassMat = this.std({ color: 0xc9d6d2, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.42, depthWrite: false });
    const profile = [
      [0.0, 0.0], [0.041, 0.0], [0.045, 0.006], [0.045, 0.1], [0.038, 0.118], [0.024, 0.126], [0.023, 0.142], [0.0, 0.142],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    bottle.add(this.mesh(new THREE.LatheGeometry(profile, 24), glassMat, 0, 0, 0));
    const pillMat = this.std({ color: 0xf4f1ea, roughness: 0.6 });
    const pillGeo = this.track(new THREE.CylinderGeometry(0.011, 0.011, 0.005, 12));
    for (let i = 0; i < 16; i++) {
      const p = new THREE.Mesh(pillGeo, pillMat);
      const a = Math.random() * Math.PI * 2,
        r = Math.random() * 0.028;
      p.position.set(Math.cos(a) * r, 0.006 + (i % 5) * 0.006 + Math.random() * 0.003, Math.sin(a) * r);
      p.rotation.set(Math.random() * 0.8, Math.random() * 3, Math.random() * 0.8);
      bottle.add(p);
    }
    const label = this.mesh(
      new THREE.CylinderGeometry(0.0458, 0.0458, 0.055, 32, 1, true, -Math.PI * 0.55, Math.PI * 1.1),
      this.std({ map: this.lozengeLabelTex(), roughness: 0.85 }),
      0,
      0.055,
      0
    );
    label.rotation.y = -0.6;
    bottle.add(label);
    bottle.add(this.mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.024, 20), this.std({ color: 0x7a1c1c, roughness: 0.6 }), 0, 0.148, 0, true));
    bottle.position.set(nsX - 0.1, 0.52, nsZ);
    this.scene.add(bottle);
    const pickBottle = new THREE.Mesh(this.track(new THREE.BoxGeometry(0.16, 0.22, 0.16)), this.track(new THREE.MeshBasicMaterial({ visible: false })));
    pickBottle.position.set(nsX - 0.1, 0.62, nsZ);
    this.scene.add(pickBottle);
    this.registerInteractable({
      root: pickBottle,
      type: "lozenge",
      label: "Maple Leaf Throat Lozenges · the bottle Mother pressed into your hand",
      onPick: () => {
        this.playOneShot("drug");
        // 拿起来晃了晃，圆片在瓶里响
        this.tween(0.7, (k) => {
          const s = (1 - k) * Math.sin(k * Math.PI * 7);
          bottle.rotation.z = s * 0.14;
          bottle.rotation.x = s * 0.06;
          bottle.position.y = 0.52 + Math.sin(k * Math.PI) * 0.03;
        });
        this.emitCaption(
          "Peppermint, and honestly sweet—the plain, straightforward sweetness only old-fashioned candy has.\nMother said, “Your throat’s been bothering you lately, and a new place will only make it worse. Take these.”\n—But here, too, every night after dinner, they hand out a little white tablet. Two peppermints, one deeper and one lighter. You never looked closely into that slight difference.",
          14600
        );
      },
      glow: [bottle],
    });

    // 闹钟（两只铃铛、表盘、秒针在走）+ 一杯水
    const clock = new THREE.Group();
    const body = this.mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.035, 28), metal, 0, 0, 0, true);
    body.rotation.x = Math.PI / 2;
    clock.add(body);
    const face = this.mesh(new THREE.CircleGeometry(0.045, 28), this.std({ map: this.clockFaceTex(), roughness: 0.6 }), 0, 0, 0.0181);
    clock.add(face);
    const bezel = this.mesh(new THREE.TorusGeometry(0.047, 0.004, 6, 28), this.std({ color: 0x9a8a6a, roughness: 0.3, metalness: 0.8 }), 0, 0, 0.018);
    clock.add(bezel);
    for (const s of [-1, 1]) {
      const bell = this.mesh(new THREE.SphereGeometry(0.026, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), metal, s * 0.032, 0.05, 0);
      bell.rotation.z = -s * 0.5;
      clock.add(bell);
      const foot = this.mesh(new THREE.CylinderGeometry(0.006, 0.004, 0.02, 6), metal, s * 0.03, -0.058, 0);
      foot.rotation.z = s * 0.4;
      clock.add(foot);
    }
    const hand = new THREE.Group();
    hand.add(this.mesh(new THREE.BoxGeometry(0.0012, 0.04, 0.0008), this.std({ color: 0x8a1c1c, roughness: 0.5 }), 0, 0.016, 0));
    hand.position.set(0, 0, 0.0196);
    clock.add(hand);
    this.secondHand = hand;
    clock.position.set(nsX + 0.12, 0.588, nsZ + 0.02);
    clock.rotation.y = -0.35;
    this.scene.add(clock);
    const glass = new THREE.Mesh(this.track(new THREE.CylinderGeometry(0.035, 0.03, 0.09, 18, 1, true)), this.std({ color: 0xafc0c4, roughness: 0.1, transparent: true, opacity: 0.38, depthWrite: false }));
    glass.position.set(nsX + 0.12, 0.565, nsZ - 0.14);
    this.scene.add(glass);
    this.scene.add(this.mesh(new THREE.CylinderGeometry(0.0315, 0.029, 0.055, 18), this.std({ color: 0x8fa8b0, roughness: 0.05, transparent: true, opacity: 0.35, depthWrite: false }), nsX + 0.12, 0.5475, nsZ - 0.14));

    // 床边一双旧拖鞋
    const slipper = this.std({ color: 0x3a2a22, roughness: 0.95 });
    for (const [sx, sz, ry] of [[1.27, -1.05, 0.25], [1.29, -0.88, 0.1]]) {
      const sl = this.rbox(0.11, 0.035, 0.27, 0.017, slipper, sx, 0.018, sz, false);
      sl.rotation.y = ry;
      this.scene.add(sl);
    }
  }

  // ====================================================================
  // 衣柜 + 父亲的皮箱
  // ====================================================================
  private buildWardrobeAndCase() {
    const woodT = this.woodTex();
    const wood = this.std({ color: 0x4a3320, roughness: 0.78, map: woodT, bumpMap: woodT, bumpScale: 0.8 });
    const inner = this.std({ color: 0x4a3322, roughness: 0.9 });
    const panel = this.std({ color: 0x3a2818, roughness: 0.7, map: woodT });
    const metal = this.std({ color: 0x2a1c10, roughness: 0.5, metalness: 0.4 });
    const brass = this.std({ color: 0x9a7a44, roughness: 0.35, metalness: 0.75 });

    // 衣柜（西墙北端）：空心柜体 + 两扇会开的门，里面是七件照颜色叠好的衬衫、两条挂着的长裤、一套睡衣
    const wx = -RX + 0.32;
    const wz = ZN + 0.65;
    const WD = 0.6, WW = 1.05, WH = 2.05;
    const wd = new THREE.Group();
    wd.add(this.box(0.02, WH, WW, inner, -WD / 2 + 0.01, WH / 2, 0)); // 背板
    for (const s of [-1, 1]) wd.add(this.box(WD, WH, 0.025, wood, 0, WH / 2, s * (WW / 2 - 0.0125))); // 侧板
    wd.add(this.box(WD, 0.03, WW, wood, 0, WH - 0.015, 0)); // 顶板
    wd.add(this.box(WD - 0.02, 0.03, WW - 0.05, inner, -0.01, 0.13, 0)); // 底板
    wd.add(this.box(WD + 0.02, 0.12, WW + 0.02, wood, 0.01, 0.06, 0)); // 底座
    wd.add(this.box(WD + 0.08, 0.06, WW + 0.08, wood, 0.03, WH + 0.03, 0)); // 檐口
    wd.add(this.box(WD - 0.04, 0.02, WW - 0.06, inner, -0.02, 1.62, 0)); // 搁板
    const rod = this.mesh(new THREE.CylinderGeometry(0.01, 0.01, WW - 0.06, 8), metal, -0.03, 1.52, 0);
    rod.rotation.x = Math.PI / 2;
    wd.add(rod);
    // 七件衬衫，照颜色叠成一摞
    const shirtCols = [0xece7da, 0xc9d6e4, 0xd8d2c0, 0xb8c4b0, 0xe2d8c8, 0xa9b8cc, 0xf2efe6];
    shirtCols.forEach((c, i) => {
      const sh = this.rbox(0.27, 0.026, 0.3, 0.008, this.std({ color: c, roughness: 1 }), -0.05 + (Math.random() - 0.5) * 0.01, 1.645 + i * 0.028, -0.2, false);
      sh.rotation.y = (Math.random() - 0.5) * 0.06;
      wd.add(sh);
    });
    // 两条长裤挂在衣架上
    const hangerMat = this.std({ color: 0x5a3d22, roughness: 0.6 });
    for (const [tz, col] of [[0.12, 0x2f2f33], [0.3, 0x4a3f33]] as [number, number][]) {
      const hanger = this.mesh(new THREE.TorusGeometry(0.11, 0.006, 6, 18, Math.PI), hangerMat, -0.03, 1.43, tz);
      hanger.rotation.y = Math.PI / 2;
      wd.add(hanger);
      wd.add(this.boxNS(0.006, 0.08, 0.006, metal, -0.03, 1.49, tz));
      wd.add(this.rbox(0.035, 0.78, 0.26, 0.012, this.std({ color: col, roughness: 1 }), -0.03, 1.03, tz, false));
    }
    // 一套睡衣，叠着放在底板上
    wd.add(this.rbox(0.3, 0.06, 0.32, 0.015, this.std({ color: 0x8c9aa8, roughness: 1 }), -0.05, 0.175, 0.2, false));
    // 两扇门：铰链在外侧，往屋里开
    const doors: THREE.Group[] = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(WD / 2, 0, s * (WW / 2));
      const leafW = WW / 2 - 0.005;
      pivot.add(this.box(0.025, WH - 0.17, leafW, wood, 0.0125, 0.12 + (WH - 0.17) / 2, -s * leafW / 2));
      for (const [py, ph] of [[1.42, 0.72], [0.6, 0.6]]) pivot.add(this.boxNS(0.008, ph, leafW - 0.14, panel, 0.029, py, -s * leafW / 2));
      const handle = this.mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.13, 8), brass, 0.045, 1.05, -s * (leafW - 0.05));
      pivot.add(handle);
      for (const hy of [0.99, 1.11]) pivot.add(this.boxNS(0.022, 0.01, 0.01, brass, 0.034, hy, -s * (leafW - 0.05)));
      if (s === 1) pivot.add(this.boxNS(0.006, 0.05, 0.026, brass, 0.03, 0.93, -(leafW - 0.02))); // 锁眼
      wd.add(pivot);
      doors.push(pivot);
    }
    wd.position.set(wx, 0, wz);
    this.scene.add(wd);
    this.blob(wx + 0.05, wz, 0.85, 1.25, 0.55);
    let doorsBusy = false;
    this.registerInteractable({
      root: wd,
      type: "wardrobe",
      label: "Wardrobe",
      onPick: () => {
        this.playOneShot("case");
        this.emitCaption(
          "Seven shirts folded by color and laid inside, two pairs of trousers hung up, one change of pajamas.\nA man’s entire belongings, it turns out, fit so easily into a wardrobe that is not his own.",
          7700
        );
        // 门打开，看一眼里面的东西，过一会儿再关上（人站得太近就只开一道缝）
        if (doorsBusy) return;
        doorsBusy = true;
        const room = this.pos.x - (wx + WD / 2);
        const open = room > 0.75 ? 1.2 : 0.55;
        const setAngle = (a: number) => {
          doors[0].rotation.y = a; // 北门（铰链在 -z）
          doors[1].rotation.y = -a; // 南门（铰链在 +z）
        };
        this.tween(0.9, (k) => setAngle(open * easeOut(k)), () =>
          this.tween(5.2, () => {}, () =>
            this.tween(1.1, (k) => setAngle(open * (1 - easeInOut(k))), () => {
              setAngle(0);
              doorsBusy = false;
            })
          )
        );
      },
    });

    // 父亲的棕色皮箱（搁在地上，床尾附近）：圆角箱体、两道皮带与铜扣、铜包角、提手焐得发亮发暗。
    // 箱底是空心的，箱盖绕后沿的合页翻开：里头是褪了色的里衬、两条松着的捆衣带，盖子内侧的侧兜里插着入院时签的文件。
    const caseX = -0.6,
      caseZ = -0.2;
    const leather = this.std({ color: 0x5a3618, roughness: 0.5 });
    const strapMat = this.std({ color: 0x3e2410, roughness: 0.5 });
    const worn = this.std({ color: 0x2b1607, roughness: 0.22 }); // 被手掌焐得发亮、发软，颜色比别处深
    const linT = this.liningTex();
    const lining = this.std({ map: linT, color: 0x9c5c50, roughness: 0.95 }); // 褪了色的酒红棉布
    const pocketMat = this.std({ map: linT, color: 0x84483e, roughness: 0.95 });
    const tape = this.std({ color: 0x4a2a22, roughness: 0.9 }); // 松紧带、拉带
    const cotton = this.std({ color: 0x9a8268, roughness: 0.95 }); // 捆衣带（本白的棉带子，旧得发黄）
    const docT = this.docTex();
    const paperA = this.std({ map: docT, roughness: 0.9 });
    const paperB = this.std({ map: docT, color: 0xe6dccb, roughness: 0.9 });
    const keyhole = this.std({ color: 0x140d07, roughness: 0.6 });
    const CHW = 0.33, CHD = 0.22; // 半长、半宽
    const CR = 0.03, CT = 0.016, CRIN = 0.07; // 外圆角、壁厚、内圆角
    const HB = 0.15, HL = 0.05; // 箱底高、箱盖高（合缝在 y=0.15）
    const sc = new THREE.Group();
    const cornerGeo = this.track(new THREE.SphereGeometry(0.02, 10, 8));
    const corner = (parent: THREE.Object3D, x: number, y: number, z: number) => {
      const c = new THREE.Mesh(cornerGeo, brass);
      c.position.set(x, y, z);
      c.scale.set(1, 0.8, 1);
      parent.add(c);
    };

    // —— 箱底 ——
    sc.add(this.mesh(this.trayGeo(CHW, CHD, CR, CT, CRIN, HB, 0.012, 0.004), leather, 0, 0, 0, true));
    sc.add(this.mesh(this.trayGeo(CHW - CT, CHD - CT, CRIN, 0.003, CRIN - 0.003, HB - 0.02, 0.003, 0), lining, 0, 0.012, 0)); // 里衬
    sc.add(this.mesh(this.trayGeo(CHW + 0.002, CHD + 0.002, CR + 0.002, 0.006, CR - 0.004, 0.004, 0, 0.0015), strapMat, 0, HB - 0.004, 0)); // 口沿的深色包边
    for (const bx of [-0.2, 0.2]) {
      sc.add(this.boxNS(0.05, HB, 0.004, strapMat, bx, HB / 2, 0.222)); // 皮带（前）
      sc.add(this.boxNS(0.05, HB, 0.004, strapMat, bx, HB / 2, -0.222)); // 皮带（后）
      sc.add(this.boxNS(0.058, 0.034, 0.008, brass, bx, 0.15, 0.226)); // 铜扣
    }
    // 两把锁扣：锁座钉在箱底上，扣片绕下沿往外翻
    const latches: THREE.Group[] = [];
    for (const lx of [-0.09, 0.09]) {
      sc.add(this.boxNS(0.044, 0.02, 0.004, brass, lx, 0.128, 0.222)); // 锁座
      const lg = new THREE.Group();
      lg.position.set(lx, 0.134, 0.2235);
      lg.add(this.boxNS(0.032, 0.034, 0.007, brass, 0, 0.017, 0.0035)); // 扣片
      lg.add(this.boxNS(0.005, 0.009, 0.002, keyhole, 0, 0.013, 0.0075)); // 锁眼
      sc.add(lg);
      latches.push(lg);
    }
    // 后沿的两片合页
    for (const hx of [-0.12, 0.12]) {
      const barrel = this.mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.04, 8), brass, hx, HB, -CHD - 0.003);
      barrel.rotation.z = Math.PI / 2;
      sc.add(barrel);
      sc.add(this.boxNS(0.04, 0.02, 0.002, brass, hx, HB - 0.012, -CHD - 0.001));
    }
    for (const cx of [-0.31, 0.31]) for (const cz of [-0.2, 0.2]) corner(sc, cx, 0.02, cz);
    // 箱底两条捆衣带：一头缝在后壁上，另一头带着小铜扣，松松地搭在箱底（中间拐一点弯，看得出是软的）
    for (const [tx, r1, r2] of [[-0.15, 0.03, 0.12], [0.16, -0.04, -0.13]]) {
      sc.add(this.boxNS(0.026, 0.09, 0.003, cotton, tx, 0.06, -CHD + CT + 0.0045));
      const z0 = -CHD + CT + 0.003;
      const x1 = tx + 0.15 * Math.sin(r1), z1 = z0 + 0.15 * Math.cos(r1);
      const x2 = x1 + 0.15 * Math.sin(r2), z2 = z1 + 0.15 * Math.cos(r2);
      for (const [ax, az, bx2, bz, h] of [[tx, z0, x1, z1, 0.0165], [x1, z1, x2, z2, 0.0168]]) {
        const seg = this.boxNS(0.026, 0.003, 0.152, cotton, (ax + bx2) / 2, h, (az + bz) / 2);
        seg.rotation.y = Math.atan2(bx2 - ax, bz - az);
        sc.add(seg);
      }
      const bk = this.boxNS(0.034, 0.004, 0.022, brass, x2, 0.019, z2);
      bk.rotation.y = r2;
      sc.add(bk);
    }

    // —— 箱盖：铰在后沿上（lid 的原点就是合页轴），往后翻开 ——
    const lid = new THREE.Group();
    lid.position.set(0, HB, -CHD);
    const lidShell = this.trayGeo(CHW, CHD, CR, CT, CRIN, HL, 0.012, 0.004);
    lidShell.rotateX(Math.PI);
    lidShell.translate(0, HL, CHD);
    lid.add(this.mesh(lidShell, leather, 0, 0, 0, true));
    const lidLining = this.trayGeo(CHW - CT, CHD - CT, CRIN, 0.003, CRIN - 0.003, HL - 0.018, 0.003, 0);
    lidLining.rotateX(Math.PI);
    lidLining.translate(0, HL - 0.012, CHD);
    lid.add(this.mesh(lidLining, lining));
    const lidPiping = this.trayGeo(CHW + 0.002, CHD + 0.002, CR + 0.002, 0.006, CR - 0.004, 0.004, 0, 0.0015);
    lidPiping.translate(0, 0, CHD);
    lid.add(this.mesh(lidPiping, strapMat));
    for (const bx of [-0.2, 0.2]) {
      lid.add(this.boxNS(0.05, 0.004, 0.446, strapMat, bx, HL + 0.001, CHD)); // 皮带（顶）
      lid.add(this.boxNS(0.05, HL, 0.004, strapMat, bx, HL / 2, 2 * CHD + 0.002)); // 皮带（前）
      lid.add(this.boxNS(0.05, HL, 0.004, strapMat, bx, HL / 2, -0.002)); // 皮带（后）
    }
    for (const lx of [-0.09, 0.09]) lid.add(this.boxNS(0.018, 0.012, 0.003, brass, lx, 0.012, 2 * CHD + 0.0015)); // 锁鼻（合上时藏在扣片后面）
    for (const hx of [-0.12, 0.12]) lid.add(this.boxNS(0.04, 0.02, 0.002, brass, hx, 0.012, -0.001)); // 合页（盖上那片）
    for (const cx of [-0.31, 0.31]) for (const cz of [-0.2, 0.2]) corner(lid, cx, 0.03, cz + CHD);
    const handleCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.075, HL, 0.38), new THREE.Vector3(0, HL + 0.07, 0.38), new THREE.Vector3(0.075, HL, 0.38));
    lid.add(this.mesh(new THREE.TubeGeometry(handleCurve, 16, 0.012, 8, false), worn, 0, 0, 0, true));
    for (const hx of [-0.075, 0.075]) lid.add(this.boxNS(0.03, 0.02, 0.03, brass, hx, HL + 0.005, 0.38));
    // 盖子内侧的侧兜（兜口朝着盖子前沿——开着箱子时朝上），入院时签的那几页文件插在里头，露出一截
    lid.add(this.rbox(0.5, 0.004, 0.18, 0.002, pocketMat, 0, 0.029, 0.12, false)); // 兜面
    lid.add(this.boxNS(0.5, 0.006, 0.01, tape, 0, 0.0285, 0.209)); // 兜口的松紧带
    for (const [px, pr, pm] of [[-0.07, 0.04, paperA], [0.05, -0.07, paperB]] as [number, number, THREE.Material][]) {
      const paper = this.boxNS(0.2, 0.0015, 0.15, pm, px, 0.0325, 0.2);
      paper.rotation.y = pr;
      lid.add(paper);
    }
    sc.add(lid);

    // 两根拉住箱盖的布条：一头缝在箱底侧壁上，一头缝在盖子侧壁上，箱盖开到头时绷直
    const stayGeo = this.track(new THREE.BoxGeometry(0.002, 1, 0.016));
    const stays = [-1, 1].map((s) => {
      const m = new THREE.Mesh(stayGeo, tape);
      m.receiveShadow = true;
      sc.add(m);
      return { m, x: s * (CHW - CT - 0.005) };
    });
    const setLid = (a: number) => {
      lid.rotation.x = a;
      const ay = HB + 0.012 * Math.cos(a) - 0.14 * Math.sin(a); // 盖子上那一头（随盖子转）
      const az = -CHD + 0.012 * Math.sin(a) + 0.14 * Math.cos(a);
      const by = 0.1, bz = -0.08; // 箱底上那一头
      for (const st of stays) {
        st.m.position.set(st.x, (ay + by) / 2, (az + bz) / 2);
        st.m.scale.y = Math.hypot(ay - by, az - bz);
        st.m.rotation.x = Math.atan2(az - bz, ay - by);
      }
    };
    setLid(0);
    const LATCH = 1.0; // 扣片弹开的角度
    const setLatch = (a: number) => latches.forEach((g) => (g.rotation.x = a));

    // 开箱时扬起的一小团灰：从箱口和箱底飘起来，在灯光里亮一下，慢慢散开、沉下去
    const PN = 46;
    const dPos = new Float32Array(PN * 3);
    const d0 = new Float32Array(PN * 3);
    const dVel = new Float32Array(PN * 3);
    const dSeed = new Float32Array(PN);
    const dGeo = this.track(new THREE.BufferGeometry());
    dGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
    const dMat = this.track(
      new THREE.PointsMaterial({ color: 0xffe2b8, size: 0.014, map: this.softSpotTex(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    const motes = new THREE.Points(dGeo, dMat);
    // 一小片灰雾（很多颗、都很淡，叠在一起才像一团），让那一下「噗」有点体积
    const CN = 28;
    const cPos = new Float32Array(CN * 3);
    const c0 = new Float32Array(CN * 3);
    const cVel = new Float32Array(CN * 3);
    const cGeo = this.track(new THREE.BufferGeometry());
    cGeo.setAttribute("position", new THREE.BufferAttribute(cPos, 3));
    const cMat = this.track(new THREE.PointsMaterial({ color: 0xb09a7c, size: 0.12, map: this.softSpotTex(), transparent: true, opacity: 0, depthWrite: false }));
    const haze = new THREE.Points(cGeo, cMat);
    for (const pts of [motes, haze]) {
      pts.visible = false;
      pts.frustumCulled = false;
      pts.raycast = () => {}; // 不挡准星
      sc.add(pts);
    }
    const spawnDust = () => {
      for (let i = 0; i < PN; i++) {
        const r = Math.random();
        const j = i * 3;
        if (r < 0.45) {
          // 前沿的缝里
          d0[j] = (Math.random() - 0.5) * 0.6;
          d0[j + 1] = HB + 0.004;
          d0[j + 2] = CHD - 0.01;
          dVel[j] = (Math.random() - 0.5) * 0.06;
          dVel[j + 2] = 0.05 + Math.random() * 0.09;
        } else if (r < 0.72) {
          // 两侧的缝里
          const s = Math.random() < 0.5 ? -1 : 1;
          d0[j] = s * (CHW - 0.01);
          d0[j + 1] = HB + 0.004;
          d0[j + 2] = (Math.random() - 0.3) * 0.4;
          dVel[j] = s * (0.04 + Math.random() * 0.08);
          dVel[j + 2] = (Math.random() - 0.5) * 0.05;
        } else {
          // 箱子里头
          d0[j] = (Math.random() - 0.5) * 0.52;
          d0[j + 1] = 0.03 + Math.random() * 0.1;
          d0[j + 2] = (Math.random() - 0.5) * 0.34;
          dVel[j] = (Math.random() - 0.5) * 0.05;
          dVel[j + 2] = (Math.random() - 0.5) * 0.05;
        }
        dVel[j + 1] = 0.12 + Math.random() * 0.26;
        dSeed[i] = Math.random() * Math.PI * 2;
      }
      for (let i = 0; i < CN; i++) {
        const j = i * 3;
        const front = i < CN * 0.55;
        const side = i % 2 ? 1 : -1;
        c0[j] = front ? (Math.random() - 0.5) * 0.56 : side * (CHW - 0.03);
        c0[j + 1] = HB + Math.random() * 0.03;
        c0[j + 2] = front ? CHD - 0.03 : (Math.random() - 0.4) * 0.36;
        cVel[j] = front ? (Math.random() - 0.5) * 0.05 : side * (0.03 + Math.random() * 0.04);
        cVel[j + 1] = 0.05 + Math.random() * 0.08;
        cVel[j + 2] = front ? 0.03 + Math.random() * 0.05 : (Math.random() - 0.5) * 0.03;
      }
      motes.visible = haze.visible = true;
    };
    const DUST_T = 3.2;
    const stepDust = (k: number) => {
      const t = k * DUST_T;
      const e = (1 - Math.exp(-1.7 * t)) / 1.7; // 带阻尼的位移：先冲一下，很快就慢下来
      for (let i = 0; i < PN; i++) {
        const j = i * 3;
        const s = dSeed[i];
        dPos[j] = d0[j] + dVel[j] * e + Math.sin(t * 1.9 + s) * 0.012 * t;
        dPos[j + 1] = d0[j + 1] + dVel[j + 1] * e - 0.012 * t * t;
        dPos[j + 2] = d0[j + 2] + dVel[j + 2] * e + Math.cos(t * 1.6 + s) * 0.012 * t;
      }
      for (let i = 0; i < CN * 3; i++) cPos[i] = c0[i] + cVel[i] * e * 1.3;
      (dGeo.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
      (cGeo.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
      const light = 0.5 + 0.5 * this.lampLevel;
      dMat.opacity = 0.9 * light * Math.min(1, k / 0.05) * (1 - easeInOut(Math.max(0, (k - 0.3) / 0.7)));
      cMat.opacity = 0.075 * light * Math.min(1, k / 0.08) * (1 - easeInOut(Math.max(0, (k - 0.12) / 0.6)));
      cMat.size = 0.12 + 0.2 * easeOut(k);
    };

    sc.position.set(caseX, 0, caseZ);
    sc.rotation.y = 0.5;
    this.scene.add(sc);
    this.blob(caseX, caseZ, 0.85, 0.62, 0.55, -0.5);
    let caseBusy = false;
    this.registerInteractable({
      root: sc,
      type: "suitcase",
      label: "Father’s brown suitcase",
      onPick: () => {
        this.playOneShot("case");
        // 打开看看：两把锁扣先「咔」地弹开，箱盖绕着合页翻起来，扬起一小团灰；过一会儿再合上、扣好
        if (!caseBusy) {
          caseBusy = true;
          this.tween(0.16, (k) => setLatch(LATCH * easeOut(k)), () => {
            spawnDust();
            this.tween(DUST_T, stepDust, () => (motes.visible = haze.visible = false), true);
            this.tween(1.4, (k) => setLid(-1.85 * easeOutBack(Math.pow(k, 1.3))), () =>
              this.wait(8, () =>
                this.tween(0.9, (k) => setLid(-1.85 * (1 - k * k)), () =>
                  this.tween(0.3, (k) => setLid(-0.06 * Math.sin(Math.PI * k)), () => {
                    setLid(0);
                    this.tween(0.12, (k) => setLatch(LATCH * (1 - k)), () => {
                      setLatch(0);
                      caseBusy = false;
                    });
                  })
                )
              )
            );
          });
        }
        this.emitCaption(
          "The leather along the handle has been warmed by Father’s palm until it is glossy and soft and darker than the rest—the shape of one hand gripping it day after day.\nNow when I take hold of it, my hand fits exactly into that shape, like two generations of hands completing, over a strip of leather, the wordless handshake they never managed while he was alive.\nFather went in 1941, taken by a disease of the lungs whose name I have never managed to remember.",
          17200
        );
      },
    });
  }

  // ====================================================================
  // 脸盆架 + 镜子
  // ====================================================================
  private buildWashstand() {
    const woodT = this.woodTex();
    const wood = this.std({ color: 0x4a3320, roughness: 0.65, map: woodT, bumpMap: woodT, bumpScale: 0.8 });
    const panel = this.std({ color: 0x3a2818, roughness: 0.7, map: woodT });
    const porcelain = this.std({ color: 0xddd8cc, roughness: 0.25 });
    const marble = this.std({ color: 0xcfc8bc, roughness: 0.3 });
    const metal = this.std({ color: 0x8a6a44, roughness: 0.4, metalness: 0.6 });
    const wx = -RX + 0.28;
    const wz = ZS - 0.9;
    // 脸盆架：柜身 + 小门 + 大理石台面；瓷脸盆里立着一只水壶；侧面横杆上搭一条毛巾；一块肥皂
    const ws = new THREE.Group();
    ws.add(this.box(0.5, 0.8, 0.5, wood, 0, 0.4, 0));
    ws.add(this.boxNS(0.008, 0.5, 0.38, panel, 0.252, 0.4, 0));
    const wsKnob = this.mesh(new THREE.SphereGeometry(0.016, 10, 10), metal, 0.262, 0.42, 0.15);
    ws.add(wsKnob);
    ws.add(this.rbox(0.56, 0.04, 0.56, 0.01, marble, 0.01, 0.82, 0, true));
    const basinProfile = [
      [0.0, 0.0], [0.1, 0.0], [0.16, 0.03], [0.2, 0.085], [0.215, 0.1], [0.21, 0.106], [0.19, 0.092], [0.15, 0.035], [0.09, 0.014], [0.0, 0.014],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    ws.add(this.mesh(new THREE.LatheGeometry(basinProfile, 32), porcelain, 0, 0.84, 0, true));
    const ewerProfile = [
      [0.0, 0.0], [0.058, 0.0], [0.074, 0.04], [0.07, 0.12], [0.052, 0.17], [0.058, 0.2], [0.076, 0.218], [0.07, 0.224], [0.05, 0.208], [0.044, 0.17], [0.06, 0.12], [0.064, 0.04], [0.05, 0.012], [0.0, 0.012],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const ewer = new THREE.Group();
    ewer.add(this.mesh(new THREE.LatheGeometry(ewerProfile, 28), porcelain, 0, 0, 0, true));
    const ewerHandle = this.mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 14, Math.PI * 1.1), porcelain, -0.07, 0.13, 0);
    ewerHandle.rotation.z = Math.PI * 0.45;
    ewer.add(ewerHandle);
    ewer.position.set(0.03, 0.854, 0.02);
    ewer.rotation.y = 0.6;
    ws.add(ewer);
    // 毛巾杆 + 毛巾（搭在朝南的一侧）
    for (const tx of [-0.2, 0.2]) ws.add(this.boxNS(0.02, 0.02, 0.06, metal, tx, 0.7, 0.27));
    const towelBar = this.mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.44, 8), metal, 0, 0.7, 0.3);
    towelBar.rotation.z = Math.PI / 2;
    ws.add(towelBar);
    const towel = this.std({ color: 0xe4ddcc, roughness: 1 });
    ws.add(this.rbox(0.3, 0.42, 0.012, 0.006, towel, 0.02, 0.5, 0.312, false));
    ws.add(this.boxNS(0.3, 0.03, 0.013, this.std({ color: 0x7a2a22, roughness: 1 }), 0.02, 0.36, 0.313));
    ws.add(this.rbox(0.075, 0.025, 0.048, 0.01, this.std({ color: 0xe8e0c8, roughness: 0.6 }), -0.17, 0.853, -0.16, false));
    ws.position.set(wx, 0, wz);
    this.scene.add(ws);
    this.blob(wx + 0.03, wz, 0.75, 0.75, 0.5);

    // 墙上的镜子（西墙）：真的会照出房间——只是照不出你自己。旧镜子，边上的银层已经发暗剥落。
    const frameGroup = new THREE.Group();
    frameGroup.add(this.box(0.03, 0.72, 0.52, panel, -RX + 0.02, 1.6, wz)); // 背板
    for (const [fy, fh, fz, fd] of [
      [1.94, 0.05, wz, 0.52],
      [1.26, 0.05, wz, 0.52],
      [1.6, 0.72, wz - 0.235, 0.05],
      [1.6, 0.72, wz + 0.235, 0.05],
    ]) {
      frameGroup.add(this.box(0.05, fh, fd, wood, -RX + 0.05, fy, fz));
    }
    this.scene.add(frameGroup);
    const mirror = new Reflector(this.track(new THREE.PlaneGeometry(0.42, 0.62)), {
      color: 0x8a8c8e,
      textureWidth: 512,
      textureHeight: 768,
      clipBias: 0.003,
      multisample: 0,
    });
    mirror.rotation.y = Math.PI / 2;
    mirror.position.set(-RX + 0.06, 1.6, wz);
    this.scene.add(mirror);
    this.mirror = mirror;
    const tarnish = this.track(new THREE.MeshBasicMaterial({ map: this.tarnishTex(), transparent: true, opacity: 0.55, depthWrite: false }));
    this.tarnishMat = tarnish;
    const tarnishPlane = new THREE.Mesh(this.track(new THREE.PlaneGeometry(0.42, 0.62)), tarnish);
    tarnishPlane.rotation.y = Math.PI / 2;
    tarnishPlane.position.set(-RX + 0.062, 1.6, wz);
    this.scene.add(tarnishPlane);
    this.registerInteractable({
      root: mirror,
      type: "mirror",
      label: "Mirror on the wall · take a look",
      onPick: () =>
        this.emitCaption(
          "In the mirror is me. Or rather, someone who looks like me.\nI have been afraid of this since I was in my teens: you think you own your thoughts, when really you are only a room they rent on their way through—they stay a while, change their clothes, and go, leaving behind something that looks like them to keep you company for the rest of your life.",
          13300
        ),
      glow: [frameGroup],
    });
  }

  // ====================================================================
  // 窗（插销在外侧）+ 窗帘 + 暖气片
  // ====================================================================
  private buildWindow() {
    const trim = this.std({ color: 0x4a3624, roughness: 0.7, map: this.woodTex() });
    const iron = this.std({ color: 0x3a3530, roughness: 0.6, metalness: 0.3 });
    // 玻璃：半透明，能透过它看到外面的雨
    const paneMat = this.std({ color: 0x2a3a4a, emissive: 0x35506e, emissiveIntensity: 0.18, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.22, depthWrite: false });
    const wx = WIN_CX;
    const wy = WIN_CY;
    const wz = ZN + 0.06;

    // 窗框 + 中梃 + 窗台
    const frame = new THREE.Group();
    frame.add(this.box(1.3, 0.1, 0.14, trim, wx, wy + 0.7, wz));
    frame.add(this.box(1.3, 0.1, 0.14, trim, wx, wy - 0.7, wz));
    frame.add(this.box(0.1, 1.5, 0.14, trim, wx - 0.6, wy, wz));
    frame.add(this.box(0.1, 1.5, 0.14, trim, wx + 0.6, wy, wz));
    frame.add(this.box(0.06, 1.4, 0.1, trim, wx, wy, wz)); // 竖中梃
    frame.add(this.box(1.2, 0.06, 0.1, trim, wx, wy, wz)); // 横中梃
    frame.add(this.box(1.4, 0.06, 0.2, trim, wx, wy - 0.78, wz + 0.04)); // 窗台
    this.scene.add(frame);

    const pane = new THREE.Mesh(this.track(new THREE.PlaneGeometry(1.15, 1.4)), paneMat);
    pane.position.set(wx, wy, wz + 0.06);
    this.scene.add(pane);
    this.registerInteractable({
      root: pane,
      type: "window",
      label: "Window · look closer",
      onPick: () =>
        this.emitCaption(
          "There is light behind the glass, but it only shines flat against the surface of the pane and cannot come in.\nYou reach for the window latch—there is none. The latch is on the outside, not the inside.\nLouis said it: “Mr. Banks, the windows here open from the outside.”",
          10400
        ),
      glow: [pane, frame],
    });

    // 玻璃上的雨：一层静止的水珠，一层慢慢往下淌的水痕
    for (const streak of [false, true]) {
      const t = this.glassRainTex(streak);
      t.repeat.set(1.15 / 0.8, 1.4 / 1.6);
      this.dropLayers.push(t);
      const m = new THREE.Mesh(
        this.track(new THREE.PlaneGeometry(1.15, 1.4)),
        this.track(new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: streak ? 0.5 : 0.42, depthWrite: false }))
      );
      m.position.set(wx, wy, wz + (streak ? 0.0605 : 0.061));
      this.scene.add(m);
    }

    // 开合的机关在外侧：玻璃那边看得见一枚铁插销，手却够不着
    const latch = new THREE.Group();
    latch.add(this.boxNS(0.12, 0.035, 0.02, iron, 0, 0, 0));
    latch.add(this.boxNS(0.02, 0.06, 0.02, iron, 0.05, -0.02, 0.0));
    const latchKnob = this.mesh(new THREE.SphereGeometry(0.012, 8, 8), iron, 0.05, -0.05, 0);
    latch.add(latchKnob);
    latch.position.set(wx + 0.12, wy + 0.04, ZN - 0.012);
    this.scene.add(latch);

    // 一点冷光从窗口渗进来
    this.windowLight = new THREE.DirectionalLight(0x9fb6cc, 0.35);
    this.windowLight.position.set(wx, wy + 1, wz - 2);
    (this.windowLight as THREE.DirectionalLight).target.position.set(wx, 0.5, wz + 3);
    this.scene.add((this.windowLight as THREE.DirectionalLight).target);
    this.scene.add(this.windowLight);

    // —— 窗外：风雨夜 ——
    // 暗天幕（在窗洞后面，挡住外面的虚空）；闪电时才看得见远处的屋脊和一棵秃树
    const skyMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.06, 0.08, 0.11), map: this.skyTex(), fog: false });
    this.mats.push(skyMat);
    this.skyMat = skyMat;
    const sky = new THREE.Mesh(this.track(new THREE.PlaneGeometry(4.2, 4.2)), skyMat);
    sky.position.set(WIN_CX, 1.5, ZN - 0.75);
    this.scene.add(sky);

    // 雨：一束往下落的线段，循环复用
    const N = 120;
    const pos = new Float32Array(N * 2 * 3);
    const xMin = WIN_CX - 0.9, xRange = 1.8;
    const yMin = 0.1, yRange = 3.2;
    const zMin = ZN - 0.6, zRange = 0.45;
    const streak = 0.18;
    for (let i = 0; i < N; i++) {
      const x = xMin + Math.random() * xRange;
      const y = yMin + Math.random() * yRange;
      const z = zMin + Math.random() * zRange;
      pos[i * 6 + 0] = x; pos[i * 6 + 1] = y + streak; pos[i * 6 + 2] = z; // 顶
      pos[i * 6 + 3] = x; pos[i * 6 + 4] = y; pos[i * 6 + 5] = z; // 底
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.geoms.push(rainGeo);
    const rainMat = new THREE.LineBasicMaterial({ color: 0xa6bccf, transparent: true, opacity: 0.5, depthWrite: false, fog: false });
    this.mats.push(rainMat);
    const rain = new THREE.LineSegments(rainGeo, rainMat);
    rain.frustumCulled = false;
    this.scene.add(rain);
    this.rain = rain;
    this.rainPos = pos;

    // 窗帘（半拉）：有褶子的布，挂在铜杆上，随窗缝里的风轻轻晃
    const cw = 0.55,
      ch = 1.62;
    const cGeo = this.track(new THREE.PlaneGeometry(cw, ch, 28, 10));
    const cp = cGeo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < cp.count; i++) {
      const x = cp.getX(i);
      const y = cp.getY(i);
      const flare = 1 + (0.5 - y / ch) * 0.35; // 越往下褶子越开
      cp.setZ(i, Math.sin(((x + cw / 2) / cw) * Math.PI * 8) * 0.012 * flare);
    }
    cGeo.computeVertexNormals();
    this.curtainGeo = cGeo;
    this.curtainRest = new Float32Array(cp.array as Float32Array);
    const curtainMat = this.std({ color: 0x6b5236, roughness: 1, side: THREE.DoubleSide });
    const curtain = new THREE.Mesh(cGeo, curtainMat);
    curtain.position.set(wx - 0.52, wy - 0.02, wz + 0.17);
    curtain.receiveShadow = true;
    this.scene.add(curtain);
    this.curtain = curtain;
    const brass = this.std({ color: 0x9a7a44, roughness: 0.35, metalness: 0.75 });
    const rod = this.mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.7, 10), brass, wx - 0.05, wy + 0.82, wz + 0.17);
    rod.rotation.z = Math.PI / 2;
    this.scene.add(rod);
    for (const fx of [wx - 0.9, wx + 0.8]) {
      this.scene.add(this.mesh(new THREE.SphereGeometry(0.025, 10, 8), brass, fx, wy + 0.82, wz + 0.17));
      this.scene.add(this.boxNS(0.015, 0.015, 0.16, brass, fx + (fx < wx ? 0.06 : -0.06), wy + 0.82, wz + 0.09));
    }
    for (let i = 0; i < 6; i++) {
      const ring = this.mesh(new THREE.TorusGeometry(0.018, 0.003, 5, 12), brass, wx - 0.77 + i * 0.1, wy + 0.82, wz + 0.17);
      ring.rotation.y = Math.PI / 2;
      this.scene.add(ring);
    }

    // 暖气片（窗下，铸铁片）+ 进水管和阀门
    const rad = new THREE.Group();
    for (let i = 0; i < 9; i++) rad.add(this.box(0.04, 0.55, 0.16, iron, -0.32 + i * 0.08, 0.32, 0));
    rad.add(this.box(0.76, 0.06, 0.18, iron, 0, 0.6, 0));
    rad.add(this.box(0.76, 0.06, 0.18, iron, 0, 0.05, 0));
    rad.add(this.mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.16, 8), iron, 0.45, 0.08, 0));
    const pipe = this.mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.1, 8), iron, 0.41, 0.08, 0);
    pipe.rotation.z = Math.PI / 2;
    rad.add(pipe);
    rad.add(this.mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 12), this.std({ color: 0x5a2a1a, roughness: 0.6 }), 0.45, 0.18, 0));
    rad.position.set(wx, 0, ZN + 0.18);
    this.scene.add(rad);
  }

  // ====================================================================
  // 门 + 墙上细节 + 吊灯
  // ====================================================================
  private buildDoorAndDetails() {
    const woodT = this.woodTex();
    const wood = this.std({ color: 0x3a2616, roughness: 0.7, map: woodT, bumpMap: woodT, bumpScale: 0.8 });
    const metal = this.std({ color: 0x8a6a44, roughness: 0.4, metalness: 0.6 });
    const dark = this.std({ color: 0x0c0806, roughness: 1 });

    // 门（南墙，居中偏右）：门板分格、合页、门把手、锁眼；门底下一道缝，透着走廊的灯
    const dx = 0.7;
    const door = new THREE.Group();
    door.add(this.box(1.0, 2.4, 0.08, wood, 0, 1.2, 0));
    const doorPanel = this.std({ color: 0x2e1e10, roughness: 0.7 });
    door.add(this.box(0.7, 0.9, 0.02, doorPanel, 0, 1.6, -0.05));
    door.add(this.box(0.7, 0.7, 0.02, doorPanel, 0, 0.75, -0.05));
    for (const [py, ph] of [[1.6, 0.9], [0.75, 0.7]]) {
      // 门板四周的压条
      door.add(this.boxNS(0.74, 0.025, 0.012, wood, 0, py + ph / 2 + 0.012, -0.062));
      door.add(this.boxNS(0.74, 0.025, 0.012, wood, 0, py - ph / 2 - 0.012, -0.062));
      door.add(this.boxNS(0.025, ph + 0.05, 0.012, wood, -0.37, py, -0.062));
      door.add(this.boxNS(0.025, ph + 0.05, 0.012, wood, 0.37, py, -0.062));
    }
    const knobPivot = new THREE.Group();
    knobPivot.position.set(-0.38, 1.1, -0.048);
    const knob = new THREE.Mesh(this.track(new THREE.SphereGeometry(0.045, 16, 14)), metal);
    knob.position.set(0, 0, -0.035);
    knob.scale.set(1, 1, 0.85);
    knobPivot.add(knob);
    knobPivot.add(this.mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.04, 10), metal, 0, 0, -0.012).rotateX(Math.PI / 2));
    door.add(knobPivot);
    const rose = this.mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.008, 18), metal, -0.38, 1.1, -0.044);
    rose.rotation.x = Math.PI / 2;
    door.add(rose);
    door.add(this.boxNS(0.05, 0.11, 0.006, metal, -0.38, 0.95, -0.043)); // 锁眼面板
    door.add(this.boxNS(0.012, 0.03, 0.002, dark, -0.38, 0.94, -0.047)); // 锁眼
    for (const hy of [0.35, 1.2, 2.05]) door.add(this.boxNS(0.03, 0.12, 0.09, metal, 0.495, hy, 0)); // 合页
    // 门框 + 门槛
    this.scene.add(this.box(0.1, 2.5, 0.16, wood, dx - 0.55, 1.25, ZS - 0.05));
    this.scene.add(this.box(0.1, 2.5, 0.16, wood, dx + 0.55, 1.25, ZS - 0.05));
    this.scene.add(this.box(1.2, 0.12, 0.16, wood, dx, 2.5, ZS - 0.05));
    this.scene.add(this.boxNS(1.0, 0.006, 0.12, wood, dx, 0.003, ZS - 0.06));
    door.position.set(dx, 0.02, ZS - 0.06);
    this.scene.add(door);
    // 门缝里漏进来的走廊夜灯：门底下一道暖光
    const slitMat = this.track(new THREE.MeshBasicMaterial({ color: 0xffc27a, fog: false }));
    this.doorSlitMat = slitMat;
    const slit = new THREE.Mesh(this.track(new THREE.PlaneGeometry(0.98, 0.1)), slitMat);
    slit.rotation.x = -Math.PI / 2;
    slit.position.set(dx, 0.0068, ZS - 0.055);
    this.scene.add(slit);
    this.registerInteractable({
      root: door,
      type: "door",
      label: "Door",
      onPick: () => {
        this.playOneShot("door");
        // 手搭上门把手，拧一下，又松开
        this.tween(0.7, (k) => {
          knobPivot.rotation.z = -Math.sin(k * Math.PI) * 0.7;
        });
        this.emitCaption(
          "The door has a lock, and the key is in my hand. Beyond it lies the corridor—its floor the color white becomes after many, many years, trodden thin and pale by the soles of one year after another.\nThree people are sitting in the corridor. But for now, back to the desk.",
          10400
        );
      },
    });
    // 电灯开关
    this.scene.add(this.box(0.08, 0.12, 0.03, this.std({ color: 0xd8cdb4, roughness: 0.6 }), dx + 0.75, 1.2, ZS - 0.04));

    // 门边墙上一排挂钩：一件旧大衣、一顶礼帽
    const hookBoard = this.box(0.62, 0.08, 0.025, wood, 2.0, 1.74, ZS - 0.0125);
    this.scene.add(hookBoard);
    for (const hx of [1.78, 2.0, 2.22]) {
      const hook = this.mesh(new THREE.CylinderGeometry(0.008, 0.006, 0.08, 8), metal, hx, 1.73, ZS - 0.06);
      hook.rotation.x = Math.PI / 2 - 0.5;
      this.scene.add(hook);
    }
    const wool = this.std({ color: 0x2c2a2b, roughness: 1 });
    const coat = new THREE.Group();
    coat.add(this.rbox(0.42, 0.1, 0.13, 0.045, wool, 0, 1.6, 0, true)); // 肩
    const coatBody = this.mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.98, 16, 1), wool, 0, 1.08, 0, true);
    coatBody.scale.set(1, 1, 0.42);
    coat.add(coatBody);
    coat.add(this.rbox(0.16, 0.12, 0.05, 0.02, wool, 0, 1.65, 0.05, false)); // 领
    for (const by of [1.4, 1.25, 1.1]) coat.add(this.mesh(new THREE.SphereGeometry(0.01, 8, 6), this.std({ color: 0x15100c, roughness: 0.4 }), 0, by, 0.11));
    coat.position.set(1.8, 0, ZS - 0.12);
    coat.rotation.y = Math.PI + 0.05;
    this.scene.add(coat);
    const felt = this.std({ color: 0x3a3226, roughness: 0.9 });
    const hat = new THREE.Group();
    hat.add(this.mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.1, 18), felt, 0, 0.05, 0, true));
    hat.add(this.mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.008, 24), felt, 0, 0.004, 0, true));
    hat.add(this.mesh(new THREE.CylinderGeometry(0.091, 0.091, 0.022, 18), this.std({ color: 0x15110d, roughness: 0.7 }), 0, 0.02, 0));
    hat.position.set(2.22, 1.72, ZS - 0.17);
    hat.rotation.set(-0.35, 0, 0.12);
    this.scene.add(hat);

    // 日历（东墙，挂在书桌对面偏右）：页子会被手指拨一下
    const cal = this.box(0.34, 0.46, 0.02, wood, RX - 0.04, 1.7, -1.6);
    cal.rotation.y = -Math.PI / 2;
    this.scene.add(cal);
    const calPivot = new THREE.Group();
    calPivot.position.set(RX - 0.06, 1.9, -1.6);
    calPivot.rotation.set(0, -Math.PI / 2, 0, "YXZ");
    const calPage = new THREE.Mesh(this.track(new THREE.PlaneGeometry(0.3, 0.4)), this.std({ map: this.calendarTex(), roughness: 0.9 }));
    calPage.position.set(0, -0.2, 0);
    calPivot.add(calPage);
    this.scene.add(calPivot);
    this.scene.add(this.mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.03, 6), metal, RX - 0.05, 1.93, -1.6).rotateZ(Math.PI / 2));
    this.registerInteractable({
      root: cal,
      type: "calendar",
      label: "Calendar on the wall",
      onPick: () => {
        this.tween(0.9, (k) => {
          calPivot.rotation.x = -Math.abs(Math.sin(k * Math.PI * 3)) * 0.12 * (1 - k);
        });
        this.emitCaption("Monday, September 7, 1953. The new term.\nThe calendar on the wall is still stopped at the day I came.", 5600);
      },
      glow: [cal, calPage],
    });

    // 一幅褪色的画（南墙，门的左边）
    const pic = this.box(0.66, 0.5, 0.04, wood, -0.7, 1.6, ZS - 0.03);
    this.scene.add(pic);
    const picArt = new THREE.Mesh(this.track(new THREE.PlaneGeometry(0.56, 0.4)), this.std({ map: this.portraitTex(5), roughness: 0.9 }));
    picArt.rotation.y = Math.PI;
    picArt.position.set(-0.7, 1.6, ZS - 0.052);
    this.scene.add(picArt);
    // 挂画的铁丝
    const wire = this.std({ color: 0x5a5048, roughness: 0.5, metalness: 0.6 });
    for (const s of [-1, 1]) {
      const wseg = this.boxNS(0.004, 0.25, 0.004, wire, -0.7 + s * 0.11, 1.95, ZS - 0.02);
      wseg.rotation.z = s * 1.05;
      this.scene.add(wseg);
    }
    this.scene.add(this.mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.02, 6), wire, -0.7, 2.01, ZS - 0.01).rotateX(Math.PI / 2));

    // 小十字架（东墙）
    this.scene.add(this.box(0.03, 0.22, 0.03, wood, RX - 0.05, 1.95, 1.2));
    this.scene.add(this.box(0.03, 0.03, 0.14, wood, RX - 0.05, 1.99, 1.2));

    // 吊灯（中央，很暗，会闪）：天花上一圈石膏灯盘
    this.scene.add(this.mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.025, 28), this.std({ color: 0x3a3127, roughness: 1 }), 0, H - 0.0125, 0.2));
    this.scene.add(this.mesh(new THREE.TorusGeometry(0.16, 0.012, 6, 28), this.std({ color: 0x40362b, roughness: 1 }), 0, H - 0.028, 0.2).rotateX(Math.PI / 2));
    this.scene.add(this.box(0.04, 0.18, 0.04, this.std({ color: 0x1c1812, roughness: 0.8 }), 0, H - 0.1, 0.2));
    const bulbShade = new THREE.Mesh(this.track(new THREE.ConeGeometry(0.16, 0.18, 20, 1, true)), this.std({ color: 0x2a2118, emissive: 0xffca70, emissiveIntensity: 0.7, roughness: 0.8, side: THREE.DoubleSide }));
    bulbShade.position.set(0, H - 0.26, 0.2);
    this.scene.add(bulbShade);
    const ceilLight = new THREE.PointLight(0xffc070, 1.6, 6, 2.2);
    ceilLight.position.set(0, H - 0.3, 0.2);
    this.scene.add(ceilLight);
    this.flickerLights.push({ light: ceilLight, base: 1.6, seed: 41 });

    // 台灯光里浮着的灰尘
    const DN = 150;
    const dpos = new Float32Array(DN * 3);
    const seeds = new Float32Array(DN);
    for (let i = 0; i < DN; i++) {
      dpos[i * 3] = -1.55 + Math.random() * 2.1;
      dpos[i * 3 + 1] = 0.85 + Math.random() * 1.5;
      dpos[i * 3 + 2] = ZN + 0.2 + Math.random() * 1.6;
      seeds[i] = Math.random() * 100;
    }
    const dGeo = new THREE.BufferGeometry();
    dGeo.setAttribute("position", new THREE.BufferAttribute(dpos, 3));
    this.geoms.push(dGeo);
    const dMat = new THREE.PointsMaterial({ color: 0xffe2b0, size: 0.011, map: this.softSpotTex(), transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    this.mats.push(dMat);
    const dust = new THREE.Points(dGeo, dMat);
    dust.frustumCulled = false;
    this.scene.add(dust);
    this.dust = dust;
    this.dustSeed = seeds;
    this.dustMat = dMat;
  }

  // ====================================================================
  // 碰撞
  // ====================================================================
  private defineCollision() {
    this.walk = [{ x0: -RX, x1: RX, z0: ZN, z1: ZS }];
    this.block = [
      { x0: -1.65, x1: 0.15, z0: ZN, z1: ZN + 0.95 }, // 书桌
      { x0: -1.1, x1: -0.4, z0: ZN + 0.85, z1: ZN + 1.45 }, // 椅子
      { x0: RX - 1.05, x1: RX, z0: ZN, z1: ZN + 2.5 }, // 床
      { x0: RX - 1.5, x1: RX - 0.95, z0: ZN + 0.3, z1: ZN + 0.8 }, // 床头柜
      { x0: -RX, x1: -RX + 0.65, z0: ZN, z1: ZN + 1.3 }, // 衣柜
      { x0: -RX, x1: -RX + 0.55, z0: ZS - 1.2, z1: ZS - 0.6 }, // 脸盆架
      { x0: -0.95, x1: -0.25, z0: -0.55, z1: 0.15 }, // 皮箱
      { x0: 0.2, x1: 1.5, z0: ZN, z1: ZN + 0.3 }, // 暖气片/窗台
    ];
  }

  private inRect(x: number, z: number, r: Rect, grow: number) {
    return x >= r.x0 - grow && x <= r.x1 + grow && z >= r.z0 - grow && z <= r.z1 + grow;
  }

  private isWalkable(x: number, z: number) {
    let ok = false;
    for (const r of this.walk) if (this.inRect(x, z, r, -PLAYER_R)) { ok = true; break; }
    if (!ok) return false;
    for (const b of this.block) if (this.inRect(x, z, b, PLAYER_R)) return false;
    return true;
  }

  // ====================================================================
  // 输入
  // ====================================================================
  private bindInput() {
    const el = this.renderer.domElement;
    el.addEventListener("click", this.onClick);
    document.addEventListener("pointerlockchange", this.onPointerLockChange);
    document.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  private onClick = () => {
    if (this.disposed) return;
    if (!this.locked) {
      this.renderer.domElement.requestPointerLock?.();
      this.ensureAudio();
      return;
    }
    this.interact();
  };

  private onPointerLockChange = () => {
    this.locked = document.pointerLockElement === this.renderer.domElement;
    this.cb.onLockChange(this.locked);
    if (!this.locked) this.keys.clear();
    // 第一次进入：此刻音频已由点击解锁，开场旁白逐字显示的同时就能听到写字声
    if (this.locked && !this.openingShown) {
      this.openingShown = true;
      if (!this.opts.continuing) {
        this.emitCaption(
          "My room is on the second floor, on the left side of the hall. The door has a lock, and the key is in my hand.\nI folded the seven shirts by color and laid them in the wardrobe, set The Waste Land by the bed and the glass bottle beside it.\nI open the diary; the nib hovers above the first line, waiting to give itself a name—and the moment the new game begins, so does the diary.",
          14400
        );
      } else {
        this.emitCaption("You are back in the room. The diary still lies open on the desk.", 4600);
      }
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.locked) return;
    const sens = 0.0022;
    this.euler.y -= e.movementX * sens;
    this.euler.x -= e.movementY * sens;
    this.euler.x = Math.max(-1.4, Math.min(1.4, this.euler.x));
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.locked) return;
    if (e.code === "KeyE") {
      this.interact();
      return;
    }
    this.keys.add(e.code);
  };
  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.code);

  private interact() {
    if (this.hovered && !(this.hovered.oneShot && this.hovered.done)) {
      const h = this.hovered;
      if (h.oneShot) h.done = true;
      h.onPick();
    }
  }

  // ====================================================================
  // 拾取
  // ====================================================================
  private registerInteractable(i: Interactable) {
    i.root.traverse((o) => ((o as any).userData.__interactable = i));
    this.interactables.push(i);
    // 准星对准时让物件微微泛起暖光：给它的材质各克隆一份（别影响共用同一材质的家具）
    const clones = new Map<THREE.Material, THREE.MeshStandardMaterial>();
    for (const target of i.glow ?? [i.root]) {
      target.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || Array.isArray(m.material)) return;
        const mat = m.material as THREE.MeshStandardMaterial;
        if (!mat.isMeshStandardMaterial || !mat.visible) return;
        let c = clones.get(mat);
        if (!c) {
          c = this.track(mat.clone());
          c.userData.baseEmissive = c.emissive.clone();
          // 发亮的颜色跟着物件自己的底色走（带贴图的取个大概的平均亮度），不会把深色木头照成一片米白
          c.userData.glowAlbedo = c.color.clone().multiplyScalar(c.map ? 0.35 : 1);
          clones.set(mat, c);
        }
        m.material = c;
      });
    }
    if (clones.size) {
      const g = { mats: [...clones.values()], level: 0, target: 0 };
      this.glows.push(g);
      const prev = i.highlight;
      i.highlight = (on) => {
        prev?.(on);
        g.target = on ? 1 : 0;
      };
    }
  }

  private updateHover() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    this.raycaster.far = REACH;
    const roots = this.interactables.map((i) => i.root);
    const hits = this.raycaster.intersectObjects(roots, true);
    let found: Interactable | null = null;
    if (hits.length) {
      let o: THREE.Object3D | null = hits[0].object;
      while (o) {
        if ((o as any).userData.__interactable) {
          found = (o as any).userData.__interactable as Interactable;
          break;
        }
        o = o.parent;
      }
    }
    if (found !== this.hovered) {
      this.hovered?.highlight?.(false);
      this.hovered = found;
      if (found && !(found.oneShot && found.done)) {
        found.highlight?.(true);
        this.cb.onPrompt(found.label);
      } else {
        this.cb.onPrompt(null);
      }
    }
  }

  // ====================================================================
  // 音频
  // ====================================================================
  /** 建立循环音的 <audio> 元素（创建不需要手势，播放才需要）。 */
  private initAudioElements() {
    const mk = (url: string) => {
      const a = new Audio(url);
      a.loop = true;
      a.preload = "auto";
      a.volume = 0;
      return a;
    };
    this.loopEls.walk = mk("./walksound.mp3");
    this.loopEls.window = mk("./window.m4a");
    this.penEl = mk("./pen.mp3"); // 写字声，循环
  }

  /** 第一次用户点击时启动循环音（自动播放策略要求由手势触发）。 */
  private ensureAudio() {
    if (this.audioStarted) return;
    this.audioStarted = true;
    for (const k in this.loopEls) this.loopEls[k].play().catch(() => {});
    this.penEl?.play().catch(() => {});
  }

  /** 统一的旁白出口：文字逐字显示期间响写字声（pen.mp3），显示完毕即止。 */
  private emitCaption(text: string, durationMs = 5000) {
    const revealMs = Math.min(text.length * CHAR_MS, Math.max(0, durationMs - 250));
    this.penUntil = performance.now() + revealMs;
    this.cb.onCaption(text, durationMs);
  }

  /** 一次性音效（关门 / 皮箱 / 药片）。每次新建一个 <audio> 播放。 */
  private playOneShot(name: string, vol = 0.95) {
    if (!this.opts.sfx) return;
    const url = this.oneShotUrls[name];
    if (!url) return;
    try {
      const a = new Audio(url);
      a.volume = Math.max(0, Math.min(1, vol));
      a.play().catch(() => {});
    } catch {
      /* noop */
    }
  }

  /** 每帧更新三个循环音的音量（脚步开合、窗与写字按距离）。 */
  private updateLoopGains(dt: number, moving: boolean) {
    if (!this.audioStarted) return;
    const cam = this.camera.position;
    const atten = (d: number, maxD: number, base: number) => Math.max(0, 1 - d / maxD) * base;
    const targets: Record<string, number> = {
      walk: moving ? 0.7 : 0,
      // 窗外（雨）声：靠近窗大、远离窗小（远到一定程度归零）
      window: atten(cam.distanceTo(this.windowPos), 4.2, 0.9),
    };
    const k = Math.min(1, dt * 9);
    const m = this.opts.sfx ? 1 : 0;
    for (const name in this.loopEls) {
      this.loopCur[name] += ((targets[name] ?? 0) - this.loopCur[name]) * k;
      this.loopEls[name].volume = Math.max(0, Math.min(1, this.loopCur[name] * m));
    }
  }

  // ====================================================================
  // 主循环
  // ====================================================================
  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    if (!this.running) return;
    let dt = this.clock.getDelta();
    if (dt > 0.1) dt = 0.1;
    try {
      this.update(dt);
      if (this.shadowDirty) {
        this.renderer.shadowMap.needsUpdate = true;
        this.shadowDirty = false;
      }
      this.renderer.render(this.scene, this.camera);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[Greenbrook3D] frame error", err);
    }
  };

  private tmpForward = new THREE.Vector3();
  private tmpRight = new THREE.Vector3();

  private update(dt: number) {
    const yaw = this.euler.y;
    this.tmpForward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    this.tmpRight.set(Math.cos(yaw), 0, -Math.sin(yaw));
    let mx = 0,
      mz = 0;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) { mx += this.tmpForward.x; mz += this.tmpForward.z; }
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) { mx -= this.tmpForward.x; mz -= this.tmpForward.z; }
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) { mx += this.tmpRight.x; mz += this.tmpRight.z; }
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) { mx -= this.tmpRight.x; mz -= this.tmpRight.z; }
    const len = Math.hypot(mx, mz);
    let moving = false;
    if (len > 0.0001) {
      moving = true;
      const step = (SPEED * dt) / len;
      const nx = this.pos.x + mx * step;
      const nz = this.pos.z + mz * step;
      if (this.isWalkable(nx, this.pos.z)) this.pos.x = nx;
      if (this.isWalkable(this.pos.x, nz)) this.pos.z = nz;
    }

    if (moving) {
      this.bob += dt * 8.5;
      const phase = Math.sin(this.bob);
      this.camera.position.set(this.pos.x, this.pos.y + phase * 0.032, this.pos.z);
    } else {
      this.bob *= 0.9;
      this.camera.position.copy(this.pos);
    }
    this.camera.quaternion.setFromEuler(this.euler);
    this.camera.updateMatrixWorld();

    // 循环音：脚步（走时）、窗外雨声（近窗大、远窗小）
    this.updateLoopGains(dt, moving);
    // 写字声：文字逐字显示期间响，显示完毕即止
    if (this.penEl) this.penEl.volume = this.opts.sfx && performance.now() < this.penUntil ? 0.95 : 0;

    this.updateHover();

    const time = this.clock.elapsedTime;
    // 台灯开关：亮度在零点几秒里渐亮/渐暗，而不是一下子跳变
    this.lampLevel += ((this.lampOn ? 1 : 0) - this.lampLevel) * Math.min(1, dt * 7);
    if (Math.abs(this.lampLevel - (this.lampOn ? 1 : 0)) < 0.002) this.lampLevel = this.lampOn ? 1 : 0;
    if (this.deskLampShade) this.deskLampShade.emissiveIntensity = 0.04 + 1.36 * this.lampLevel;
    if (this.lampBulbMat) this.lampBulbMat.emissiveIntensity = 2.2 * this.lampLevel;
    for (const f of this.flickerLights) {
      if (f.light === this.deskLamp && this.lampLevel <= 0) {
        f.light.intensity = 0; // 台灯被关掉了，保持熄灭
        continue;
      }
      const n =
        Math.sin(time * 13 + f.seed) * 0.5 +
        Math.sin(time * 7.3 + f.seed * 2) * 0.3 +
        Math.sin(time * 31 + f.seed * 3) * 0.2;
      const amp = 0.05 + this.opts.decay * 0.22;
      f.light.intensity = f.base * (1 - amp * Math.max(0, n) * (Math.random() > 0.975 ? 3 : 1));
      if (f.light === this.deskLamp) f.light.intensity *= this.lampLevel;
    }

    this.updateDetails(dt, time);

    // —— 窗外的雨：线段往下落，落到底再绕回顶 ——
    if (this.rain && this.rainPos) {
      const p = this.rainPos;
      const v = 5.5 * dt;
      const yTop = 3.3, yBot = 0.1, range = yTop - yBot;
      for (let i = 0; i < p.length; i += 6) {
        p[i + 1] -= v;
        p[i + 4] -= v;
        if (p[i + 4] < yBot) {
          p[i + 1] += range;
          p[i + 4] += range;
        }
      }
      (this.rain.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    }

    // 偶尔一道闪电
    this.nextLightning -= dt;
    if (this.nextLightning <= 0) {
      this.flash = 1;
      this.nextLightning = 8 + Math.random() * 16;
    }
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3.5);
    const fl = this.flash;
    if (this.skyMat) this.skyMat.color.setRGB(0.06 + fl * 0.5, 0.08 + fl * 0.55, 0.11 + fl * 0.6);
    if (this.windowLight) this.windowLight.intensity = 0.35 + this.opts.decay * 0.35 + fl * 1.8;
  }

  /** 每帧的小细节：交互动画、悬停高光、灰尘、玻璃上的雨、窗帘、秒针。 */
  private updateDetails(dt: number, time: number) {
    if (this.tweens.length) {
      if (this.tweens.some((tw) => !tw.still)) this.shadowDirty = true; // 有东西在动，阴影跟着重算
      for (let i = this.tweens.length - 1; i >= 0; i--) {
        const tw = this.tweens[i];
        tw.t += dt;
        const k = Math.min(1, tw.t / tw.dur);
        tw.step(k);
        if (k >= 1) {
          this.tweens.splice(i, 1);
          tw.done?.();
        }
      }
    }

    for (const g of this.glows) {
      if (g.level === g.target) continue;
      g.level += (g.target - g.level) * Math.min(1, dt * 10);
      if (Math.abs(g.level - g.target) < 0.01) g.level = g.target;
      for (const m of g.mats) {
        const base = m.userData.baseEmissive as THREE.Color;
        const albedo = m.userData.glowAlbedo as THREE.Color;
        const k = (g.level * 0.16) / Math.max(m.emissiveIntensity, 0.2);
        m.emissive.setRGB(base.r + albedo.r * k + GLOW.r * 0.004 * g.level, base.g + albedo.g * k + GLOW.g * 0.004 * g.level, base.b + albedo.b * k + GLOW.b * 0.004 * g.level);
      }
    }

    if (this.dust && this.dustSeed && this.dustMat) {
      const p = (this.dust.geometry.getAttribute("position") as THREE.BufferAttribute).array as Float32Array;
      const sd = this.dustSeed;
      for (let i = 0; i < sd.length; i++) {
        const s = sd[i];
        p[i * 3] += Math.sin(time * 0.31 + s) * 0.0009 * dt * 60 * 0.1;
        p[i * 3 + 1] += (Math.cos(time * 0.23 + s * 1.7) * 0.0007 - 0.00012) * dt * 60 * 0.1;
        p[i * 3 + 2] += Math.sin(time * 0.19 + s * 2.3) * 0.0006 * dt * 60 * 0.1;
        if (p[i * 3 + 1] < 0.85) p[i * 3 + 1] += 1.5;
        if (p[i * 3 + 1] > 2.35) p[i * 3 + 1] -= 1.5;
      }
      (this.dust.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
      this.dustMat.opacity = 0.45 * (0.25 + 0.75 * this.lampLevel) * (1 - this.opts.decay * 0.45);
    }

    if (this.dropLayers.length === 2) {
      const streaks = this.dropLayers[1];
      streaks.offset.y = (streaks.offset.y + dt * 0.045) % 1;
    }

    if (this.curtainGeo && this.curtainRest) {
      const cp = this.curtainGeo.getAttribute("position") as THREE.BufferAttribute;
      const rest = this.curtainRest;
      const ch = 1.62;
      for (let i = 0; i < cp.count; i++) {
        const x = rest[i * 3];
        const y = rest[i * 3 + 1];
        const hang = Math.max(0, 0.5 - y / ch); // 上端挂住不动，越往下晃得越多
        cp.setZ(i, rest[i * 3 + 2] + Math.sin(time * 0.7 + y * 1.6 + x * 2.2) * 0.014 * hang);
      }
      cp.needsUpdate = true;
    }

    if (this.secondHand) {
      // 秒针一秒一跳
      this.secondHand.rotation.z = -Math.floor(time) * ((Math.PI * 2) / 60);
    }
  }

  // ====================================================================
  // decay：房间一寸寸变冷
  // ====================================================================
  applyDecay(d: number) {
    this.opts.decay = Math.max(0, Math.min(1, d));
    const fogCol = new THREE.Color(0x140d08).lerp(new THREE.Color(0x0e141a), this.opts.decay);
    this.fog.color.copy(fogCol);
    this.fog.density = 0.024 + this.opts.decay * 0.045;
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(new THREE.Color(0x0c0907).lerp(new THREE.Color(0x080c11), this.opts.decay));
    }
    this.hemi.intensity = 0.5 * (1 - this.opts.decay * 0.55);
    this.hemi.color.copy(new THREE.Color(0x6b5436).lerp(new THREE.Color(0x39434f), this.opts.decay));
    if (this.windowLight) this.windowLight.intensity = 0.35 + this.opts.decay * 0.35; // 冷光更显
    if (this.tarnishMat) this.tarnishMat.opacity = 0.55 + this.opts.decay * 0.3; // 镜子越来越照不清
    if (this.doorSlitMat) this.doorSlitMat.color.setHex(0xffc27a).lerp(new THREE.Color(0x8fa3b8), this.opts.decay * 0.7);
  }

  // ====================================================================
  // 公共 API
  // ====================================================================
  resize() {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  pause() {
    this.running = false;
    this.keys.clear();
    if (document.pointerLockElement === this.renderer.domElement) document.exitPointerLock?.();
    for (const k in this.loopEls) this.loopEls[k].pause();
    this.penEl?.pause();
  }

  resume() {
    if (this.disposed) return;
    this.running = true;
    this.clock.getDelta();
    if (this.audioStarted) {
      for (const k in this.loopEls) this.loopEls[k].play().catch(() => {});
      this.penEl?.play().catch(() => {});
    }
  }

  setSfx(on: boolean) {
    this.opts.sfx = on;
    if (!on) {
      for (const k in this.loopEls) this.loopEls[k].volume = 0;
      if (this.penEl) this.penEl.volume = 0;
    }
  }

  dispose() {
    this.disposed = true;
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    const el = this.renderer.domElement;
    el.removeEventListener("click", this.onClick);
    document.removeEventListener("pointerlockchange", this.onPointerLockChange);
    document.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    if (document.pointerLockElement === el) document.exitPointerLock?.();
    for (const k in this.loopEls) {
      try {
        this.loopEls[k].pause();
        this.loopEls[k].src = "";
      } catch {
        /* noop */
      }
    }
    try {
      this.penEl?.pause();
      if (this.penEl) this.penEl.src = "";
    } catch {
      /* noop */
    }
    this.mirror?.dispose();
    for (const g of this.geoms) g.dispose();
    for (const m of this.mats) m.dispose();
    for (const t of this.textures) t.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss?.();
    if (el.parentElement === this.container) this.container.removeChild(el);
  }
}
