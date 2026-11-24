import React, { useState } from 'react';
import {
  Award,
  CalendarPlus,
  Check,
  Coins,
  Crown,
  Flame,
  Gift,
  Heart,
  Lock,
  Settings,
  Share2,
  Star,
  Trophy,
  Vibrate,
  X,
} from 'lucide-react';
import { GameMode, GameSettings, PlayerProgress } from '../types/game';
import { ACHIEVEMENTS, GARDEN_PLANTS } from '../utils/levelGenerator';
import {
  calculateStreakReward,
  DAILY_REWARD_SCHEDULE,
  getDailyLoginStatus,
  getStarRankInfo,
  getTotalStars,
  STAR_RANK_TIERS,
} from '../utils/storage';
import {
  DailyChestIllustration,
  GardenSanctuaryBanner,
  PlantIllustration,
  RssDropletEmblem,
} from './SceneryArtwork';

/* ============================================================================
 * GARDEN SCREEN
 * ========================================================================== */
export const GardenScreen: React.FC<{ progress: PlayerProgress }> = ({ progress }) => {
  const unlockedCount = GARDEN_PLANTS.filter(
    (p) => progress.levelsCleared >= p.unlockAt || progress.collections[p.id]
  ).length;

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-4 pb-24 lg:pb-10 space-y-5">
      <div className="relative rounded-3xl overflow-hidden border border-[#E4D6B8] h-44 sm:h-52 shadow-[0_12px_30px_-16px_rgba(110,85,48,0.22)]">
        <GardenSanctuaryBanner />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2D2218]/65 via-[#2D2218]/20 to-transparent flex items-end p-5 sm:p-6">
          <div className="text-white">
            <p className="text-xs font-semibold text-[#FDECC4] tabular-nums">
              {unlockedCount} / {GARDEN_PLANTS.length} Botanical Species Unlocked
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold">Sunlit Garden</h1>
            <p className="text-xs sm:text-sm text-[#FFF6E3]/90">
              Clear levels along your journey to grow new plants in your RSS sanctuary.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {GARDEN_PLANTS.map((plant) => {
          const unlocked =
            progress.levelsCleared >= plant.unlockAt || Boolean(progress.collections[plant.id]);
          return (
            <div
              key={plant.id}
              className={`rounded-3xl p-4 border flex flex-col items-center text-center transition-colors ${
                unlocked
                  ? 'bg-[#FFFDF8] border-[#DFE6D5] shadow-xs'
                  : 'bg-[#F5EFE2] border-[#E5DAC4] opacity-80'
              }`}
            >
              <div className="mb-2">
                <PlantIllustration id={plant.id} unlocked={unlocked} />
              </div>
              <h2 className="font-display text-base font-bold text-[#2D2218]">{plant.name}</h2>
              <p className="mt-1 text-xs text-[#6E5B47] leading-snug">{plant.description}</p>
              <div className="mt-3 text-[11px] font-bold tabular-nums">
                {unlocked ? (
                  <span className="inline-flex items-center gap-1 text-[#247243]">
                    <Check className="w-3.5 h-3.5" /> Blooming
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[#8A7760]">
                    <Lock className="w-3 h-3" /> Clear {plant.unlockAt} levels
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ============================================================================
 * REWARDS SCREEN
 * ========================================================================== */
export const RewardsScreen: React.FC<{
  progress: PlayerProgress;
  referenceDateKey: string;
  onClaimDailyLogin: () => void;
  onPlayDaily: () => void;
  onShare: () => void;
}> = ({ progress, referenceDateKey, onClaimDailyLogin, onPlayDaily, onShare }) => {
  const dailyStatus = getDailyLoginStatus(progress, referenceDateKey);
  const dailyClearedToday = Boolean(progress.dailyClears[referenceDateKey]);

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-4 pb-24 lg:pb-10 space-y-5">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#2D2218]">
          Rewards & Streaks
        </h1>
        <p className="text-sm text-[#6E5B47]">
          Collect daily login bonuses, complete daily puzzles, and unlock level milestones.
        </p>
      </div>

      {/* Full 7-Day Daily Login Rewards Card */}
      <section className="rounded-3xl bg-[#FFFDF8] border border-[#E6DAC0] p-5 shadow-[0_12px_30px_-16px_rgba(110,85,48,0.2)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE5D0]">
          <div className="flex items-center gap-3.5">
            <DailyChestIllustration className="w-16 h-16 shrink-0" />
            <div>
              <p className="text-xs font-bold text-[#9A5B09] tabular-nums">
                Daily Login Streak · {dailyStatus.projectedStreak}d ({dailyStatus.streakMultiplier}× Coins)
              </p>
              <h2 className="font-display text-xl font-bold text-[#2D2218]">
                7-Day Bonus Calendar
              </h2>
              <p className="text-xs sm:text-sm text-[#6E5B47]">
                Consecutive visits grow your streak multiplier for extra bonus coins and lives.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClaimDailyLogin}
            disabled={!dailyStatus.canClaim}
            className={`min-h-[46px] px-5 py-2.5 rounded-2xl font-display text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
              dailyStatus.canClaim
                ? 'btn-tactile-coral text-white'
                : 'bg-[#EEF5F0] text-[#247243] border border-[#C3E1CD] cursor-default'
            }`}
          >
            {dailyStatus.canClaim ? (
              <>
                <Gift className="w-4 h-4" />
                <span>Claim Day {dailyStatus.activeDayNumber}</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Claimed Today</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {DAILY_REWARD_SCHEDULE.map((tier) => {
            const done =
              tier.day < dailyStatus.activeDayNumber ||
              (tier.day === dailyStatus.activeDayNumber && dailyStatus.alreadyClaimedToday);
            const isToday = tier.day === dailyStatus.activeDayNumber && dailyStatus.canClaim;
            const tileStreakDay = dailyStatus.cycleStartStreak + (tier.day - 1);
            const calc = calculateStreakReward(tier, tileStreakDay);

            return (
              <div
                key={tier.day}
                className={`rounded-2xl p-3 border flex flex-col items-center text-center ${
                  isToday
                    ? 'bg-[#FFF3CE] border-[#E59B14]'
                    : done
                    ? 'bg-[#EEF7F1] border-[#BFE2CB]'
                    : 'bg-[#FAF4E7] border-[#E8DEC8]'
                }`}
              >
                <span className="text-xs font-bold text-[#5C4936] tabular-nums">{tier.label}</span>
                <div className="my-2 flex flex-col items-center gap-1">
                  {calc.totalCoins > 0 && (
                    <span className="inline-flex items-center gap-1 font-display text-sm font-bold text-[#8F5906] tabular-nums">
                      <Coins className="w-4 h-4 text-[#E59B14]" />+{calc.totalCoins}
                    </span>
                  )}
                  {calc.lives > 0 && (
                    <span className="inline-flex items-center gap-1 font-display text-sm font-bold text-[#B82843] tabular-nums">
                      <Heart className="w-4 h-4 text-[#D93D59] fill-[#D93D59]" />+{calc.lives}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-semibold text-[#75614B] tabular-nums">
                  {calc.bonusCoins > 0 ? `${calc.multiplier}×` : done ? 'Claimed' : isToday ? 'Available' : 'Upcoming'}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Daily Challenge + Share Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-3xl bg-[#FFFDF8] border border-[#E6DAC0] p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C25B1A] tabular-nums">
              <Flame className="w-4 h-4" />
              <span>Daily Challenge · Streak {progress.dailyChallengeStreak}</span>
            </div>
            <h2 className="mt-1 font-display text-lg font-bold text-[#2D2218]">
              Today’s Seeded Puzzle
            </h2>
            <p className="mt-1 text-sm text-[#6E5B47]">
              {dailyClearedToday
                ? 'Completed for today! You can replay for fun anytime.'
                : 'Complete today’s unique liquid flow layout for +25 coins.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onPlayDaily}
            className="min-h-[46px] px-5 py-2.5 rounded-2xl btn-tactile-emerald text-white font-display text-sm font-bold cursor-pointer self-start"
          >
            {dailyClearedToday ? 'Replay Daily' : 'Play Daily Challenge'}
          </button>
        </div>

        <div className="rounded-3xl bg-[#FFFDF8] border border-[#E6DAC0] p-5 flex flex-col justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#2D2218]">Share RSS Liquid Flow</h2>
            <p className="mt-1 text-sm text-[#6E5B47]">
              Invite friends to play RSS Liquid Flow and compare stars across sunlit worlds.
            </p>
          </div>
          <button
            type="button"
            onClick={onShare}
            className="min-h-[46px] px-5 py-2.5 rounded-2xl bg-[#F6EEDB] hover:bg-[#EFE2C6] text-[#4C3A26] font-display text-sm font-bold inline-flex items-center gap-2 cursor-pointer self-start"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Game Link</span>
          </button>
        </div>
      </div>

      {/* Achievements */}
      <section className="rounded-3xl bg-[#FFFDF8] border border-[#E6DAC0] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-[#E59B14]" />
          <h2 className="font-display text-lg font-bold text-[#2D2218]">Journey Milestones</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ACHIEVEMENTS.map((ach) => {
            const done = progress.levelsCleared >= ach.target || Boolean(progress.achievements[ach.id]);
            const pct = Math.min(100, Math.round((progress.levelsCleared / ach.target) * 100));
            return (
              <div
                key={ach.id}
                className={`rounded-2xl p-4 border ${
                  done ? 'bg-[#EEF7F1] border-[#BFE2CB]' : 'bg-[#FAF4E7] border-[#E8DEC8]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-base font-bold text-[#2D2218]">{ach.title}</span>
                  <span className="text-xs font-bold text-[#8F5906] tabular-nums">
                    +{ach.rewardCoins} coins
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[#6E5B47] tabular-nums">
                  Clear {ach.target} {ach.target === 1 ? 'level' : 'levels'} ({Math.min(progress.levelsCleared, ach.target)}/{ach.target})
                </p>
                <div className="mt-2.5 h-2 rounded-full bg-[#E6DAC2] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#2E8555]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

/* ============================================================================
 * PROFILE SCREEN
 * ========================================================================== */
export const ProfileScreen: React.FC<{
  progress: PlayerProgress;
  referenceDateKey: string;
  onUpdateName: (name: string) => void;
  onOpenSettings: () => void;
  onSimulateNextDay: () => void;
}> = ({ progress, referenceDateKey, onUpdateName, onOpenSettings, onSimulateNextDay }) => {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(progress.playerName);
  const totalStars = getTotalStars(progress);
  const starRank = getStarRankInfo(totalStars);

  // Real breakdown of earned star ratings across completed levels
  const starValues = Object.values(progress.levelStars).map((v) => Number(v) || 0);
  const threeStarCount = starValues.filter((s) => s >= 3).length;
  const twoStarCount = starValues.filter((s) => s === 2).length;
  const oneStarCount = starValues.filter((s) => s === 1).length;

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draftName.trim() || 'Guest';
    onUpdateName(trimmed);
    setEditing(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 pt-4 pb-24 lg:pb-10 space-y-5">
      <div className="rounded-3xl bg-[#FFFDF8] border border-[#E6DAC0] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <RssDropletEmblem className="w-16 h-16 shrink-0" />
          <div>
            {editing ? (
              <form onSubmit={handleSaveName} className="flex items-center gap-2">
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  maxLength={24}
                  className="px-3 py-1.5 rounded-xl border border-[#D9C9AA] bg-[#FAF6EC] text-sm font-semibold text-[#2D2218] focus:outline-2 focus:outline-[#E55A3C]"
                  aria-label="Player name"
                />
                <button
                  type="submit"
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#2E8555] text-white text-xs font-bold cursor-pointer"
                >
                  Save
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-[#2D2218]">
                  {progress.playerName}
                </h1>
                <button
                  type="button"
                  onClick={() => {
                    setDraftName(progress.playerName);
                    setEditing(true);
                  }}
                  className="text-xs font-semibold text-[#9E5B0C] hover:underline cursor-pointer"
                >
                  Edit
                </button>
              </div>
            )}
            <p className="text-xs sm:text-sm text-[#6E5B47]">
              Local progress preserved safely in browser storage
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          className="min-h-[44px] px-4 py-2 rounded-2xl bg-[#F6EEDB] hover:bg-[#EFE2C6] text-[#4C3A26] text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>

      {/* Star Overview Panel with Rank-Based Badge */}
      <section
        aria-label="Star Overview"
        className="rounded-3xl bg-gradient-to-br from-[#FFFDF7] via-[#FBF3E0] to-[#F7EBD0] border border-[#E5D3AD] p-5 sm:p-6 shadow-[0_12px_30px_-16px_rgba(110,85,48,0.22)]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-[#FFE68C] to-[#E8A017] border-2 border-[#FFFDF8] shadow-md flex items-center justify-center text-[#5A3404] shrink-0">
              <Star className="w-7 h-7 fill-[#FFF5CC] text-[#7C4704]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#8A6128] uppercase tracking-wider">
                Star Overview
              </p>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl font-bold text-[#2D2218] tabular-nums">
                  {totalStars}
                </span>
                <span className="text-sm font-semibold text-[#6E5B47]">
                  Total {totalStars === 1 ? 'Star' : 'Stars'} Earned
                </span>
              </div>
              <p className="text-xs text-[#6E5B47] mt-0.5">{starRank.current.subtitle}</p>
            </div>
          </div>

          {/* Rank-Based Badge */}
          <div
            className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border-2 shadow-xs self-start sm:self-center shrink-0"
            style={{
              backgroundColor: starRank.current.badgeBg,
              borderColor: starRank.current.badgeBorder,
              color: starRank.current.badgeText,
            }}
          >
            {starRank.current.id === 'grandmaster' || starRank.current.id === 'master' ? (
              <Crown className="w-5 h-5 shrink-0" />
            ) : (
              <Award className="w-5 h-5 shrink-0" />
            )}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-80 leading-none">
                Rank
              </div>
              <div className="font-display text-lg font-bold leading-tight">
                {starRank.current.title}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar Toward Next Rank */}
        <div className="mt-4 pt-4 border-t border-[#E8D8B5]">
          <div className="flex items-center justify-between text-xs font-semibold text-[#6E5B47] mb-1.5 tabular-nums">
            <span>
              {starRank.next
                ? `${starRank.starsToNext} more ${
                    starRank.starsToNext === 1 ? 'star' : 'stars'
                  } to reach ${starRank.next.title}`
                : 'Maximum Grandmaster Rank Achieved'}
            </span>
            <span className="text-[#2D2218] font-bold">
              {starRank.next ? `${totalStars} / ${starRank.next.minStars}` : `${totalStars} ★`}
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-[#EAE0C8] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.max(4, starRank.progressPct)}%`,
                backgroundColor: starRank.current.barColor,
              }}
            />
          </div>

          {/* Star Breakdown & Rank Ladder */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-[#FFFDF8]/85 border border-[#EADCC0] py-2 px-2">
              <div className="flex items-center justify-center gap-0.5 text-[#E8A317]">
                <Star className="w-3.5 h-3.5 fill-[#F5BC38]" />
                <Star className="w-3.5 h-3.5 fill-[#F5BC38]" />
                <Star className="w-3.5 h-3.5 fill-[#F5BC38]" />
              </div>
              <div className="mt-1 font-display text-base font-bold text-[#2D2218] tabular-nums">
                {threeStarCount}
              </div>
              <div className="text-[11px] text-[#7A664F]">3-Star Clears</div>
            </div>
            <div className="rounded-2xl bg-[#FFFDF8]/85 border border-[#EADCC0] py-2 px-2">
              <div className="flex items-center justify-center gap-0.5 text-[#E8A317]">
                <Star className="w-3.5 h-3.5 fill-[#F5BC38]" />
                <Star className="w-3.5 h-3.5 fill-[#F5BC38]" />
              </div>
              <div className="mt-1 font-display text-base font-bold text-[#2D2218] tabular-nums">
                {twoStarCount}
              </div>
              <div className="text-[11px] text-[#7A664F]">2-Star Clears</div>
            </div>
            <div className="rounded-2xl bg-[#FFFDF8]/85 border border-[#EADCC0] py-2 px-2">
              <div className="flex items-center justify-center gap-0.5 text-[#E8A317]">
                <Star className="w-3.5 h-3.5 fill-[#F5BC38]" />
              </div>
              <div className="mt-1 font-display text-base font-bold text-[#2D2218] tabular-nums">
                {oneStarCount}
              </div>
              <div className="text-[11px] text-[#7A664F]">1-Star Clears</div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-1.5 text-[11px] text-[#7A664F] tabular-nums">
            {STAR_RANK_TIERS.map((tier) => {
              const reached = totalStars >= tier.minStars;
              return (
                <span
                  key={tier.id}
                  className={`font-semibold ${
                    tier.id === starRank.current.id
                      ? 'text-[#2D2218] underline decoration-[#E59B14] decoration-2 underline-offset-4'
                      : reached
                      ? 'text-[#2E8555]'
                      : 'opacity-70'
                  }`}
                >
                  {tier.title} ({tier.minStars}★)
                </span>
              );
            })}
          </div>
        </div>
      </section>

      {/* Real Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
        <div className="rounded-2xl bg-[#FFFDF8] border border-[#E6DAC0] p-4">
          <div className="text-xs font-medium text-[#7A664F]">Levels Cleared</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#2D2218] tabular-nums">
            {progress.levelsCleared}
          </div>
        </div>
        <div className="rounded-2xl bg-[#FFFDF8] border border-[#E6DAC0] p-4">
          <div className="text-xs font-medium text-[#7A664F]">Best Level</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#2D2218] tabular-nums">
            {progress.bestLevel}
          </div>
        </div>
        <div className="rounded-2xl bg-[#FFFDF8] border border-[#E6DAC0] p-4">
          <div className="text-xs font-medium text-[#7A664F]">Total Stars</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#2D2218] tabular-nums inline-flex items-center gap-1.5">
            <Star className="w-5 h-5 text-[#E8A317] fill-[#F5BC38]" />
            <span>{totalStars}</span>
          </div>
        </div>
        <div className="rounded-2xl bg-[#FFFDF8] border border-[#E6DAC0] p-4">
          <div className="text-xs font-medium text-[#7A664F]">Coins</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#9A5F0A] tabular-nums">
            {progress.coins.toLocaleString()}
          </div>
        </div>
        <div className="rounded-2xl bg-[#FFFDF8] border border-[#E6DAC0] p-4">
          <div className="text-xs font-medium text-[#7A664F]">Total Moves</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#2D2218] tabular-nums">
            {progress.totalMoves.toLocaleString()}
          </div>
        </div>
        <div className="rounded-2xl bg-[#FFFDF8] border border-[#E6DAC0] p-4">
          <div className="text-xs font-medium text-[#7A664F]">Daily Login Streak</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#2E8555] tabular-nums">
            {progress.dailyLogin.streak} {progress.dailyLogin.streak === 1 ? 'day' : 'days'}
          </div>
        </div>
      </div>

      {/* Non-destructive Daily Login Verification Helper */}
      <div className="rounded-3xl bg-[#FFFDF8] border border-[#E6DAC0] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-bold text-[#2D2218]">
            Daily Login Reward Preview
          </h2>
          <p className="mt-0.5 text-xs sm:text-sm text-[#6E5B47] tabular-nums">
            Active calendar date: {referenceDateKey}. Preview tomorrow’s login check to verify multi-day coin & bonus life rewards without resetting progress.
          </p>
        </div>
        <button
          type="button"
          onClick={onSimulateNextDay}
          className="min-h-[44px] px-4 py-2 rounded-2xl bg-[#FBEBD0] hover:bg-[#F7DCAD] text-[#7E4B0A] text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
        >
          <CalendarPlus className="w-4 h-4" />
          <span>Preview Next Day</span>
        </button>
      </div>
    </div>
  );
};

/* ============================================================================
 * SETTINGS MODAL
 * ========================================================================== */
export const SettingsModal: React.FC<{
  open: boolean;
  settings: GameSettings;
  onUpdate: (next: GameSettings) => void;
  onClose: () => void;
}> = ({ open, settings, onUpdate, onClose }) => {
  if (!open) return null;

  const toggle = (
    key: keyof Pick<GameSettings, 'sfx' | 'vibration' | 'reduceMotion' | 'showHints' | 'autoAdvance'>
  ) => {
    onUpdate({ ...settings, [key]: !settings[key] });
  };

  const intensityLabel =
    settings.vibrationIntensity <= 30
      ? 'Light'
      : settings.vibrationIntensity <= 70
      ? 'Medium'
      : 'Strong';

  const handleIntensityChange = (nextVal: number) => {
    const clamped = Math.max(10, Math.min(100, nextVal));
    onUpdate({ ...settings, vibrationIntensity: clamped });
    if (
      settings.vibration &&
      typeof navigator !== 'undefined' &&
      typeof navigator.vibrate === 'function'
    ) {
      try {
        const previewMs = Math.max(6, Math.round(18 * (0.35 + (clamped / 100) * 1.15)));
        navigator.vibrate(previewMs);
      } catch {
        // Ignore on unsupported devices
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#2D2218]/45 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-heading"
    >
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-[#FFFDF8] border border-[#E7DAC0] p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[#EFE5D0]">
          <h2 id="settings-heading" className="font-display text-xl font-bold text-[#2D2218]">
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-[#F6EEDB] hover:bg-[#EFE2C6] text-[#4C3A26] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="flex items-center justify-between min-h-[44px] px-3 py-2 rounded-2xl bg-[#FAF4E7] border border-[#ECE1CA] cursor-pointer">
            <span className="text-sm font-semibold text-[#3C2E20]">Sound effects</span>
            <input
              type="checkbox"
              checked={settings.sfx}
              onChange={() => toggle('sfx')}
              className="w-5 h-5 accent-[#E55A3C] cursor-pointer"
            />
          </label>

          {/* Vibration Toggle + Accessibility Intensity Slider */}
          <div className="rounded-2xl bg-[#FAF4E7] border border-[#ECE1CA] px-3 py-2.5 space-y-2.5">
            <label className="flex items-center justify-between min-h-[32px] cursor-pointer">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#3C2E20]">
                <Vibrate className="w-4 h-4 text-[#C96A1B]" />
                <span>Vibration feedback</span>
              </span>
              <input
                type="checkbox"
                checked={settings.vibration}
                onChange={() => toggle('vibration')}
                className="w-5 h-5 accent-[#E55A3C] cursor-pointer"
              />
            </label>

            <div
              className={`pt-2 border-t border-[#E8DEC8] transition-opacity ${
                settings.vibration ? 'opacity-100' : 'opacity-45'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-[#6E5B47] mb-1.5 tabular-nums">
                <label htmlFor="vibration-intensity-slider">Vibration intensity</label>
                <span className="text-[#2D2218] font-bold">
                  {intensityLabel} · {settings.vibrationIntensity}%
                </span>
              </div>
              <input
                id="vibration-intensity-slider"
                type="range"
                min={10}
                max={100}
                step={10}
                disabled={!settings.vibration}
                value={settings.vibrationIntensity}
                onChange={(e) => handleIntensityChange(Number(e.target.value))}
                aria-label="Adjust vibration feedback intensity"
                className="w-full h-2 rounded-full accent-[#E55A3C] cursor-pointer disabled:cursor-not-allowed"
              />
              <div className="mt-1 flex items-center justify-between text-[10px] font-medium text-[#8B765D]">
                <span>Gentle</span>
                <span>Balanced</span>
                <span>Strong</span>
              </div>
            </div>
          </div>

          {(
            [
              ['reduceMotion', 'Reduced motion'],
              ['showHints', 'Show puzzle hints'],
              ['autoAdvance', 'Auto-advance prompt'],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center justify-between min-h-[44px] px-3 py-2 rounded-2xl bg-[#FAF4E7] border border-[#ECE1CA] cursor-pointer"
            >
              <span className="text-sm font-semibold text-[#3C2E20]">{label}</span>
              <input
                type="checkbox"
                checked={settings[key]}
                onChange={() => toggle(key)}
                className="w-5 h-5 accent-[#E55A3C] cursor-pointer"
              />
            </label>
          ))}

          <div className="flex items-center justify-between min-h-[44px] px-3 py-2 rounded-2xl bg-[#FAF4E7] border border-[#ECE1CA]">
            <span className="text-sm font-semibold text-[#3C2E20]">Game mode</span>
            <select
              value={settings.mode}
              onChange={(e) => onUpdate({ ...settings, mode: e.target.value as GameMode })}
              className="rounded-xl bg-[#FFFDF8] border border-[#DFD2B8] px-3 py-1.5 text-sm font-semibold text-[#2D2218]"
            >
              <option value="relaxed">Relaxed</option>
              <option value="challenge">Challenge</option>
              <option value="expert">Expert</option>
              <option value="master">Master</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full min-h-[48px] rounded-2xl btn-tactile-emerald text-white font-display text-base font-bold cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
};
