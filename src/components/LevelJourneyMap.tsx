import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Crown, Lock, MapPin, Play, Star } from 'lucide-react';
import { FriendEntry, PlayerProgress } from '../types/game';
import { getDifficultyForLevel, getWorldForLevel, WORLDS } from '../utils/levelGenerator';
import { WorldChapterScenery } from './SceneryArtwork';

interface LevelJourneyMapProps {
  progress: PlayerProgress;
  maxUnlocked: number;
  visibleLimit: number;
  focusLevel?: number | null;
  onSelectLevel: (level: number) => void;
  onLockedTap: (level: number) => void;
  onLoadMore: () => void;
  onEnsureVisibleLevel?: (level: number) => void;
  reduceMotion: boolean;
}

interface PositionedNode {
  level: number;
  xPercent: number;
  y: number;
  worldId: number;
  isMilestone: boolean;
  isWorldFinale: boolean;
}

interface PositionedChapter {
  worldId: number;
  y: number;
  sectionHeight: number;
  levelStart: number;
  levelEnd: number;
}

const CHAPTER_BANNER_HEIGHT = 104;
const CHAPTER_GAP_TOP = 26;
const FIRST_NODE_OFFSET = 64;
const ROW_STEP = 98;
const CHAPTER_BOTTOM_PAD = 34;

function buildMapLayout(visibleLimit: number) {
  const nodes: PositionedNode[] = [];
  const chapters: PositionedChapter[] = [];

  let cursorY = 16;
  for (let level = 1; level <= visibleLimit; level++) {
    const worldId = Math.floor((level - 1) / 20) + 1;
    const isChapterStart = (level - 1) % 20 === 0;

    if (isChapterStart) {
      if (level > 1) cursorY += CHAPTER_GAP_TOP;
      const chapterStartY = cursorY;
      chapters.push({
        worldId,
        y: chapterStartY,
        sectionHeight: 0,
        levelStart: level,
        levelEnd: level + 19,
      });
      cursorY += CHAPTER_BANNER_HEIGHT + FIRST_NODE_OFFSET;
    }

    // Gentle alternating S-curve trajectory with smooth horizontal sway
    const indexInWorld = (level - 1) % 20;
    const wave = Math.sin(indexInWorld * 0.78 + (worldId % 2 === 0 ? 0.65 : 0));
    const xPercent = 50 + wave * 28;

    nodes.push({
      level,
      xPercent,
      y: cursorY,
      worldId,
      isMilestone: level % 10 === 0,
      isWorldFinale: level % 20 === 0,
    });

    cursorY += ROW_STEP;

    const isChapterEnd = level % 20 === 0 || level === visibleLimit;
    if (isChapterEnd && chapters.length > 0) {
      const currentChapter = chapters[chapters.length - 1];
      currentChapter.sectionHeight = cursorY - currentChapter.y + CHAPTER_BOTTOM_PAD;
      cursorY += CHAPTER_BOTTOM_PAD;
    }
  }

  return {
    nodes,
    chapters,
    totalHeight: cursorY + 24,
  };
}

