import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Gift,
  Lock,
  MapPin,
  Settings,
  Skull,
  Star,
  Volume2,
  VolumeX,
} from 'lucide-react';
import mapAmberTerracesImg from '../assets/images/map_amber_terraces_1795782208221.jpg';
import mapBlossomSpringsImg from '../assets/images/map_blossom_springs_1795782208160.jpg';
import mapCrystalCoveImg from '../assets/images/map_crystal_cove_1795779603254.jpg';
import mapCrystalPeaksImg from '../assets/images/map_crystal_peaks_1795782209555.jpg';
import mapJungleTempleImg from '../assets/images/map_jungle_temple_1795779604600.jpg';
import mapTropicalLagoonImg from '../assets/images/map_tropical_lagoon_1795779603175.jpg';
import { FriendEntry, PlayerProgress, WorldTheme } from '../types/game';
import { getDifficultyForLevel, getWorldForLevel, WORLDS } from '../utils/levelGenerator';
import { MasteryBadge } from './MasteryBadge';

interface LevelJourneyMapProps {
  progress: PlayerProgress;
  maxUnlocked: number;
  visibleLimit: number;
  focusLevel?: number | null;
  sfxEnabled?: boolean;
  canClaimDaily?: boolean;
  canFreeSpin?: boolean;
  onSelectLevel: (level: number) => void;
  onLockedTap: (level: number) => void;
  onLoadMore: () => void;
  onEnsureVisibleLevel?: (level: number) => void;
  onToggleSfx?: () => void;
  onOpenSettings?: () => void;
  onOpenDailyModal?: () => void;
  onOpenWheel?: () => void;
  onOpenMasteryShowcase?: (levelId: number) => void;
  reduceMotion: boolean;
}

interface ChapterNode {
  level: number;
  xPercent: number;
  y: number;
  isBossNode: boolean;
}

interface ChapterSegment {
  key: string;
  d: string;
  unlocked: boolean;
  completed: boolean;
}

interface WorldChapterData {
  world: WorldTheme;
  levelStart: number;
  levelEnd: number;
  actualEnd: number;
  canvasHeight: number;
  nodes: ChapterNode[];
  segments: ChapterSegment[];
  clearedCount: number;
  starsCount: number;
}

interface WorldBackgroundTheme {
  image: string;
  tintOverlay: string;
  fallbackGradient: string;
  headerBg: string;
  borderAccent: string;
}

