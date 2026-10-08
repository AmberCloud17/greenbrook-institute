/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, ReactNode, useMemo } from "react";
import { allStoryNodes, storyData, storyData2, storyData3, storyData4, storyData5 } from "./data";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "motion/react";
import { World } from "./world/World";
import type { ReadingDoc } from "./world/Greenbrook3D";

/**
 * 从存档推断「凋零度」decay（0..1）：剧情越往后，爱德华的语言/心智越被抹平，
 * 3D 世界也随之一寸寸变冷变暗。读取 localStorage 里的剧情进度来估算。
 */
const computeDecay = (): number => {
  try {
    const saved = localStorage.getItem("greenbrookHistory");
    if (!saved) return 0;
    const hist = JSON.parse(saved) as { nodeId: string }[];
    let d = 0;
    for (const h of hist) {
      const id = h.nodeId || "";
      if (id.startsWith("chapter_5") || id.startsWith("report") || id === "end") d = Math.max(d, 0.95);
      else if (id.startsWith("chapter_4") || id.startsWith("nested_novel_4") || id.startsWith("nested_novel_final"))
        d = Math.max(d, 0.65);
      else if (id.startsWith("chapter_3") || id.startsWith("nested_novel_3")) d = Math.max(d, 0.42);
      else if (id.startsWith("chapter_2") || id.startsWith("nested_novel_2")) d = Math.max(d, 0.2);
    }
    return d;
  } catch {
    return 0;
  }
};

const DustParticles = () => {
  const particles = useMemo(() => Array.from({ length: 24 }).map((_, i) => ({
    id: i,
    top: Math.random() * 100,
    left: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 25 + 15,
    delay: Math.random() * 10,
    blur: Math.random() * 1.5 + 0.5
  })), []);

  return (
    <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden mix-blend-screen opacity-70">
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{
            y: p.top + 'vh', x: p.left + 'vw', opacity: 0
          }}
          animate={{
            y: [p.top + 'vh', (p.top - 20) + 'vh'],
            x: [p.left + 'vw', (p.left + (Math.random() > 0.5 ? 8 : -8)) + 'vw'],
            opacity: [0, Math.random() * 0.6 + 0.3, 0]
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear"
          }}
          className="absolute rounded-full bg-[#ffeed2]"
          style={{ width: p.size, height: p.size, filter: `blur(${p.blur}px)`, boxShadow: '0 0 8px 2px rgba(255,233,180,0.5)' }}
        />
      ))}
    </div>
  );
};

// 逐字显示的节奏（秒/字符）。中文版是 0.015 秒/字；同样的内容译成英文后字符数约为
// 中文的 3.5 倍，按比例缩到 0.0043，整段文字显示（以及写字声）的总时长与中文版一致。
const CHAR_DELAY = 0.0043;

const JitterText = ({ text, intensity = 0, isRevealing = false, delayOffset = 0, skipAnimation = false }: {
  text: string;
  intensity: number;
  isRevealing?: boolean;
  delayOffset?: number;
  skipAnimation?: boolean;
}) => {
  if (intensity <= 0 && (!isRevealing || skipAnimation)) return <>{text}</>;

  const words = text.split(/(\s+)/);
  const jitterRatio = Math.min(intensity, 1);
  const jitters = (idx: number) => (idx * 137) % 100 < jitterRatio * 100;
  let globalCharIdx = 0;

  return (
    <span className="group/para cursor-default">
      {words.map((word, wIdx) => {
        if (!word.trim()) {
           globalCharIdx += word.length;
           return <span key={wIdx} style={{ whiteSpace: 'pre-wrap' }}>{word}</span>;
        }

        // 英文的字符数是中文的好几倍，逐字母一个 span 会让 DOM 暴涨、打开桌面时卡顿。
        // 一个单词里没有会抖动的字母时，就整词一个 span（显现时间仍按它第一个字母算）；
        // 只有含抖动字母的单词才拆成逐字母的 span —— 抖动的字母和显现的节奏都不变。
        const wordStart = globalCharIdx;
        let wordJitters = false;
        for (let k = 0; k < word.length; k++) {
          if (jitters(wordStart + k)) { wordJitters = true; break; }
        }
        if (!wordJitters) {
          globalCharIdx += word.length;
          if (isRevealing && !skipAnimation) {
            return (
              <span
                key={wIdx}
                className="inline-block animate-typeIn opacity-0"
                style={{ animationDelay: `${delayOffset + wordStart * CHAR_DELAY}s`, animationFillMode: "forwards" }}
              >
                {word}
              </span>
            );
          }
          return <span key={wIdx} className="inline-block">{word}</span>;
        }

        return (
          <span key={wIdx} className="inline-block">
            {word.split('').map((char, cIdx) => {
              const currentIdx = globalCharIdx++;

              if (intensity <= 0 && (!isRevealing || skipAnimation)) {
                 return <span key={cIdx}>{char}</span>;
              }

              const shouldJitter = jitters(currentIdx);

              let className = "inline-block transition-all duration-500";
              let style: any = {};

              if (isRevealing && !skipAnimation) {
                className += " animate-typeIn opacity-0";
                style.animationDelay = `${delayOffset + currentIdx * CHAR_DELAY}s`;
                style.animationFillMode = "forwards";
              }

              if (shouldJitter) {
                className += " group-hover/para:animate-jitter group-hover/para:text-[#a73c3c] group-hover/para:opacity-100";
                style.animationDuration = `${0.1 + ((currentIdx * 13) % 10) * 0.02}s`;
                if (!isRevealing || skipAnimation) {
                  style.animationDelay = `${((currentIdx * 7) % 20) * 0.05}s`;
                }
              }

              return (
                <span 
                  key={cIdx} 
                  className={className}
                  style={style}
                >
                  {char}
                </span>
              );
            })}
          </span>
        );
      })}
    </span>
  );
};

let globalSfxOn = true;

const playPageTurnSound = () => {
  if (!globalSfxOn) return;
  try {
    const audio = new Audio('./booksound.mp3');
    audio.volume = 0.5; // Turn down page turn a bit
    audio.play().catch(() => {});
  } catch (e) {
    // Ignore audio errors
  }
};

const useEnvironmentAudio = (musicOn: boolean) => {
  useEffect(() => {
    if (!musicOn) return;
    
    // Create subtle environment noise (Brownian/Pink Noise blend for "room tone")
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // (roughly compensate for gain)
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    // Filter to make it sound like distant rumble / environment
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400; // Low rumble
    
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.075; // Low volume ambient noise

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noise.start(0);

    const handleFirstInteraction = () => {
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
    window.addEventListener('pointerdown', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);

    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      noise.stop(0);
      noise.disconnect();
      filter.disconnect();
      gainNode.disconnect();
      ctx.close();
    };
  }, [musicOn]);
};

const InkBlot = ({ seed }: { seed: number }) => {
  const size = 30 + (seed * 13) % 40;
  const rotation = (seed * 83) % 360;
  const spread = 20 + (seed * 17) % 30;
  const opacity = 0.4 + ((seed * 7) % 30) / 100;
  const rightPos = 10 + (seed * 21) % 70;
  const dropOffset = (seed * 5) % 15;

  return (
    <div className="absolute pointer-events-none mix-blend-multiply flex items-center justify-center"
      style={{
        width: size,
        height: size,
        right: `${rightPos}%`,
        bottom: `-${size/2}px`,
        opacity: opacity,
        rotate: `${rotation}deg`
      }}>
        <div style={{
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle at 45% 45%, rgba(26, 17, 12, 0.85) 0%, rgba(26, 17, 12, 0.6) 20%, rgba(41, 28, 20, 0.4) 40%, transparent 70%)',
          borderRadius: `${40+spread}% ${60-spread}% ${50+spread/2}% ${50-spread/2}% / ${50-spread}% ${50+spread}% ${60-spread/2}% ${40+spread/2}%`,
          filter: 'blur(1px)'
        }} />
        {seed % 2 === 0 && (
          <div className="absolute rounded-full bg-[#1a110c] opacity-60"
               style={{ width: size/6, height: size/6, top: -dropOffset, right: -dropOffset, filter: 'blur(0.5px)' }} />
        )}
    </div>
  );
};

const MenuButton = ({ onClick, text, subText }: { onClick: () => void, text: string, subText: string }) => {
  return (
    <button 
      onClick={() => {
        playPageTurnSound();
        onClick();
      }}
      className="group relative flex flex-col items-start text-left focus:outline-none cursor-pointer"
    >
      <span className="text-[#eee4d0] font-serif text-base sm:text-lg tracking-[0.2em] transform transition-all duration-300 origin-left group-hover:scale-110 group-hover:text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
        {text}
      </span>
      <span className="text-[#a4967a] font-serif text-[10px] sm:text-xs tracking-widest mt-1 opacity-70 transition-opacity duration-300 group-hover:opacity-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        {subText}
      </span>
      <span className="absolute -left-6 top-1/2 -translate-y-1/2 w-3 h-[1px] bg-[#eee4d0] opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:-left-8"></span>
    </button>
  );
};

