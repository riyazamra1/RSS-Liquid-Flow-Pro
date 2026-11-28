import React, { useState } from 'react';
import {
  Award,
  CalendarDays,
  Check,
  Coins,
  Crown,
  Flame,
  Gift,
  Heart,
  Lock,
  LogOut,
  Palette,
  Play,
  Plus,
  RefreshCw,
  Send,
  Settings,
  Share2,
  Smartphone,
  Sparkles,
  Star,
  Target,
  Trophy,
  User,
  Users,
  Vibrate,
  X,
} from 'lucide-react';
import {
  AppThemeId,
  DailyMissionDefinition,
  GameMode,
  GameSettings,
  PlayerProgress,
} from '../types/game';
import { ACHIEVEMENTS, GARDEN_PLANTS } from '../utils/levelGenerator';
import { detectRuntimePlatform } from '../utils/platform';
import {
  calculateStreakReward,
  DAILY_MISSIONS_DEFINITIONS,
  DAILY_REWARD_SCHEDULE,
  getDailyLoginStatus,
  getDailySpinStatus,
  getFriendDailyQuota,
  getOffsetDateKey,
  getStarRankInfo,
  getTotalStars,
  getXpLevelInfo,
  MAX_FRIEND_LIVES_PER_DAY,
  normalizeDailyMissions,
  STAR_RANK_TIERS,
} from '../utils/storage';
import { APP_THEMES } from '../utils/themes';
import { getCurrentAppVersion, getLastUpdateCheckTime } from '../utils/updater';
import { PWAInstallButton } from './PWAInstallButton';
import {
  DailyChestIllustration,
  GardenSanctuaryBanner,
  PlantIllustration,
} from './SceneryArtwork';
import { SocialAchievementsPanel } from './SocialAchievementsPanel';

/* ============================================================================
 * GARDEN SCREEN
 * ========================================================================== */