const WORLD_BACKGROUNDS: Record<number, WorldBackgroundTheme> = {
  1: {
    image: mapTropicalLagoonImg,
    tintOverlay: 'linear-gradient(180deg, rgba(16, 132, 184, 0.08) 0%, rgba(18, 168, 80, 0.08) 100%)',
    fallbackGradient: 'linear-gradient(180deg, #32C5F4 0%, #1CA3D9 52%, #1084B8 100%)',
    headerBg: 'from-[#0D5B85]/92 to-[#1374A8]/88',
    borderAccent: '#6EE7B7',
  },
  2: {
    image: mapAmberTerracesImg,
    tintOverlay: 'linear-gradient(180deg, rgba(229, 152, 25, 0.06) 0%, rgba(180, 83, 9, 0.12) 100%)',
    fallbackGradient: 'linear-gradient(180deg, #F59E0B 0%, #D97706 52%, #14B8A6 100%)',
    headerBg: 'from-[#92400E]/92 to-[#B45309]/88',
    borderAccent: '#FCD34D',
  },
  3: {
    image: mapBlossomSpringsImg,
    tintOverlay: 'linear-gradient(180deg, rgba(236, 72, 153, 0.06) 0%, rgba(14, 165, 233, 0.08) 100%)',
    fallbackGradient: 'linear-gradient(180deg, #F9A8D4 0%, #38BDF8 52%, #0284C7 100%)',
    headerBg: 'from-[#9D174D]/92 to-[#BE185D]/88',
    borderAccent: '#F9A8D4',
  },
  4: {
    image: mapJungleTempleImg,
    tintOverlay: 'linear-gradient(180deg, rgba(101, 163, 13, 0.08) 0%, rgba(20, 184, 166, 0.1) 100%)',
    fallbackGradient: 'linear-gradient(180deg, #4ADE80 0%, #14B8A6 52%, #0F766E 100%)',
    headerBg: 'from-[#166534]/92 to-[#15803D]/88',
    borderAccent: '#86EFAC',
  },
  5: {
    image: mapAmberTerracesImg,
    tintOverlay: 'linear-gradient(180deg, rgba(194, 65, 12, 0.24) 0%, rgba(154, 52, 18, 0.22) 100%)',
    fallbackGradient: 'linear-gradient(180deg, #EA580C 0%, #C2410C 52%, #7C2D12 100%)',
    headerBg: 'from-[#7C2D12]/92 to-[#9A3412]/88',
    borderAccent: '#FDBA74',
  },
  6: {
    image: mapJungleTempleImg,
    tintOverlay: 'linear-gradient(180deg, rgba(234, 179, 8, 0.22) 0%, rgba(180, 83, 9, 0.18) 100%)',
    fallbackGradient: 'linear-gradient(180deg, #FACC15 0%, #D97706 52%, #0D9488 100%)',
    headerBg: 'from-[#854D0E]/92 to-[#A16207]/88',
    borderAccent: '#FDE047',
  },
  7: {
    image: mapCrystalCoveImg,
    tintOverlay: 'linear-gradient(180deg, rgba(2, 132, 199, 0.1) 0%, rgba(6, 182, 212, 0.12) 100%)',
    fallbackGradient: 'linear-gradient(180deg, #38BDF8 0%, #0284C7 52%, #0369A1 100%)',
    headerBg: 'from-[#075985]/92 to-[#0369A1]/88',
    borderAccent: '#7DD3FC',
  },
  8: {
    image: mapCrystalPeaksImg,
    tintOverlay: 'linear-gradient(180deg, rgba(109, 40, 217, 0.12) 0%, rgba(79, 70, 229, 0.12) 100%)',
    fallbackGradient: 'linear-gradient(180deg, #8B5CF6 0%, #6D28D9 52%, #1E1B4B 100%)',
    headerBg: 'from-[#4C1D95]/92 to-[#5B21B6]/88',
    borderAccent: '#C4B5FD',
  },
  9: {
    image: mapTropicalLagoonImg,
    tintOverlay: 'linear-gradient(180deg, rgba(5, 150, 105, 0.22) 0%, rgba(6, 95, 70, 0.24) 100%)',
    fallbackGradient: 'linear-gradient(180deg, #34D399 0%, #059669 52%, #064E3B 100%)',
    headerBg: 'from-[#064E3B]/92 to-[#065F46]/88',
    borderAccent: '#6EE7B7',
  },
  10: {
    image: mapCrystalPeaksImg,
    tintOverlay: 'linear-gradient(180deg, rgba(168, 85, 247, 0.22) 0%, rgba(236, 72, 153, 0.18) 100%)',
    fallbackGradient: 'linear-gradient(180deg, #A855F7 0%, #7E22CE 52%, #3B0764 100%)',
    headerBg: 'from-[#581C87]/92 to-[#701A75]/88',
    borderAccent: '#E9D5FF',
  },
};

function getWorldBgTheme(worldId: number): WorldBackgroundTheme {
  const mappedId = ((worldId - 1) % 10) + 1;
  return WORLD_BACKGROUNDS[mappedId] ?? WORLD_BACKGROUNDS[1];
}

const NODE_STEP_Y = 78;
const CHAPTER_TOP_PAD = 64;
const CHAPTER_BOTTOM_PAD = 68;

function buildSeparatedChapters(
  visibleLimit: number,
  completedLevels: Record<string, boolean>,
  levelStars: Record<string, number>,
  maxUnlocked: number
): WorldChapterData[] {
  const worldCount = Math.ceil(visibleLimit / 20);
  const chapters: WorldChapterData[] = [];

  for (let w = 0; w < worldCount; w++) {
    const levelStart = w * 20 + 1;
    const levelEnd = (w + 1) * 20;
    const actualEnd = Math.min(visibleLimit, levelEnd);
    const world = getWorldForLevel(levelStart);
    const countInChapter = actualEnd - levelStart + 1;

    const canvasHeight =
      CHAPTER_TOP_PAD + Math.max(0, countInChapter - 1) * NODE_STEP_Y + CHAPTER_BOTTOM_PAD;

    const nodes: ChapterNode[] = [];
    let clearedCount = 0;
    let starsCount = 0;

    for (let i = 0; i < countInChapter; i++) {
      const level = levelStart + i;
      if (completedLevels[String(level)]) clearedCount += 1;
      starsCount += Number(levelStars[String(level)]) || 0;

      // Smooth winding path inside each 20-level world (levelStart at bottom -> actualEnd at top)
      const wave = Math.sin(i * 0.72 + (world.id % 2 === 0 ? 0.9 : 0.15));
      const xPercent = 52 + wave * 24;
      const y = canvasHeight - CHAPTER_BOTTOM_PAD - i * NODE_STEP_Y;

      nodes.push({
        level,
        xPercent,
        y,
        isBossNode: level % 5 === 0,
      });
    }

    const segments: ChapterSegment[] = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i];
      const b = nodes[i + 1];
      const x1 = a.xPercent * 10;
      const y1 = a.y;
      const x2 = b.xPercent * 10;
      const y2 = b.y;
      const midY = (y1 + y2) / 2;
      segments.push({
        key: `${a.level}-${b.level}`,
        d: `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`,
        completed: Boolean(completedLevels[String(a.level)]),
        unlocked: b.level <= maxUnlocked,
      });
    }

    chapters.push({
      world,
      levelStart,
      levelEnd,
      actualEnd,
      canvasHeight,
      nodes,
      segments,
      clearedCount,
      starsCount,
    });
  }

  // Render higher worlds above lower worlds so ascending bottom-to-top flows naturally upward
  return chapters.reverse();
}