export const LevelJourneyMap: React.FC<LevelJourneyMapProps> = ({
  progress,
  maxUnlocked,
  visibleLimit,
  focusLevel,
  onSelectLevel,
  onLockedTap,
  onLoadMore,
  onEnsureVisibleLevel,
  reduceMotion,
}) => {
  const nodeRefs = useRef<Map<number, HTMLButtonElement | null>>(new Map());
  const chapterRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [pendingScrollWorld, setPendingScrollWorld] = useState<number | null>(null);
  const [pendingScrollLevel, setPendingScrollLevel] = useState<number | null>(null);

  const { nodes, chapters, totalHeight } = useMemo(
    () => buildMapLayout(visibleLimit),
    [visibleLimit]
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
    }, 100);
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

  const handleWorldTabClick = (worldId: number, levelEnd: number) => {
    if (levelEnd > visibleLimit) {
      onEnsureVisibleLevel?.(levelEnd);
      setPendingScrollWorld(worldId);
    } else {
      scrollToWorld(worldId);
    }
  };

  const segments = useMemo(() => {
    const result: {
      key: string;
      d: string;
      unlocked: boolean;
      completed: boolean;
      worldId: number;
      glowColor: string;
      strokeColor: string;
      sameWorld: boolean;
    }[] = [];

    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i];
      const b = nodes[i + 1];
      const x1 = a.xPercent * 10;
      const y1 = a.y;
      const x2 = b.xPercent * 10;
      const y2 = b.y;
      const midY = (y1 + y2) / 2;
      const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
      const completed = Boolean(progress.completedLevels[String(a.level)]);
      const unlocked = b.level <= maxUnlocked;
      const world = getWorldForLevel(a.level);
      result.push({
        key: `${a.level}-${b.level}`,
        d,
        unlocked,
        completed,
        worldId: a.worldId,
        glowColor: world.palette.pathGlow,
        strokeColor: world.palette.pathStroke,
        sameWorld: a.worldId === b.worldId,
      });
    }
    return result;
  }, [nodes, progress.completedLevels, maxUnlocked]);

  const currentWorld = getWorldForLevel(progress.currentLevel);

  return (
    <section
      aria-label="Level Progression Map"
      className="relative rounded-3xl overflow-hidden theme-surface-glass backdrop-blur-md border theme-border shadow-[0_16px_40px_-16px_rgba(24,18,12,0.28)] flex flex-col"
    >
      {/* Sticky Map Top Bar + 10-World Quick-Jump Strip */}
      <div className="sticky top-0 z-20 theme-surface-strong backdrop-blur-md border-b theme-border">
        <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold theme-ink-secondary truncate">
              200-Level Atlas · 10 Distinct Themed Worlds
            </p>
            <h2 className="font-display text-lg sm:text-xl font-bold theme-ink truncate leading-tight">
              Journey Map
            </h2>
          </div>

          <button
            type="button"
            onClick={() => scrollToLevel(progress.currentLevel)}
            className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-xl theme-surface-muted border text-xs font-display font-bold theme-ink transition-opacity hover:opacity-90 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#E55A3C]"
          >
            <MapPin className="w-3.5 h-3.5 text-[#E55A3C] dark:text-[#2BD4C5]" />
            <span>Current · Lv {progress.currentLevel}</span>
          </button>
        </div>

        {/* Horizontal 10-World Quick-Jump Navigator */}
        <div
          role="tablist"
          aria-label="Jump to world chapter"
          className="px-4 pb-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar"
        >
          {WORLDS.map((world) => {
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
                className={`min-h-[34px] px-2.5 py-1 rounded-xl border text-xs font-display font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-all tabular-nums ${
                  isCurrentWorld
                    ? 'theme-surface border-[#E55A3C] dark:border-[#2BD4C5] theme-ink shadow-xs'
                    : worldUnlocked
                    ? 'theme-surface-muted theme-ink-secondary hover:opacity-100 opacity-90'
                    : 'theme-surface-muted theme-ink-muted opacity-65 hover:opacity-90'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/15"
                  style={{ backgroundColor: world.palette.accent }}
                />
                <span>W{world.id}</span>
                {worldComplete ? (
                  <Check className="w-3 h-3 text-[#2E8555] dark:text-[#5EEAD4]" />
                ) : !worldUnlocked ? (
                  <Lock className="w-2.5 h-2.5 opacity-70" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Biome Map Canvas */}
      <div
        ref={scrollContainerRef}
        className="relative w-full overflow-y-auto overflow-x-hidden min-h-[56dvh] max-h-[calc(100dvh-230px)] lg:max-h-[calc(100dvh-180px)] scroll-smooth"
      >
        <div className="relative w-full" style={{ height: `${totalHeight}px` }}>
          {/* Per-World Themed Biome Zone Backgrounds */}
          {chapters.map((chapter) => {
            const world = getWorldForLevel(chapter.levelStart);
            return (
              <div
                key={`biome-bg-${chapter.worldId}`}
                aria-hidden="true"
                className="absolute left-2 right-2 sm:left-3 sm:right-3 rounded-3xl overflow-hidden border theme-border pointer-events-none"
                style={{
                  top: `${chapter.y}px`,
                  height: `${chapter.sectionHeight}px`,
                }}
              >
                {/* Light mode soft world gradient wash */}
                <div
                  className="absolute inset-0 opacity-78 dark:opacity-0 transition-opacity"
                  style={{
                    background: `linear-gradient(180deg, ${world.palette.backdropFrom} 0%, ${world.palette.backdropVia} 52%, ${world.palette.backdropTo} 100%)`,
                  }}
                />
                {/* Dark mode atmospheric biome tint */}
                <div
                  className="absolute inset-0 opacity-0 dark:opacity-100 transition-opacity"
                  style={{
                    background: `linear-gradient(180deg, rgba(10, 22, 36, 0.72) 0%, ${world.palette.accent}24 45%, rgba(8, 16, 28, 0.82) 100%)`,
                  }}
                />
                {/* Subtle radial topographic glow accents inside biome */}
                <div
                  className="absolute -left-16 top-1/3 w-52 h-52 rounded-full blur-3xl opacity-35 dark:opacity-20"
                  style={{ backgroundColor: world.palette.hillNear }}
                />
                <div
                  className="absolute -right-16 bottom-1/4 w-56 h-56 rounded-full blur-3xl opacity-35 dark:opacity-20"
                  style={{ backgroundColor: world.palette.pathGlow }}
                />
              </div>
            );
          })}

          {/* World Chapter Illustrated Header Banners */}
          {chapters.map((chapter) => {
            const world = getWorldForLevel(chapter.levelStart);
            let clearedInWorld = 0;
            let starsInWorld = 0;
            for (let lv = chapter.levelStart; lv <= chapter.levelEnd; lv++) {
              if (progress.completedLevels[String(lv)]) clearedInWorld += 1;
              starsInWorld += Number(progress.levelStars[String(lv)]) || 0;
            }
            const worldPct = Math.round((clearedInWorld / 20) * 100);

            return (
              <div
                key={`world-${chapter.worldId}`}
                ref={(el) => {
                  chapterRefs.current.set(chapter.worldId, el);
                }}
                className="absolute left-4 right-4 sm:left-5 sm:right-5 rounded-2xl overflow-hidden border theme-border shadow-[0_8px_22px_-10px_rgba(24,18,12,0.32)] scroll-mt-3 z-10"
                style={{ top: `${chapter.y + 8}px`, height: `${CHAPTER_BANNER_HEIGHT - 8}px` }}
              >
                <WorldChapterScenery world={world} />
                <div className="absolute inset-0 bg-gradient-to-r from-[#231810]/72 via-[#231810]/45 to-[#231810]/25" />

                <div className="relative z-10 h-full px-4 sm:px-5 py-3 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-[#FDECC4] tabular-nums">
                        World {world.id} · Levels {chapter.levelStart}–{chapter.levelEnd}
                      </div>
                      <h3 className="font-display text-lg sm:text-xl font-bold text-white leading-tight truncate">
                        {world.name}
                      </h3>
                    </div>

                    <div className="shrink-0 bg-[#1B130C]/65 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/20 text-right">
                      <div className="font-display text-xs sm:text-sm font-bold text-white tabular-nums leading-none">
                        {clearedInWorld} / 20
                      </div>
                      <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[#FFE082] tabular-nums leading-none">
                        <Star className="w-3 h-3 fill-[#F5BC38] text-[#F5BC38]" />
                        <span>{starsInWorld}/60</span>
                      </div>
                    </div>
                  </div>

                  {/* World completion track */}
                  <div className="w-full h-1.5 rounded-full bg-white/25 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(clearedInWorld > 0 ? 4 : 0, worldPct)}%`,
                        backgroundColor: '#FDE047',
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Winding World-Colored SVG Trail Path */}
          <svg
            viewBox={`0 0 1000 ${totalHeight}`}
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none z-[5]"
            aria-hidden="true"
          >
            {segments
              .filter((seg) => seg.sameWorld)
              .map((seg) => (
                <path
                  key={`bed-${seg.key}`}
                  d={seg.d}
                  fill="none"
                  stroke="rgba(36, 26, 18, 0.2)"
                  strokeWidth="22"
                  strokeLinecap="round"
                />
              ))}

            {segments
              .filter((seg) => seg.sameWorld)
              .map((seg) => (
                <path
                  key={`inner-${seg.key}`}
                  d={seg.d}
                  fill="none"
                  stroke={
                    seg.completed
                      ? seg.glowColor
                      : seg.unlocked
                      ? '#F49D54'
                      : 'rgba(255, 250, 238, 0.72)'
                  }
                  strokeWidth={seg.completed || seg.unlocked ? '11' : '8'}
                  strokeDasharray={seg.unlocked || seg.completed ? undefined : '10 12'}
                  strokeLinecap="round"
                />
              ))}

            {segments
              .filter((seg) => seg.sameWorld && seg.completed)
              .map((seg) => (
                <path
                  key={`sheen-${seg.key}`}
                  d={seg.d}
                  fill="none"
                  stroke="#FFF6D6"
                  strokeWidth="3"
                  strokeLinecap="round"
                  opacity="0.82"
                />
              ))}
          </svg>

          {/* Interactive Level Medallions + Friends */}
          {nodes.map((node) => {
            const isCompleted = Boolean(progress.completedLevels[String(node.level)]);
            const isCurrent = node.level === progress.currentLevel;
            const isLocked = node.level > maxUnlocked;
            const stars = Number(progress.levelStars[String(node.level)]) || (isCompleted ? 1 : 0);
            const levelScore = Number(progress.levelScores?.[String(node.level)]) || 0;
            const isPerfect = Boolean(progress.perfectLevels?.[String(node.level)]);
            const difficulty = getDifficultyForLevel(node.level);
            const nodeFriends = friendsByLevel.get(node.level) ?? [];
            const placeFriendsLeft = node.xPercent > 54;

            const handlePress = () => {
              if (isLocked) {
                onLockedTap(node.level);
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
                {/* Floating Game Emblem Pin above Current Playable Level */}
                {isCurrent && (
                  <div
                    className={`absolute -top-12 flex flex-col items-center pointer-events-none ${
                      reduceMotion ? '' : 'animate-float-pin'
                    }`}
                  >
                    <div className="p-0.5 rounded-full bg-white/95 shadow-md border-2 border-[#E55A3C]">
                      <img
                        src="/logo.png"
                        alt="Current level marker"
                        className="w-8 h-8 object-contain"
                      />
                    </div>
                    <div className="w-2.5 h-2.5 -mt-1 rotate-45 bg-[#E55A3C]" />
                  </div>
                )}

                {/* Soft Beacon Ring behind Current Level */}
                {isCurrent && !reduceMotion && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 -m-2.5 rounded-full border-4 border-[#F59E0B] animate-beacon pointer-events-none"
                  />
                )}

                {/* Friends currently on this Level */}
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
                        className="flex items-center gap-1 rounded-full theme-surface-strong border px-1.5 py-0.5 shadow-md backdrop-blur-sm"
                      >
                        <span
                          className="w-6 h-6 rounded-full border border-white text-white font-display text-[10px] font-bold flex items-center justify-center shrink-0"
                          style={{ backgroundColor: friend.avatarColor }}
                        >
                          {friend.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="text-[11px] font-bold theme-ink whitespace-nowrap pr-1">
                          {friend.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tactile Level Medallion Button */}
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
                      ? `Open Level ${node.level} details, ${difficulty}`
                      : `Open completed Level ${node.level} details, ${stars} of 3 stars, score ${levelScore}`
                  }
                  className={`relative flex flex-col items-center justify-center rounded-full border-[3px] transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E55A3C] ${
                    isCurrent
                      ? 'w-[76px] h-[76px] node-current border-[#FFF5DF] text-white cursor-pointer hover:scale-105 active:scale-95'
                      : isCompleted
                      ? `w-[66px] h-[66px] ${
                          node.isMilestone ? 'node-milestone-complete' : 'node-complete'
                        } border-[#FFFDF7] text-white cursor-pointer hover:scale-105 active:scale-95`
                      : isLocked
                      ? 'w-[56px] h-[56px] node-locked border-[#F9F4E8] dark:border-[#2A587A] text-[#7D6C58] dark:text-[#98C2DC] cursor-not-allowed active:scale-95'
                      : 'w-[62px] h-[62px] bg-gradient-to-b from-[#FCE1A6] to-[#E9A93B] border-[#FFFDF7] text-[#3F290C] shadow-[0_5px_0_#B37815] cursor-pointer hover:scale-105 active:scale-95'
                  }`}
                >
                  {node.isMilestone && !isCurrent && (
                    <span
                      aria-hidden="true"
                      className={`absolute -top-3 flex items-center justify-center w-6 h-6 rounded-full border-2 border-[#FFFDF8] shadow-xs ${
                        isLocked
                          ? 'bg-[#D7CCB8] text-[#7D6E5B]'
                          : 'bg-[#F2B229] text-[#573404]'
                      }`}
                    >
                      <Crown className="w-3.5 h-3.5" />
                    </span>
                  )}

                  {isLocked ? (
                    <>
                      <Lock className="w-3.5 h-3.5 mb-0.5 opacity-80" />
                      <span className="font-display text-sm font-bold leading-none tabular-nums">
                        {node.level}
                      </span>
                    </>
                  ) : (
                    <>
                      <span
                        className={`font-display font-bold leading-none tabular-nums drop-shadow-[0_1px_1px_rgba(45,34,24,0.28)] ${
                          isCurrent ? 'text-2xl' : isCompleted ? 'text-lg' : 'text-xl'
                        }`}
                      >
                        {node.level}
                      </span>
                      {isCompleted && (
                        <span
                          className="mt-0.5 flex items-center justify-center gap-0.5"
                          aria-hidden="true"
                        >
                          {[1, 2, 3].map((s) => (
                            <Star
                              key={s}
                              className={`w-3 h-3 ${s === 2 ? '-translate-y-[1px]' : ''} ${
                                s <= stars
                                  ? 'text-[#FFE66D] fill-[#FFE66D] drop-shadow-[0_1px_1px_rgba(45,34,24,0.45)]'
                                  : 'text-white/40 fill-white/15'
                              }`}
                            />
                          ))}
                        </span>
                      )}
                      {isCurrent && (
                        <span className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-bold tracking-wide text-[#FFF4DE]">
                          <Play className="w-2.5 h-2.5 fill-current" />
                          Play
                        </span>
                      )}
                    </>
                  )}
                </button>

                {/* Completed Node Score & ★ PERFECT Badge */}
                {isCompleted && (
                  <div className="mt-1 flex flex-col items-center gap-0.5">
                    {isPerfect && (
                      <span className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-[#FFD700] to-[#F59E0B] text-[#4E2A02] text-[9px] font-display font-extrabold shadow-xs border border-white/80 tracking-wide leading-none whitespace-nowrap">
                        ★ PERFECT
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-lg theme-surface-strong border text-[10px] font-bold theme-ink tabular-nums shadow-xs whitespace-nowrap leading-tight">
                      {levelScore > 0 ? String(levelScore).padStart(5, '0') : `${stars}★`}
                    </span>
                  </div>
                )}

                {/* Subtle Milestone caption on uncompleted 10th/20th levels */}
                {!isCompleted && node.isMilestone && !isCurrent && (
                  <span className="mt-1 text-[10px] font-bold theme-ink-secondary whitespace-nowrap">
                    {node.isWorldFinale ? 'World Finale' : 'Milestone'}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Load More Worlds / Levels */}
        <div className="px-4 pb-6 pt-3 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            className="min-h-[42px] px-5 py-2 rounded-2xl theme-surface-strong border text-xs sm:text-sm font-display font-bold theme-ink shadow-xs hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
          >
            Load More Levels ({visibleLimit + 1}–{visibleLimit + 60})
          </button>
        </div>
      </div>
    </section>
  );
};
