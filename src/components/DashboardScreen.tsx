import React, { useEffect, useState } from 'react';
import {
  CalendarCheck2,
  ChevronRight,
  Coins,
  Flame,
  Gift,
  Heart,
  Play,
  Sprout,
  Star,
  Trophy,
  User,
} from 'lucide-react';
import { AppScreen, PlayerProgress } from '../types/game';
import {
  getDifficultyForLevel,
  getLevelObjectiveText,
  getWorldForLevel,
} from '../utils/levelGenerator';
import {
  DAILY_REWARD_SCHEDULE,
  getDailyLoginStatus,
  getTotalStars,
  MAX_STANDARD_LIVES,
  recomputeLives,
} from '../utils/storage';
import { AnimatedDashboardBackdrop } from './AnimatedDashboardBackdrop';
import { LevelJourneyMap } from './LevelJourneyMap';
import { DailyChestIllustration, RssDropletEmblem } from './SceneryArtwork';

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
  onPlayDaily: () => void;
  onOpenDailyReward: () => void;
  onClaimDailyRewardInline: () => void;
  onRefillLifeWithCoins: () => void;
  onNavigate: (screen: AppScreen) => void;
}

function formatCountdown(msRemaining: number): string {
  const totalSec = Math.max(0, Math.ceil(msRemaining / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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
  onPlayDaily,
  onOpenDailyReward,
  onClaimDailyRewardInline,
  onRefillLifeWithCoins,
  onNavigate,
}) => {
  const [now, setNow] = useState(() => Date.now());

  const lifeInfo = recomputeLives(progress.lifeState);
  const needsCountdown = lifeInfo.count < MAX_STANDARD_LIVES && lifeInfo.nextRefillAt > 0;

  useEffect(() => {
    if (!needsCountdown) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [needsCountdown]);

  const currentWorld = getWorldForLevel(progress.currentLevel);
  const clearedInWorld = Array.from({ length: 20 }, (_, i) => currentWorld.levelStart + i).filter(
    (lv) => progress.completedLevels[String(lv)]
  ).length;
  const worldPct = Math.round((clearedInWorld / 20) * 100);
  const totalStars = getTotalStars(progress);
  const dailyStatus = getDailyLoginStatus(progress, referenceDateKey);
  const dailyClearedToday = Boolean(progress.dailyClears[referenceDateKey]);
  const bonusLivesCount = Math.max(0, lifeInfo.count - MAX_STANDARD_LIVES);

  return (
    <div className="relative">
      <AnimatedDashboardBackdrop reduceMotion={reduceMotion} />
      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 pt-3 sm:pt-6 pb-24 lg:pb-10">
      {/* Unclaimed Daily Login Banner — immediately visible at top of dashboard */}
      {dailyStatus.canClaim && (
        <div className="mb-4 rounded-2xl bg-gradient-to-r from-[#FFF3CE] via-[#FCE6B0] to-[#FBD8A2] border border-[#E5B85B] p-3.5 sm:p-4 shadow-[0_8px_24px_-12px_rgba(181,115,12,0.35)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <DailyChestIllustration className="w-12 h-12 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#9A5B09] tabular-nums">
                Day {dailyStatus.projectedStreak} Daily Login Bonus · {dailyStatus.streakMultiplier}× Multiplier
              </div>
              <p className="font-display text-base sm:text-lg font-bold text-[#2D2218] truncate">
                Claim{' '}
                {dailyStatus.todayReward.totalCoins > 0 && `+${dailyStatus.todayReward.totalCoins} Coins`}
                {dailyStatus.todayReward.totalCoins > 0 && dailyStatus.todayReward.lives > 0 && ' & '}
                {dailyStatus.todayReward.lives > 0 &&
                  `+${dailyStatus.todayReward.lives} Bonus ${
                    dailyStatus.todayReward.lives === 1 ? 'Life' : 'Lives'
                  }`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClaimDailyRewardInline}
              className="flex-1 sm:flex-initial min-h-[44px] px-5 py-2 rounded-xl btn-tactile-gold text-[#3F2604] font-display text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Gift className="w-4 h-4" />
              <span>Claim Bonus</span>
            </button>
            <button
              type="button"
              onClick={onOpenDailyReward}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FFFDF8]/85 hover:bg-[#FFFDF8] border border-[#E0C281] text-[#5C411D] text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              7-Day Track
            </button>
          </div>
        </div>
      )}

      {/* Main Responsive 2-Column Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Mobile-First Primary Play Hero + Quick Stats (shown first on mobile, right sidebar on desktop) */}
        <div className="order-1 lg:order-2 lg:col-span-5 xl:col-span-4 space-y-4 lg:sticky lg:top-20">
          {/* Player Identity & Primary Play Card */}
          <div className="rounded-3xl bg-[#FFFDF8]/86 backdrop-blur-md border border-[#E6DAC0] p-5 shadow-[0_12px_32px_-16px_rgba(110,85,48,0.22)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <RssDropletEmblem className="w-12 h-12 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-[#7A664F] truncate">
                    {progress.playerName} · {currentWorld.name}
                  </div>
                  <h1 className="font-display text-2xl font-bold text-[#2D2218] leading-tight tabular-nums">
                    Level {progress.currentLevel}
                  </h1>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#F6EEDB] hover:bg-[#EFE2C6] text-[#5E4932] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Profile
              </button>
            </div>

            {/* Level Objective Summary */}
            <p className="mt-3 text-sm text-[#6B5742] leading-relaxed">
              {getLevelObjectiveText(progress.currentLevel)}
            </p>

            {/* Primary Play / Continue CTA */}
            <button
              type="button"
              onClick={onPlayCurrent}
              className="mt-4 w-full min-h-[54px] px-6 py-3 rounded-2xl btn-tactile-coral text-white font-display text-lg font-bold flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>
                {progress.levelsCleared > 0
                  ? `Continue Level ${progress.currentLevel}`
                  : `Play Level ${progress.currentLevel}`}
              </span>
            </button>

            {/* World Progress Meter */}
            <div className="mt-5 pt-4 border-t border-[#EFE5D0]">
              <div className="flex items-center justify-between text-xs font-semibold text-[#6E5B47] mb-1.5">
                <span>World {currentWorld.id} Progress</span>
                <span className="tabular-nums text-[#2D2218]">
                  {clearedInWorld} / 20 ({worldPct}%)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-[#EFE6D2] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#45A96F] to-[#E8A317] transition-all duration-300"
                  style={{ width: `${Math.max(4, worldPct)}%` }}
                />
              </div>

              {/* Clean Unboxed Stats Strip (tabular numerals, zero pill clutter) */}
              <div className="mt-4 grid grid-cols-3 gap-2 pt-3 border-t border-[#F2E9D6] text-center">
                <div>
                  <div className="text-[11px] font-medium text-[#7D6852]">Cleared</div>
                  <div className="font-display text-lg font-bold text-[#2D2218] tabular-nums">
                    {progress.levelsCleared}
                  </div>
                </div>
                <div className="border-x border-[#EFE5D0]">
                  <div className="text-[11px] font-medium text-[#7D6852]">Stars</div>
                  <div className="font-display text-lg font-bold text-[#2D2218] tabular-nums inline-flex items-center justify-center gap-1">
                    <Star className="w-4 h-4 text-[#E8A317] fill-[#F5BC38]" />
                    <span>{totalStars}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-[#7D6852]">Best Score</div>
                  <div className="font-display text-lg font-bold text-[#2D2218] tabular-nums">
                    {progress.bestScore.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lives & Wallet Status Card */}
          <div className="rounded-3xl bg-[#FFFDF8]/86 backdrop-blur-md border border-[#E6DAC0] p-4 sm:p-5 shadow-[0_10px_28px_-16px_rgba(110,85,48,0.18)]">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-[#D93D59] fill-[#D93D59]" />
                <h2 className="font-display text-base font-bold text-[#2D2218]">
                  Lives & Coins
                </h2>
              </div>
              <div className="inline-flex items-center gap-1.5 font-display text-base font-bold text-[#9A5F0A] tabular-nums">
                <Coins className="w-4 h-4 text-[#E59B14]" />
                <span>{progress.coins.toLocaleString()}</span>
              </div>
            </div>

            {/* Visual 5-Heart Row + Bonus Life Overflow Indicator */}
            <div className="flex items-center justify-between gap-2 bg-[#FAF4E7] border border-[#EBE0C9] rounded-2xl px-3.5 py-2.5">
              <div className="flex items-center gap-1.5" aria-label={`${lifeInfo.count} lives available`}>
                {Array.from({ length: MAX_STANDARD_LIVES }, (_, idx) => {
                  const filled = idx < lifeInfo.count;
                  return (
                    <Heart
                      key={idx}
                      className={`w-5 h-5 transition-transform ${
                        filled
                          ? 'text-[#D93D59] fill-[#E84D6A]'
                          : 'text-[#D3C7B2] fill-[#E7DEC9]'
                      }`}
                    />
                  );
                })}
                {bonusLivesCount > 0 && (
                  <span className="ml-1 font-display text-sm font-bold text-[#B82843] tabular-nums">
                    +{bonusLivesCount} bonus
                  </span>
                )}
              </div>

              <span className="text-xs font-semibold text-[#5E4932] tabular-nums whitespace-nowrap">
                {lifeInfo.count >= MAX_STANDARD_LIVES
                  ? bonusLivesCount > 0
                    ? `${lifeInfo.count} Ready`
                    : '5 / 5 Full'
                  : `Next in ${formatCountdown(lifeInfo.nextRefillAt - now)}`}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-xs text-[#75614B]">
                {lifeInfo.count >= MAX_STANDARD_LIVES
                  ? 'Replaying cleared levels never costs a life.'
                  : 'Lives refill every 30 min, or top up with coins.'}
              </p>
              {lifeInfo.count < MAX_STANDARD_LIVES && (
                <button
                  type="button"
                  onClick={onRefillLifeWithCoins}
                  disabled={progress.coins < 50}
                  className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#FBEBD0] hover:bg-[#F7DCAD] disabled:opacity-50 text-[#7E4B0A] text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  +1 Life · 50 Coins
                </button>
              )}
            </div>
          </div>

          {/* Daily Login Streak Mini-Tracker Card */}
          <div className="rounded-3xl bg-[#FFFDF8]/86 backdrop-blur-md border border-[#E6DAC0] p-4 sm:p-5 shadow-[0_10px_28px_-16px_rgba(110,85,48,0.18)]">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="font-display text-base font-bold text-[#2D2218]">
                  Daily Login Rewards
                </h2>
                <p className="text-xs text-[#7A664F] tabular-nums">
                  {dailyStatus.alreadyClaimedToday
                    ? `Streak ${progress.dailyLogin.streak}d · Claimed today`
                    : `Day ${dailyStatus.activeDayNumber} bonus ready to collect`}
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenDailyReward}
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#F6EEDB] hover:bg-[#EFE2C6] text-[#5C4327] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>{dailyStatus.canClaim ? 'Claim' : 'Calendar'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {DAILY_REWARD_SCHEDULE.map((tier) => {
                const done =
                  tier.day < dailyStatus.activeDayNumber ||
                  (tier.day === dailyStatus.activeDayNumber && dailyStatus.alreadyClaimedToday);
                const active = tier.day === dailyStatus.activeDayNumber && dailyStatus.canClaim;

                return (
                  <button
                    key={tier.day}
                    type="button"
                    onClick={onOpenDailyReward}
                    title={`Day ${tier.day}: ${tier.coins ? `+${tier.coins} coins` : ''} ${
                      tier.lives ? `+${tier.lives} lives` : ''
                    }`}
                    className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center border text-center transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#FFEBB8] border-[#E59B14] text-[#6B3F05]'
                        : done
                        ? 'bg-[#EAF5EE] border-[#BFE2CB] text-[#226940]'
                        : 'bg-[#FAF4E7] border-[#E8DEC8] text-[#7A664F]'
                    }`}
                  >
                    <span className="text-[10px] font-bold tabular-nums">D{tier.day}</span>
                    {tier.lives > 0 ? (
                      <Heart
                        className={`w-3.5 h-3.5 mt-0.5 ${
                          active || done ? 'text-[#D93D59] fill-[#D93D59]' : 'text-[#B8A891]'
                        }`}
                      />
                    ) : (
                      <Coins
                        className={`w-3.5 h-3.5 mt-0.5 ${
                          active || done ? 'text-[#E59B14]' : 'text-[#B8A891]'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Daily Challenge & Quick Destinations */}
          <div className="rounded-3xl bg-[#FFFDF8]/86 backdrop-blur-md border border-[#E6DAC0] p-4 sm:p-5 shadow-[0_10px_28px_-16px_rgba(110,85,48,0.18)] space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#C25B1A] tabular-nums">
                  <Flame className="w-4 h-4" />
                  <span>Daily Challenge · Streak {progress.dailyChallengeStreak}</span>
                </div>
                <p className="mt-1 text-sm text-[#5C4936]">
                  {dailyClearedToday
                    ? 'Today’s seeded puzzle is complete. Replay anytime for practice.'
                    : 'Solve today’s seeded liquid puzzle to earn +25 bonus coins.'}
                </p>
              </div>
              <button
                type="button"
                onClick={onPlayDaily}
                className="min-h-[44px] px-4 py-2 rounded-xl btn-tactile-emerald text-white font-display text-sm font-bold whitespace-nowrap shrink-0 cursor-pointer"
              >
                {dailyClearedToday ? 'Replay' : 'Play Daily'}
              </button>
            </div>

            <div className="pt-3 border-t border-[#EFE5D0] grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onNavigate('garden')}
                className="min-h-[48px] rounded-2xl bg-[#FAF4E7] hover:bg-[#F3E7CE] border border-[#EAE0CA] flex flex-col items-center justify-center gap-1 text-xs font-semibold text-[#473726] cursor-pointer transition-colors"
              >
                <Sprout className="w-4 h-4 text-[#2E8555]" />
                <span>Garden</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('rewards')}
                className="min-h-[48px] rounded-2xl bg-[#FAF4E7] hover:bg-[#F3E7CE] border border-[#EAE0CA] flex flex-col items-center justify-center gap-1 text-xs font-semibold text-[#473726] cursor-pointer transition-colors"
              >
                <Trophy className="w-4 h-4 text-[#D98E16]" />
                <span>Rewards</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className="min-h-[48px] rounded-2xl bg-[#FAF4E7] hover:bg-[#F3E7CE] border border-[#EAE0CA] flex flex-col items-center justify-center gap-1 text-xs font-semibold text-[#473726] cursor-pointer transition-colors"
              >
                <User className="w-4 h-4 text-[#C95232]" />
                <span>Profile</span>
              </button>
            </div>
          </div>
        </div>

        {/* Centerpiece Winding Level Journey Map (dominant focal anchor on desktop & mobile) */}
        <div className="order-2 lg:order-1 lg:col-span-7 xl:col-span-8">
          <LevelJourneyMap
            progress={progress}
            maxUnlocked={maxUnlocked}
            visibleLimit={visibleLimit}
            onSelectLevel={onSelectLevel}
            onLockedTap={onLockedTap}
            onLoadMore={onLoadMore}
            reduceMotion={reduceMotion}
          />

          {/* Quiet Legend directly beneath the map (unboxed text, zero pill clutter) */}
          <div className="mt-3 px-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#7A664F]">
            <div className="flex flex-wrap items-center gap-3">
              <span>Current: Level {progress.currentLevel} ({getDifficultyForLevel(progress.currentLevel)})</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">Unlocked up to Level {maxUnlocked}</span>
              <span aria-hidden="true">·</span>
              <span>Crown nodes mark every 10th milestone</span>
            </div>
            <button
              type="button"
              onClick={onOpenDailyReward}
              className="inline-flex items-center gap-1 font-semibold text-[#9E5B0C] hover:underline cursor-pointer"
            >
              <CalendarCheck2 className="w-3.5 h-3.5" />
              <span>Daily Login Calendar</span>
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