export const LevelJourneyMap: React.FC<LevelJourneyMapProps> = ({
  progress,
  maxUnlocked,
  visibleLimit,
  focusLevel,
  sfxEnabled = true,
  canClaimDaily = false,
  canFreeSpin = false,
  onSelectLevel,
  onLockedTap,
  onLoadMore,
  onEnsureVisibleLevel,
  onToggleSfx,
  onOpenSettings,
  onOpenDailyModal,
  onOpenWheel,
  onOpenMasteryShowcase,
  reduceMotion,
}) => {
  const nodeRefs = useRef<Map<number, HTMLButtonElement | null>>(new Map());
  const chapterRefs = useRef<Map<number, HTMLElement | null>>(new Map());
  const bgParallaxRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const prevScrollMetricsRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);
  const lastAutoTriggeredLimitRef = useRef<number>(0);
  const [pendingScrollWorld, setPendingScrollWorld] = useState<number | null>(null);
  const [pendingScrollLevel, setPendingScrollLevel] = useState<number | null>(null);
  const [failedWorlds, setFailedWorlds] = useState<Record<number, boolean>>({});

  const worldTabs = useMemo(() => {
    const tabCount = Math.max(WORLDS.length, Math.ceil(visibleLimit / 20) + 1);
    return Array.from({ length: tabCount }, (_, idx) => getWorldForLevel(idx * 20 + 1));
  }, [visibleLimit]);

  const chapters = useMemo(
    () =>
      buildSeparatedChapters(
        visibleLimit,
        progress.completedLevels,
        progress.levelStars,
        maxUnlocked
      ),
    [visibleLimit, progress.completedLevels, progress.levelStars, maxUnlocked]
  );

  const friendsByLevel = useMemo(() => {
    const map = new Map<number, FriendEntry[]>();
    progress.friends.forEach((friend) => {
      const list = map.get(friend.level) ?? [];
      list.push(friend);
      map.set(friend.level, list);
    });
    return map;
  }, [progress.friends]);

  const scrollToLevel = (targetLv: number) => {
    const el = nodeRefs.current.get(targetLv);
    if (el) {
      el.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'center',
      });
      return true;
    }
    return false;
  };

  const scrollToWorld = (worldId: number) => {
    const el = chapterRefs.current.get(worldId);
    if (el) {
      el.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      });
      return true;
    }
    return false;
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      scrollToLevel(progress.currentLevel);
    }, 80);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  useEffect(() => {
    if (focusLevel && focusLevel > 0) {
      if (!scrollToLevel(focusLevel)) {
        onEnsureVisibleLevel?.(focusLevel);
        setPendingScrollLevel(focusLevel);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusLevel]);

  useEffect(() => {
    if (pendingScrollWorld !== null) {
      if (scrollToWorld(pendingScrollWorld)) {
        setPendingScrollWorld(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleLimit, pendingScrollWorld]);

  useEffect(() => {
    if (pendingScrollLevel !== null) {
      if (scrollToLevel(pendingScrollLevel)) {
        setPendingScrollLevel(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleLimit, pendingScrollLevel]);

  // Subtle GPU-composited parallax scrolling effect across island backgrounds
  useEffect(() => {
    if (reduceMotion) {
      bgParallaxRefs.current.forEach((bgEl) => {
        if (bgEl) bgEl.style.transform = 'translate3d(0, 0, 0)';
      });
      return;
    }

    const container = scrollContainerRef.current;
    if (!container) return;

    let rafId: number | null = null;

    const updateParallax = () => {
      rafId = null;
      const containerRect = container.getBoundingClientRect();
      const viewportCenterY = containerRect.top + containerRect.height / 2;

      chapterRefs.current.forEach((sectionEl, worldId) => {
        const bgEl = bgParallaxRefs.current.get(worldId);
        if (!sectionEl || !bgEl) return;

        const rect = sectionEl.getBoundingClientRect();
        // Skip off-screen islands for minimal work
        if (rect.bottom < containerRect.top - 120 || rect.top > containerRect.bottom + 120) {
          return;
        }

        const sectionCenterY = rect.top + rect.height / 2;
        const delta = (viewportCenterY - sectionCenterY) * 0.085;
        const clamped = Math.max(-52, Math.min(52, delta));
        bgEl.style.transform = `translate3d(0, ${clamped.toFixed(1)}px, 0) scale(1.04)`;
      });
    };

    const triggerLoadMoreWithAnchor = () => {
      if (
        container.scrollTop < 140 &&
        lastAutoTriggeredLimitRef.current !== visibleLimit &&
        pendingScrollWorld === null &&
        pendingScrollLevel === null
      ) {
        lastAutoTriggeredLimitRef.current = visibleLimit;
        prevScrollMetricsRef.current = {
          scrollHeight: container.scrollHeight,
          scrollTop: container.scrollTop,
        };
        onLoadMore();
      }
    };

    const scheduleUpdate = () => {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(() => {
          updateParallax();
          triggerLoadMoreWithAnchor();
        });
      }
    };

    // Initial position sync (parallax only, do not auto-trigger load on first mount)
    rafId = window.requestAnimationFrame(updateParallax);

    container.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });

    return () => {
      container.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [reduceMotion, chapters, visibleLimit, pendingScrollWorld, pendingScrollLevel, onLoadMore]);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    const saved = prevScrollMetricsRef.current;
    if (container && saved && pendingScrollWorld === null && pendingScrollLevel === null) {
      const heightDiff = container.scrollHeight - saved.scrollHeight;
      if (heightDiff > 0) {
        container.scrollTop = saved.scrollTop + heightDiff;
      }
      prevScrollMetricsRef.current = null;
    }
  }, [visibleLimit, pendingScrollWorld, pendingScrollLevel]);

  const handleWorldTabClick = (worldId: number, levelEnd: number) => {
    if (levelEnd > visibleLimit) {
      onEnsureVisibleLevel?.(levelEnd);
      setPendingScrollWorld(worldId);
    } else {
      scrollToWorld(worldId);
    }
  };

  const currentWorld = getWorldForLevel(progress.currentLevel);

  return (
    <section
      aria-label="Level Progression Map"
      className="relative rounded-3xl overflow-hidden border-2 theme-border theme-surface-glass shadow-[0_20px_50px_-14px_rgba(7,52,92,0.35)] flex flex-col"
    >
      {/* Compact Sticky Top World Quick-Jump Strip */}
      <div className="sticky top-0 z-20 bg-gradient-to-b from-[#0E5D8B]/95 to-[#1374A8]/92 border-b border-white/25">
        <div className="flex items-center justify-between gap-3 px-4 pt-2.5 pb-1.5">
          <div className="min-w-0">
            <h2 className="font-display text-base sm:text-lg font-bold text-white truncate leading-tight">
              World {currentWorld.id} · {currentWorld.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => scrollToLevel(progress.currentLevel)}
            className="inline-flex items-center gap-1.5 min-h-[34px] px-3 py-1 rounded-full bg-white text-[#0A5385] text-xs font-display font-bold shadow-md hover:scale-105 active:scale-95 transition-transform whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
          >
            <MapPin className="w-3.5 h-3.5 text-[#349E0F]" />
            <span>Lv {progress.currentLevel}</span>
          </button>
        </div>

        <div
          role="tablist"
          aria-label="Jump to world chapter"
          className="px-4 pb-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar"
        >
          {worldTabs.map((world) => {
            const isCurrentWorld = world.id === currentWorld.id;
            const worldUnlocked = maxUnlocked >= world.levelStart;
            let clearedCount = 0;
            for (let lv = world.levelStart; lv <= world.levelEnd; lv++) {
              if (progress.completedLevels[String(lv)]) clearedCount += 1;
            }
            const worldComplete = clearedCount >= 20;

            return (
              <button
                key={world.id}
                type="button"
                role="tab"
                aria-selected={isCurrentWorld}
                onClick={() => handleWorldTabClick(world.id, world.levelEnd)}
                title={`World ${world.id}: ${world.name} (Levels ${world.levelStart}–${world.levelEnd})`}
                className={`min-h-[30px] px-2.5 py-1 rounded-full border text-xs font-display font-bold inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer transition-all tabular-nums ${
                  isCurrentWorld
                    ? 'bg-white text-[#0A5385] border-white shadow-sm'
                    : worldUnlocked
                    ? 'bg-white/18 text-white border-white/30 hover:bg-white/28'
                    : 'bg-black/20 text-white/65 border-white/15 hover:bg-black/30'
                }`}
              >
                <span>W{world.id}</span>
                {worldComplete ? (
                  <Check className="w-3 h-3 text-[#2E9E46]" />
                ) : !worldUnlocked ? (
                  <Lock className="w-2.5 h-2.5 opacity-80" />
                ) : null}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              const nextWorldId = Math.ceil(visibleLimit / 20) + 1;
              onLoadMore();
              setPendingScrollWorld(nextWorldId);
            }}
            title="Load more endless worlds"
            className="min-h-[30px] px-2.5 py-1 rounded-full border border-white/35 bg-white/20 hover:bg-white/30 text-white text-xs font-display font-bold inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer transition-all"
          >
            <span>∞ +5 Worlds</span>
          </button>
        </div>
      </div>

      {/* Scrollable Separated 20-Level Worlds Container */}
      <div className="relative w-full">
        {/* Left Floating Translucent Game Control Rail */}
        <div className="pointer-events-none absolute inset-y-4 left-3 z-20 flex flex-col justify-between">
          <div className="pointer-events-auto flex flex-col items-center gap-2 p-1.5 rounded-3xl bg-[#093252]/45 border border-white/25 shadow-lg">
            {onToggleSfx && (
              <button
                type="button"
                onClick={onToggleSfx}
                aria-label={sfxEnabled ? 'Mute sound effects' : 'Enable sound effects'}
                title={sfxEnabled ? 'Sound On' : 'Sound Muted'}
                className="w-10 h-10 rounded-2xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                {sfxEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 opacity-80" />}
              </button>
            )}
            <button
              type="button"
              onClick={() => scrollToLevel(progress.currentLevel)}
              aria-label={`Locate current level ${progress.currentLevel}`}
              title={`Locate Level ${progress.currentLevel}`}
              className="w-10 h-10 rounded-2xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <MapPin className="w-5 h-5" />
            </button>
          </div>

          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Open game settings"
              title="Settings"
              className="pointer-events-auto w-12 h-12 rounded-2xl node-island-complete border-[3px] border-white text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              <Settings className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Top-Right Floating Daily Gift & Lucky Spin Wheel Shortcuts */}
        {(onOpenDailyModal || onOpenWheel) && (
          <div className="pointer-events-none absolute top-3 right-3 z-20 flex flex-col items-center gap-2.5">
            {onOpenDailyModal && (
              <button
                type="button"
                onClick={onOpenDailyModal}
                aria-label="Open daily login gift"
                title="Daily Gift"
                className={`pointer-events-auto relative w-12 h-12 rounded-2xl border-[3px] border-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-transform cursor-pointer ${
                  canClaimDaily
                    ? 'bg-gradient-to-b from-[#FFE169] via-[#F9A825] to-[#E65100] text-white'
                    : 'bg-[#0C4D78]/80 text-white/95'
                }`}
              >
                <Gift className="w-6 h-6" />
                {canClaimDaily && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#FF2E63] border-2 border-white text-[10px] font-display font-extrabold text-white flex items-center justify-center shadow-sm">
                    !
                  </span>
                )}
              </button>
            )}

            {onOpenWheel && (
              <button
                type="button"
                onClick={onOpenWheel}
                aria-label="Open Lucky Spin Wheel"
                title={canFreeSpin ? 'Free Spin Ready!' : 'Lucky Spin Wheel'}
                className="pointer-events-auto relative w-12 h-12 rounded-full border-[3px] border-white bg-[#0C4D78]/85 flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-transform cursor-pointer"
              >
                <svg viewBox="0 0 36 36" className="w-8 h-8" aria-hidden="true">
                  <circle cx="18" cy="18" r="16" fill="#FFFDF7" />
                  <path d="M18 18 L18 2 A16 16 0 0 1 29.3 6.7 Z" fill="#F59E0B" />
                  <path d="M18 18 L29.3 6.7 A16 16 0 0 1 34 18 Z" fill="#EC4899" />
                  <path d="M18 18 L34 18 A16 16 0 0 1 29.3 29.3 Z" fill="#64748B" />
                  <path d="M18 18 L29.3 29.3 A16 16 0 0 1 18 34 Z" fill="#10B981" />
                  <path d="M18 18 L18 34 A16 16 0 0 1 6.7 29.3 Z" fill="#0EA5E9" />
                  <path d="M18 18 L6.7 29.3 A16 16 0 0 1 2 18 Z" fill="#8B5CF6" />
                  <path d="M18 18 L2 18 A16 16 0 0 1 6.7 6.7 Z" fill="#475569" />
                  <path d="M18 18 L6.7 6.7 A16 16 0 0 1 18 2 Z" fill="#E55A3C" />
                  <circle cx="18" cy="18" r="4.5" fill="#FFFDF7" stroke="#B45309" strokeWidth="1.5" />
                </svg>
                {canFreeSpin && (
                  <span className="absolute -bottom-1.5 px-1.5 py-0.5 rounded-full bg-[#16A34A] border border-white text-[8px] font-display font-extrabold text-white tracking-wide leading-none shadow-xs">
                    FREE
                  </span>
                )}
              </button>
            )}
          </div>
        )}

        <div
          ref={scrollContainerRef}
          className="relative w-full overflow-y-auto overflow-x-hidden min-h-[60dvh] max-h-[calc(100dvh-225px)] lg:max-h-[calc(100dvh-180px)] scroll-smooth p-2.5 sm:p-4 space-y-6"
        >
          {/* Load More Higher Worlds Button at Summit */}
          <div className="pt-1 flex justify-center">
            <button
              type="button"
              onClick={() => {
                const container = scrollContainerRef.current;
                if (container) {
                  prevScrollMetricsRef.current = {
                    scrollHeight: container.scrollHeight,
                    scrollTop: container.scrollTop,
                  };
                }
                onLoadMore();
              }}
              className="min-h-[42px] px-5 py-2 rounded-full bg-white text-[#094D7A] border-2 border-[#7EDBF5] text-xs sm:text-sm font-display font-bold shadow-md hover:scale-105 active:scale-95 transition-transform cursor-pointer whitespace-nowrap tabular-nums"
            >
              Load Higher Islands ({visibleLimit + 1}–{visibleLimit + 100}) · ∞ Endless
            </button>
          </div>

          {/* Distinct Separated 20-Level World Chapters, each with its own World Background */}
          {chapters.map((chapter, chapterIdx) => {
            const bgTheme = getWorldBgTheme(chapter.world.id);
            const worldPct = Math.round((chapter.clearedCount / 20) * 100);
            const isNearCurrent = Math.abs(chapter.world.id - currentWorld.id) <= 1;

            return (
              <React.Fragment key={`chapter-block-${chapter.world.id}`}>
                <section
                  ref={(el) => {
                    chapterRefs.current.set(chapter.world.id, el);
                  }}
                  aria-label={`World ${chapter.world.id}: ${chapter.world.name}`}
                  className="relative rounded-3xl overflow-hidden border-[3px] shadow-[0_18px_40px_-14px_rgba(7,36,64,0.45)] scroll-mt-3"
                  style={{
                    borderColor: bgTheme.borderAccent,
                    contain: 'layout paint style',
                  }}
                >
                  {/* Dedicated 20-Level World Header Gate */}
                  <div
                    className={`relative z-15 bg-gradient-to-r ${bgTheme.headerBg} px-4 sm:px-5 py-3 border-b border-white/25 text-white`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-white/85 tabular-nums">
                          World {chapter.world.id} · Levels {chapter.levelStart}–{chapter.levelEnd}
                        </div>
                        <h3 className="font-display text-base sm:text-lg font-bold truncate leading-tight">
                          {chapter.world.name}
                        </h3>
                      </div>

                      <div className="shrink-0 flex items-center gap-2.5 text-right tabular-nums">
                        <div className="px-2.5 py-1 rounded-xl bg-black/25 border border-white/20">
                          <div className="font-display text-xs font-bold leading-none">
                            {chapter.clearedCount}/20
                          </div>
                          <div className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-bold text-[#FFD62E] leading-none">
                            <Star className="w-3 h-3 fill-[#FFD62E] text-[#FFD62E]" />
                            <span>{chapter.starsCount}/60</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 w-full h-1.5 rounded-full bg-white/20 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#FFE066] transition-all duration-300"
                        style={{ width: `${Math.max(chapter.clearedCount > 0 ? 4 : 0, worldPct)}%` }}
                      />
                    </div>
                  </div>

                  {/* Separated 20-Level Island Biome Canvas */}
                  <div
                    className="relative w-full overflow-hidden"
                    style={{
                      height: `${chapter.canvasHeight}px`,
                      background: bgTheme.fallbackGradient,
                    }}
                  >
                    {/* Overscanned Parallax Background Layer */}
                    <div
                      ref={(el) => {
                        bgParallaxRefs.current.set(chapter.world.id, el);
                      }}
                      aria-hidden="true"
                      className="absolute left-0 right-0 -top-[10%] h-[120%] pointer-events-none"
                      style={{ willChange: reduceMotion ? 'auto' : 'transform' }}
                    >
                      {!failedWorlds[chapter.world.id] && (
                        <img
                          src={bgTheme.image}
                          alt={`World ${chapter.world.id}: ${chapter.world.name}`}
                          loading={isNearCurrent ? 'eager' : 'lazy'}
                          decoding="async"
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setFailedWorlds((prev) => ({
                              ...prev,
                              [chapter.world.id]: true,
                            }))
                          }
                          className="w-full h-full object-cover object-center select-none pointer-events-none"
                        />
                      )}

                      {/* Per-World Atmospheric Color Tint */}
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: bgTheme.tintOverlay }}
                      />
                    </div>

                    {/* Winding Trail inside this 20-Level World */}
                    <svg
                      viewBox={`0 0 1000 ${chapter.canvasHeight}`}
                      preserveAspectRatio="none"
                      className="absolute inset-0 w-full h-full pointer-events-none z-[5]"
                      aria-hidden="true"
                    >
                      {chapter.segments.map((seg) => (
                        <path
                          key={`shadow-${seg.key}`}
                          d={seg.d}
                          fill="none"
                          stroke="rgba(7, 56, 86, 0.34)"
                          strokeWidth="20"
                          strokeLinecap="round"
                        />
                      ))}

                      {chapter.segments.map((seg) => (
                        <path
                          key={`trail-${seg.key}`}
                          d={seg.d}
                          fill="none"
                          stroke={
                            seg.completed
                              ? '#FFFDF6'
                              : seg.unlocked
                              ? '#D6FAFF'
                              : 'rgba(255, 255, 255, 0.62)'
                          }
                          strokeWidth={seg.completed || seg.unlocked ? '12' : '9'}
                          strokeDasharray={seg.unlocked || seg.completed ? undefined : '12 14'}
                          strokeLinecap="round"
                        />
                      ))}

                      {chapter.segments
                        .filter((seg) => seg.completed)
                        .map((seg) => (
                          <path
                            key={`glow-${seg.key}`}
                            d={seg.d}
                            fill="none"
                            stroke="#8FF4FF"
                            strokeWidth="4"
                            strokeLinecap="round"
                            opacity="0.72"
                          />
                        ))}
                    </svg>

                    {/* 20 Level Discs inside this World */}
                    {chapter.nodes.map((node) => {
                      const isCompleted = Boolean(progress.completedLevels[String(node.level)]);
                      const isCurrent = node.level === progress.currentLevel;
                      const isLocked = node.level > maxUnlocked;
                      const stars =
                        Number(progress.levelStars[String(node.level)]) || (isCompleted ? 1 : 0);
                      const isPerfect = Boolean(progress.perfectLevels?.[String(node.level)]);
                      const difficulty = getDifficultyForLevel(node.level);
                      const showBossSkull = node.isBossNode && !isCompleted && !isCurrent;
                      const nodeFriends = friendsByLevel.get(node.level) ?? [];
                      const placeFriendsLeft = node.xPercent > 54;

                      const handlePress = () => {
                        if (isLocked) {
                          onLockedTap(node.level);
                        } else if (isPerfect && onOpenMasteryShowcase) {
                          onOpenMasteryShowcase(node.level);
                        } else {
                          onSelectLevel(node.level);
                        }
                      };

                      return (
                        <div
                          key={`node-wrap-${node.level}`}
                          className="absolute flex flex-col items-center"
                          style={{
                            left: `${node.xPercent}%`,
                            top: `${node.y}px`,
                            transform: 'translate(-50%, -50%)',
                            zIndex: isCurrent ? 18 : nodeFriends.length > 0 ? 14 : 11,
                          }}
                        >
                          {/* Crisp Static Halo Ring behind Current Active Level (zero animated characters) */}
                          {isCurrent && (
                            <span
                              aria-hidden="true"
                              className="absolute inset-0 -m-2 rounded-full border-[3px] border-[#D6FF9E]/90 shadow-[0_0_20px_rgba(163,255,82,0.5)] pointer-events-none"
                            />
                          )}

                          {/* Real Friends currently on this Level */}
                          {nodeFriends.length > 0 && (
                            <div
                              className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none ${
                                placeFriendsLeft
                                  ? 'right-[calc(100%+10px)] flex-row-reverse'
                                  : 'left-[calc(100%+10px)]'
                              }`}
                            >
                              {nodeFriends.slice(0, 2).map((friend) => (
                                <div
                                  key={friend.id}
                                  title={`${friend.name} · Level ${friend.level}`}
                                  className="flex items-center gap-1 rounded-2xl bg-white/95 border-2 border-white px-1.5 py-0.5 shadow-lg"
                                >
                                  <span
                                    className="w-6 h-6 rounded-xl border border-white text-white font-display text-[10px] font-bold flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: friend.avatarColor }}
                                  >
                                    {friend.name.slice(0, 2).toUpperCase()}
                                  </span>
                                  <span className="text-[11px] font-bold text-[#0A3A5C] whitespace-nowrap pr-1">
                                    {friend.name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Glossy 3D Circular Island Disc Button */}
                          <button
                            ref={(el) => {
                              nodeRefs.current.set(node.level, el);
                            }}
                            type="button"
                            onClick={handlePress}
                            aria-label={
                              isLocked
                                ? `Level ${node.level}, ${difficulty}, locked`
                                : isCurrent
                                ? `Play Level ${node.level}, ${difficulty}`
                                : `Level ${node.level}, ${stars} of 3 stars`
                            }
                            className={`relative flex items-center justify-center rounded-full border-[4px] transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${
                              isCurrent
                                ? 'w-[72px] h-[72px] node-island-current border-white text-white cursor-pointer hover:scale-105 active:scale-95'
                                : isCompleted
                                ? `w-[64px] h-[64px] node-island-complete ${
                                    stars >= 3
                                      ? 'border-[#FFF6B3] ring-2 ring-[#FFD426]/80'
                                      : 'border-white'
                                  } text-white cursor-pointer hover:scale-105 active:scale-95`
                                : showBossSkull
                                ? 'w-[62px] h-[62px] node-island-boss border-white text-white cursor-pointer hover:scale-105 active:scale-95'
                                : isLocked
                                ? 'w-[56px] h-[56px] node-island-locked border-[#EDF5FA] text-white cursor-not-allowed active:scale-95'
                                : 'w-[62px] h-[62px] node-island-unlocked border-white text-white cursor-pointer hover:scale-105 active:scale-95'
                            }`}
                          >
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute top-1 left-2 right-2 h-5 rounded-full bg-gradient-to-b from-white/50 to-transparent"
                            />

                            {showBossSkull ? (
                              <Skull className="relative z-10 w-7 h-7 text-white drop-shadow-[0_2px_2px_rgba(110,8,38,0.5)]" />
                            ) : isLocked ? (
                              <Lock className="relative z-10 w-5 h-5 text-white drop-shadow-[0_1px_2px_rgba(32,52,70,0.45)]" />
                            ) : (
                              <span
                                className={`relative z-10 font-display font-extrabold leading-none tabular-nums drop-shadow-[0_2px_2px_rgba(7,48,94,0.55)] ${
                                  isCurrent ? 'text-[26px]' : 'text-[21px]'
                                }`}
                              >
                                {node.level}
                              </span>
                            )}
                          </button>

                          {/* Fanned Glossy Gold Stars Directly Beneath Completed Nodes */}
                          {isCompleted && (
                            <div
                              aria-label={`${stars} of 3 stars earned`}
                              className="relative z-10 -mt-3 flex items-center justify-center gap-0.5 pointer-events-none"
                            >
                              {[1, 2, 3].map((s) => {
                                const earned = s <= stars;
                                return (
                                  <Star
                                    key={s}
                                    className={`${
                                      s === 1
                                        ? 'w-4 h-4 -rotate-12 translate-y-0.5'
                                        : s === 2
                                        ? 'w-5 h-5 -translate-y-0.5 scale-110'
                                        : 'w-4 h-4 rotate-12 translate-y-0.5'
                                    } ${
                                      earned
                                        ? 'text-[#B86200] fill-[#FFD62E] drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]'
                                        : 'text-white/60 fill-[#0C3C66]/45'
                                    }`}
                                  />
                                );
                              })}
                            </div>
                          )}

                          {/* Mastery Badge for Perfect Score Clears */}
                          {isCompleted && isPerfect && (
                            <div className="relative z-15 -mt-0.5">
                              <MasteryBadge
                                level={node.level}
                                onClick={() => {
                                  if (onOpenMasteryShowcase) {
                                    onOpenMasteryShowcase(node.level);
                                  } else {
                                    onSelectLevel(node.level);
                                  }
                                }}
                              />
                            </div>
                          )}

                          {/* Level Number Badge on Locked / Skull Discs */}
                          {(showBossSkull || isLocked) && (
                            <span
                              className={`-mt-1.5 relative z-10 px-1.5 py-0.5 rounded-full text-[10px] font-display font-bold border border-white/70 shadow-sm tabular-nums leading-none whitespace-nowrap ${
                                showBossSkull
                                  ? 'bg-[#8E0B32]/90 text-white'
                                  : 'bg-[#123B59]/80 text-white/95'
                              }`}
                            >
                              {node.level}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Clear Visual Boundary Divider Between Each 20-Level World */}
                {chapterIdx < chapters.length - 1 && (
                  <div
                    aria-hidden="true"
                    className="flex items-center justify-center gap-3 px-6 py-0.5"
                  >
                    <div className="h-[2px] flex-1 rounded-full bg-gradient-to-r from-transparent via-black/15 dark:via-white/20 to-black/15 dark:to-white/20" />
                    <span className="text-[11px] font-display font-bold theme-ink-secondary tabular-nums whitespace-nowrap">
                      World {chapter.world.id - 1} Complete · Enter World {chapter.world.id}
                    </span>
                    <div className="h-[2px] flex-1 rounded-full bg-gradient-to-l from-transparent via-black/15 dark:via-white/20 to-black/15 dark:to-white/20" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
};
