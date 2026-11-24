import React, { useEffect, useMemo, useRef } from 'react';
import { Crown, Lock, MapPin, Play, Star } from 'lucide-react';
import { PlayerProgress } from '../types/game';
import { getDifficultyForLevel, getWorldForLevel } from '../utils/levelGenerator';
import { RssDropletEmblem, WorldChapterScenery } from './SceneryArtwork';

interface LevelJourneyMapProps {
  progress: PlayerProgress;
  maxUnlocked: number;
  visibleLimit: number;
  onSelectLevel: (level: number) => void;
  onLockedTap: (level: number) => void;
  onLoadMore: () => void;
  reduceMotion: boolean;
}

interface PositionedNode {
  level: number;
  xPercent: number; // 0..100
  y: number; // px from top of map canvas
  worldId: number;
  isMilestone: boolean;
}

interface PositionedChapter {
  worldId: number;
  y: number;
  levelStart: number;
  levelEnd: number;
}

const CHAPTER_HEIGHT = 96;
const CHAPTER_GAP_TOP = 18;
const FIRST_NODE_OFFSET = 58;
const ROW_STEP = 96;

/**
 * Generates an organic winding S-curve path where every node sits dead-center on the SVG spline.
 */
function buildMapLayout(visibleLimit: number) {
  const nodes: PositionedNode[] = [];
  const chapters: PositionedChapter[] = [];

  let cursorY = 14;
  for (let level = 1; level <= visibleLimit; level++) {
    const worldId = Math.floor((level - 1) / 20) + 1;
    const isChapterStart = (level - 1) % 20 === 0;

    if (isChapterStart) {
      if (level > 1) cursorY += CHAPTER_GAP_TOP;
      chapters.push({
        worldId,
        y: cursorY,
        levelStart: level,
        levelEnd: level + 19,
      });
      cursorY += CHAPTER_HEIGHT + FIRST_NODE_OFFSET;
    }

    // Smooth S-curve oscillating comfortably between 21% and 79%
    const phase = (level - 1) * 0.78;
    const xPercent = 50 + Math.sin(phase) * 29;

    nodes.push({
      level,
      xPercent,
      y: cursorY,
      worldId,
      isMilestone: level % 10 === 0,
    });

    cursorY += ROW_STEP;
  }

  return {
    nodes,
    chapters,
    totalHeight: cursorY + 32,
  };
}

