import React, { useMemo, useState } from 'react';
import { Award, Compass, Flame, Play, Sparkles, Star } from 'lucide-react';
import { PlayerProgress } from '../types/game';
import { getDifficultyForLevel, getWorldForLevel } from '../utils/levelGenerator';
import { getOffsetDateKey, getStarRankInfo, getTotalStars } from '../utils/storage';
import { FriendsLeaderboard } from './FriendsLeaderboard';
import { LevelJourneyMap } from './LevelJourneyMap';
import { WorldChapterScenery } from './SceneryArtwork';

interface DashboardScreenProps {
  progress: PlayerProgress;
  maxUnlocked: number;
  visibleLimit: number;
  referenceDateKey: string;
  reduceMotion: boolean;
  onPlayCurrent: () => void;
  onSelectLevel: (level: number) => void;
  onLockedTap: (level: number) => void;
  onLoadMore: () => void;
  onEnsureVisibleLevel?: (level: number) => void;
  onSendFriendLife: (friendId: string) => void;
  onAddFriend: (name: string, level: number) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  progress,
  maxUnlocked,
  visibleLimit,
  referenceDateKey,
  reduceMotion,
  onPlayCurrent,
  onSelectLevel,
  onLockedTap,
  onLoadMore,
  onEnsureVisibleLevel,
  onSendFriendLife,
  onAddFriend,
}) => {
  const [focusLevel, setFocusLevel] = useState<number | null>(null);

  const totalStars = getTotalStars(progress);
  const starRank = getStarRankInfo(totalStars);
  const currentWorld = getWorldForLevel(progress.currentLevel);
  const currentDifficulty = getDifficultyForLevel(progress.currentLevel);

  const perfectCount = useMemo(
    () => Object.values(progress.perfectLevels ?? {}).filter(Boolean).length,
    [progress.perfectLevels]
  );

  const yesterdayKey = getOffsetDateKey(referenceDateKey, -1);
  const activeLoginStreak =
    progress.dailyLogin.lastClaimDate === referenceDateKey ||
    progress.dailyLogin.lastClaimDate === yesterdayKey
      ? Math.max(0, progress.dailyLogin.streak)
      : 0;

  const worldStats = useMemo(() => {
    let cleared = 0;
    let stars = 0;
    let perfects = 0;
    for (let lv = currentWorld.levelStart; lv <= currentWorld.levelEnd; lv++) {
      const key = String(lv);
      if (progress.completedLevels[key]) cleared += 1;
      stars += Number(progress.levelStars[key]) || 0;
      if (progress.perfectLevels?.[key]) perfects += 1;
    }
    const nextMilestone =
      progress.currentLevel <= currentWorld.levelStart + 9
        ? currentWorld.levelStart + 9
        : currentWorld.levelEnd;
    return {
      cleared,
      stars,
      perfects,
      pct: Math.round((cleared / 20) * 100),
      nextMilestone,
    };
  }, [
    currentWorld.levelEnd,
    currentWorld.levelStart,
    progress.completedLevels,
    progress.currentLevel,
    progress.levelStars,
    progress.perfectLevels,
  ]);

  const handleJumpToLevel = (lv: number) => {
    onEnsureVisibleLevel?.(lv);
    setFocusLevel(lv);
  };

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto px-3 sm:px-6 pt-3 sm:pt-5 pb-20 lg:pb-8 space-y-4">
      {/* Play / Continue Hero Command Card — Positioned Prominently ABOVE the Map */}
      <section
        aria-label="Player Journey Summary"
        className="relative rounded-3xl theme-surface-glass backdrop-blur-md border overflow-hidden shadow-[0_14px_34px_-16px_rgba(24,18,12,0.28)]"
      >
        {/* Subtle top world-accent horizon bar */}
        <div
          aria-hidden="true"
          className="h-1.5 w-full"
          style={{
            background: `linear-gradient(90deg, ${currentWorld.palette.accent} 0%, ${currentWorld.palette.pathGlow} 100%)`,
          }}
        />

        <div className="p-4 sm:p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: Player Emblem, Current Level & World Identity */}
            <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl theme-surface-muted border flex items-center justify-center shrink-0 shadow-xs">
                <img
                  src="/logo.png"
                  alt="RSS Liquid Flow"
                  className="w-9 h-9 sm:w-10 sm:h-10 object-contain drop-shadow-xs"
                />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-semibold theme-ink-secondary">
                  <span className="truncate">{progress.playerName}</span>
                  <span aria-hidden="true">·</span>
                  <span className="theme-ink font-bold">{starRank.current.title}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">World {currentWorld.id}</span>
                </div>

                <h1 className="mt-0.5 font-display text-2xl sm:text-3xl font-bold theme-ink leading-tight tracking-tight tabular-nums">
                  Level {progress.currentLevel}{' '}
                  <span className="font-semibold theme-ink-secondary text-lg sm:text-xl">
                    · {currentWorld.name}
                  </span>
                </h1>

                <p className="mt-0.5 text-xs sm:text-sm theme-ink-secondary tabular-nums">
                  {currentDifficulty} puzzle · {worldStats.cleared}/20 chapter levels cleared
                </p>
              </div>
            </div>

            {/* Right: Primary Focal Play / Continue Action */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onPlayCurrent}
                className="min-h-[52px] px-6 sm:px-7 py-3 rounded-2xl btn-tactile-coral text-white font-display text-base sm:text-lg font-bold inline-flex items-center justify-center gap-2.5 whitespace-nowrap cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>
                  {progress.levelsCleared > 0
                    ? `Continue Level ${progress.currentLevel}`
                    : `Play Level ${progress.currentLevel}`}
                </span>
              </button>
            </div>
          </div>

          {/* Integrated Unboxed Journey Metrics Row */}
          <div className="mt-4 pt-3.5 border-t theme-border grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5">
            <div>
              <div className="text-[11px] font-semibold theme-ink-secondary">Levels Cleared</div>
              <div className="mt-0.5 font-display text-lg sm:text-xl font-bold theme-ink tabular-nums">
                {progress.levelsCleared}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold theme-ink-secondary">Star Rank</span>
                <span className="text-[11px] font-bold theme-ink-muted tabular-nums">
                  {starRank.next ? `${totalStars}/${starRank.next.minStars}★` : 'Max'}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 font-display text-lg sm:text-xl font-bold theme-ink tabular-nums">
                  <Star className="w-4 h-4 text-[#E8A317] fill-[#F5BC38]" />
                  {totalStars}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-black/10 dark:bg-white/12 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(6, starRank.progressPct)}%`,
                      backgroundColor: starRank.current.barColor,
                    }}
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold theme-ink-secondary">Perfect Clears</div>
              <div className="mt-0.5 inline-flex items-center gap-1.5 font-display text-lg sm:text-xl font-bold text-[#9A5F0A] dark:text-[#F5BC38] tabular-nums">
                <Sparkles className="w-4 h-4 text-[#E8A317]" />
                <span>{perfectCount}</span>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold theme-ink-secondary">Login Streak</div>
              <div className="mt-0.5 inline-flex items-center gap-1.5 font-display text-lg sm:text-xl font-bold text-[#C24522] dark:text-[#FF9E5E] tabular-nums">
                <Flame className="w-4 h-4 fill-current" />
                <span>
                  {activeLoginStreak} {activeLoginStreak === 1 ? 'day' : 'days'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Split: Redesigned Level Journey Map (8 cols) + Chapter & Friends Sidebar (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-8">
          <LevelJourneyMap
            progress={progress}
            maxUnlocked={maxUnlocked}
            visibleLimit={visibleLimit}
            focusLevel={focusLevel}
            onSelectLevel={onSelectLevel}
            onLockedTap={onLockedTap}
            onLoadMore={onLoadMore}
            onEnsureVisibleLevel={onEnsureVisibleLevel}
            reduceMotion={reduceMotion}
          />
        </div>

        <aside className="lg:col-span-4 space-y-4 lg:sticky lg:top-20">
          {/* Current Chapter Overview Card */}
          <section
            aria-label="Current World Progress"
            className="rounded-3xl theme-surface-glass backdrop-blur-md border overflow-hidden shadow-[0_12px_30px_-16px_rgba(24,18,12,0.24)]"
          >
            <div className="relative h-24 overflow-hidden border-b theme-border">
              <WorldChapterScenery world={currentWorld} />
              <div className="absolute inset-0 bg-gradient-to-t from-[#241A12]/78 via-[#241A12]/28 to-transparent p-4 flex flex-col justify-end">
                <div className="text-[11px] font-semibold text-[#FDECC4] tabular-nums">
                  World {currentWorld.id} · Levels {currentWorld.levelStart}–{currentWorld.levelEnd}
                </div>
                <h2 className="font-display text-lg font-bold text-white leading-tight">
                  {currentWorld.name}
                </h2>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold theme-ink-secondary mb-1.5 tabular-nums">
                  <span>Chapter Completion</span>
                  <span className="font-bold theme-ink">
                    {worldStats.cleared} / 20 ({worldStats.pct}%)
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-black/10 dark:bg-white/12 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(worldStats.cleared > 0 ? 5 : 0, worldStats.pct)}%`,
                      backgroundColor: currentWorld.palette.accent,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div className="rounded-2xl theme-surface-muted border px-3 py-2">
                  <div className="text-[11px] font-medium theme-ink-secondary">World Stars</div>
                  <div className="mt-0.5 inline-flex items-center gap-1 font-display text-base font-bold theme-ink tabular-nums">
                    <Star className="w-4 h-4 text-[#E8A317] fill-[#F5BC38]" />
                    <span>{worldStats.stars} / 60</span>
                  </div>
                </div>
                <div className="rounded-2xl theme-surface-muted border px-3 py-2">
                  <div className="text-[11px] font-medium theme-ink-secondary">World Perfects</div>
                  <div className="mt-0.5 inline-flex items-center gap-1 font-display text-base font-bold theme-ink tabular-nums">
                    <Award className="w-4 h-4 text-[#E59B14]" />
                    <span>{worldStats.perfects} / 20</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleJumpToLevel(worldStats.nextMilestone)}
                className="w-full min-h-[40px] px-3.5 py-2 rounded-2xl theme-surface-muted border text-xs font-display font-bold theme-ink inline-flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                <Compass className="w-4 h-4 text-[#E55A3C] dark:text-[#2BD4C5]" />
                <span>Locate Milestone Level {worldStats.nextMilestone}</span>
              </button>
            </div>
          </section>

          <FriendsLeaderboard
            progress={progress}
            referenceDateKey={referenceDateKey}
            onSendLife={onSendFriendLife}
            onAddFriend={onAddFriend}
            onJumpToLevel={handleJumpToLevel}
            compact
          />
        </aside>
      </div>
    </div>
  );
};
