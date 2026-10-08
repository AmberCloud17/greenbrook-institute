/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * World — 第一人称 3D 层的 React 外壳
 * 负责：挂载/卸载 Greenbrook3D 引擎、渲染抬头显示（准星 / 提示 / 旁白 /
 * 「点击环顾」），并在阅读层打开时暂停引擎。叙事仍由阅读层承担。
 */

import React, { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Greenbrook3D, ReadingDoc, CHAR_MS } from "./Greenbrook3D";

const Dust = () => {
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: Math.random() * 2.5 + 1,
        duration: Math.random() * 25 + 18,
        delay: Math.random() * 10,
        blur: Math.random() * 1.5 + 0.5,
      })),
    []
  );
  return (
    <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden mix-blend-screen opacity-50">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: p.top + "vh", x: p.left + "vw", opacity: 0 }}
          animate={{
            y: [p.top + "vh", p.top - 18 + "vh"],
            x: [p.left + "vw", p.left + (Math.random() > 0.5 ? 6 : -6) + "vw"],
            opacity: [0, Math.random() * 0.5 + 0.2, 0],
          }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "linear" }}
          className="absolute rounded-full bg-[#ffeed2]"
          style={{ width: p.size, height: p.size, filter: `blur(${p.blur}px)`, boxShadow: "0 0 8px 2px rgba(255,233,180,0.45)" }}
        />
      ))}
    </div>
  );
};

export interface WorldProps {
  decay: number;
  sfx: boolean;
  /** 阅读层是否开着（开着时暂停 3D）。 */
  readingOpen: boolean;
  continuing: boolean;
  onOpenReading: (doc: ReadingDoc) => void;
  onExitToTitle: () => void;
}

