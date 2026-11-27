import React, { useMemo, useRef, useState } from 'react';
import { Award, ChevronDown, ChevronUp, Compass, Flame, Play, Sparkles, Star, Trophy, ArrowRight, BookOpen } from 'lucide-react';
import { PlayerProgress } from '../types/game';
import { getWorldForLevel, WORLDS } from '../utils/levelGenerator';
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
  sfxEnabled?: boolean;
  canClaimDaily?: boolean;
  canFreeSpin?: boolean;
  onPlayCurrent: () => void;
  onSelectLevel: (level: number) => void;
  onLockedTap: (level: number) => void;
  onLoadMore: () => void;
  onEnsureVisibleLevel?: (level: number) => void;
  onSendFriendLife: (friendId: string) => void;
  onAddFriend: (name: string, level: number) => void;
  onToggleSfx?: () => void;
  onOpenSettings?: () => void;
  onOpenDailyModal?: () => void;
  onOpenWheel?: () => void;
  onOpenMasteryShowcase?: (levelId: number) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  progress,
  maxUnlocked,
  visibleLimit,
  referenceDateKey,
  reduceMotion,
  sfxEnabled = true,
  canClaimDaily = false,
  canFreeSpin = false,
  onPlayCurrent,
  onSelectLevel,
  onLockedTap,
  onLoadMore,
  onEnsureVisibleLevel,
  onSendFriendLife,
  onAddFriend,
  onToggleSfx,
  onOpenSettings,
  onOpenDailyModal,
  onOpenWheel,
  onOpenMasteryShowcase,
}) => {
  const [focusLevel, setFocusLevel] = useState<number | null>(null);
  const atlasScrollRef = useRef<HTMLDivElement | null>(null);

  const scrollAtlasBy = (deltaY: number) => {
    atlasScrollRef.current?.scrollBy({
      top: deltaY,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  };

  const totalStars = getTotalStars(progress);
  const starRank = getStarRankInfo(totalStars);
  const currentWorld = getWorldForLevel(progress.currentLevel);

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
    <div className="relative z-10 w-full max-w-7xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-28 space-y-6 animate-screen-transition">
      {/* Cinematic Hero Arena Card */}
      <section
        aria-label="Dashboard Hero Arena"
        className="relative rounded-3xl overflow-hidden theme-surface-glass backdrop-blur-xl border theme-border shadow-[0_20px_50px_-15px_rgba(24,18,12,0.32)]"
      >
        <div className="absolute inset-0 opacity-45 pointer-events-none">
          <WorldChapterScenery world={currentWorld} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-transparent dark:from-black/90 dark:via-black/60 dark:to-black/20 pointer-events-none" />

        <div className="relative z-10 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 text-white">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-xs font-display font-semibold tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 text-[#FFD700]" />
              <span>World {currentWorld.id} · {currentWorld.name}</span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Level {progress.currentLevel}
            </h1>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onPlayCurrent}
                className="min-h-[56px] px-8 py-3.5 rounded-2xl btn-tactile-coral text-white font-display text-lg font-bold inline-flex items-center gap-3 cursor-pointer shadow-xl hover:scale-105 transition-transform"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Play Level {progress.currentLevel}</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>

              <button
                type="button"
                onClick={() => handleJumpToLevel(currentWorld.levelStart)}
                className="min-h-[56px] px-5 py-3.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 text-white font-display text-sm font-bold inline-flex items-center gap-2 cursor-pointer hover:bg-white/25 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                <span>Jump to World {currentWorld.id}</span>
              </button>
            </div>
          </div>

          {/* Player Rank & Stats Floating Card */}
          <div className="rounded-2xl bg-black/40 backdrop-blur-xl border border-white/20 p-5 shadow-2xl lg:w-80 shrink-0 space-y-4">
            <div className="flex items-center justify-between border-b border-white/15 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFE68C] to-[#E8A017] flex items-center justify-center font-display font-bold text-[#5A3404] shadow-md">
                  <Star className="w-5 h-5 fill-[#FFF5CC] text-[#7C4704]" />
                </div>
                <div>
                  <div className="text-xs text-white/70">Player Rank</div>
                  <div className="font-display text-base font-bold text-white">{starRank.current.title}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-xl font-bold text-[#FFD700] tabular-nums">{totalStars} ★</div>
                <div className="text-[10px] text-white/70">Total Stars</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="rounded-xl bg-white/10 p-2.5">
                <div className="text-xs text-white/70">Cleared</div>
                <div className="font-display text-lg font-bold text-white tabular-nums">{progress.levelsCleared}</div>
              </div>
              <div className="rounded-xl bg-white/10 p-2.5">
                <div className="text-xs text-white/70">Perfects</div>
                <div className="font-display text-lg font-bold text-[#FFD700] tabular-nums">{perfectCount}</div>
              </div>
              <div className="rounded-xl bg-white/10 p-2.5">
                <div className="text-xs text-white/70">Streak</div>
                <div className="font-display text-lg font-bold text-[#FF785A] tabular-nums">{activeLoginStreak}d</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Split Layout: Redesigned Map (8 cols) + Sidebar (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8">
          <LevelJourneyMap
            progress={progress}
            maxUnlocked={maxUnlocked}
            visibleLimit={visibleLimit}
            focusLevel={focusLevel}
            sfxEnabled={sfxEnabled}
            canClaimDaily={canClaimDaily}
            canFreeSpin={canFreeSpin}
            onSelectLevel={onSelectLevel}
            onLockedTap={onLockedTap}
            onLoadMore={onLoadMore}
            onEnsureVisibleLevel={onEnsureVisibleLevel}
            onToggleSfx={onToggleSfx}
            onOpenSettings={onOpenSettings}
            onOpenDailyModal={onOpenDailyModal}
            onOpenWheel={onOpenWheel}
            onOpenMasteryShowcase={onOpenMasteryShowcase}
            reduceMotion={reduceMotion}
          />
        </div>

        <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
          {/* Chapter Progress Summary Card */}
          <section
            aria-label="Chapter Summary"
            className="rounded-3xl theme-surface-glass backdrop-blur-xl border theme-border p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#E8A317]" />
                <h3 className="font-display text-lg font-bold theme-ink">Chapter Milestones</h3>
              </div>
              <span className="text-xs font-bold theme-ink-secondary tabular-nums">
                {worldStats.cleared}/20 Cleared
              </span>
            </div>

            <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/15 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#E55A3C] to-[#E8A317]"
                style={{ width: `${worldStats.pct}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-2xl theme-surface-muted border p-3">
                <div className="text-xs theme-ink-secondary">Chapter Stars</div>
                <div className="mt-1 font-display text-lg font-bold theme-ink tabular-nums inline-flex items-center gap-1">
                  <Star className="w-4 h-4 text-[#E8A317] fill-[#F5BC38]" />
                  <span>{worldStats.stars} / 60</span>
                </div>
              </div>

              <div className="rounded-2xl theme-surface-muted border p-3">
                <div className="text-xs theme-ink-secondary">Perfect Badges</div>
                <div className="mt-1 font-display text-lg font-bold theme-ink tabular-nums inline-flex items-center gap-1">
                  <Award className="w-4 h-4 text-[#E59B14]" />
                  <span>{worldStats.perfects} / 20</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleJumpToLevel(worldStats.nextMilestone)}
              className="w-full min-h-[46px] rounded-2xl theme-surface-muted border font-display text-sm font-bold theme-ink inline-flex items-center justify-center gap-2 cursor-pointer hover:opacity-90"
            >
              <Compass className="w-4 h-4 text-[#E55A3C]" />
              <span>Locate Milestone Level {worldStats.nextMilestone}</span>
            </button>
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

      {/* World Biome Selector — Compact Scrollable Endless Atlas */}
      <section aria-label="World Biomes" className="space-y-3 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-xl font-bold theme-ink">
              World Biome Atlas (∞ Endless Worlds)
            </h2>
            <p className="text-xs font-medium theme-ink-secondary tabular-nums">
              Worlds 1–{Math.max(WORLDS.length, Math.ceil(visibleLimit / 20))} · Scroll to browse or click any world to jump
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollAtlasBy(-180)}
              aria-label="Scroll biome atlas up"
              title="Scroll up"
              className="min-w-[34px] min-h-[34px] rounded-xl theme-surface-muted border flex items-center justify-center theme-ink cursor-pointer hover:opacity-90"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollAtlasBy(180)}
              aria-label="Scroll biome atlas down"
              title="Scroll down"
              className="min-w-[34px] min-h-[34px] rounded-xl theme-surface-muted border flex items-center justify-center theme-ink cursor-pointer hover:opacity-90"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onLoadMore}
              className="min-h-[34px] px-3 py-1 rounded-xl theme-surface-muted border text-xs font-display font-bold theme-ink cursor-pointer hover:opacity-90"
            >
              +5 Worlds (∞)
            </button>
          </div>
        </div>

        <div className="rounded-3xl theme-surface-glass backdrop-blur-md border p-3 shadow-sm">
          <div
            ref={atlasScrollRef}
            className="max-h-[232px] overflow-y-auto overscroll-contain pr-1.5 grid grid-cols-2 sm:grid-cols-5 gap-3"
          >
            {Array.from(
              { length: Math.max(WORLDS.length, Math.ceil(visibleLimit / 20)) },
              (_, idx) => getWorldForLevel(idx * 20 + 1)
            ).map((world) => {
              const isCurrent = world.id === currentWorld.id;
              const unlocked = maxUnlocked >= world.levelStart;
              let clearedCount = 0;
              for (let lv = world.levelStart; lv <= world.levelEnd; lv++) {
                if (progress.completedLevels[String(lv)]) clearedCount += 1;
              }

              return (
                <button
                  key={world.id}
                  type="button"
                  onClick={() => handleJumpToLevel(world.levelStart)}
                  className={`relative rounded-2xl p-3.5 border text-left transition-all cursor-pointer overflow-hidden flex flex-col justify-between gap-3 ${
                    isCurrent
                      ? 'theme-surface border-[#E55A3C] dark:border-[#2BD4C5] shadow-md ring-2 ring-[#E55A3C]/30'
                      : unlocked
                      ? 'theme-surface-glass hover:opacity-100 opacity-90'
                      : 'theme-surface-muted opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/10 dark:bg-white/10 theme-ink tabular-nums">
                      World {world.id}
                    </span>
                    <span className="text-xs font-display font-bold theme-ink tabular-nums">
                      {clearedCount}/20
                    </span>
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold theme-ink truncate">{world.name}</h3>
                    <p className="text-[11px] theme-ink-secondary truncate">{world.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
