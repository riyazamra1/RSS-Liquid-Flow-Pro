import React, { useEffect, useMemo, useRef } from 'react';
import { Crown, Lock, MapPin, Play, Star } from 'lucide-react';
import { FriendEntry, PlayerProgress } from '../types/game';
import { getDifficultyForLevel, getWorldForLevel } from '../utils/levelGenerator';
import { WorldChapterScenery } from './SceneryArtwork';

interface LevelJourneyMapProps {
  progress: PlayerProgress;
  maxUnlocked: number;
  visibleLimit: number;
  focusLevel?: number | null;
  onSelectLevel: (level: number) => void;
  onLockedTap: (level: number) => void;
  onLoadMore: () => void;
  reduceMotion: boolean;
}

interface PositionedNode {
  level: number;
  xPercent: number;
  y: number;
  worldId: number;
  isMilestone: boolean;
}

interface PositionedChapter {
  worldId: number;
  y: number;
  levelStart: number;
  levelEnd: number;
}

const CHAPTER_HEIGHT = 88;
const CHAPTER_GAP_TOP = 18;
const FIRST_NODE_OFFSET = 56;
const ROW_STEP = 96;

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

    const phase = (level - 1) * 0.78;
    const xPercent = 50 + Math.sin(phase) * 28;

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
    totalHeight: cursorY + 36,
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
  reduceMotion,
}) => {
  const nodeRefs = useRef<Map<number, HTMLButtonElement | null>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const { nodes, chapters, totalHeight } = useMemo(
    () => buildMapLayout(visibleLimit),
    [visibleLimit]
  );

  // Map friends by their current level so friend badges appear directly on the winding map
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
    }
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
      scrollToLevel(focusLevel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusLevel]);

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
      aria-label="Level Progression Map"
      className="relative rounded-3xl overflow-hidden bg-transparent border theme-border shadow-[0_14px_38px_-14px_rgba(24,18,12,0.24)] flex flex-col h-full"
    >
      {/* Compact Transparent Glass Map Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-2.5 theme-surface-glass backdrop-blur-md border-b">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold theme-ink-secondary truncate">
            {currentWorld.subtitle}
          </p>
          <h2 className="font-display text-lg sm:text-xl font-bold theme-ink truncate leading-tight">
            {currentWorld.name}
          </h2>
        </div>

        <button
          type="button"
          onClick={() => scrollToLevel(progress.currentLevel)}
          className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-xl theme-surface-muted border text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#E55A3C]"
        >
          <MapPin className="w-3.5 h-3.5 text-[#E55A3C] dark:text-[#2BD4C5]" />
          <span>Level {progress.currentLevel}</span>
        </button>
      </div>

      {/* Transparent Scrollable Winding Map Canvas so Full-Screen Theme Scenery Shines Behind */}
      <div
        ref={scrollContainerRef}
        className="relative flex-1 w-full overflow-y-auto overflow-x-hidden min-h-[58dvh] max-h-[calc(100dvh-196px)] lg:max-h-[calc(100dvh-132px)] scroll-smooth bg-white/10 dark:bg-black/15"
      >
        <div className="relative w-full" style={{ height: `${totalHeight}px` }}>
          {/* World Chapter Scenery Banners */}
          {chapters.map((chapter) => {
            const world = getWorldForLevel(chapter.levelStart);
            const clearedInWorld = Array.from({ length: 20 }, (_, i) => chapter.levelStart + i).filter(
              (lv) => progress.completedLevels[String(lv)]
            ).length;

            return (
              <div
                key={`world-${chapter.worldId}`}
                className="absolute left-3 right-3 sm:left-5 sm:right-5 rounded-2xl overflow-hidden border theme-border shadow-[0_6px_18px_-8px_rgba(30,22,12,0.28)]"
                style={{ top: `${chapter.y}px`, height: `${CHAPTER_HEIGHT}px` }}
              >
                <WorldChapterScenery world={world} />
                <div className="relative z-10 h-full px-4 sm:px-5 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-[#5E472D] tabular-nums">
                      World {world.id} · Levels {chapter.levelStart}–{chapter.levelEnd}
                    </div>
                    <h3 className="font-display text-lg sm:text-xl font-bold text-[#2D2218]">
                      {world.name}
                    </h3>
                  </div>
                  <div className="text-right shrink-0 bg-[#FFFDF8]/90 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-[#E5D7B9]">
                    <div className="font-display text-sm font-bold text-[#2D2218] tabular-nums">
                      {clearedInWorld} / 20
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Winding SVG Path Connecting Every Level Node */}
          <svg
            viewBox={`0 0 1000 ${totalHeight}`}
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none"
            aria-hidden="true"
          >
            {segments.map((seg) => (
              <path
                key={`bed-${seg.key}`}
                d={seg.d}
                fill="none"
                stroke="rgba(45, 34, 24, 0.28)"
                strokeWidth="24"
                strokeLinecap="round"
              />
            ))}

            {segments.map((seg) => (
              <path
                key={`inner-${seg.key}`}
                d={seg.d}
                fill="none"
                stroke={seg.completed ? '#F6B838' : seg.unlocked ? '#F49D54' : 'rgba(255, 250, 238, 0.72)'}
                strokeWidth={seg.completed || seg.unlocked ? '12' : '10'}
                strokeDasharray={seg.unlocked || seg.completed ? undefined : '10 12'}
                strokeLinecap="round"
              />
            ))}

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

          {/* Interactive Tactile Level Nodes + Friend Level Avatars */}
          {nodes.map((node) => {
            const isCompleted = Boolean(progress.completedLevels[String(node.level)]);
            const isCurrent = node.level === progress.currentLevel;
            const isLocked = node.level > maxUnlocked;
            const stars = Number(progress.levelStars[String(node.level)]) || (isCompleted ? 1 : 0);
            const levelScore = Number(progress.levelScores?.[String(node.level)]) || 0;
            const difficulty = getDifficultyForLevel(node.level);
            const nodeFriends = friendsByLevel.get(node.level) ?? [];
            const placeFriendsLeft = node.xPercent > 55;

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
                  zIndex: isCurrent ? 18 : nodeFriends.length > 0 ? 14 : 10,
                }}
              >
                {/* Floating Game Logo Pin above Current Playable Level */}
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

                {/* Pulsing Beacon Ring behind Current Level */}
                {isCurrent && !reduceMotion && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 -m-2 rounded-full border-4 border-[#F59E0B] animate-beacon pointer-events-none"
                  />
                )}

                {/* Friends currently on this Level shown directly beside the Map Node */}
                {nodeFriends.length > 0 && (
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none ${
                      placeFriendsLeft ? 'right-[calc(100%+10px)] flex-row-reverse' : 'left-[calc(100%+10px)]'
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
                      ? `Play current Level ${node.level}, ${difficulty}`
                      : `Replay completed Level ${node.level}, ${stars} of 3 stars, score ${levelScore}`
                  }
                  className={`relative flex flex-col items-center justify-center rounded-full border-[3px] transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E55A3C] ${
                    isCurrent
                      ? 'w-[74px] h-[74px] node-current border-[#FFF5DF] text-white cursor-pointer hover:scale-105 active:scale-95'
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

                {/* Completed Level Score displayed neatly under the node */}
                {isCompleted && (
                  <span className="mt-1 px-2 py-0.5 rounded-lg theme-surface-strong border text-[10px] font-bold theme-ink tabular-nums shadow-xs whitespace-nowrap">
                    {levelScore > 0 ? `${levelScore.toLocaleString()} pts` : `${stars}★`}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Load More Levels Action */}
        <div className="px-4 pb-6 pt-2 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            className="min-h-[42px] px-5 py-2 rounded-2xl theme-surface-strong border text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
          >
            Load More Levels ({visibleLimit + 1}–{visibleLimit + 60})
          </button>
        </div>
      </div>
    </section>
  );
};