export const GardenScreen: React.FC<{ progress: PlayerProgress }> = ({ progress }) => {
  const unlockedCount = GARDEN_PLANTS.filter(
    (p) => progress.levelsCleared >= p.unlockAt || progress.collections[p.id]
  ).length;

  return (
    <div className="relative z-10 max-w-5xl mx-auto px-3 sm:px-6 pt-4 pb-28 space-y-5">
      <div className="relative rounded-3xl overflow-hidden border theme-border h-44 sm:h-52 shadow-[0_12px_30px_-16px_rgba(24,18,12,0.28)]">
        <GardenSanctuaryBanner />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2D2218]/72 via-[#2D2218]/24 to-transparent flex items-end p-5 sm:p-6">
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
              className={`rounded-3xl p-4 border flex flex-col items-center text-center transition-colors backdrop-blur-md ${
                unlocked ? 'theme-surface-glass shadow-xs' : 'theme-surface-muted opacity-80'
              }`}
            >
              <div className="mb-2">
                <PlantIllustration id={plant.id} unlocked={unlocked} />
              </div>
              <h2 className="font-display text-base font-bold theme-ink">{plant.name}</h2>
              <p className="mt-1 text-xs theme-ink-secondary leading-snug">{plant.description}</p>
              <div className="mt-3 text-[11px] font-bold tabular-nums">
                {unlocked ? (
                  <span className="inline-flex items-center gap-1 text-[#247243] dark:text-[#5EEAD4]">
                    <Check className="w-3.5 h-3.5" /> Blooming
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 theme-ink-muted">
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
 * REWARDS SCREEN (Daily Login Rewards + Daily Challenge + Friend Life Sharing)
 * ========================================================================== */
export const RewardsScreen: React.FC<{
  progress: PlayerProgress;
  referenceDateKey: string;
  onClaimDailyLogin: () => void;
  onClaimMission: (missionId: DailyMissionDefinition['id']) => void;
  onPlayDaily: () => void;
  onPlayCurrent: () => void;
  onShare: () => void;
  onOpenWheel: () => void;
  onSendFriendLife: (friendId: string) => void;
  onClaimFriendLife: (friendId: string) => void;
  onAddFriend: (name: string, level: number) => void;
}> = ({
  progress,
  referenceDateKey,
  onClaimDailyLogin,
  onClaimMission,
  onPlayDaily,
  onPlayCurrent,
  onShare,
  onOpenWheel,
  onSendFriendLife,
  onClaimFriendLife,
  onAddFriend,
}) => {
  const [addingFriend, setAddingFriend] = useState(false);
  const [friendName, setFriendName] = useState('');
  const [friendLevel, setFriendLevel] = useState(String(Math.max(1, progress.currentLevel)));

  const dailyStatus = getDailyLoginStatus(progress, referenceDateKey);
  const dailySpinStatus = getDailySpinStatus(progress, referenceDateKey);
  const freeSpinReady = dailySpinStatus.canSpinToday;
  const dailyClearedToday = Boolean(progress.dailyClears[referenceDateKey]);
  const missionsState = normalizeDailyMissions(progress.dailyMissions, referenceDateKey);
  const xpInfo = getXpLevelInfo(progress.xp);

  const completedMissionsCount = DAILY_MISSIONS_DEFINITIONS.filter(
    (m) => missionsState[m.metric] >= m.target
  ).length;

  // Build authentic 30-day calendar history ending at referenceDateKey
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const claimedDateSet = new Set<string>(progress.dailyLogin.claimedDates || []);
  if (progress.dailyLogin.lastClaimDate) {
    claimedDateSet.add(progress.dailyLogin.lastClaimDate);
  }

  // Identify contiguous active streak dates ending at today (or yesterday if today not yet claimed)
  const activeStreakSet = new Set<string>();
  const streakAnchor = claimedDateSet.has(referenceDateKey)
    ? referenceDateKey
    : getOffsetDateKey(referenceDateKey, -1);
  if (claimedDateSet.has(streakAnchor)) {
    let cursor = streakAnchor;
    for (let step = 0; step < 30; step++) {
      if (!claimedDateSet.has(cursor)) break;
      activeStreakSet.add(cursor);
      cursor = getOffsetDateKey(cursor, -1);
    }
  }

  const historyDays = Array.from({ length: 30 }, (_, idx) => {
    const offset = idx - 29; // -29 .. 0
    const dateKey = getOffsetDateKey(referenceDateKey, offset);
    const [year, month, day] = dateKey.split('-').map(Number);
    const dt = new Date(year, (month || 1) - 1, day || 1);
    const weekday = dt.getDay(); // 0..6
    const monthShort = MONTH_NAMES[(month || 1) - 1] || '';
    const isClaimed = claimedDateSet.has(dateKey);
    const isToday = dateKey === referenceDateKey;
    const isStreakDay = activeStreakSet.has(dateKey);
    const showMonthLabel = idx === 0 || day === 1;

    return {
      dateKey,
      day,
      year,
      monthShort,
      weekday,
      isClaimed,
      isToday,
      isStreakDay,
      showMonthLabel,
      readableDate: `${monthShort} ${day}, ${year}`,
    };
  });

  const leadingCalendarSpacers = historyDays[0]?.weekday ?? 0;
  const trailingCalendarSpacers = (7 - ((leadingCalendarSpacers + historyDays.length) % 7)) % 7;
  const checkedIn30Count = historyDays.filter((d) => d.isClaimed).length;
  const consistencyPct = Math.round((checkedIn30Count / 30) * 100);
  const rangeLabel =
    historyDays.length > 0
      ? `${historyDays[0].monthShort} ${historyDays[0].day} – ${historyDays[historyDays.length - 1].monthShort} ${historyDays[historyDays.length - 1].day}`
      : 'Past 30 Days';

  const handleAddFriendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = friendName.trim();
    if (!cleaned) return;
    const lv = Math.max(1, Math.min(999, Number(friendLevel) || 1));
    onAddFriend(cleaned, lv);
    setFriendName('');
    setFriendLevel(String(Math.max(1, progress.currentLevel)));
    setAddingFriend(false);
  };

  return (
    <div className="relative z-10 max-w-5xl mx-auto px-3 sm:px-6 pt-4 pb-28 space-y-5">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold theme-ink">
          Rewards &amp; Daily Events
        </h1>
        <p className="text-sm theme-ink-secondary">
          Spin the Lucky Wheel, complete Daily Missions for bonus coins &amp; XP, and claim login streaks.
        </p>
      </div>

      {/* Lucky Prize Wheel Card */}
      <section
        aria-label="Lucky Prize Wheel"
        className="rounded-3xl theme-surface-glass backdrop-blur-md border p-5 shadow-[0_12px_30px_-16px_rgba(24,18,12,0.25)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-full p-1 bg-gradient-to-b from-[#FFE680] via-[#F59E0B] to-[#B45309] shadow-md shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full" aria-hidden="true">
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
            {freeSpinReady && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#16A34A] border-2 border-white text-[10px] font-display font-extrabold text-white flex items-center justify-center shadow-xs tabular-nums">
                {dailySpinStatus.remainingToday}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-bold tabular-nums">
              <span className={freeSpinReady ? 'text-[#247243] dark:text-[#5EEAD4]' : 'theme-ink-secondary'}>
                {freeSpinReady
                  ? `${dailySpinStatus.remainingToday} of ${dailySpinStatus.maxDailySpins} Daily Spins Left`
                  : `Daily Limit Reached (${dailySpinStatus.usedToday}/${dailySpinStatus.maxDailySpins}) · Come Back Tomorrow`}
              </span>
              {progress.spinWheel?.totalSpins > 0 && (
                <>
                  <span aria-hidden="true" className="theme-ink-muted">·</span>
                  <span className="theme-ink-secondary">
                    {progress.spinWheel.totalSpins} Total Spins
                  </span>
                </>
              )}
            </div>
            <h2 className="font-display text-xl font-bold theme-ink">Lucky Prize Wheel</h2>
            <p className="text-xs sm:text-sm theme-ink-secondary">
              Win up to +250 Coins, bonus Life Gifts, or test your luck (max 3 spins per day).
              {progress.spinWheel?.lastOutcomeLabel ? ` Last win: ${progress.spinWheel.lastOutcomeLabel}.` : ''}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenWheel}
          className={`min-h-[48px] px-5 py-2.5 rounded-2xl font-display text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
            freeSpinReady
              ? 'btn-tactile-emerald text-white'
              : 'theme-surface-muted border theme-ink-secondary'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>
            {freeSpinReady
              ? `Spin Now (${dailySpinStatus.remainingToday}/${dailySpinStatus.maxDailySpins})`
              : 'Limit Reached (3/3)'}
          </span>
        </button>
      </section>

      {/* Daily Missions Section (3 Distinct Achievable Tasks) */}
      <section
        aria-label="Daily Missions"
        className="rounded-3xl theme-surface-glass backdrop-blur-md border p-5 shadow-[0_12px_30px_-16px_rgba(24,18,12,0.25)]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b theme-border">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#FFE7DF] dark:bg-[#173A54] border border-[#F3BCA8] dark:border-[#2B648E] flex items-center justify-center text-[#E55A3C] dark:text-[#2BD4C5] shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-bold theme-ink">Daily Missions</h2>
                <span className="text-xs font-bold theme-ink-secondary tabular-nums">
                  {completedMissionsCount}/3 Complete
                </span>
              </div>
              <p className="text-xs sm:text-sm theme-ink-secondary">
                Finish today&apos;s 3 tasks to earn bonus coins and player experience.
              </p>
            </div>
          </div>

          {/* Player Experience (XP) Level Indicator */}
          <div className="rounded-2xl theme-surface-muted border px-3.5 py-2 min-w-[190px] shrink-0">
            <div className="flex items-center justify-between gap-3 text-xs font-bold tabular-nums">
              <span className="inline-flex items-center gap-1 text-[#2E8555] dark:text-[#5EEAD4]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Lv. {xpInfo.level}</span>
              </span>
              <span className="theme-ink">{xpInfo.totalXp.toLocaleString()} XP</span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#2E8555] to-[#48AF75] dark:from-[#2BD4C5] dark:to-[#34D399] transition-all duration-300"
                style={{ width: `${Math.max(4, xpInfo.progressPct)}%` }}
              />
            </div>
            <div className="mt-1 text-[10px] font-medium theme-ink-muted tabular-nums">
              {xpInfo.currentLevelXp}/{xpInfo.nextLevelXp} XP to Lv. {xpInfo.level + 1}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {DAILY_MISSIONS_DEFINITIONS.map((mission) => {
            const rawValue = missionsState[mission.metric];
            const currentValue = Math.min(mission.target, rawValue);
            const pct = Math.min(100, Math.round((currentValue / mission.target) * 100));
            const isComplete = rawValue >= mission.target;
            const isClaimed = missionsState.claimedMissionIds.includes(mission.id);

            return (
              <div
                key={mission.id}
                className={`rounded-2xl p-4 border flex flex-col justify-between gap-3 transition-colors ${
                  isClaimed
                    ? 'bg-[#EEF7F1] dark:bg-[#133831] border-[#BFE2CB] dark:border-[#246A60]'
                    : isComplete
                    ? 'bg-[#FFF5DA] dark:bg-[#2F2A14] border-[#E59B14]'
                    : 'theme-surface-muted'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-base font-bold theme-ink leading-snug">
                      {mission.title}
                    </h3>
                    <span className="text-xs font-bold theme-ink tabular-nums whitespace-nowrap shrink-0">
                      {currentValue}/{mission.target}
                    </span>
                  </div>
                  <p className="mt-1 text-xs theme-ink-secondary leading-relaxed">
                    {mission.description}
                  </p>

                  <div className="mt-3 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isClaimed || isComplete
                          ? 'bg-[#2E8555] dark:bg-[#2BD4C5]'
                          : 'bg-[#E55A3C]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="mt-2.5 flex items-center gap-2 text-xs font-bold tabular-nums">
                    <span className="inline-flex items-center gap-1 text-[#9A5F0A] dark:text-[#F5BC38]">
                      <Coins className="w-3.5 h-3.5 text-[#E59B14]" />+{mission.rewardCoins} Coins
                    </span>
                    <span aria-hidden="true" className="theme-ink-muted">·</span>
                    <span className="inline-flex items-center gap-1 text-[#2E8555] dark:text-[#5EEAD4]">
                      <Sparkles className="w-3.5 h-3.5" />+{mission.rewardXp} XP
                    </span>
                  </div>
                </div>

                {isClaimed ? (
                  <button
                    type="button"
                    disabled
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#E2F3E8] dark:bg-[#16423A] text-[#1D633B] dark:text-[#5EEAD4] border border-[#BFE2CB] dark:border-[#246A60] font-display text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-default"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Claimed</span>
                  </button>
                ) : isComplete ? (
                  <button
                    type="button"
                    onClick={() => onClaimMission(mission.id)}
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-xl btn-tactile-coral text-white font-display text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Gift className="w-3.5 h-3.5" />
                    <span>Claim Reward</span>
                  </button>
                ) : mission.id === 'gift_lives' ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (progress.friends.length === 0) {
                        setAddingFriend(true);
                      }
                      document
                        .getElementById('friends-life-sharing-section')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-xl theme-surface border font-display text-xs font-bold theme-ink inline-flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90"
                  >
                    <Send className="w-3.5 h-3.5 text-[#E55A3C] dark:text-[#2BD4C5]" />
                    <span>{progress.friends.length === 0 ? 'Add Friend & Gift' : 'Gift Lives Below'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onPlayCurrent}
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-xl theme-surface border font-display text-xs font-bold theme-ink inline-flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90"
                  >
                    <Play className="w-3.5 h-3.5 fill-current text-[#E55A3C] dark:text-[#2BD4C5]" />
                    <span>Play Level {progress.currentLevel}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Full 7-Day Daily Login Rewards Card */}
      <section className="rounded-3xl theme-surface-glass backdrop-blur-md border p-5 shadow-[0_12px_30px_-16px_rgba(24,18,12,0.25)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b theme-border">
          <div className="flex items-center gap-3.5">
            <DailyChestIllustration className="w-16 h-16 shrink-0" />
            <div>
              <p className="text-xs font-bold text-[#9A5B09] dark:text-[#F5BC38] tabular-nums">
                Daily Login Streak · {dailyStatus.projectedStreak}d ({dailyStatus.streakMultiplier}× Coins)
              </p>
              <h2 className="font-display text-xl font-bold theme-ink">
                7-Day Bonus Calendar
              </h2>
              <p className="text-xs sm:text-sm theme-ink-secondary">
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
                : 'bg-[#EEF5F0] dark:bg-[#143D38] text-[#247243] dark:text-[#5EEAD4] border border-[#C3E1CD] dark:border-[#246A60] cursor-default'
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
                    ? 'bg-[#FFF3CE] dark:bg-[#2F2A14] border-[#E59B14]'
                    : done
                    ? 'bg-[#EEF7F1] dark:bg-[#133831] border-[#BFE2CB] dark:border-[#246A60]'
                    : 'theme-surface-muted'
                }`}
              >
                <span className="text-xs font-bold theme-ink-secondary tabular-nums">{tier.label}</span>
                <div className="my-2 flex flex-col items-center gap-1">
                  {calc.totalCoins > 0 && (
                    <span className="inline-flex items-center gap-1 font-display text-sm font-bold text-[#8F5906] dark:text-[#F5BC38] tabular-nums">
                      <Coins className="w-4 h-4 text-[#E59B14]" />+{calc.totalCoins}
                    </span>
                  )}
                  {calc.lives > 0 && (
                    <span className="inline-flex items-center gap-1 font-display text-sm font-bold text-[#B82843] dark:text-[#FF7894] tabular-nums">
                      <Heart className="w-4 h-4 text-[#D93D59] fill-[#D93D59]" />+{calc.lives}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-semibold theme-ink-muted tabular-nums">
                  {calc.bonusCoins > 0 ? `${calc.multiplier}×` : done ? 'Claimed' : isToday ? 'Available' : 'Upcoming'}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 30-Day Login History Calendar */}
      <section
        aria-label="Login History"
        className="rounded-3xl theme-surface-glass backdrop-blur-md border p-5 shadow-[0_12px_30px_-16px_rgba(24,18,12,0.25)]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b theme-border">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#EEF7F1] dark:bg-[#133831] border border-[#BFE2CB] dark:border-[#246A60] flex items-center justify-center text-[#247243] dark:text-[#5EEAD4] shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <h2 className="font-display text-xl font-bold theme-ink">Login History</h2>
                <span className="text-xs font-semibold theme-ink-secondary tabular-nums">
                  {rangeLabel}
                </span>
              </div>
              <p className="text-xs sm:text-sm theme-ink-secondary">
                Past 30 days of daily check-ins. Keep your streak alive to unlock higher coin multipliers.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-bold tabular-nums shrink-0">
            <span className="text-[#247243] dark:text-[#5EEAD4]">
              {checkedIn30Count}/30 Days
            </span>
            <span aria-hidden="true" className="theme-ink-muted">·</span>
            <span className="inline-flex items-center gap-1 text-[#C25B1A] dark:text-[#FF9E5E]">
              <Flame className="w-3.5 h-3.5" />
              {progress.dailyLogin.streak}d Streak
            </span>
            <span aria-hidden="true" className="theme-ink-muted">·</span>
            <span className="theme-ink-secondary">
              {consistencyPct}%
            </span>
          </div>
        </div>

        {/* 30-Day Consistency Progress Bar */}
        <div className="mt-3.5">
          <div className="h-1.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#2E8555] to-[#48AF75] dark:from-[#2BD4C5] dark:to-[#34D399] transition-all duration-300"
              style={{ width: `${Math.max(checkedIn30Count > 0 ? 4 : 0, consistencyPct)}%` }}
            />
          </div>
        </div>

        {/* Weekday Column Headers */}
        <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2 text-center" aria-hidden="true">
          {WEEKDAY_LABELS.map((wd) => (
            <div
              key={wd}
              className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider theme-ink-muted pb-1"
            >
              {wd}
            </div>
          ))}
        </div>

        {/* Calendar Grid Matrix */}
        <div
          aria-label="Past 30 days login calendar"
          className="grid grid-cols-7 gap-1.5 sm:gap-2"
        >
          {Array.from({ length: leadingCalendarSpacers }).map((_, i) => (
            <div
              key={`lead-${i}`}
              aria-hidden="true"
              className="min-h-[54px] sm:min-h-[60px] rounded-xl border border-transparent opacity-0 pointer-events-none"
            />
          ))}

          {historyDays.map((cell) => {
            const statusText = cell.isClaimed
              ? cell.isToday
                ? 'Today · Checked in'
                : cell.isStreakDay
                ? 'Checked in · Active streak'
                : 'Checked in'
              : cell.isToday
              ? 'Today · Tap to claim reward'
              : 'Missed check-in';

            const canTapToday = cell.isToday && dailyStatus.canClaim;

            const cellClasses = cell.isClaimed
              ? cell.isToday
                ? 'bg-[#E2F5EA] dark:bg-[#14453B] border-[#2E8555] dark:border-[#2BD4C5] ring-2 ring-[#2E8555]/25 dark:ring-[#2BD4C5]/30 text-[#195734] dark:text-[#7FF5E6]'
                : cell.isStreakDay
                ? 'bg-[#EAF7EF] dark:bg-[#133831] border-[#6BC28F] dark:border-[#2A7B6D] text-[#1D633B] dark:text-[#5EEAD4]'
                : 'bg-[#F2F8F4] dark:bg-[#122E29] border-[#C6E3D0] dark:border-[#20574E] text-[#247243] dark:text-[#5EEAD4]'
              : cell.isToday
              ? 'bg-[#FFF3CE] dark:bg-[#2F2A14] border-2 border-dashed border-[#E59B14] text-[#8F5906] dark:text-[#F5BC38] hover:brightness-95 cursor-pointer'
              : 'theme-surface-muted border opacity-70 theme-ink-secondary';

            const inner = (
              <>
                <div className="w-full flex items-center justify-between gap-0.5 text-[10px] leading-none">
                  <span className="font-bold opacity-85 truncate">
                    {cell.isToday ? 'Today' : cell.showMonthLabel ? cell.monthShort : ''}
                  </span>
                  {cell.isStreakDay && cell.isClaimed && (
                    <Flame
                      className="w-3 h-3 text-[#E55A3C] dark:text-[#FF9E5E] shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </div>

                <div className="font-display text-sm sm:text-base font-bold tabular-nums leading-none">
                  {cell.day}
                </div>

                <div className="h-3.5 flex items-center justify-center">
                  {cell.isClaimed ? (
                    <span className="w-4 h-4 rounded-full bg-[#2E8555] dark:bg-[#2BD4C5] text-white dark:text-[#0B2220] flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" aria-hidden="true" />
                    </span>
                  ) : cell.isToday ? (
                    <Gift className="w-3.5 h-3.5 text-[#E59B14] shrink-0" aria-hidden="true" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-30" aria-hidden="true" />
                  )}
                </div>
              </>
            );

            if (canTapToday) {
              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  onClick={onClaimDailyLogin}
                  title={`${cell.readableDate} · ${statusText}`}
                  aria-label={`${cell.readableDate} · ${statusText}`}
                  className={`min-h-[54px] sm:min-h-[60px] rounded-xl border p-1.5 flex flex-col items-center justify-between transition-transform active:scale-95 ${cellClasses}`}
                >
                  {inner}
                </button>
              );
            }

            return (
              <div
                key={cell.dateKey}
                title={`${cell.readableDate} · ${statusText}`}
                aria-label={`${cell.readableDate} · ${statusText}`}
                className={`min-h-[54px] sm:min-h-[60px] rounded-xl border p-1.5 flex flex-col items-center justify-between ${cellClasses}`}
              >
                {inner}
              </div>
            );
          })}

          {Array.from({ length: trailingCalendarSpacers }).map((_, i) => (
            <div
              key={`trail-${i}`}
              aria-hidden="true"
              className="min-h-[54px] sm:min-h-[60px] rounded-xl border border-transparent opacity-0 pointer-events-none"
            />
          ))}
        </div>

        {/* Accessible Icon + Color Legend */}
        <div className="mt-4 pt-3 border-t theme-border flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold theme-ink-secondary">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-[#2E8555] dark:bg-[#2BD4C5] text-white dark:text-[#0B2220] inline-flex items-center justify-center">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
              <span>Checked in</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-[#E55A3C] dark:text-[#FF9E5E]" />
              <span>Current streak</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5 text-[#E59B14]" />
              <span>Today&apos;s check-in</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm theme-surface-muted border inline-block" />
              <span>Missed</span>
            </span>
          </div>
          <span className="tabular-nums theme-ink-muted">
            Total check-ins: {progress.dailyLogin.totalClaims}
          </span>
        </div>
      </section>

      {/* Daily Challenge (Strictly Once Per Day) + Share Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-3xl theme-surface-glass backdrop-blur-md border p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C25B1A] dark:text-[#FF9E5E] tabular-nums">
              <Flame className="w-4 h-4" />
              <span>Daily Challenge · Streak {progress.dailyChallengeStreak}</span>
            </div>
            <h2 className="mt-1 font-display text-lg font-bold theme-ink">
              Today&apos;s Seeded Puzzle
            </h2>
            <p className="mt-1 text-sm theme-ink-secondary">
              {dailyClearedToday
                ? 'Daily Challenge completed for today! Come back tomorrow to extend your streak.'
                : 'Complete today’s unique liquid flow layout once to earn +25 coins and +1 streak.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onPlayDaily}
            disabled={dailyClearedToday}
            className={`min-h-[46px] px-5 py-2.5 rounded-2xl font-display text-sm font-bold self-start inline-flex items-center gap-2 ${
              dailyClearedToday
                ? 'bg-[#EEF5F0] dark:bg-[#143D38] text-[#247243] dark:text-[#5EEAD4] border border-[#C3E1CD] dark:border-[#246A60] cursor-not-allowed'
                : 'btn-tactile-emerald text-white cursor-pointer'
            }`}
          >
            {dailyClearedToday ? (
              <>
                <Check className="w-4 h-4" />
                <span>Completed Today · Come Back Tomorrow</span>
              </>
            ) : (
              <span>Play Daily Challenge</span>
            )}
          </button>
        </div>

        <div className="rounded-3xl theme-surface-glass backdrop-blur-md border p-5 flex flex-col justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold theme-ink">Invite Friends &amp; Share</h2>
            <p className="mt-1 text-sm theme-ink-secondary">
              Share RSS Liquid Flow on Telegram, Android, or web so friends can race your level and share up to 2 lives/day.
            </p>
          </div>
          <button
            type="button"
            onClick={onShare}
            className="min-h-[46px] px-5 py-2.5 rounded-2xl theme-surface-muted border font-display text-sm font-bold inline-flex items-center gap-2 cursor-pointer self-start hover:opacity-90"
          >
            <Share2 className="w-4 h-4 text-[#E55A3C] dark:text-[#2BD4C5]" />
            <span>Share Game Link</span>
          </button>
        </div>
      </div>

      {/* Friends Life Sharing Panel (2 lives/day per friend) */}
      <section
        id="friends-life-sharing-section"
        className="rounded-3xl theme-surface-glass backdrop-blur-md border p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#E55A3C] dark:text-[#2BD4C5]" />
            <h2 className="font-display text-lg font-bold theme-ink">Friends Life Sharing</h2>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold theme-ink-secondary tabular-nums">
              {MAX_FRIEND_LIVES_PER_DAY} lives / day per friend
            </span>
            <button
              type="button"
              onClick={() => setAddingFriend((v) => !v)}
              className="min-h-[34px] px-2.5 py-1 rounded-xl theme-surface-muted border text-xs font-bold inline-flex items-center gap-1 cursor-pointer hover:opacity-90"
            >
              {addingFriend ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{addingFriend ? 'Close' : 'Add Friend'}</span>
            </button>
          </div>
        </div>

        {addingFriend && (
          <form
            onSubmit={handleAddFriendSubmit}
            className="mb-4 p-3 rounded-2xl theme-surface-muted border flex flex-wrap items-center gap-2"
          >
            <input
              type="text"
              value={friendName}
              onChange={(e) => setFriendName(e.target.value)}
              placeholder="Friend name"
              maxLength={18}
              required
              className="flex-1 min-w-[130px] px-3 py-1.5 rounded-xl theme-surface border text-xs font-semibold focus:outline-2 focus:outline-[#E55A3C]"
            />
            <input
              type="number"
              min={1}
              max={999}
              value={friendLevel}
              onChange={(e) => setFriendLevel(e.target.value)}
              aria-label="Friend level"
              className="w-20 px-2.5 py-1.5 rounded-xl theme-surface border text-xs font-bold tabular-nums text-center focus:outline-2 focus:outline-[#E55A3C]"
            />
            <button
              type="submit"
              className="min-h-[36px] px-4 py-1.5 rounded-xl btn-tactile-emerald text-white font-display text-xs font-bold cursor-pointer"
            >
              Add Friend
            </button>
          </form>
        )}

        {progress.friends.length === 0 ? (
          <div className="py-6 px-4 text-center rounded-2xl theme-surface-muted border border-dashed theme-border">
            <p className="text-xs sm:text-sm theme-ink-secondary">
              No friends added yet. Click <strong className="theme-ink">Add Friend</strong> above to add real friends and gift lives.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {progress.friends.map((friend) => {
              const quota = getFriendDailyQuota(friend, referenceDateKey);
              return (
                <div
                  key={friend.id}
                  className="rounded-2xl theme-surface-muted border p-3.5 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-9 h-9 rounded-full text-white font-display text-xs font-bold flex items-center justify-center shrink-0"
                      style={{ backgroundColor: friend.avatarColor }}
                    >
                      {friend.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="font-display text-sm font-bold theme-ink truncate">
                        {friend.name}
                      </div>
                      <div className="text-xs theme-ink-secondary tabular-nums">
                        Level {friend.level}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onSendFriendLife(friend.id)}
                      disabled={!quota.canSend}
                      className="min-h-[36px] px-2.5 py-1 rounded-xl bg-[#FBEBD0] dark:bg-[#183C57] disabled:opacity-45 text-[#7E4B0A] dark:text-[#7CE8FF] text-xs font-bold inline-flex items-center gap-1 cursor-pointer tabular-nums"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send ({quota.remainingSend}/{MAX_FRIEND_LIVES_PER_DAY})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onClaimFriendLife(friend.id)}
                      disabled={!quota.canReceive}
                      className="min-h-[36px] px-2.5 py-1 rounded-xl bg-[#FFE7EC] dark:bg-[#3A1E33] disabled:opacity-45 text-[#B82843] dark:text-[#FF8AA1] text-xs font-bold inline-flex items-center gap-1 cursor-pointer tabular-nums"
                    >
                      <Heart className="w-3.5 h-3.5 fill-current" />
                      <span>+{quota.remainingReceive}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Achievements */}
      <section className="rounded-3xl theme-surface-glass backdrop-blur-md border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-[#E59B14]" />
          <h2 className="font-display text-lg font-bold theme-ink">Journey Milestones</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ACHIEVEMENTS.map((ach) => {
            const done = progress.levelsCleared >= ach.target || Boolean(progress.achievements[ach.id]);
            const pct = Math.min(100, Math.round((progress.levelsCleared / ach.target) * 100));
            return (
              <div
                key={ach.id}
                className={`rounded-2xl p-4 border ${
                  done
                    ? 'bg-[#EEF7F1] dark:bg-[#133831] border-[#BFE2CB] dark:border-[#246A60]'
                    : 'theme-surface-muted'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-base font-bold theme-ink">{ach.title}</span>
                  <span className="text-xs font-bold text-[#8F5906] dark:text-[#F5BC38] tabular-nums">
                    +{ach.rewardCoins} coins
                  </span>
                </div>
                <p className="mt-0.5 text-xs theme-ink-secondary tabular-nums">
                  Clear {ach.target} {ach.target === 1 ? 'level' : 'levels'} (
                  {Math.min(progress.levelsCleared, ach.target)}/{ach.target})
                </p>
                <div className="mt-2.5 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-[#2E8555]" style={{ width: `${pct}%` }} />
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
  signedInEmail?: string | null;
  onUpdateName: (name: string) => void;
  onOpenSettings: () => void;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
  onClaimSocialBadge: (badgeId: string) => void;
  onOpenFriends?: () => void;
  onShare?: () => void;
}> = ({
  progress,
  signedInEmail,
  onUpdateName,
  onOpenSettings,
  onOpenAuth,
  onSignOut,
  onClaimSocialBadge,
  onOpenFriends,
  onShare,
}) => {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(progress.playerName);
  const totalStars = getTotalStars(progress);
  const starRank = getStarRankInfo(totalStars);
  const platform = detectRuntimePlatform();

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

  const platformLabel =
    platform === 'telegram'
      ? 'Telegram Mini App'
      : platform === 'android-webview'
      ? 'Android App'
      : platform === 'pwa'
      ? 'Installed App'
      : 'Web Browser';

  return (
    <div className="relative z-10 max-w-4xl mx-auto px-3 sm:px-6 pt-4 pb-28 space-y-5">
      <div className="rounded-3xl theme-surface-glass backdrop-blur-md border p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src="/logo.png"
            alt="RSS Liquid Flow"
            className="w-16 h-16 object-contain shrink-0 drop-shadow-sm"
          />
          <div>
            {editing ? (
              <form onSubmit={handleSaveName} className="flex items-center gap-2">
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  maxLength={24}
                  className="px-3 py-1.5 rounded-xl theme-surface-muted border text-sm font-semibold focus:outline-2 focus:outline-[#E55A3C]"
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
                <h1 className="font-display text-2xl font-bold theme-ink">
                  {progress.playerName}
                </h1>
                <button
                  type="button"
                  onClick={() => {
                    setDraftName(progress.playerName);
                    setEditing(true);
                  }}
                  className="text-xs font-semibold text-[#9E5B0C] dark:text-[#5EEAD4] hover:underline cursor-pointer"
                >
                  Edit
                </button>
              </div>
            )}
            <p className="text-xs sm:text-sm theme-ink-secondary">
              {signedInEmail ? `${signedInEmail} · ${platformLabel}` : `${platformLabel} · Progress saved locally`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onSignOut ? (
            <button
              type="button"
              onClick={onSignOut}
              className="min-h-[44px] px-4 py-2 rounded-2xl bg-[#FFE7EC] dark:bg-[#3A1E33] border border-[#F3BCC8] dark:border-[#6A3256] text-[#B82843] dark:text-[#FF8AA1] text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0 hover:opacity-90"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          ) : (
            onOpenAuth && (
              <button
                type="button"
                onClick={onOpenAuth}
                className="min-h-[44px] px-4 py-2 rounded-2xl btn-tactile-coral text-white text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer shadow-sm whitespace-nowrap shrink-0"
              >
                <User className="w-4 h-4" />
                <span>Account / Login</span>
              </button>
            )
          )}
          <button
            type="button"
            onClick={onOpenSettings}
            className="min-h-[44px] px-4 py-2 rounded-2xl theme-surface-muted border text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Settings className="w-4 h-4" />
            <span>Settings &amp; Themes</span>
          </button>
        </div>
      </div>

      {/* Star Overview Panel with Rank-Based Badge */}
      <section
        aria-label="Star Overview"
        className="rounded-3xl theme-surface-glass backdrop-blur-md border p-5 sm:p-6 shadow-[0_12px_30px_-16px_rgba(24,18,12,0.25)]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-[#FFE68C] to-[#E8A017] border-2 border-[#FFFDF8] shadow-md flex items-center justify-center text-[#5A3404] shrink-0">
              <Star className="w-7 h-7 fill-[#FFF5CC] text-[#7C4704]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#9A6520] dark:text-[#F5BC38]">Star Overview</p>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl font-bold theme-ink tabular-nums">
                  {totalStars}
                </span>
                <span className="text-sm font-semibold theme-ink-secondary">
                  Total {totalStars === 1 ? 'Star' : 'Stars'} Earned
                </span>
              </div>
              <p className="text-xs theme-ink-secondary mt-0.5">{starRank.current.subtitle}</p>
            </div>
          </div>

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
              <div className="text-[10px] font-bold opacity-80 leading-none">Rank</div>
              <div className="font-display text-lg font-bold leading-tight">
                {starRank.current.title}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t theme-border">
          <div className="flex items-center justify-between text-xs font-semibold theme-ink-secondary mb-1.5 tabular-nums">
            <span>
              {starRank.next
                ? `${starRank.starsToNext} more ${
                    starRank.starsToNext === 1 ? 'star' : 'stars'
                  } to reach ${starRank.next.title}`
                : 'Maximum Grandmaster Rank Achieved'}
            </span>
            <span className="theme-ink font-bold">
              {starRank.next ? `${totalStars} / ${starRank.next.minStars}` : `${totalStars} ★`}
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.max(4, starRank.progressPct)}%`,
                backgroundColor: starRank.current.barColor,
              }}
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl theme-surface-muted border py-2 px-2">
              <div className="flex items-center justify-center gap-0.5 text-[#E8A317]">
                <Star className="w-3.5 h-3.5 fill-[#F5BC38]" />
                <Star className="w-3.5 h-3.5 fill-[#F5BC38]" />
                <Star className="w-3.5 h-3.5 fill-[#F5BC38]" />
              </div>
              <div className="mt-1 font-display text-base font-bold theme-ink tabular-nums">
                {threeStarCount}
              </div>
              <div className="text-[11px] theme-ink-secondary">3-Star Clears</div>
            </div>
            <div className="rounded-2xl theme-surface-muted border py-2 px-2">
              <div className="flex items-center justify-center gap-0.5 text-[#E8A317]">
                <Star className="w-3.5 h-3.5 fill-[#F5BC38]" />
                <Star className="w-3.5 h-3.5 fill-[#F5BC38]" />
              </div>
              <div className="mt-1 font-display text-base font-bold theme-ink tabular-nums">
                {twoStarCount}
              </div>
              <div className="text-[11px] theme-ink-secondary">2-Star Clears</div>
            </div>
            <div className="rounded-2xl theme-surface-muted border py-2 px-2">
              <div className="flex items-center justify-center gap-0.5 text-[#E8A317]">
                <Star className="w-3.5 h-3.5 fill-[#F5BC38]" />
              </div>
              <div className="mt-1 font-display text-base font-bold theme-ink tabular-nums">
                {oneStarCount}
              </div>
              <div className="text-[11px] theme-ink-secondary">1-Star Clears</div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-1.5 text-[11px] theme-ink-secondary tabular-nums">
            {STAR_RANK_TIERS.map((tier) => {
              const reached = totalStars >= tier.minStars;
              return (
                <span
                  key={tier.id}
                  className={`font-semibold ${
                    tier.id === starRank.current.id
                      ? 'theme-ink underline decoration-[#E59B14] decoration-2 underline-offset-4'
                      : reached
                      ? 'text-[#2E8555] dark:text-[#5EEAD4]'
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

      {/* Social Achievements Panel (Unlockable Community Badges) */}
      <SocialAchievementsPanel
        progress={progress}
        onClaimBadge={onClaimSocialBadge}
        onOpenFriends={onOpenFriends}
        onShare={onShare}
      />

      {/* Real Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
        <div className="rounded-2xl theme-surface-glass backdrop-blur-md border p-4">
          <div className="text-xs font-medium theme-ink-secondary">Levels Cleared</div>
          <div className="mt-1 font-display text-2xl font-bold theme-ink tabular-nums">
            {progress.levelsCleared}
          </div>
        </div>
        <div className="rounded-2xl theme-surface-glass backdrop-blur-md border p-4">
          <div className="text-xs font-medium theme-ink-secondary">Best Level</div>
          <div className="mt-1 font-display text-2xl font-bold theme-ink tabular-nums">
            {progress.bestLevel}
          </div>
        </div>
        <div className="rounded-2xl theme-surface-glass backdrop-blur-md border p-4">
          <div className="text-xs font-medium theme-ink-secondary">Total Stars</div>
          <div className="mt-1 font-display text-2xl font-bold theme-ink tabular-nums inline-flex items-center gap-1.5">
            <Star className="w-5 h-5 text-[#E8A317] fill-[#F5BC38]" />
            <span>{totalStars}</span>
          </div>
        </div>
        <div className="rounded-2xl theme-surface-glass backdrop-blur-md border p-4">
          <div className="text-xs font-medium theme-ink-secondary">Coins</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#9A5F0A] dark:text-[#F5BC38] tabular-nums">
            {progress.coins.toLocaleString()}
          </div>
        </div>
        <div className="rounded-2xl theme-surface-glass backdrop-blur-md border p-4">
          <div className="text-xs font-medium theme-ink-secondary">Total Moves</div>
          <div className="mt-1 font-display text-2xl font-bold theme-ink tabular-nums">
            {progress.totalMoves.toLocaleString()}
          </div>
        </div>
        <div className="rounded-2xl theme-surface-glass backdrop-blur-md border p-4">
          <div className="text-xs font-medium theme-ink-secondary">Experience</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#2E8555] dark:text-[#5EEAD4] tabular-nums">
            Lv. {getXpLevelInfo(progress.xp).level} · {getXpLevelInfo(progress.xp).totalXp.toLocaleString()} XP
          </div>
        </div>
        <div className="rounded-2xl theme-surface-glass backdrop-blur-md border p-4">
          <div className="text-xs font-medium theme-ink-secondary">Daily Login Streak</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#E55A3C] dark:text-[#FF9E5E] tabular-nums">
            {progress.dailyLogin.streak} {progress.dailyLogin.streak === 1 ? 'day' : 'days'}
          </div>
        </div>
      </div>

      {/* Multi-Platform Install Card */}
      <div className="rounded-3xl theme-surface-glass backdrop-blur-md border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E55A3C] dark:text-[#2BD4C5]">
            <Smartphone className="w-4 h-4" />
            <span>Play Everywhere</span>
          </div>
          <h2 className="mt-1 font-display text-base font-bold theme-ink">
            Android, Web &amp; Telegram Mini App
          </h2>
          <p className="mt-0.5 text-xs theme-ink-secondary">
            Install RSS Liquid Flow directly to your Android home screen for full-screen offline play.
          </p>
        </div>
        <PWAInstallButton />
      </div>
    </div>
  );
};

/* ============================================================================
 * SETTINGS MODAL (With Botanical / Midnight Ocean / Sunset Desert Theme Engine)
 * ========================================================================== */
export const SettingsModal: React.FC<{
  open: boolean;
  settings: GameSettings;
  signedInEmail?: string | null;
  onUpdate: (next: GameSettings) => void;
  onCheckForUpdates?: () => void;
  onSignOut?: () => void;
  onReplayIntro?: () => void;
  onClose: () => void;
}> = ({ open, settings, signedInEmail, onUpdate, onCheckForUpdates, onSignOut, onReplayIntro, onClose }) => {
  if (!open) return null;
  const appVersion = getCurrentAppVersion();
  const lastCheck = getLastUpdateCheckTime();

  const toggle = (
    key: keyof Pick<
      GameSettings,
      'sfx' | 'vibration' | 'reduceMotion' | 'showHints' | 'autoAdvance' | 'autoUpdate'
    >
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

  const handleSelectTheme = (themeId: AppThemeId) => {
    onUpdate({ ...settings, theme: themeId });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-heading"
    >
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl theme-surface border p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b theme-border">
          <h2 id="settings-heading" className="font-display text-xl font-bold theme-ink">
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl theme-surface-muted cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {/* Theme Engine Selector: Botanical, Midnight Ocean, Sunset Desert */}
          <div className="rounded-2xl theme-surface-muted border p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-sm font-bold theme-ink">
                <Palette className="w-4 h-4 text-[#E55A3C] dark:text-[#2BD4C5]" />
                <span>Visual Theme</span>
              </span>
              <span className="text-xs font-semibold theme-ink-secondary">
                {APP_THEMES.find((t) => t.id === settings.theme)?.name ?? 'Botanical'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Visual Theme">
              {APP_THEMES.map((theme) => {
                const selected = settings.theme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => handleSelectTheme(theme.id)}
                    className={`rounded-2xl p-2 border-2 text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                      selected
                        ? 'border-[#E55A3C] dark:border-[#2BD4C5] theme-surface shadow-sm'
                        : 'border-transparent theme-surface opacity-85 hover:opacity-100'
                    }`}
                  >
                    <div
                      className="w-full h-9 rounded-xl border border-black/10 relative flex items-center justify-end p-1"
                      style={{ background: theme.swatchGradient }}
                    >
                      {selected && (
                        <span className="w-5 h-5 rounded-full bg-white text-[#2D2218] flex items-center justify-center shadow-xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <div className="font-display text-xs font-bold theme-ink leading-tight">
                      {theme.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-center justify-between min-h-[44px] px-3 py-2 rounded-2xl theme-surface-muted border cursor-pointer">
            <span className="text-sm font-semibold theme-ink">Sound effects</span>
            <input
              type="checkbox"
              checked={settings.sfx}
              onChange={() => toggle('sfx')}
              className="w-5 h-5 accent-[#E55A3C] cursor-pointer"
            />
          </label>

          {/* Vibration Toggle + Intensity Slider */}
          <div className="rounded-2xl theme-surface-muted border px-3 py-2.5 space-y-2.5">
            <label className="flex items-center justify-between min-h-[32px] cursor-pointer">
              <span className="inline-flex items-center gap-2 text-sm font-semibold theme-ink">
                <Vibrate className="w-4 h-4 text-[#C96A1B] dark:text-[#2BD4C5]" />
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
              className={`pt-2 border-t theme-border transition-opacity ${
                settings.vibration ? 'opacity-100' : 'opacity-45'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold theme-ink-secondary mb-1.5 tabular-nums">
                <label htmlFor="vibration-intensity-slider">Vibration intensity</label>
                <span className="theme-ink font-bold">
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
              <div className="mt-1 flex items-center justify-between text-[10px] font-medium theme-ink-muted">
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
              className="flex items-center justify-between min-h-[44px] px-3 py-2 rounded-2xl theme-surface-muted border cursor-pointer"
            >
              <span className="text-sm font-semibold theme-ink">{label}</span>
              <input
                type="checkbox"
                checked={settings[key]}
                onChange={() => toggle(key)}
                className="w-5 h-5 accent-[#E55A3C] cursor-pointer"
              />
            </label>
          ))}

          {/* Seamless Auto-Update ON / OFF Control (No Reinstall Required) */}
          <div className="rounded-2xl theme-surface-muted border px-3 py-3 space-y-2.5">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 text-sm font-semibold theme-ink">
                  <RefreshCw className="w-4 h-4 text-[#2E8555] dark:text-[#5EEAD4] shrink-0" />
                  <span>Auto-update</span>
                </div>
                <p className="text-[11px] theme-ink-secondary mt-0.5">
                  {settings.autoUpdate
                    ? 'Updates apply automatically without reinstalling.'
                    : 'Manual mode: you will be asked before installing updates.'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoUpdate}
                onChange={() => toggle('autoUpdate')}
                aria-label="Toggle automatic updates"
                className="w-5 h-5 accent-[#2E8555] cursor-pointer shrink-0"
              />
            </label>

            <div className="pt-2 border-t theme-border flex items-center justify-between gap-2 text-[11px] theme-ink-secondary tabular-nums">
              <span>
                v{appVersion}
                {lastCheck ? ` · Checked ${lastCheck}` : ''}
              </span>
              {onCheckForUpdates && (
                <button
                  type="button"
                  onClick={onCheckForUpdates}
                  className="min-h-[32px] px-3 py-1 rounded-lg theme-surface border text-xs font-semibold theme-ink cursor-pointer hover:opacity-90 whitespace-nowrap shrink-0"
                >
                  Check Now
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between min-h-[44px] px-3 py-2 rounded-2xl theme-surface-muted border">
            <span className="text-sm font-semibold theme-ink">Game mode</span>
            <select
              value={settings.mode}
              onChange={(e) => onUpdate({ ...settings, mode: e.target.value as GameMode })}
              className="rounded-xl theme-surface border px-3 py-1.5 text-sm font-semibold"
            >
              <option value="relaxed">Relaxed</option>
              <option value="challenge">Challenge</option>
              <option value="expert">Expert</option>
              <option value="master">Master</option>
            </select>
          </div>

          <PWAInstallButton fullWidth />

          {/* Account Session Controls */}
          {(onSignOut || onReplayIntro) && (
            <div className="rounded-2xl theme-surface-muted border p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-bold theme-ink">Account Session</span>
                <span className="theme-ink-secondary truncate max-w-[180px]">
                  {signedInEmail || 'Signed in'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {onReplayIntro && (
                  <button
                    type="button"
                    onClick={onReplayIntro}
                    className="min-h-[42px] px-3 rounded-xl theme-surface border text-xs font-bold theme-ink inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Replay Intro</span>
                  </button>
                )}
                {onSignOut && (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="min-h-[42px] px-3 rounded-xl bg-[#FFE7EC] dark:bg-[#3A1E33] border border-[#F3BCC8] dark:border-[#6A3256] text-[#B82843] dark:text-[#FF8AA1] text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </div>
          )}
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