export const LevelJourneyMap: React.FC<LevelJourneyMapProps> = ({
  progress,
  maxUnlocked,
  visibleLimit,
  onSelectLevel,
  onLockedTap,
  onLoadMore,
  reduceMotion,
}) => {
  const currentNodeRef = useRef<HTMLButtonElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const { nodes, chapters, totalHeight } = useMemo(
    () => buildMapLayout(visibleLimit),
    [visibleLimit]
  );

  // Smoothly scroll the current playable level into comfortable view on initial mount
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (currentNodeRef.current) {
        currentNodeRef.current.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'center',
        });
      }
    }, 120);
    return () => window.clearTimeout(timer);
  }, [reduceMotion]);

  const scrollToCurrent = () => {
    if (currentNodeRef.current) {
      currentNodeRef.current.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'center',
      });
    }
  };

  // Build individual smooth cubic Bezier segments so completed/unlocked segments glow warmly
  const segments = useMemo(() => {
    const result: {
      key: string;
      d: string;
      unlocked: boolean;
      completed: boolean;
      worldId: number;
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
      result.push({
        key: `${a.level}-${b.level}`,
        d,
        unlocked,
        completed,
        worldId: a.worldId,
      });
    }
    return result;
  }, [nodes, progress.completedLevels, maxUnlocked]);

  const currentWorld = getWorldForLevel(progress.currentLevel);

  return (
    <section
      aria-label="Level Progression Journey"
      className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#FFFDF6]/72 via-[#FBF3DF]/66 to-[#F4E9CF]/70 backdrop-blur-xs border border-[#E6DAC0] shadow-[0_14px_38px_-14px_rgba(110,85,48,0.22)]"
    >
      {/* Journey Map Sticky Header Bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-3 bg-[#FFFDF8]/92 backdrop-blur-md border-b border-[#EADEC5]">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#7D6852] truncate">
            {currentWorld.subtitle}
          </p>
          <h2 className="font-display text-lg sm:text-xl font-bold text-[#2D2218] truncate leading-tight">
            {currentWorld.name}
          </h2>
        </div>

        <button
          type="button"
          onClick={scrollToCurrent}
          className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl bg-[#F7EBD2] hover:bg-[#F0DFBA] text-[#5C4327] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#E55A3C]"
        >
          <MapPin className="w-3.5 h-3.5 text-[#E55A3C]" />
          <span>Level {progress.currentLevel}</span>
        </button>
      </div>

      {/* Scrollable Winding Map Canvas */}
      <div
        ref={scrollContainerRef}
        className="relative w-full overflow-y-auto overflow-x-hidden max-h-[68vh] sm:max-h-[72vh] lg:max-h-[calc(100vh-152px)] scroll-smooth"
      >
        <div
          className="relative w-full"
          style={{ height: `${totalHeight}px` }}
        >
          {/* Subtle Warm Botanical Scenery Decorations along the margins */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {nodes
              .filter((_, idx) => idx % 3 === 1)
              .map((node) => {
                const placeRight = node.xPercent < 50;
                const world = getWorldForLevel(node.level);
                return (
                  <div
                    key={`prop-${node.level}`}
                    className={`absolute ${reduceMotion ? '' : 'animate-drift'}`}
                    style={{
                      top: `${node.y - 24}px`,
                      left: placeRight ? '80%' : '8%',
                    }}
                  >
                    <svg width="56" height="48" viewBox="0 0 56 48" fill="none">
                      <ellipse cx="28" cy="36" rx="20" ry="8" fill={world.palette.hillNear} opacity="0.55" />
                      <path
                        d="M28 36 C20 30 16 20 22 14 C27 18 29 27 28 36 Z"
                        fill={world.palette.accent}
                        opacity="0.32"
                      />
                      <path
                        d="M28 36 C36 31 41 22 36 16 C31 20 29 28 28 36 Z"
                        fill={world.palette.accent}
                        opacity="0.45"
                      />
                      <circle cx="28" cy="14" r="4.5" fill="#F4B731" opacity="0.7" />
                    </svg>
                  </div>
                );
              })}
          </div>

          {/* World Chapter Scenery Banners */}
          {chapters.map((chapter) => {
            const world = getWorldForLevel(chapter.levelStart);
            const clearedInWorld = Array.from({ length: 20 }, (_, i) => chapter.levelStart + i).filter(
              (lv) => progress.completedLevels[String(lv)]
            ).length;

            return (
              <div
                key={`world-${chapter.worldId}`}
                className="absolute left-3 right-3 sm:left-5 sm:right-5 rounded-2xl overflow-hidden border border-[#E4D6B8] shadow-[0_6px_18px_-8px_rgba(110,85,48,0.22)]"
                style={{ top: `${chapter.y}px`, height: `${CHAPTER_HEIGHT}px` }}
              >
                <WorldChapterScenery world={world} />
                <div className="relative z-10 h-full px-4 sm:px-5 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-[#6F583D] tabular-nums">
                      World {world.id} · Levels {chapter.levelStart}–{chapter.levelEnd}
                    </div>
                    <h3 className="font-display text-lg sm:text-xl font-bold text-[#2D2218]">
                      {world.name}
                    </h3>
                  </div>
                  <div className="text-right shrink-0 bg-[#FFFDF8]/88 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-[#E5D7B9]">
                    <div className="font-display text-sm font-bold text-[#2D2218] tabular-nums">
                      {clearedInWorld} / 20
                    </div>
                    <div className="text-[11px] font-medium text-[#755F48]">Cleared</div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Winding SVG Path Connecting Every Level Node Accurately */}
          <svg
            viewBox={`0 0 1000 ${totalHeight}`}
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none"
            aria-hidden="true"
          >
            {/* Base warm travertine trail bed */}
            {segments.map((seg) => (
              <path
                key={`bed-${seg.key}`}
                d={seg.d}
                fill="none"
                stroke="#E5D8BE"
                strokeWidth="22"
                strokeLinecap="round"
              />
            ))}

            {/* Inner path surface */}
            {segments.map((seg) => (
              <path
                key={`inner-${seg.key}`}
                d={seg.d}
                fill="none"
                stroke={seg.completed ? '#F6B838' : seg.unlocked ? '#F49D54' : '#EFE6D2'}
                strokeWidth={seg.completed || seg.unlocked ? '12' : '10'}
                strokeDasharray={seg.unlocked || seg.completed ? undefined : '10 12'}
                strokeLinecap="round"
              />
            ))}

            {/* Warm golden center sheen on completed trails */}
            {segments
              .filter((seg) => seg.completed)
              .map((seg) => (
                <path
                  key={`sheen-${seg.key}`}
                  d={seg.d}
                  fill="none"
                  stroke="#FFF3C4"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  opacity="0.85"
                />
              ))}
          </svg>

          {/* Interactive Tactile Level Nodes */}
          {nodes.map((node) => {
            const isCompleted = Boolean(progress.completedLevels[String(node.level)]);
            const isCurrent = node.level === progress.currentLevel;
            const isLocked = node.level > maxUnlocked;
            const stars = Number(progress.levelStars[String(node.level)]) || (isCompleted ? 1 : 0);
            const difficulty = getDifficultyForLevel(node.level);

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
                  zIndex: isCurrent ? 15 : 10,
                }}
              >
                {/* Floating RSS Player Pin above Current Playable Level */}
                {isCurrent && (
                  <div
                    className={`absolute -top-12 flex flex-col items-center pointer-events-none ${
                      reduceMotion ? '' : 'animate-float-pin'
                    }`}
                  >
                    <div className="p-0.5 rounded-full bg-[#FFFDF8] shadow-md border-2 border-[#E55A3C]">
                      <RssDropletEmblem className="w-8 h-8" />
                    </div>
                    <div className="w-2.5 h-2.5 -mt-1 rotate-45 bg-[#E55A3C]" />
                  </div>
                )}

                {/* Pulsing Beacon Ring behind Current Level */}
                {isCurrent && !reduceMotion && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 -m-2 rounded-full border-4 border-[#F59E0B] animate-beacon pointer-events-none"
                  />
                )}

                <button
                  ref={isCurrent ? currentNodeRef : undefined}
                  type="button"
                  onClick={handlePress}
                  aria-label={
                    isLocked
                      ? `Level ${node.level}, ${difficulty}, locked`
                      : isCurrent
                      ? `Play current Level ${node.level}, ${difficulty}`
                      : `Replay completed Level ${node.level}, ${stars} of 3 stars`
                  }
                  className={`relative flex flex-col items-center justify-center rounded-full border-[3px] transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E55A3C] ${
                    isCurrent
                      ? 'w-[74px] h-[74px] node-current border-[#FFF5DF] text-white cursor-pointer hover:scale-105 active:scale-95'
                      : isCompleted
                      ? `w-[66px] h-[66px] ${
                          node.isMilestone ? 'node-milestone-complete' : 'node-complete'
                        } border-[#FFFDF7] text-white cursor-pointer hover:scale-105 active:scale-95`
                      : isLocked
                      ? 'w-[56px] h-[56px] node-locked border-[#F9F4E8] text-[#8B7B67] cursor-not-allowed active:scale-95'
                      : 'w-[62px] h-[62px] bg-gradient-to-b from-[#FCE1A6] to-[#E9A93B] border-[#FFFDF7] text-[#3F290C] shadow-[0_5px_0_#B37815] cursor-pointer hover:scale-105 active:scale-95'
                  }`}
                >
                  {/* Milestone Crown Indicator */}
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

                {/* Difficulty cue underneath current level */}
                {!isCompleted && isCurrent ? (
                  <span className="mt-2 px-2.5 py-0.5 rounded-lg bg-[#2D2218] text-[#FFFDF8] text-[11px] font-semibold shadow-sm whitespace-nowrap">
                    Current · {difficulty}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Load More Levels Footer */}
        <div className="px-4 pb-6 pt-2 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-[#FFFDF8] hover:bg-[#F7EEDB] border border-[#DFD1B4] text-[#4C3A26] text-sm font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Load More Levels ({visibleLimit + 1}–{visibleLimit + 60})
          </button>
        </div>
      </div>
    </section>
  );
};