export const World: React.FC<WorldProps> = ({
  decay,
  sfx,
  readingOpen,
  continuing,
  onOpenReading,
  onExitToTitle,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Greenbrook3D | null>(null);

  const [prompt, setPrompt] = useState<string | null>(null);
  const [caption, setCaption] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(0); // 逐字显示到第几个字
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  const captionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // 从首页「继续」直接进桌面时，先不建 3D 房间：等合上桌面、回到房间时再建，
  // 免得桌面刚打开就被房间的加载（贴图、着色器）卡住。新游戏照旧一进来就建。
  const [roomWanted, setRoomWanted] = useState(!readingOpen);
  useEffect(() => {
    if (!readingOpen) setRoomWanted(true);
  }, [readingOpen]);

  // 挂载引擎（只一次）
  useEffect(() => {
    if (!roomWanted || !mountRef.current) return;
    const engine = new Greenbrook3D(
      mountRef.current,
      {
        onPrompt: (t) => setPrompt(t),
        onCaption: (t, dur = 5000) => {
          setCaption(t);
          setRevealed(0);
          // 逐字显示（与房间里的写字声同步）；显示完后停留，到时清空
          if (revealTimer.current) clearInterval(revealTimer.current);
          const stepMs = Math.min(CHAR_MS, Math.max(8, (dur - 300) / Math.max(1, t.length)));
          let i = 0;
          revealTimer.current = setInterval(() => {
            i++;
            setRevealed(i);
            if (i >= t.length && revealTimer.current) {
              clearInterval(revealTimer.current);
              revealTimer.current = null;
            }
          }, stepMs);
          if (captionTimer.current) clearTimeout(captionTimer.current);
          captionTimer.current = setTimeout(() => setCaption(null), dur);
        },
        onOpenReading: (doc) => onOpenReading(doc),
        onReady: () => setReady(true),
        onLockChange: (l) => setLocked(l),
      },
      { decay, sfx, continuing }
    );
    engineRef.current = engine;
    return () => {
      if (captionTimer.current) clearTimeout(captionTimer.current);
      if (revealTimer.current) clearInterval(revealTimer.current);
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomWanted]);

  // 开局提示停留约 12 秒后淡出
  useEffect(() => {
    const t = setTimeout(() => setShowHelp(false), 12000);
    return () => clearTimeout(t);
  }, []);

  // 阅读层开关 → 暂停 / 恢复
  useEffect(() => {
    const e = engineRef.current;
    if (!e) return;
    if (readingOpen) {
      e.pause();
      setPrompt(null);
    } else {
      e.resume();
    }
  }, [readingOpen]);

  useEffect(() => {
    engineRef.current?.applyDecay(decay);
  }, [decay]);

  useEffect(() => {
    engineRef.current?.setSfx(sfx);
  }, [sfx]);

  return (
    <div className="fixed inset-0 z-10 bg-black select-none" style={{ display: readingOpen ? "none" : "block" }}>
      {/* 3D 画布挂载点 */}
      <div ref={mountRef} className="absolute inset-0" />

      {/* 颗粒 / 暗角 / 噪点，维持与阅读层一致的质感 */}
      <Dust />
      <div className="absolute inset-0 z-30 noise-overlay opacity-[0.12] pointer-events-none mix-blend-overlay" />
      <div className="vignette z-30 pointer-events-none opacity-90" />
      {/* decay 越深，画面越往冷里压 */}
      <div
        className="absolute inset-0 z-30 pointer-events-none mix-blend-color"
        style={{ background: "#2a3340", opacity: decay * 0.28 }}
      />

      {/* 准星 */}
      {locked && (
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div
            className="rounded-full border transition-all duration-200"
            style={{
              width: prompt ? 14 : 5,
              height: prompt ? 14 : 5,
              borderColor: prompt ? "rgba(255,225,170,0.95)" : "rgba(235,225,205,0.6)",
              backgroundColor: prompt ? "rgba(255,225,170,0.15)" : "rgba(235,225,205,0.55)",
              boxShadow: prompt ? "0 0 10px rgba(255,200,120,0.7)" : "none",
            }}
          />
        </div>
      )}

      {/* 交互提示 */}
      <AnimatePresence>
        {locked && prompt && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute left-1/2 -translate-x-1/2 bottom-[18%] z-40 pointer-events-none flex items-center gap-3"
          >
            <span className="px-2 py-0.5 rounded border border-[#e9dcc0]/60 text-[#e9dcc0] font-mono text-xs tracking-widest">E</span>
            <span className="text-[#efe4cd] font-serif tracking-wider text-base sm:text-lg drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
              {prompt}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 第一人称旁白 */}
      <AnimatePresence>
        {caption && (
          <motion.div
            key={caption}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 right-0 bottom-[8%] z-40 px-8 flex justify-center pointer-events-none"
          >
            <p className="max-w-2xl text-center text-[#e7dcc4] font-serif text-[1.05rem] sm:text-[1.25rem] leading-[1.9] tracking-wide whitespace-pre-line drop-shadow-[0_3px_10px_rgba(0,0,0,0.95)]">
              {caption.slice(0, revealed)}
              {revealed < caption.length && <span className="opacity-60 animate-pulse">▍</span>}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 「点击环顾」遮罩（未锁定指针时） */}
      <AnimatePresence>
        {ready && !locked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/45 backdrop-blur-[2px] cursor-pointer"
            onClick={() => {
              // 把点击转交给画布以请求指针锁定
              (mountRef.current?.querySelector("canvas") as HTMLCanvasElement | null)?.click();
            }}
          >
            <div className="text-[#ece3d1] font-serif text-2xl sm:text-3xl tracking-[0.3em] mb-4 drop-shadow-[0_3px_10px_rgba(0,0,0,0.9)]">
              Enter the Room
            </div>
            <div className="text-[#a4967a] font-mono text-[11px] sm:text-xs tracking-[0.25em] uppercase">
              Click to look around
            </div>
            <div className="mt-10 text-[#8a7f6f] font-serif text-sm tracking-widest leading-loose text-center">
              WASD to walk · Mouse to look around · E or left-click to interact · Esc to release the pointer
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 操作提示（开局短暂显示） */}
      <AnimatePresence>
        {locked && showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none text-[#cabfa6] font-serif text-xs sm:text-sm tracking-widest"
          >
            Go to the desk and open the diary.
          </motion.div>
        )}
      </AnimatePresence>

      {/* 返回首页（仅未锁定时可点） */}
      <div className="absolute top-5 right-6 z-50 flex gap-4">
        <button
          onClick={onExitToTitle}
          className="group px-4 py-2 text-[#cabfa6] hover:text-white transition-colors duration-300 font-serif text-xs tracking-widest uppercase pointer-events-auto"
        >
          Main Menu
        </button>
      </div>

      {/* 载入态 */}
      {!ready && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0a0705]">
          <div className="text-[#a4967a] font-serif tracking-[0.3em] animate-pulse">Entering Greenbrook…</div>
        </div>
      )}
    </div>
  );
};