const TitleScreen = ({ 
  onStartNew, 
  onContinue,
  hasSave,
  musicOn, 
  sfxOn, 
  onToggleMusic, 
  onToggleSfx 
}: { 
  onStartNew: () => void,
  onContinue: () => void,
  hasSave: boolean,
  musicOn: boolean,
  sfxOn: boolean,
  onToggleMusic: () => void,
  onToggleSfx: () => void
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const { clientX, clientY } = e;
      if (spotlightRef.current) {
        spotlightRef.current.style.background = `radial-gradient(circle 120px at ${clientX}px ${clientY}px, rgba(255, 245, 230, 0.08), transparent 80%)`;
      }
    };
    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  return (
    <div className="relative w-full h-screen bg-[#0a0705] overflow-hidden select-none">
      {/* Background Image - Users need to upload their image as bg.webp to public directory */}
      <motion.div 
        className="absolute inset-0 z-0 bg-cover bg-center mix-blend-screen opacity-40 bg-[radial-gradient(circle_at_50%_40%,rgba(138,115,85,0.1)_0%,rgba(0,0,0,0)_60%),linear-gradient(to_bottom,rgba(0,0,0,0)_0%,rgba(10,7,5,1)_100%)]"
        style={{ backgroundImage: 'url("./bg.webp")' }}
        initial={{ scale: 1.02 }}
        animate={{ scale: 1 }}
        transition={{ duration: 15, ease: "easeOut" }}
      ></motion.div>
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent z-10 pointer-events-none"></div>
      
      <div ref={spotlightRef} className="absolute inset-0 z-10 pointer-events-none mix-blend-color-dodge transition-opacity duration-200"></div>
      <div className="absolute inset-0 noise-overlay z-10 opacity-40 pointer-events-none mix-blend-multiply"></div>
      <div className="vignette z-10 pointer-events-none"></div>

      <div className="relative z-20 h-full flex flex-col justify-center px-12 sm:px-20 md:px-32 max-w-3xl">
        <motion.div
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 2, ease: "easeOut", delay: 0.5 }}
        >
          <h1 className="text-[#ece3d1] font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-widest mb-4 drop-shadow-[0_5px_15px_rgba(0,0,0,0.9)] leading-tight uppercase">
            Greenbrook
            <br />
            Institute
          </h1>
          <h2 className="text-[#a4967a] font-serif text-lg sm:text-xl tracking-[0.5em] mb-20 drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)]">
            Autumn · 1953
          </h2>
        </motion.div>

        <motion.div 
          className="flex flex-col space-y-8 items-start"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2, delay: 1.5 }}
        >
          {!showSettings ? (
             <>
               <MenuButton onClick={onStartNew} text="New Game" subText="BEGIN A NEW DIARY" />
               {hasSave && (
                 <MenuButton onClick={onContinue} text="Continue" subText="RETURN TO THE DIARY" />
               )}
               <MenuButton onClick={() => setShowSettings(true)} text="Settings" subText="SOUND & MUSIC" />
             </>
          ) : (
             <>
               <MenuButton 
                 onClick={onToggleMusic} 
                 text={`Music: ${musicOn ? 'On' : 'Off'}`} 
                 subText="BACKGROUND MUSIC" 
               />
               <MenuButton 
                 onClick={onToggleSfx} 
                 text={`Sound: ${sfxOn ? 'On' : 'Off'}`} 
                 subText="SOUND EFFECTS" 
               />
               <div className="pt-4">
                 <MenuButton onClick={() => setShowSettings(false)} text="Back" subText="RETURN" />
               </div>
             </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

const MainGame = ({ bgmRef, penAudioRef, onReturnHome }: { bgmRef: React.RefObject<HTMLAudioElement | null>, penAudioRef: React.RefObject<HTMLAudioElement | null>, onReturnHome: () => void }) => {
  const [history, setHistory] = useState<{nodeId: string, selectedOptionId: string | null}[]>(() => {
    try {
      const saved = localStorage.getItem('greenbrookHistory');
      return saved ? JSON.parse(saved) : [ { nodeId: "intro", selectedOptionId: null as string | null } ];
    } catch {
      return [ { nodeId: "intro", selectedOptionId: null as string | null } ];
    }
  });

  const [bookmarks, setBookmarks] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('greenbrookBookmarks');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('greenbrookHistory', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('greenbrookBookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  // 从存档载入时「自愈」一次被打断的跳转：若最新条目已选了带 nextId 的选项，
  // 但下一节点尚未追加（玩家在打字动画途中关掉了阅读层），就补上它，避免卡死。
  useEffect(() => {
    setHistory(prev => {
      const last = prev[prev.length - 1];
      if (!last || !last.selectedOptionId) return prev;
      const node = allStoryNodes[last.nodeId];
      const opt = node?.options.find(o => o.id === last.selectedOptionId);
      if (opt && opt.nextId && opt.nextId !== last.nodeId && allStoryNodes[opt.nextId]) {
        return [...prev, { nodeId: opt.nextId, selectedOptionId: null }];
      }
      return prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [skipTyping, setSkipTyping] = useState(false);
  const [bend, setBend] = useState({ id: null as string | null, rx: 0, ry: 0 });
  const latestScrollRef = useRef<HTMLDivElement>(null);
  // 三本书各自的滚动容器（日记 / 《玻璃侦探》 / 出院评估）
  const diaryScrollRef = useRef<HTMLElement>(null);
  const nestedScrollRef = useRef<HTMLDivElement>(null);
  const reportScrollRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    if (viewingDoc !== id) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xPct = (x / rect.width) - 0.5;
    const yPct = (y / rect.height) - 0.5;
    setBend({ id, rx: -yPct * 12, ry: xPct * 12 });
  };
  const handlePointerUp = () => setBend({ id: null, rx: 0, ry: 0 });

  useEffect(() => {
    let rafId = 0;
    let lastX = 0, lastY = 0;
    const apply = () => {
      rafId = 0;
      const xPct = (lastX / window.innerWidth) - 0.5;
      const yPct = (lastY / window.innerHeight) - 0.5;
      mouseX.set(xPct);
      mouseY.set(yPct);

      if (spotlightRef.current) {
        spotlightRef.current.style.background = `radial-gradient(circle 120px at ${lastX}px ${lastY}px, rgba(255, 245, 230, 0.08), transparent 80%)`;
      }
    };
    const handlePointerMove = (e: PointerEvent) => {
      lastX = e.clientX; lastY = e.clientY;
      if (!rafId) rafId = requestAnimationFrame(apply);
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const getDocType = (nodeId: string) => {
    if (nodeId.startsWith('report')) return 'report';
    if (nodeId.startsWith('nested_novel')) return 'nested';
    return 'diary';
  };

  const historyWithGlobals = history.map((h, i) => ({ ...h, globalIndex: i }));
  const diaryHistory = historyWithGlobals.filter(h => getDocType(h.nodeId) === 'diary');
  const nestedHistory = historyWithGlobals.filter(h => getDocType(h.nodeId) === 'nested');
  const reportHistory = historyWithGlobals.filter(h => getDocType(h.nodeId) === 'report');

  const latestItem = history[history.length - 1];
  const latestDocType = getDocType(latestItem.nodeId);

  const [viewingDoc, setViewingDoc] = useState<'diary' | 'nested' | 'report' | null>(null);
  const [isNovelCoverOpen, setIsNovelCoverOpen] = useState(false);
  const [isReportCoverOpen, setIsReportCoverOpen] = useState(false);
  const [isDiaryCoverOpen, setIsDiaryCoverOpen] = useState(false);
  const [pendingJump, setPendingJump] = useState<{ nextId: string, timeoutId: ReturnType<typeof setTimeout> } | null>(null);
  const [collectedPhotos, setCollectedPhotos] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('greenbrookPhotos');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('greenbrookPhotos', JSON.stringify(collectedPhotos));
  }, [collectedPhotos]);

  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [isViewingEnvelope, setIsViewingEnvelope] = useState(false);

  useEffect(() => {
    if (isViewingEnvelope && history[history.length - 1]?.selectedOptionId === '4-end') {
      const timer = setTimeout(() => {
        setIsViewingEnvelope(false);
        playPageTurnSound();
        setViewingDoc('nested');
        setTimeout(() => {
           setIsNovelCoverOpen(true);
           setHistory(prev => {
              if (prev[prev.length - 1].selectedOptionId === '4-end') {
                 return [...prev, { nodeId: "nested_novel_4", selectedOptionId: null }];
              }
              return prev;
           });
        }, 600);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [isViewingEnvelope, history]);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleCloseEnvelope = () => {
    setIsViewingEnvelope(false);
    playPageTurnSound();
    
    if (history[history.length - 1]?.selectedOptionId === '4-end') {
       setViewingDoc('nested');
       setTimeout(() => {
          setIsNovelCoverOpen(true);
          setHistory(prev => {
             if (prev[prev.length - 1].selectedOptionId === '4-end') {
                return [...prev, { nodeId: "nested_novel_4", selectedOptionId: null }];
             }
             return prev;
          });
       }, 600);
    }
  };
  
  const springConfig = { damping: 30, stiffness: 100, mass: 1 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  const globalRotateX = useTransform(smoothMouseY, [-0.5, 0.5], [1.5, -1.5]);
  const globalRotateY = useTransform(smoothMouseX, [-0.5, 0.5], [-1.5, 1.5]);

  useEffect(() => {
    if (skipTyping) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (penAudioRef.current) penAudioRef.current.pause();
    }
  }, [skipTyping]);

  useEffect(() => {
    if (skipTyping) return;
    
    // Always hide pen audio if we are currently looking at the Nested Novel ("Glass Detective")
    if (viewingDoc === 'nested') {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (penAudioRef.current) penAudioRef.current.pause();
      return;
    }
    
    const latestItem = history[history.length - 1];
    
    if (getDocType(latestItem.nodeId) === 'nested') {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (penAudioRef.current) penAudioRef.current.pause();
      return;
    }

    const node = allStoryNodes[latestItem.nodeId];
    if (!node) return;

    let durationMs = 0;

    if (!latestItem.selectedOptionId) {
      let accumulatedDelay = 0;
      if (node.title) {
        accumulatedDelay += node.title.length * CHAR_DELAY + 0.2;
      }
      
      const rawNodeText = typeof node.text === 'function' ? node.text(history) : node.text;
      const filterEmptyLines = (arr: (string | boolean | null | undefined)[]) => arr.filter(Boolean) as string[];
      const nodeTextArray = filterEmptyLines(Array.isArray(rawNodeText) ? rawNodeText : [rawNodeText])
        .filter(p => !p.includes('________________________________________'));
        
      nodeTextArray.forEach(p => {
        accumulatedDelay += p.length * CHAR_DELAY + 0.15;
      });
      
      durationMs = accumulatedDelay * 1000 + 250;
    } else {
      const option = node.options.find(o => o.id === latestItem.selectedOptionId);
      if (option) {
        let currentResDelay = 0;
        if (option.desc) {
          currentResDelay += option.desc.length * CHAR_DELAY;
        }
        if (option.resultText) {
          const rawResText = typeof option.resultText === 'function' ? option.resultText(history) : option.resultText;
          const filterEmptyLines = (arr: (string | boolean | null | undefined)[]) => arr.filter(Boolean) as string[];
          const resTextArray = filterEmptyLines(Array.isArray(rawResText) ? rawResText : [rawResText])
            .filter(p => !p.includes('________________________________________'));
          resTextArray.forEach(p => {
            currentResDelay += p.length * CHAR_DELAY;
          });
        }
        durationMs = currentResDelay > 0 ? (currentResDelay * 1000) + 250 : 0;
      }
    }

    if (durationMs > 0) {
       if (penAudioRef.current) {
         penAudioRef.current.currentTime = 0;
         const playPromise = penAudioRef.current.play();
         if (playPromise !== undefined) {
           playPromise.catch(() => {});
         }
       }
       if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
       typingTimeoutRef.current = setTimeout(() => {
         if (penAudioRef.current) {
           penAudioRef.current.pause();
         }
         if (latestItem.selectedOptionId === '4-end') {
           setViewingDoc(null);
         }
       }, durationMs);
    }
    
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  }, [history, skipTyping, viewingDoc]);

  useEffect(() => {
    const handleFirstInteraction = () => {
      if (bgmRef.current) {
         bgmRef.current.play().catch(() => {});
      }
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
    window.addEventListener('pointerdown', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  useEffect(() => {
    if (skipTyping && pendingJump) {
      clearTimeout(pendingJump.timeoutId);
      setHistory(prev => {
        if (prev[prev.length - 1].nodeId !== pendingJump.nextId) {
           playPageTurnSound();
           return [...prev, { nodeId: pendingJump.nextId, selectedOptionId: null }];
        }
        return prev;
      });
      setPendingJump(null);
    }
    if (skipTyping && history[history.length - 1]?.selectedOptionId === '4-end') {
      setViewingDoc(null);
    }
  }, [skipTyping, pendingJump, history]);

  useEffect(() => {
    setViewingDoc(latestDocType);
  }, [latestDocType, history.length]);

  // ---- 翻书时停在哪儿 ----
  // 打开一本书时翻到「字正一个个浮现」的地方，而不是回到第一页。
  // 每本书只滚自己的那一页（scrollIntoView 可能连外层一起滚；以前那个共用的「最新」标记还常常落在别的书里）。
  const bookBox = (type: 'diary' | 'nested' | 'report'): HTMLElement | null =>
    (type === 'diary' ? diaryScrollRef : type === 'nested' ? nestedScrollRef : reportScrollRef).current;

  /** el 在某本书滚动容器里的纵坐标。按排版位置累加，书本飞入、按压翻折时的变换都不影响它。 */
  const yInBook = (el: HTMLElement, box: HTMLElement) => {
    let y = 0;
    let e: HTMLElement | null = el;
    while (e && e !== box) {
      y += e.offsetTop;
      e = e.offsetParent as HTMLElement | null;
    }
    if (e === box) return y;
    const br = box.getBoundingClientRect();
    const k = br.height / Math.max(1, box.offsetHeight) || 1;
    return (el.getBoundingClientRect().top - br.top) / k + box.scrollTop;
  };

  /**
   * 把一本书翻到它「写到哪儿」：这本书最后一条里，字正在浮现的那一行。
   * 还在写——跟着字走，让正在浮现的那一行落在页面中间；已经写完——让最后一行字停在页面偏上，
   * 下面露出选项。写到的地方离这一条的开头还不到半页时，就让这一条从页首开始。
   */
  const scrollBookToWriting = (type: 'diary' | 'nested' | 'report', behavior: ScrollBehavior) => {
    const box = bookBox(type);
    if (!box) return;
    const entries = box.querySelectorAll<HTMLElement>('[data-entry]');
    const last = entries[entries.length - 1];
    if (!last) return;
    const h = box.clientHeight;
    const entryTop = yInBook(last, box) - 48;
    const typing = last.querySelectorAll<HTMLElement>('.animate-typeIn');
    const lastChar = typing[typing.length - 1];
    let writtenTo: number; // 字写到的位置
    let at: number; // 让它落在页面多高处
    if (lastChar && parseFloat(getComputedStyle(lastChar).opacity) < 0.99) {
      // 还在写：最后一个已经开始浮现的字
      let front: HTMLElement | null = null;
      for (let i = typing.length - 1; i >= 0; i--) {
        if (parseFloat(getComputedStyle(typing[i]).opacity) > 0.02) { front = typing[i]; break; }
      }
      writtenTo = front ? yInBook(front, box) : entryTop;
      at = 0.5;
    } else if (lastChar) {
      // 刚写完：最后一个字的下沿
      writtenTo = yInBook(lastChar, box) + lastChar.offsetHeight;
      at = 0.4;
    } else {
      // 早就写完的（别的书、或点过跳过）：正文到选项为止，没有选项就是这一条的末尾
      const choices = last.querySelector<HTMLElement>('[data-choices]');
      writtenTo = choices ? yInBook(choices, box) : yInBook(last, box) + last.offsetHeight;
      at = 0.4;
    }
    box.scrollTo({ top: Math.max(0, entryTop, writtenTo - h * at), behavior });
  };

  /** 打开一本书时的落点：正在写的那本跟着字走；别的书有书签就翻到书签，没有就翻到它最后写下的地方。 */
  const positionBook = (type: 'diary' | 'nested' | 'report', behavior: ScrollBehavior) => {
    const box = bookBox(type);
    const bm = bookmarks[type];
    if (box && bm && type !== latestDocType) {
      const el = box.querySelector<HTMLElement>(`[id="node-${bm}"]`);
      if (el) {
        box.scrollTo({ top: Math.max(0, yInBook(el, box) + el.offsetHeight / 2 - box.clientHeight / 2), behavior });
        return;
      }
    }
    scrollBookToWriting(type, behavior);
  };

  useEffect(() => {
    if (viewingDoc !== 'diary') setIsDiaryCoverOpen(false);
    if (viewingDoc !== 'nested') setIsNovelCoverOpen(false);
    if (viewingDoc !== 'report') setIsReportCoverOpen(false);

    if (viewingDoc) {
      const doc = viewingDoc;
      const t = setTimeout(() => positionBook(doc, 'auto'), 450); // Wait for open animation
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingDoc]);

  // 翻开封面后再定位一次（封面翻开动画期间内容还没真正排好版/可见，字也还在往下写）
  useEffect(() => {
    const open = isDiaryCoverOpen || isNovelCoverOpen || isReportCoverOpen;
    if (!open || !viewingDoc) return;
    const doc = viewingDoc;
    const t = setTimeout(() => positionBook(doc, 'auto'), 750);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDiaryCoverOpen, isNovelCoverOpen, isReportCoverOpen]);

  // 新的一条（或刚选的选项）出现时，把正在写的那本书滚到它的开头
  useEffect(() => {
    const t = setTimeout(() => {
      const anchor = latestScrollRef.current;
      const box = bookBox(getDocType(history[history.length - 1].nodeId));
      if (anchor && box && box.contains(anchor)) {
        box.scrollTo({ top: Math.max(0, yInBook(anchor, box) - 48), behavior: 'smooth' });
      }
    }, 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  const handleSelect = (nodeId: string, optionId: string, nextId: string) => {
    playPageTurnSound();
    
    const currentDocType = getDocType(nodeId);
    const nextDocType = nextId ? getDocType(nextId) : currentDocType;

    setSkipTyping(false);
    
    // First, update the current node to show the selected option (and its resultText)
    setHistory(prev => {
      const newHist = [...prev];
      newHist[newHist.length - 1].selectedOptionId = optionId;
      return newHist;
    });

    if (nextId) {
      const node = allStoryNodes[nodeId];
      const option = node.options.find(o => o.id === optionId);
      
      let textToAnimate = "";
      if (option) {
         if (option.desc) textToAnimate += option.desc;
         if (option.resultText) {
            const rawResText = typeof option.resultText === 'function' ? option.resultText(history) : option.resultText;
            const resArray = Array.isArray(rawResText) ? rawResText : [rawResText];
            textToAnimate += resArray.filter(Boolean).join("");
         }
      }
      
      const charCount = textToAnimate.length;
      // Calculate delay based on whether it jumps document and text length
      let delayMs = 0;
      if (currentDocType !== nextDocType) {
        delayMs = charCount > 0 ? (charCount * CHAR_DELAY * 1000) + 3000 : 2000;
      } else {
        delayMs = charCount > 0 ? (charCount * CHAR_DELAY * 1000) + 800 : 100;
      }

      if (delayMs > 100 || currentDocType !== nextDocType) {
        const timeoutId = setTimeout(() => {
          setPendingJump(null);
          setHistory(prev => {
            if (prev[prev.length - 1].nodeId === nodeId) {
              if (currentDocType !== nextDocType) playPageTurnSound();
              return [...prev, { nodeId: nextId, selectedOptionId: null }];
            }
            return prev;
          });
        }, delayMs);
        setPendingJump({ nextId, timeoutId });
      } else {
        // Instant transition if same document and no text
        setHistory(prev => {
           if (prev[prev.length - 1].nodeId === nodeId) {
             return [...prev, { nodeId: nextId, selectedOptionId: null }];
           }
           return prev;
        });
      }
    }
  };

  const handleReplay = () => {
    playPageTurnSound();
    setHistory([{ nodeId: "intro", selectedOptionId: null }]);
    setCollectedPhotos([]);
    setViewingPhoto(null);
    localStorage.setItem('greenbrookPhotos', JSON.stringify([]));
    setSkipTyping(false);
    setIsNovelCoverOpen(false);
    setIsReportCoverOpen(false);
    setIsDiaryCoverOpen(false);
  };

  const renderNodeList = (chunk: {nodeId: string, selectedOptionId: string | null, globalIndex: number}[], type: 'diary'|'nested'|'report') => {
    let isCoverOpen = true;
    if (type === 'diary') isCoverOpen = isDiaryCoverOpen;
    if (type === 'report') isCoverOpen = isReportCoverOpen;
    if (type === 'nested') isCoverOpen = isNovelCoverOpen;

    return (
      <AnimatePresence initial={false}>
        {chunk.map((item, index) => {
          const node = allStoryNodes[item.nodeId];
          if (!node) return null;
          
          const isLatestGlobal = item.globalIndex === history.length - 1;
          const isJustAnsweredGlobal = history.length > 1 && item.globalIndex === history.length - 2;
          const selectedOption = node.options.find(o => o.id === item.selectedOptionId);
  
          const globalHistoryIndex = item.globalIndex;
          const historyUpToHere = history.slice(0, globalHistoryIndex + 1);

          let textIntensity = 0;
          if (historyUpToHere.some(h => h.nodeId.startsWith('chapter_5') || h.nodeId === 'report')) {
             textIntensity = 0.5 + (globalHistoryIndex * 0.02);
          } else if (historyUpToHere.some(h => h.nodeId.startsWith('chapter_4') || h.nodeId.startsWith('nested_novel_final'))) {
             textIntensity = 0.1 + (globalHistoryIndex * 0.005);
          } else if (historyUpToHere.some(h => h.nodeId.startsWith('chapter_3') || h.nodeId.startsWith('nested_novel_3'))) {
             textIntensity = 0.01 + (globalHistoryIndex * 0.001);
          }

          if (type === 'nested') {
             textIntensity *= 0.5;
          }

          const optionIntensity = (type === 'diary' && historyUpToHere.some(h => h.nodeId.startsWith('chapter_5'))) ? 0.6 : 0;
  
          const rawNodeText = typeof node.text === 'function' ? node.text(historyUpToHere) : node.text;
          const filterEmptyLines = (arr: (string | boolean | null | undefined)[]) => arr.filter(Boolean) as string[];
          const nodeTextArray = filterEmptyLines(Array.isArray(rawNodeText) ? rawNodeText : [rawNodeText])
            .filter(p => !p.includes('________________________________________'));
  
          const availableOptions = node.options.filter(opt => 
              opt.condition ? opt.condition(historyUpToHere) : true
          );
  
          let accumulatedDelay = 0;
          if (isLatestGlobal && node.title && !skipTyping) {
            accumulatedDelay += node.title.length * CHAR_DELAY + 0.2;
          }
  
          const isReport = item.nodeId === "report";
  
          return (
            <motion.div
              id={`node-${item.nodeId}`}
              data-entry=""
              key={`${item.nodeId}-${index}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className={`relative group/node mb-16 ${!isLatestGlobal ? 'opacity-50' : 'opacity-100'} transition-opacity duration-700`}
              style={!isLatestGlobal && !isJustAnsweredGlobal ? ({ contentVisibility: 'auto', containIntrinsicSize: 'auto 600px', overflowClipMargin: '1.5rem' } as React.CSSProperties) : undefined}
            >
              {isLatestGlobal && !item.selectedOptionId && <div ref={latestScrollRef} className="scroll-mt-12" />}

              {/* Bookmark Toggle Ribbon */}
              <div 
                className={`absolute -right-6 sm:-right-10 top-2 w-6 sm:w-8 h-12 sm:h-16 cursor-pointer origin-top transition-all duration-300 z-10 ${bookmarks[type] === item.nodeId ? 'opacity-100 scale-y-100 drop-shadow-md' : 'opacity-0 scale-y-50 group-hover/node:opacity-40 hover:opacity-70 group-hover/node:scale-y-75'}`}
                style={{ 
                  backgroundColor: type === 'nested' ? '#2f4f4f' : '#8c2a2a',
                  clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)" 
                }}
                onClick={() => {
                  setBookmarks(prev => {
                    const next = {...prev};
                    if (next[type] === item.nodeId) delete next[type];
                    else next[type] = item.nodeId;
                    return next;
                  });
                }}
                title={bookmarks[type] === item.nodeId ? "Remove bookmark" : "Bookmark this entry"}
              />

              {node.title && (
                <h2 className={`font-bold border-b pb-3 mb-10 mt-4 font-serif text-center ${type === 'nested' ? 'text-2xl border-[#d1c5b4]/50 text-[#3d3126]' : 'text-3xl border-[#d1c5b4]/80 text-[#1f1a16]'}`}>
                  <JitterText text={node.title} intensity={textIntensity} isRevealing={isLatestGlobal} delayOffset={0} skipAnimation={skipTyping} />
                </h2>
              )}
              
              <div className={`space-y-6 leading-[2] break-words ${isReport ? 'font-mono text-sm tracking-tight text-[#2c241b]' : (type === 'nested' ? 'font-glass tracking-normal text-[1.1rem] sm:text-[1.2rem] text-[#3d3126]' : 'font-handwritten tracking-normal text-[1.45rem] sm:text-[1.6rem] text-[#3d3126]')}`}>
                {nodeTextArray.map((p, i) => {
                  const pStr = typeof p === 'string' ? p.trim() : '';
                  const isImage = pStr.startsWith("[IMAGE:");
                  let imageSrc = "";
                  
                  if (isImage) {
                    const match = pStr.match(/\[IMAGE:(.+?)\]/i);
                    if (match) imageSrc = match[1];
                  }

                  const currentDelay = accumulatedDelay;
                  if (isLatestGlobal && !skipTyping && !isImage) {
                    accumulatedDelay += pStr.length * CHAR_DELAY + 0.15;
                  } else if (isLatestGlobal && !skipTyping && isImage) {
                    accumulatedDelay += 1.0; // Image display animation delay
                  }

                  if (isImage && imageSrc) {
                     let layoutClasses = "";
                     let initialRotate = 0;
                     let targetRotate = 0;
                     
                     if (imageSrc.includes("1")) {
                       layoutClasses = "translate-x-[-5%] sm:translate-x-[-10%] md:translate-x-[-15%]";
                       initialRotate = -10;
                       targetRotate = -4;
                     } else if (imageSrc.includes("2")) {
                       layoutClasses = "translate-x-[5%] sm:translate-x-[10%] md:translate-x-[15%]";
                       initialRotate = 10;
                       targetRotate = 5;
                     } else if (imageSrc.includes("3")) {
                       layoutClasses = "translate-x-[-8%] sm:translate-x-[-15%] md:translate-x-[-20%]";
                       initialRotate = -8;
                       targetRotate = -5;
                     } else if (imageSrc.includes("4")) {
                       layoutClasses = "translate-x-[3%] sm:translate-x-[8%] md:translate-x-[12%]";
                       initialRotate = 5;
                       targetRotate = 3;
                     } else if (imageSrc.includes("5")) {
                       layoutClasses = "translate-x-[8%] sm:translate-x-[15%] md:translate-x-[20%]";
                       initialRotate = -10;
                       targetRotate = -6;
                     } else if (imageSrc.includes("6")) {
                       layoutClasses = "translate-x-[-5%] sm:translate-x-[-12%] md:translate-x-[-18%]";
                       initialRotate = -6;
                       targetRotate = -3;
                     } else if (imageSrc.includes("7")) {
                       layoutClasses = "translate-x-[6%] sm:translate-x-[12%] md:translate-x-[18%]";
                       initialRotate = 8;
                       targetRotate = 4;
                     } else if (imageSrc.includes("8")) {
                       layoutClasses = "translate-x-[-10%] sm:translate-x-[-18%] md:translate-x-[-25%]";
                       initialRotate = 2;
                       targetRotate = 2;
                     } else if (imageSrc.includes("9")) {
                       layoutClasses = "translate-x-[-6%] sm:translate-x-[-10%] md:translate-x-[-15%]";
                       initialRotate = -8;
                       targetRotate = -4;
                     } else {
                       layoutClasses = "translate-x-[0%]";
                       initialRotate = -4;
                       targetRotate = -2;
                     }

                     return (
                        <motion.div 
                          key={i} 
                          className={`w-full my-12 flex relative z-50 cursor-pointer justify-center transition-opacity duration-300 ${(!isCoverOpen || viewingDoc !== type) ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                          initial={isLatestGlobal && !skipTyping ? { opacity: 0, rotate: initialRotate, y: 30, scale: 0.95 } : false}
                          animate={(viewingDoc === type && isCoverOpen) ? { opacity: 1, rotate: targetRotate, y: 0, scale: 1 } : { opacity: 0 }}
                          whileHover={{ scale: 1.05, zIndex: 60 }}
                          transition={{ delay: skipTyping ? 0 : currentDelay, duration: 1.4, type: "spring", stiffness: 35, damping: 15 }}
                          onClick={(e) => {
                             e.stopPropagation();
                             playPageTurnSound();
                             if (!collectedPhotos.includes(imageSrc)) {
                               setCollectedPhotos(prev => [...prev, imageSrc]);
                             } else {
                               setViewingPhoto(imageSrc);
                             }
                          }}
                        >
                            <div className={`relative p-3 pb-8 sm:p-5 sm:pb-16 md:p-6 md:pb-20 bg-[#e8decf] border border-[#c1b29a] shadow-[0_15px_35px_rgba(40,30,20,0.4),4px_8px_15px_rgba(40,30,20,0.3)] w-[280px] sm:w-[420px] md:w-[500px] xl:w-[600px] rounded-[2px] before:content-[''] before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_center,transparent_0%,rgba(100,80,60,0.08)_100%)] before:pointer-events-none transition-transform duration-500 shrink-0`}>
                              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-4 bg-white/40 backdrop-blur-md shadow-[0_2px_4px_rgba(0,0,0,0.2)] rotate-[-4deg] border border-white/30"></div>
                              <div className="relative overflow-hidden border border-black/15 shadow-sm">
                                <img src={imageSrc} referrerPolicy="no-referrer" alt="Captured memory" className="w-full aspect-[4/3] sm:aspect-auto h-auto block object-cover grayscale-[35%] sepia-[45%] opacity-95 contrast-[1.15] brightness-[0.9]" />
                                <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.3)] pointer-events-none"></div>
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dust.png')] opacity-40 mix-blend-overlay pointer-events-none"></div>
                              </div>
                            </div>
                        </motion.div>
                     );
                  }

                  return (
                    <p key={i} className="whitespace-pre-wrap">
                      <JitterText text={pStr} intensity={textIntensity} isRevealing={isLatestGlobal} delayOffset={currentDelay} skipAnimation={skipTyping} />
                    </p>
                  );
                })}
              </div>
  
              {/* OPTIONS (Only if global latest) */}
              {isLatestGlobal && !item.selectedOptionId && availableOptions.length > 0 && (
                 <motion.div 
                   data-choices=""
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   transition={{ delay: skipTyping ? 0 : accumulatedDelay + 0.2, duration: 1 }}
                   className="mt-28 pt-8"
                 >
                    <p className="text-[0.65rem] font-mono uppercase tracking-[0.2em] mb-8 text-[#8a7f6f] text-center flex items-center justify-center gap-4">
                      <span className={`h-px w-12 ${type === 'nested' ? 'bg-[#8a7f6f]/30' : 'bg-[#d1c5b4]'}`}></span>
                      What next?
                      <span className={`h-px w-12 ${type === 'nested' ? 'bg-[#8a7f6f]/30' : 'bg-[#d1c5b4]'}`}></span>
                    </p>
                    <div className="flex flex-col gap-4">
                      {availableOptions.map((opt, optIndex) => {
                        return (
                        <button
                          key={opt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(node.id, opt.id, opt.nextId);
                          }}
                          className={`text-left w-full px-2 py-4 sm:p-5 bg-transparent transition-colors duration-500 flex items-start group cursor-pointer relative ${type === 'nested' ? 'border-b border-[#8a7f6f]/30 hover:border-[#834938]/60 hover:bg-[#834938]/[0.02]' : 'border-b border-dashed border-[#d1c5b4]/60 hover:border-[#3d3126]/40 hover:bg-[#3d3126]/[0.02]'}`}
                        >
                          <span className={`font-mono text-xs w-8 mt-2 transition-colors duration-500 relative z-10 flex items-center ${type === 'nested' ? 'text-[#8a7f6f]/60 group-hover:text-[#834938]' : 'text-[#8a7f6f] group-hover:text-[#110d0a]'}`}>
                            {String.fromCharCode(65 + optIndex)}.
                          </span>
                          
                          <div className="flex-1 relative z-10">
                            <div className={`leading-relaxed transition-all duration-500 ${type === 'nested' ? 'font-serif tracking-wide text-[1.05rem] sm:text-[1.125rem] text-[#5c4a3d] group-hover:text-[#2c241b]' : 'font-handwritten tracking-normal text-[1.45rem] sm:text-[1.6rem] text-[#3d3126] group-hover:text-[#110d0a] group-hover:underline decoration-2 underline-offset-[6px] decoration-[#3d3126]/30'}`}>
                              <JitterText text={opt.label.replace(/^▷\s*(?:[A-Za-z0-9]{1,2}\s*(?:—|-|\.)\s*|[①-⑤]\s*)?/, '').trim()} intensity={optionIntensity} skipAnimation={true} />
                            </div>
                          </div>
                        </button>
                        );
                      })}
                    </div>
                 </motion.div>
              )}
  
              {isLatestGlobal && !item.selectedOptionId && availableOptions.length === 0 && (
                 <motion.div 
                   data-choices=""
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   transition={{ delay: skipTyping ? 0 : accumulatedDelay + 0.5, duration: 1 }}
                   className="mt-32 pt-16 border-t border-[#d1c5b4]/50 flex flex-col items-center pb-12 w-full"
                 >
                   <span className="w-12 h-12 rounded-full border border-[#a73c3c] text-[#a73c3c] flex items-center justify-center font-serif text-2xl rotate-12 mb-6 opacity-80 mix-blend-multiply border-dashed">
                     Fin
                   </span>
                   <button
                     onClick={(e) => {
                       e.stopPropagation();
                       handleReplay();
                     }}
                     className="group relative px-8 py-3 bg-[#2c241b] border border-[#1f1a16] text-[#f4ebd8] font-mono text-xs tracking-[0.2em] uppercase hover:text-white transition-all duration-500 shadow-md overflow-hidden"
                   >
                     <div className="absolute inset-0 bg-[#a73c3c] translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 ease-out z-0"></div>
                     <span className="relative z-10 transition-colors group-hover:text-white">Close the file and begin again</span>
                   </button>
                 </motion.div>
              )}
  
              {selectedOption && (
                <div 
                  ref={isLatestGlobal && item.selectedOptionId ? latestScrollRef : null} 
                  className={`mt-16 pt-12 border-t scroll-mt-12 ${type === 'nested' ? 'border-[#8a7f6f]/20' : 'border-[#d1c5b4]'}`}
                >
                  <div className="mb-10 space-y-4">
                    <div className={`flex items-center gap-4 opacity-60 mb-6 ${type === 'nested' ? 'text-[#8a7f6f]/80' : 'text-[#8a7f6f]'}`}>
                        <div className="h-px bg-current w-12" />
                        <span className="font-mono text-[0.65rem] tracking-[0.1em] uppercase">My choice</span>
                    </div>
                    <div className={`pl-6 border-l-[3px] opacity-90 ${type === 'nested' ? 'border-[#834938]/50' : 'border-[#a73c3c]/60'}`}>
                      <p className={`font-bold leading-snug italic text-lg ${type === 'nested' ? 'font-glass text-[#3d3126]' : 'font-serif text-[#1f1a16]'}`}>
                        <JitterText text={selectedOption.label.replace(/^▷\s*(?:[A-Za-z0-9]{1,2}\s*(?:—|-|\.)\s*|[①-⑤]\s*)?/, '').trim()} intensity={0} skipAnimation={true} />
                      </p>
                    </div>
                  </div>
                  
                  {(selectedOption.desc || selectedOption.resultText) && (
                    <div className={`space-y-6 mt-8 leading-[2] break-words ${type === 'nested' ? 'font-glass tracking-normal text-[1.1rem] sm:text-[1.2rem] text-[#5c4a3d]' : 'font-handwritten tracking-normal text-[1.45rem] sm:text-[1.6rem] text-[#3d3126]'}`}>
                      {selectedOption.desc && (
                        <p className="whitespace-pre-wrap">
                          <JitterText text={selectedOption.desc} intensity={textIntensity} isRevealing={isLatestGlobal} skipAnimation={!isLatestGlobal || skipTyping} />
                        </p>
                      )}
                      {selectedOption.resultText && (() => {
                        const rawResText = typeof selectedOption.resultText === 'function' 
                          ? selectedOption.resultText(historyUpToHere)
                          : selectedOption.resultText;
                        const resTextArray = filterEmptyLines(Array.isArray(rawResText) ? rawResText : [rawResText])
                          .filter(p => !p.includes('________________________________________'));
                        
                        let currentResDelay = 0;
                        if (selectedOption.desc) {
                           currentResDelay += selectedOption.desc.length * CHAR_DELAY;
                        }

                        return resTextArray.map((p, i) => {
                          const pStr = typeof p === 'string' ? p.trim() : '';
                          const isImage = pStr.startsWith("[IMAGE:");
                          let imageSrc = "";
                          
                          if (isImage) {
                            const match = pStr.match(/\[IMAGE:(.+?)\]/i);
                            if (match) imageSrc = match[1];
                          }

                          const delay = currentResDelay;
                          if (isLatestGlobal && !skipTyping && !isImage) {
                            currentResDelay += pStr.length * CHAR_DELAY + 0.15;
                          } else if (isLatestGlobal && !skipTyping && isImage) {
                            currentResDelay += 1.0;
                          }

                          if (isImage && imageSrc) {
                             let layoutClasses = "";
                             let initialRotate = 0;
                             let targetRotate = 0;
                             
                             if (imageSrc.includes("1")) {
                               layoutClasses = "translate-x-[-5%] sm:translate-x-[-10%] md:translate-x-[-15%]";
                               initialRotate = -10;
                               targetRotate = -4;
                             } else if (imageSrc.includes("2")) {
                               layoutClasses = "translate-x-[5%] sm:translate-x-[10%] md:translate-x-[15%]";
                               initialRotate = 10;
                               targetRotate = 5;
                             } else if (imageSrc.includes("3")) {
                               layoutClasses = "translate-x-[-8%] sm:translate-x-[-15%] md:translate-x-[-20%]";
                               initialRotate = -8;
                               targetRotate = -5;
                             } else if (imageSrc.includes("4")) {
                               layoutClasses = "translate-x-[3%] sm:translate-x-[8%] md:translate-x-[12%]";
                               initialRotate = 5;
                               targetRotate = 3;
                             } else if (imageSrc.includes("5")) {
                               layoutClasses = "translate-x-[8%] sm:translate-x-[15%] md:translate-x-[20%]";
                               initialRotate = -10;
                               targetRotate = -6;
                             } else if (imageSrc.includes("6")) {
                               layoutClasses = "translate-x-[-5%] sm:translate-x-[-12%] md:translate-x-[-18%]";
                               initialRotate = -6;
                               targetRotate = -3;
                             } else if (imageSrc.includes("7")) {
                               layoutClasses = "translate-x-[6%] sm:translate-x-[12%] md:translate-x-[18%]";
                               initialRotate = 8;
                               targetRotate = 4;
                             } else if (imageSrc.includes("8")) {
                               layoutClasses = "translate-x-[-10%] sm:translate-x-[-18%] md:translate-x-[-25%]";
                               initialRotate = 2;
                               targetRotate = 2;
                             } else if (imageSrc.includes("9")) {
                               layoutClasses = "translate-x-[-6%] sm:translate-x-[-10%] md:translate-x-[-15%]";
                               initialRotate = -8;
                               targetRotate = -4;
                             } else {
                               layoutClasses = "translate-x-[0%]";
                               initialRotate = -4;
                               targetRotate = -2;
                             }

                             return (
                                <motion.div 
                                  key={`res-img-${i}`} 
                                  className={`w-full my-12 flex relative z-50 cursor-pointer justify-center transition-opacity duration-300 ${(!isCoverOpen || viewingDoc !== type) ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                                  initial={isLatestGlobal && !skipTyping ? { opacity: 0, rotate: initialRotate, y: 30, scale: 0.95 } : false}
                                  animate={(viewingDoc === type && isCoverOpen) ? { opacity: 1, rotate: targetRotate, y: 0, scale: 1 } : { opacity: 0 }}
                                  whileHover={{ scale: 1.05, zIndex: 60 }}
                                  transition={{ delay: skipTyping ? 0 : delay, duration: 1.4, type: "spring", stiffness: 35, damping: 15 }}
                                  onClick={(e) => {
                                     e.stopPropagation();
                                     playPageTurnSound();
                                     if (!collectedPhotos.includes(imageSrc)) {
                                       setCollectedPhotos(prev => [...prev, imageSrc]);
                                     } else {
                                       setViewingPhoto(imageSrc);
                                     }
                                  }}
                                >
                                    <div className={`relative p-3 pb-8 sm:p-5 sm:pb-16 md:p-6 md:pb-20 bg-[#e8decf] border border-[#c1b29a] shadow-[0_15px_35px_rgba(40,30,20,0.4),4px_8px_15px_rgba(40,30,20,0.3)] w-[280px] sm:w-[420px] md:w-[500px] xl:w-[600px] rounded-[2px] before:content-[''] before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_center,transparent_0%,rgba(100,80,60,0.08)_100%)] before:pointer-events-none transition-transform duration-500 shrink-0`}>
                                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-4 bg-white/40 backdrop-blur-md shadow-[0_2px_4px_rgba(0,0,0,0.2)] rotate-[-4deg] border border-white/30"></div>
                                      <div className="relative overflow-hidden border border-black/15 shadow-sm">
                                        <img src={imageSrc} referrerPolicy="no-referrer" alt="Captured memory" className="w-full aspect-[4/3] sm:aspect-auto h-auto block object-cover grayscale-[35%] sepia-[45%] opacity-95 contrast-[1.15] brightness-[0.9]" />
                                        <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.3)] pointer-events-none"></div>
                                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dust.png')] opacity-40 mix-blend-overlay pointer-events-none"></div>
                                      </div>
                                    </div>
                                </motion.div>
                             );
                          }

                          return (
                          <p key={i} className={`whitespace-pre-wrap ${type === 'nested' ? 'opacity-80 italic' : 'opacity-90 font-medium italic'}`}>
                            <JitterText text={pStr} intensity={textIntensity} isRevealing={isLatestGlobal} delayOffset={delay} skipAnimation={!isLatestGlobal || skipTyping} />
                          </p>
                        )});
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Random Ink Blot for Diary when a chapter ends */}
              {type === 'diary' && item.selectedOptionId && (
                <InkBlot seed={globalHistoryIndex * 17 + 42} />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    );
  };

  return (
    <div 
      className="flex flex-col h-[100dvh] w-full relative text-[#2c241b] overflow-hidden p-0 font-serif bg-[#1a110a] perspective-[1000px]"
      onClick={() => setSkipTyping(true)}
    >
      {/* Top right navigation */}
      <div className="absolute top-6 right-8 z-50 flex gap-4">
        {viewingDoc !== null ? (
          <button 
            onClick={(e) => { e.stopPropagation(); setViewingDoc(null); }}
            className="group relative flex items-center gap-2 px-4 py-2 text-[#d1c5b4] transition-all duration-300 pointer-events-auto"
          >
            <span className="text-xs font-serif tracking-widest uppercase opacity-80 group-hover:opacity-100 group-hover:drop-shadow-[0_0_8px_rgba(209,197,180,0.8)]">Back to the Desk</span>
          </button>
        ) : (
          <button
            onClick={onReturnHome}
            className="group relative flex items-center gap-2 px-4 py-2 text-[#d1c5b4] transition-all duration-300 pointer-events-auto"
          >
            <span className="text-xs font-serif tracking-widest uppercase opacity-80 group-hover:opacity-100 group-hover:drop-shadow-[0_0_8px_rgba(209,197,180,0.8)]">Back to the Room</span>
          </button>
        )}
      </div>

      {/* Helper text bottom right */}
      <div className="absolute bottom-6 right-8 sm:bottom-8 sm:right-12 z-40 pointer-events-none opacity-40 flex flex-col items-end gap-1 font-serif text-[#d1c5b4] text-[10px] sm:text-xs tracking-widest transition-opacity duration-500">
         <p>{viewingDoc === null ? 'Click a file to read it' : 'Click the desk to see everything again'}</p>
      </div>

      {/* Desk Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#24150b_0%,_#050201_100%)] z-0"></div>
      <div ref={spotlightRef} className="absolute inset-0 z-0 pointer-events-none mix-blend-color-dodge transition-opacity duration-200 animate-lamp-flicker opacity-50"></div>
      <div className="absolute inset-0 wood-texture z-0 opacity-40 mix-blend-multiply pointer-events-none"></div>
      <div className="absolute inset-0 noise-overlay z-0 opacity-[0.15] pointer-events-none mix-blend-overlay"></div>
      <div className="vignette z-0 pointer-events-none opacity-80"></div>
      
      <DustParticles />

      {/* LIGHTBOX */}
      <AnimatePresence>
        {viewingPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-12 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              playPageTurnSound();
              setViewingPhoto(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative p-3 pb-12 sm:p-6 sm:pb-20 bg-[#e8decf] shadow-2xl max-w-4xl max-h-[90vh] cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
               <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-6 bg-white/40 backdrop-blur-md shadow-[0_2px_4px_rgba(0,0,0,0.2)] rotate-[2deg] border border-white/30 z-10"></div>
               <div className="relative overflow-hidden border border-black/15">
                  <img src={viewingPhoto} referrerPolicy="no-referrer" alt="Expanded memory" className="w-full max-h-[80vh] object-contain grayscale-[20%] sepia-[30%] opacity-95 contrast-[1.1]" />
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dust.png')] opacity-30 mix-blend-overlay pointer-events-none"></div>
               </div>
               
               <button 
                onClick={(e) => {
                  e.stopPropagation();
                  playPageTurnSound();
                  setViewingPhoto(null);
                }}
                className="absolute -top-4 -right-4 w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-[#8a7355] transition-colors"
               >
                 X
               </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ENVELOPE LIGHTBOX */}
      <AnimatePresence>
        {isViewingEnvelope && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 sm:p-12 cursor-pointer overflow-y-auto overflow-x-hidden min-h-[100dvh]"
            onClick={handleCloseEnvelope}
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-5xl my-auto flex flex-col lg:flex-row gap-6 items-center lg:items-start cursor-default pt-12 pb-12 lg:pt-0"
              onClick={(e) => e.stopPropagation()}
            >
               {/* Photo */}
               <div className="relative p-3 pb-8 bg-[#e8decf] shadow-2xl flex-1 shrink-0 w-full max-w-[400px]">
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-4 bg-white/40 backdrop-blur-md shadow-[0_2px_4px_rgba(0,0,0,0.2)] rotate-[-2deg] border border-white/30 z-10"></div>
                 <div className="relative overflow-hidden border border-black/15">
                    <img src="./11.webp" referrerPolicy="no-referrer" alt="Expanded memory" className="w-full h-auto object-contain grayscale-[20%] sepia-[30%] opacity-95 contrast-[1.1]" />
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dust.png')] opacity-30 mix-blend-overlay pointer-events-none"></div>
                 </div>
               </div>

               {/* Letter */}
               <div className="relative p-8 sm:p-10 bg-[#f4ebd8] shadow-2xl flex-1 shrink-0 w-full font-mono text-[#2c241b] leading-relaxed text-sm sm:text-base border border-[#d1c5b4]/50">
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dust.png')] opacity-20 mix-blend-overlay pointer-events-none"></div>
                 <p className="mb-4 tracking-widest font-bold">Dear Mr. Banks,</p>
                 <p className="indent-6 sm:indent-8 mb-4">Following an assessment by the Greenbrook Medical Board, and in light of the observations recorded since your admission and the recommendation of your attending physician, the Board has unanimously concluded that your present condition is suited to further adjunctive neurosurgical treatment.</p>
                 <p className="indent-6 sm:indent-8 mb-4">This course of treatment is the hospital’s current standard rehabilitative procedure. It is widely practiced at many similar institutions across the country, and in 1949 it received the scholarly recognition of the Nobel Committee for Physiology or Medicine. The procedure itself takes approximately ten to fifteen minutes; the period of recovery is generally two to three days, during which you will rest under the attentive care of our medical and nursing staff.</p>
                 <p className="indent-6 sm:indent-8 mb-4 font-bold tracking-widest text-[#1f1a16] bg-[#d1c5b4]/40 px-2 py-1 rounded-sm inline-block shadow-sm">Your surgery has been scheduled for Wednesday, January 14, 1954, at nine o’clock in the morning.</p>
                 <p className="indent-6 sm:indent-8 mb-4">Please report to the third-floor nurses’ station at half past eight that morning to complete your preoperative preparation. On the night before, kindly keep to your usual routine; there is no need to fast.</p>
                 <p className="indent-6 sm:indent-8 mb-4">Your family was notified earlier this month and has expressed its understanding and support. Should you have any questions regarding these arrangements, you are welcome to call at the office on any weekday this week.</p>
                 <p className="indent-6 sm:indent-8 mb-8">We remain confident that this step will set you truly on the road to recovery.</p>
                 
                 <div className="text-right mt-8 pr-4 relative">
                    <p className="mb-2">Sincerely yours,</p>
                    <p className="font-serif font-bold text-2xl mb-2 text-[#3d3126]">R. Kevins</p>
                    <p className="text-xs sm:text-sm">Administrative Director, Greenbrook Psychiatric Rehabilitation Hospital</p>
                    <p className="mt-2 text-xs tracking-widest opacity-80">January 9, 1954</p>
                 </div>
               </div>
               
               <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseEnvelope();
                }}
                className="absolute top-0 right-0 sm:-top-4 sm:-right-4 w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-[#8a7355] transition-colors shadow-lg z-20"
               >
                 X
               </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The Workspace containing papers */}
      <motion.div
        className="flex-1 w-full h-full relative z-10 overflow-hidden perspective-[1200px]"
        style={{ rotateX: viewingDoc !== null ? 0 : globalRotateX, rotateY: viewingDoc !== null ? 0 : globalRotateY, transformStyle: "preserve-3d" }}
        onClick={() => {
           if (viewingDoc !== null) {
              setViewingDoc(null);
           }
        }}
      >
        {/* FOUNTAIN PEN */}
        <motion.div 
          className="absolute bottom-[20%] right-[10%] sm:bottom-[25%] sm:right-[12%] xl:bottom-[20%] xl:right-[18%] z-[20] drop-shadow-[10px_20px_10px_rgba(0,0,0,0.7)] cursor-pointer" 
          initial={{ rotate: -35, z: 20 }}
          whileHover={{ y: -5, rotate: -30, scale: 1.05, filter: "drop-shadow(15px 30px 15px rgba(0,0,0,0.8))" }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
           <div className="relative w-4 h-48 sm:w-5 sm:h-56">
             {/* Pen Body (Rich Leather/Brown Tortoiseshell) */}
             <div className="absolute inset-x-0 bottom-12 top-0 bg-gradient-to-r from-[#2c1c0e] via-[#4a3219] to-[#1a0f07] rounded-t-full border border-black/80">
                <div className="absolute inset-y-0 left-[20%] w-px bg-white/10"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] opacity-30 mix-blend-overlay rounded-t-full"></div>
                {/* Metallic accents (Brownish-brass) */}
                <div className="absolute bottom-0 inset-x-0 h-4 bg-gradient-to-r from-[#593d2b] via-[#855c42] to-[#3d2719] border-y border-black/50"></div>
             </div>
             {/* Pen Cap / Grip */}
             <div className="absolute inset-x-1 bottom-6 h-6 bg-gradient-to-r from-[#1a110a] via-[#2c1c11] to-[#0a0604] border-x border-black/80"></div>
             {/* Pen Nib (Metal) */}
             <div className="absolute inset-x-1.5 bottom-0 h-6 bg-gradient-to-r from-[#855c42] via-[#a3795c] to-[#4a3121] rounded-b-full shadow-inner" style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }}>
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-black/60 rounded-full"></div>
             </div>
             {/* Clip */}
             <div className="absolute top-4 right-[-3px] w-1.5 h-16 bg-gradient-to-b from-[#593d2b] to-[#3d2719] rounded-full shadow-[2px_2px_4px_rgba(0,0,0,0.5)]"></div>
           </div>
        </motion.div>

        {/* COLLECTED PHOTOS DESK LAYER */}
        <div className={`absolute bottom-[2%] left-[2%] sm:bottom-[4%] sm:left-[4%] xl:bottom-[5%] xl:left-[6%] transition-all duration-700 origin-bottom-left ${viewingDoc === null ? 'scale-[0.8]' : 'scale-[1.15] opacity-60'} z-[35] flex pointer-events-none drop-shadow-2xl`}>
          <AnimatePresence>
            {collectedPhotos.map((src, i) => (
              <motion.div
                key={src}
                initial={{ scale: 0, x: -60, rotate: -20, opacity: 0 }}
                animate={{ scale: 1, x: 0, rotate: (i % 2 === 0 ? -12 : -5) + (i * 6), opacity: 1 }}
                whileHover={{ scale: 1.05, y: -10, rotate: 0, zIndex: 100 }}
                className="relative p-2 sm:p-3 md:p-4 bg-[#e8decf] border border-[#c1b29a] shadow-[0_15px_30px_rgba(0,0,0,0.5)] w-48 sm:w-64 xl:w-[280px] cursor-pointer pointer-events-auto transform-origin-bottom-left"
                onClick={(e) => {
                  e.stopPropagation();
                  playPageTurnSound();
                  setViewingPhoto(src);
                }}
                style={{ zIndex: i, marginLeft: i === 0 ? '0' : 'clamp(-220px, -20vw, -160px)' }}
              >
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-2 bg-white/40 backdrop-blur-md shadow-[0_1px_2px_rgba(0,0,0,0.2)] rotate-[-2deg] border border-white/30 z-[5]"></div>
                <img src={src} referrerPolicy="no-referrer" alt="Collected Memory" className="w-full aspect-[4/3] object-cover grayscale-[30%] sepia-[35%] contrast-[1.1] brightness-[0.75]" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dust.png')] opacity-30 mix-blend-overlay pointer-events-none"></div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* PHOTO 11 MANDATORY ENVELOPE */}
        <AnimatePresence>
          {history.some(h => h.selectedOptionId === '4-end' || h.nodeId.startsWith('chapter_5')) && (
            <motion.div
              initial={{ opacity: 0, y: -50, rotate: -20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, rotate: 12, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.8 }}
              className={`absolute top-[4%] right-[3%] sm:top-[6%] sm:right-[15%] xl:top-[8%] xl:right-[20%] z-[25] cursor-pointer drop-shadow-[15px_15px_30px_rgba(0,0,0,0.8)] ${viewingDoc !== null ? 'scale-[0.8] opacity-50 pointer-events-none' : 'hover:scale-[1.05] opacity-95 hover:z-[60]'}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!collectedPhotos.includes('./11.webp')) {
                  setCollectedPhotos(prev => {
                     const next = [...prev, './11.webp'];
                     localStorage.setItem('greenbrookPhotos', JSON.stringify(next));
                     return next;
                  });
                }
                setIsViewingEnvelope(true);
                playPageTurnSound();
              }}
            >
               <div className="relative w-48 sm:w-60 xl:w-64 aspect-[1.4] bg-[#b1956e] border border-[#836239] rounded-sm shadow-[inset_0_0_40px_rgba(50,30,10,0.5)] flex items-center justify-center">
                   {/* Flap of envelope */}
                   <div className="absolute top-0 left-0 right-0 h-1/2 border-b border-r border-[#836239] bg-[#a3865f] origin-top rotate-x-12 opacity-40 mix-blend-multiply pointer-events-none" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}></div>
                   
                   {/* Photo sticking out */}
                   <div className="absolute top-[-15%] sm:top-[-20%] right-3 sm:right-5 w-[85%] bg-[#e8decf] p-2 border border-[#c1b29a] shadow-[0_5px_15px_rgba(0,0,0,0.4)] rotate-[-6deg] z-[2]">
                     <img src="./11.webp" className="w-full aspect-auto grayscale-[35%] sepia-[40%] brightness-90 contrast-110" />
                   </div>
                   
                   {/* Envelope front */}
                   <div className="absolute inset-x-0 bottom-0 top-[40%] bg-[#b1956e] shadow-[0_-5px_15px_rgba(0,0,0,0.3)] z-[3] border-t border-[#836239] overflow-hidden" style={{ clipPath: 'polygon(0 100%, 100% 100%, 100% 0, 50% 40%, 0 0)' }}>
                       <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dust.png')] opacity-30 mix-blend-overlay"></div>
                   </div>
                   <div className="absolute bottom-3 right-4 font-mono text-[9px] text-[#5c4021] rotate-[-2deg] font-bold z-[4] opacity-80 border border-[#5c4021] px-1">CONFIDENTIAL</div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* REPORT PAPER */}
        <motion.div
           initial={false}
           animate={viewingDoc === 'report' ? "active" : "inactive"}
           variants={{
             active: { x: "-50%", y: "-50%", left: "50%", top: "50%", rotate: 0, rotateX: bend.id === 'report' ? bend.rx : 0, rotateY: bend.id === 'report' ? bend.ry : 0, scale: bend.id === 'report' ? 0.99 : 1, zIndex: 50, opacity: 1, filter: "drop-shadow(10px 15px 30px rgba(0,0,0,0.6)) brightness(1)" },
             inactive: { x: "-50%", y: "-50%", left: "20%", top: "35%", rotate: -8, rotateX: 0, rotateY: 0, scale: 0.45, zIndex: 15, opacity: 0.95, filter: "drop-shadow(5px 5px 15px rgba(0,0,0,0.5)) brightness(0.75)" }
           }}
           whileHover={viewingDoc !== 'report' ? { scale: 0.47, filter: "drop-shadow(10px 10px 20px rgba(0,0,0,0.6)) brightness(0.85)", zIndex: 25 } : undefined}
           transition={{ type: "spring", stiffness: 220, damping: 25 }}
           style={{ display: 'flex', perspective: 1500, transformStyle: "preserve-3d" }}
           onClick={(e) => { e.stopPropagation(); if (viewingDoc !== 'report') { setViewingDoc('report'); playPageTurnSound(); } }}
           onPointerDown={(e) => handlePointerDown(e, 'report')}
           onPointerUp={handlePointerUp}
           onPointerLeave={handlePointerUp}
           className="absolute w-[95%] sm:w-full max-w-2xl h-[75vh] sm:h-[80vh] flex-col rounded-sm cursor-pointer"
        >
          {/* External Ribbon Marker for Report */}
          {bookmarks['report'] && (
            <div className="absolute -right-2 top-8 w-6 h-20 bg-[#8c2a2a] drop-shadow-md z-[1] sm:z-[-1] transition-opacity duration-300"
                 style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 85%, 0 100%)" }} />
          )}

          <div className="absolute inset-0 bg-[#eae1cf] rounded-sm border border-[#d1c5b4]/50 overflow-hidden flex flex-col z-[2] sm:z-0">
            {viewingDoc !== 'report' && <div className="absolute inset-0 z-50 hover:bg-[#5a432b]/20 transition-colors pointer-events-none"></div>}

            {/* REPORT COVER */}
            <AnimatePresence>
              {!isReportCoverOpen && reportHistory.length > 0 && (
                <motion.div
                  initial={false}
                  exit={{ rotateY: -100, opacity: 0 }}
                  transition={{ duration: 0.8, ease: "anticipate" }}
                  style={{ transformOrigin: "left center" }}
                  className="absolute inset-0 z-40 bg-[#d1c5b4] flex flex-col items-center pt-24 px-8 border-l-[8px] border-[#a3947f] shadow-[inset_10px_0_20px_rgba(0,0,0,0.2)] cursor-pointer"
                  onClick={(e) => {
                    if (viewingDoc === 'report') {
                      e.stopPropagation();
                      setIsReportCoverOpen(true);
                      playPageTurnSound();
                    }
                  }}
                >
                  <div className="absolute inset-0 noise-overlay opacity-30 pointer-events-none"></div>
                  <div className="absolute inset-0 wood-texture z-0 opacity-10 mix-blend-multiply pointer-events-none"></div>
                  
                  {/* Medical Cross / Logo Area */}
                  <div className="w-16 h-16 border-[3px] border-[#2c241b] rounded-full flex items-center justify-center mix-blend-multiply opacity-80 mb-8 sm:mb-10">
                      <div className="w-7 h-2 bg-[#2c241b] relative">
                         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-7 bg-[#2c241b]"></div>
                      </div>
                  </div>

                  <div className="w-full max-w-[320px] border-b-[3px] border-t-[1px] border-[#2c241b] py-6 mix-blend-multiply flex flex-col items-center gap-2">
                    <p className="font-mono tracking-widest text-[#2c241b] uppercase text-[10px] font-bold">Greenbrook Memorial</p>
                    <h1 className="font-serif text-4xl sm:text-5xl text-[#2c241b] text-center font-black tracking-widest">
                      Greenbrook
                    </h1>
                  </div>
                  
                  <div className="font-mono tracking-widest text-[#2c241b] uppercase text-lg sm:text-xl mt-6 font-bold mix-blend-multiply">
                    Discharge Assessment
                  </div>

                  {/* Form Elements */}
                  <div className="w-full max-w-[320px] mt-10 mix-blend-multiply flex flex-col gap-4 opacity-90">
                     <div className="flex justify-between items-end border-b border-[#2c241b]/40 pb-1">
                        <span className="font-mono text-xs font-bold">No.:</span>
                        <span className="font-mono text-sm tracking-widest font-bold">M-912</span>
                     </div>
                     <div className="flex justify-between items-end border-b border-[#2c241b]/40 pb-1">
                        <span className="font-mono text-xs font-bold">Assessed:</span>
                        <span className="font-mono text-sm tracking-widest font-bold">198█/██/██</span>
                     </div>
                     <div className="flex justify-between items-end border-b border-[#2c241b]/40 pb-1">
                        <span className="font-mono text-xs font-bold">Status:</span>
                        <div className="flex items-center gap-2 font-mono text-sm font-bold">
                          <span className="line-through decoration-[#2c241b] opacity-60">Isolation</span>
                          <span className="">Released</span>
                        </div>
                     </div>
                  </div>

                  {/* Confidential Red Stamp */}
                  <div className="absolute right-6 sm:right-12 bottom-24 border-[3px] border-[#9c2b2b] rounded-sm px-3 py-1 text-[#9c2b2b] font-bold font-serif tracking-widest text-xl -rotate-[12deg] mix-blend-multiply opacity-[0.85] shadow-sm">
                     CONFIDENTIAL<br/><span className="text-[10px] tracking-tight block text-center mt-1 border-t border-[#9c2b2b] pt-1">RESTRICTED FILE</span>
                  </div>
                  
                  <div className="absolute right-8 bottom-8 text-[#2c241b]/40 font-mono italic text-sm animate-pulse">Click to open</div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="px-6 py-4 border-b border-[#8a7f6f]/30 flex justify-between items-end font-mono text-[10px] text-[#8a7f6f] bg-[#f0e7d5]">
               <div>Greenbrook Memorial</div>
               <div className="text-right">Discharge M-912</div>
            </div>
            <div ref={reportScrollRef} className="p-8 sm:p-12 flex-1 overflow-y-auto custom-scrollbar relative z-10" style={{ contain: 'paint' }}>
               {reportHistory.length > 0 ? renderNodeList(reportHistory, 'report') : (
                 <div className="opacity-30 text-center mt-20 font-mono tracking-widest">[ File empty ]</div>
               )}
               <div className="h-16" />
            </div>
          </div>
        </motion.div>

        {/* NESTED MANUSCRIPT PAPER */}
        <motion.div
           initial={false}
           animate={viewingDoc === 'nested' ? "active" : "inactive"}
           variants={{
             active: { x: "-50%", y: "-50%", left: "50%", top: "50%", rotate: 0, rotateX: bend.id === 'nested' ? bend.rx : 0, rotateY: bend.id === 'nested' ? bend.ry : 0, scale: bend.id === 'nested' ? 0.99 : 1, zIndex: 50, opacity: 1, filter: "drop-shadow(10px 20px 50px rgba(0,0,0,0.8)) brightness(1)" },
             inactive: { x: "-50%", y: "-50%", left: "80%", top: "30%", rotate: 12, rotateX: 0, rotateY: 0, scale: 0.45, zIndex: 20, opacity: 0.95, filter: "drop-shadow(8px 10px 20px rgba(0,0,0,0.6)) brightness(0.8)" }
           }}
           whileHover={viewingDoc !== 'nested' ? { scale: 0.47, filter: "drop-shadow(12px 15px 30px rgba(0,0,0,0.7)) brightness(0.9)", zIndex: 28 } : undefined}
           transition={{ type: "spring", stiffness: 220, damping: 25 }}
           style={{ display: 'flex', perspective: 1500, transformStyle: "preserve-3d" }}
           onClick={(e) => { 
             e.stopPropagation(); 
             if (viewingDoc !== 'nested') {
               setViewingDoc('nested');
               playPageTurnSound();
             }
           }}
           onPointerDown={(e) => handlePointerDown(e, 'nested')}
           onPointerUp={handlePointerUp}
           onPointerLeave={handlePointerUp}
           className="absolute w-[90%] sm:w-[420px] h-[70vh] sm:h-[650px] flex-col rounded-r-[4px] rounded-l-[12px] cursor-pointer"
        >
          {/* External Ribbon Marker for Nested */}
          {bookmarks['nested'] && (
            <div className="absolute right-4 -top-6 w-8 h-20 bg-[#2f4f4f] drop-shadow-md z-[-1] transition-opacity duration-300"
                 style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 85%, 0 100%)" }} />
          )}

          <div className="absolute inset-0 bg-[#f0e8d5] rounded-r-[4px] rounded-l-[12px] border border-[#d1c5b4]/60 overflow-hidden flex flex-col z-[2] sm:z-0">
            {viewingDoc !== 'nested' && <div className="absolute inset-0 z-50 hover:bg-[#5a432b]/20 transition-colors pointer-events-none"></div>}
            
            {/* THE GLASS DETECTIVE COVER */}
          <AnimatePresence>
            {!isNovelCoverOpen && (
              <motion.div
                initial={false}
                exit={{ rotateY: -100, opacity: 0 }}
                transition={{ duration: 0.8, ease: "anticipate" }}
                style={{ transformOrigin: "left center" }}
                className="absolute inset-0 z-40 bg-[#163025] flex flex-col items-center justify-center border-l-[12px] border-[#0a1711] shadow-[inset_10px_0_20px_rgba(0,0,0,0.6)] cursor-pointer"
                onClick={(e) => {
                  if (viewingDoc === 'nested') {
                    e.stopPropagation();
                    setIsNovelCoverOpen(true);
                    playPageTurnSound();
                  }
                }}
              >
                <div className="absolute inset-0 noise-overlay opacity-30 pointer-events-none"></div>
                <div className="border border-[#d1c5b4]/20 p-8 sm:p-12 w-[85%] h-[85%] flex flex-col relative justify-center items-center gap-12 outline outline-1 outline-offset-[6px] outline-[#d1c5b4]/10 bg-[#142e23] shadow-2xl">
                  <div className="absolute top-4 left-4 right-4 bottom-4 border border-[#d1c5b4]/5 pointer-events-none"></div>
                  
                  <div className="flex flex-col items-center gap-8 relative z-10">
                    <p className="font-mono tracking-[0.5em] text-[#d1c5b4]/40 uppercase text-[10px] text-center border-t border-[#d1c5b4]/20 pt-4 w-full">
                       Pulp Fiction Fragment
                    </p>
                    <h1 className="font-glass text-4xl sm:text-5xl italic text-[#d1c5b4] text-center font-bold tracking-[0.06em] leading-tight drop-shadow-lg">The Glass<br/>Detective</h1>
                    <div className="w-16 h-px bg-gradient-to-r from-transparent via-[#d1c5b4]/50 to-transparent"></div>
                  </div>
                  
                  <div className="w-16 h-16 rounded-full border border-[#d1c5b4]/30 flex items-center justify-center absolute bottom-12 opacity-50 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    <span className="font-glass italic text-2xl text-[#d1c5b4]">T</span>
                  </div>
                </div>
                <div className="absolute right-6 bottom-6 text-[#d1c5b4]/30 font-glass italic text-sm animate-pulse tracking-widest">Click to open</div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="px-8 pt-8 pb-4 border-b border-[#d1c5b4]/60 text-[#8a7f6f] font-glass italic text-lg sm:text-xl text-center tracking-[0.2em] bg-[#f4ebd8]/50 relative">
             The Glass Detective
          </div>
          <div ref={nestedScrollRef} className="p-6 sm:p-10 flex-1 overflow-y-auto custom-scrollbar font-glass tracking-wider relative z-10" style={{ contain: 'paint' }}>
             {nestedHistory.length > 0 ? renderNodeList(nestedHistory, 'nested') : (
               <div className="opacity-40 text-center mt-20 flex flex-col items-center gap-4">
                 <div className="w-16 h-px bg-[#8a7f6f]/30"></div>
                 <div className="italic">This page was not intentionally left blank.</div>
                 <div className="w-16 h-px bg-[#8a7f6f]/30"></div>
               </div>
             )}
             <div className="h-16" />
          </div>
          </div>
        </motion.div>

        {/* DIARY PAPER */}
        <motion.div
           initial={false}
           animate={viewingDoc === 'diary' ? "active" : "inactive"}
           variants={{
             active: { x: "-50%", y: "-50%", left: "50%", top: "50%", rotate: 0, rotateX: bend.id === 'diary' ? bend.rx : 0, rotateY: bend.id === 'diary' ? bend.ry : 0, scale: bend.id === 'diary' ? 0.99 : 1, zIndex: 40, opacity: 1, filter: "drop-shadow(20px 0 60px rgba(0,0,0,0.8)) brightness(1)" },
             inactive: { x: "-50%", y: "-50%", left: "50%", top: "65%", rotate: -2, rotateX: 0, rotateY: 0, scale: 0.5, zIndex: 30, opacity: 0.95, filter: "drop-shadow(15px 15px 40px rgba(0,0,0,0.7)) brightness(0.85)" }
           }}
           whileHover={viewingDoc !== 'diary' ? { scale: 0.52, filter: "drop-shadow(20px 20px 50px rgba(0,0,0,0.8)) brightness(0.95)", zIndex: 35 } : undefined}
           transition={{ type: "spring", stiffness: 220, damping: 25 }}
           style={{ display: 'flex', transformStyle: "preserve-3d", perspective: 1500 }}
           onClick={(e) => { e.stopPropagation(); if (viewingDoc !== 'diary') { setViewingDoc('diary'); playPageTurnSound(); } }}
           onPointerDown={(e) => handlePointerDown(e, 'diary')}
           onPointerUp={handlePointerUp}
           onPointerLeave={handlePointerUp}
           className={`absolute w-[95%] sm:w-full max-w-3xl flex-col cursor-pointer ${viewingDoc === 'diary' ? 'h-full' : 'h-[90vh]'}`}
        >
          {/* External Ribbon Marker for Diary */}
          {bookmarks['diary'] && (
            <div className="absolute right-12 -top-6 w-10 h-28 bg-[#8c2a2a] drop-shadow-md z-[-1] transition-opacity duration-300"
                 style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 85%, 0 100%)" }} />
          )}

          <div className="absolute inset-0 flex flex-col sm:border-x border-[#b8a994] diary-bg z-[2] sm:z-0">
            {viewingDoc !== 'diary' && <div className="absolute inset-0 z-50 hover:bg-[#5a432b]/20 transition-colors pointer-events-none"></div>}
            
            {/* THE DIARY COVER */}
          <AnimatePresence>
            {!isDiaryCoverOpen && (
              <motion.div
                initial={false}
                exit={{ rotateY: -100, opacity: 0 }}
                transition={{ duration: 0.8, ease: "anticipate" }}
                style={{ transformOrigin: "left center" }}
                className="absolute inset-0 z-40 bg-[#401212] flex flex-col items-center justify-center border-l-[16px] border-[#290a0a] shadow-[inset_15px_0_30px_rgba(0,0,0,0.8)] cursor-pointer"
                onClick={(e) => {
                  if (viewingDoc === 'diary') {
                    e.stopPropagation();
                    setIsDiaryCoverOpen(true);
                    playPageTurnSound();
                  }
                }}
              >
                <div className="absolute inset-0 noise-overlay opacity-40 pointer-events-none"></div>
                
                {/* Book Spine Details */}
                <div className="absolute left-4 top-10 bottom-10 w-px bg-black/20 shadow-[1px_0_2px_rgba(255,255,255,0.1)]"></div>
                <div className="absolute left-8 top-0 bottom-0 w-8 flex flex-col justify-between py-12">
                   <div className="w-full h-px bg-black/30 shadow-[0_1px_1px_rgba(255,255,255,0.1)]"></div>
                   <div className="w-full h-px bg-black/30 shadow-[0_1px_1px_rgba(255,255,255,0.1)]"></div>
                   <div className="w-full h-px bg-black/30 shadow-[0_1px_1px_rgba(255,255,255,0.1)]"></div>
                </div>

                {/* Journal Title Box */}
                <div className="border border-[#ebd5b3]/30 p-8 sm:p-12 w-[70%] max-w-[340px] flex flex-col relative justify-center items-center gap-8 z-10 shadow-2xl bg-[#361010]">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.05)_0%,_transparent_100%)] mix-blend-screen"></div>
                  <div className="absolute top-3 left-3 w-3 h-3 rounded-full border border-[#ebd5b3]/40 flex items-center justify-center opacity-50"><div className="w-1 h-1 rounded-full bg-[#ebd5b3] shadow-[0_1px_2px_rgba(0,0,0,0.5)]"></div></div>
                  <div className="absolute top-3 right-3 w-3 h-3 rounded-full border border-[#ebd5b3]/40 flex items-center justify-center opacity-50"><div className="w-1 h-1 rounded-full bg-[#ebd5b3] shadow-[0_1px_2px_rgba(0,0,0,0.5)]"></div></div>
                  <div className="absolute bottom-3 left-3 w-3 h-3 rounded-full border border-[#ebd5b3]/40 flex items-center justify-center opacity-50"><div className="w-1 h-1 rounded-full bg-[#ebd5b3] shadow-[0_1px_2px_rgba(0,0,0,0.5)]"></div></div>
                  <div className="absolute bottom-3 right-3 w-3 h-3 rounded-full border border-[#ebd5b3]/40 flex items-center justify-center opacity-50"><div className="w-1 h-1 rounded-full bg-[#ebd5b3] shadow-[0_1px_2px_rgba(0,0,0,0.5)]"></div></div>
                  
                  <div className="flex flex-col items-center gap-5 relative z-10">
                    <p className="font-mono tracking-[0.5em] text-[#ebcea1]/60 uppercase text-[10px] sm:text-xs text-center border-b border-[#ebcea1]/20 pb-2">
                       Confidential File
                    </p>
                    <h1 className="font-serif text-3xl sm:text-4xl text-[#ebcea1] text-center font-bold tracking-[0.12em] drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)] leading-tight pt-2">
                      Personal File
                    </h1>
                    <div className="w-full flex items-center justify-center gap-3 mt-4">
                        <div className="h-px bg-gradient-to-r from-transparent to-[#ebcea1]/60 flex-1"></div>
                        <div className="w-2 h-2 rotate-45 border border-[#ebcea1]/60"></div>
                        <div className="h-px bg-gradient-to-l from-transparent to-[#ebcea1]/60 flex-1"></div>
                    </div>
                  </div>
                </div>
                
                <div className="absolute right-8 bottom-8 text-[#ebd5b3]/40 font-mono text-sm animate-pulse">
                   Click to open
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="hidden sm:block absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[rgba(0,0,0,0.15)] via-[rgba(255,255,255,0.15)] to-transparent pointer-events-none z-0"></div>
          
          <header className="shrink-0 flex justify-between items-start px-6 sm:px-8 pt-6 sm:pt-8 pb-4 border-b border-[#d1c5b4] uppercase tracking-widest text-[#7a6e5d] font-mono text-[10px] sm:text-xs relative z-10">
            <div className="flex flex-col gap-1 ml-4 sm:ml-8">
              <span className="opacity-70">Journal Entries</span>
              <span className="font-bold text-sm sm:text-lg tracking-wider font-serif normal-case text-[#2c241b]">Personal File</span>
            </div>
            <div className="text-right flex flex-col gap-2 items-end">
              <span className="px-2 py-0.5 border border-[#7a1c1c] text-[#7a1c1c] font-bold rotate-[-2deg] shadow-sm opacity-80 mix-blend-multiply rounded-sm">Confidential</span>
              <span className="text-[#5a4d41] font-bold font-serif italic text-sm mt-1">Found Property</span>
            </div>
          </header>

          <div className="relative flex-1 z-10">
            <main ref={diaryScrollRef} className="absolute top-0 bottom-0 -left-6 -right-6 sm:-left-20 sm:-right-20 md:-left-32 md:-right-32 xl:-left-[350px] xl:-right-[350px] overflow-y-auto overflow-x-hidden px-10 sm:px-28 md:px-44 xl:px-[390px] py-8 custom-scrollbar" style={{ contain: 'paint' }}>
              <article className="max-w-[600px] mx-auto text-[1.125rem] leading-[1.8] text-left text-[#3d3126] font-medium pt-2 pb-20">
                 {renderNodeList(diaryHistory, 'diary')}
                 <div className="h-16" />
              </article>
            </main>
          </div>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}

export default function App() {
  // phase: 标题 → 第一人称世界。阅读层（日记/玻璃侦探/报告）作为世界之上的覆盖层。
  const [phase, setPhase] = useState<"title" | "world">("title");
  const [continuing, setContinuing] = useState(false);
  const [readingOpen, setReadingOpen] = useState(false);
  const [decay, setDecay] = useState(0);
  const [musicOn, setMusicOn] = useState(true);
  const [sfxOn, setSfxOn] = useState(true);

  const audioRef = useRef<HTMLAudioElement>(null);
  const penRef = useRef<HTMLAudioElement>(null);

  useEnvironmentAudio(musicOn);

  // 打开游戏（标题界面）时就预加载字体/图片/音效，避免第一次进入「桌面」（阅读层）
  // 时还要现加载、卡住滚动。之前写字声 pen.mp3 走 WebAudio 增益节点，会被自动播放
  // 策略挂起而听不到——这里不再用增益，直接让 <audio> 原样播放，稳。
  useEffect(() => {
    try {
      const f: any = (document as any).fonts;
      f?.load?.("1.6rem 'Caveat'");
      f?.load?.("1.2rem 'EB Garamond'");
      f?.load?.("italic 1.2rem 'EB Garamond'");
      f?.load?.("1rem 'Crimson Pro'");
      f?.load?.("italic 1rem 'Crimson Pro'");
      f?.load?.("1rem 'JetBrains Mono'");
    } catch {
      /* ignore */
    }
    // 剧情照片 + 标题背景，提前进浏览器缓存
    ["bg", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"].forEach((n) => {
      const im = new Image();
      im.src = `./${n}.webp`;
    });
    // 音效预取
    ["./pen.mp3", "./booksound.mp3"].forEach((u) => {
      const a = new Audio();
      a.preload = "auto";
      a.src = u;
    });
  }, []);

  useEffect(() => {
    globalSfxOn = sfxOn;
    if (penRef.current) {
      penRef.current.muted = !sfxOn;
    }
  }, [sfxOn]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = !musicOn;
      audioRef.current.volume = 0.3; // 背景音乐压低，给房间音效让出空间
      if (musicOn) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [musicOn]);

  const hasSave = useMemo(() => {
    try {
      const saved = localStorage.getItem('greenbrookHistory');
      if (saved) {
        const parsed = JSON.parse(saved);
        // 只要日记被打开过（写入过存档）就算有进度可继续。新游戏会先清空存档，
        // 所以第一次进入只有「新游戏」，玩过一次后回首页就会出现「继续」。
        return Array.isArray(parsed) && parsed.length >= 1;
      }
      return false;
    } catch {
      return false;
    }
  }, [phase]); // Re-evaluate when returning to title

  const startAudio = () => {
    if (audioRef.current && musicOn) {
      audioRef.current.play().catch(() => {});
    }
    const penCtx = (window as any).penAudioContext as AudioContext | undefined;
    if (penCtx && penCtx.state === 'suspended') {
      penCtx.resume().catch(() => {});
    }
  };

  const handleContinueGame = () => {
    startAudio();
    setContinuing(true);
    setDecay(computeDecay());
    setReadingOpen(true); // 继续 = 直接回到日记，从上次的进度接着读
    setPhase("world");
  };

  const handleStartNewGame = () => {
    try {
      localStorage.removeItem('greenbrookHistory');
      localStorage.removeItem('greenbrookBookmarks');
      localStorage.removeItem('greenbrookPhotos');
    } catch (e) {
      // Ignored
    }
    startAudio();
    setContinuing(false);
    setDecay(0);
    setReadingOpen(false);
    setPhase("world");
  };

  const handleOpenReading = (_doc: ReadingDoc) => {
    // 条件渲染本身保证每次打开都是全新挂载，会从最新存档读取进度。
    setReadingOpen(true);
  };

  const handleCloseReading = () => {
    setReadingOpen(false);
    setDecay(computeDecay()); // 读完一段，世界更冷一些
  };

  const handleExitToTitle = () => {
    setReadingOpen(false);
    setPhase("title");
  };

  return (
    <>
      <audio ref={audioRef} src="./bgm.mp3" loop />
      <audio ref={penRef} src="./pen.mp3" loop />

      {phase === "world" && (
        <World
          decay={decay}
          sfx={sfxOn}
          readingOpen={readingOpen}
          continuing={continuing}
          onOpenReading={handleOpenReading}
          onExitToTitle={handleExitToTitle}
        />
      )}

      {phase === "world" && readingOpen && (
        <div className="fixed inset-0 z-40">
          <MainGame
            bgmRef={audioRef}
            penAudioRef={penRef}
            onReturnHome={handleCloseReading}
          />
        </div>
      )}

      <AnimatePresence>
        {phase === "title" && (
          <motion.div
            key="title-screen"
            className="fixed inset-0 z-50"
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          >
            <TitleScreen
              onStartNew={handleStartNewGame}
              onContinue={handleContinueGame}
              hasSave={hasSave}
              musicOn={musicOn}
              sfxOn={sfxOn}
              onToggleMusic={() => setMusicOn(!musicOn)}
              onToggleSfx={() => setSfxOn(!sfxOn)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
