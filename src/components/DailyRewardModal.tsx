import React from 'react';
import { Check, Coins, Flame, Gift, Heart, Lock, X } from 'lucide-react';
import { CalculatedDailyReward, PlayerProgress } from '../types/game';
import {
  calculateStreakReward,
  DAILY_REWARD_SCHEDULE,
  getDailyLoginStatus,
  STREAK_MULTIPLIER_LADDER,
} from '../utils/storage';
import { DailyChestIllustration } from './SceneryArtwork';

interface DailyRewardModalProps {
  open: boolean;
  progress: PlayerProgress;
  referenceDateKey: string;
  justClaimedTier: CalculatedDailyReward | null;
  onClaim: () => void;
  onClose: () => void;
}

export const DailyRewardModal: React.FC<DailyRewardModalProps> = ({
  open,
  progress,
  referenceDateKey,
  justClaimedTier,
  onClaim,
  onClose,
}) => {
  if (!open) return null;

  const status = getDailyLoginStatus(progress, referenceDateKey);
  const { todayReward } = status;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-reward-heading"
    >
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl theme-surface border shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Mobile grab handle */}
        <div className="sm:hidden flex justify-center pt-2.5">
          <div className="w-10 h-1.5 rounded-full bg-black/15 dark:bg-white/20" />
        </div>

        {/* Header */}
        <div className="relative px-6 pt-5 pb-4 theme-surface-muted border-b theme-border">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close daily rewards"
            className="absolute top-4 right-4 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl theme-surface border theme-ink cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4 pr-10">
            <DailyChestIllustration className="w-16 h-16 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-[#A36510] dark:text-[#F5BC38] tabular-nums">
                Daily Login Streak · Day {status.projectedStreak} ({status.streakMultiplier}× Coins)
              </p>
              <h2
                id="daily-reward-heading"
                className="font-display text-2xl font-bold theme-ink leading-tight"
              >
                {justClaimedTier
                  ? 'Daily Reward Claimed'
                  : status.canClaim
                  ? 'Welcome Back Bonus'
                  : 'Daily Rewards Calendar'}
              </h2>
              <p className="mt-0.5 text-xs sm:text-sm theme-ink-secondary">
                {justClaimedTier
                  ? 'Your streak-boosted bonus has been added to your wallet.'
                  : status.canClaim
                  ? 'Play consecutive days to grow your streak multiplier for bonus coins.'
                  : 'Today’s bonus is claimed. Return tomorrow to boost your streak multiplier.'}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="rounded-2xl bg-[#FFF5D6] dark:bg-[#2F2A14] border border-[#E5B85B] dark:border-[#6A5624] p-3.5 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-[#E55A3C] text-white flex items-center justify-center shadow-xs shrink-0">
                  <Flame className="w-4 h-4 fill-current" />
                </span>
                <div>
                  <div className="font-display text-sm font-bold text-[#2D2218] dark:text-[#FFF4D6] tabular-nums">
                    {status.projectedStreak}-Day Streak Multiplier
                  </div>
                  <div className="text-[11px] font-medium text-[#7C4C0E] dark:text-[#F5BC38] tabular-nums">
                    {status.streakMultiplier > 1
                      ? `Earning ${status.streakMultiplier}× coins (+${todayReward.bonusCoins} bonus today)`
                      : `Come back tomorrow for ${status.nextMultiplier}× bonus coins`}
                  </div>
                </div>
              </div>
              <div className="px-2.5 py-1 rounded-xl theme-surface border border-[#E5B85B] font-display text-base font-bold text-[#C24522] dark:text-[#FF9E5E] tabular-nums shrink-0">
                {status.streakMultiplier}×
              </div>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1" aria-label="Streak multiplier progression">
              {STREAK_MULTIPLIER_LADDER.map((mult, idx) => {
                const stepNum = idx + 1;
                const reached = stepNum <= status.activeDayNumber;
                const isCurrentStep = stepNum === status.activeDayNumber;
                return (
                  <div
                    key={stepNum}
                    className={`rounded-lg py-1 text-center border tabular-nums transition-colors ${
                      isCurrentStep
                        ? 'bg-[#E55A3C] border-[#B83B20] text-white shadow-xs'
                        : reached
                        ? 'theme-surface border-[#E0B354] text-[#8A4F07] dark:text-[#F5BC38]'
                        : 'theme-surface-muted opacity-70 theme-ink-muted'
                    }`}
                  >
                    <div className="text-[9px] font-bold leading-none opacity-80">D{stepNum}</div>
                    <div className="mt-0.5 font-display text-[11px] font-bold leading-none">
                      {mult}×
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {justClaimedTier && (
            <div className="p-4 rounded-2xl bg-[#ECF7F0] dark:bg-[#143D38] border border-[#BFE2CB] dark:border-[#246A60] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2E8555] text-white flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-display text-base font-bold text-[#1D5736] dark:text-[#5EEAD4] tabular-nums">
                    {justClaimedTier.totalCoins > 0 && `+${justClaimedTier.totalCoins} Coins`}
                    {justClaimedTier.totalCoins > 0 && justClaimedTier.lives > 0 && ' & '}
                    {justClaimedTier.lives > 0 &&
                      `+${justClaimedTier.lives} Bonus ${justClaimedTier.lives === 1 ? 'Life' : 'Lives'}`}
                  </div>
                  <div className="text-xs text-[#316B4A] dark:text-[#A9E5D8] tabular-nums">
                    {justClaimedTier.bonusCoins > 0
                      ? `Includes +${justClaimedTier.bonusCoins} streak bonus (${justClaimedTier.multiplier}×) · Streak ${progress.dailyLogin.streak}d`
                      : `Added to your RSS Liquid Flow balance · Streak ${progress.dailyLogin.streak}d`}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {DAILY_REWARD_SCHEDULE.map((tier) => {
              const isPast = tier.day < status.activeDayNumber;
              const isToday = tier.day === status.activeDayNumber;
              const isClaimedTile = isPast || (isToday && status.alreadyClaimedToday);
              const isClaimableTile = isToday && status.canClaim;
              const tileStreakDay = status.cycleStartStreak + (tier.day - 1);
              const calc = calculateStreakReward(tier, tileStreakDay);

              return (
                <div
                  key={tier.day}
                  className={`relative rounded-2xl p-3 flex flex-col items-center text-center border transition-all ${
                    tier.highlight ? 'col-span-3 sm:col-span-2' : ''
                  } ${
                    isClaimableTile
                      ? 'bg-[#FFF5DA] dark:bg-[#332B14] border-[#E59B14] shadow-sm'
                      : isClaimedTile
                      ? 'bg-[#F2F8F4] dark:bg-[#133831] border-[#C6E3D0] dark:border-[#246A60]'
                      : 'theme-surface-muted'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1.5">
                    <span className="text-[11px] font-bold theme-ink-secondary tabular-nums">
                      {tier.label}
                    </span>
                    {isClaimedTile ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#247243] dark:text-[#5EEAD4]">
                        <Check className="w-3 h-3" /> Done
                      </span>
                    ) : isClaimableTile ? (
                      <span className="text-[10px] font-bold text-[#C24522] dark:text-[#FF9E5E]">
                        Today
                      </span>
                    ) : (
                      <Lock className="w-3 h-3 theme-ink-muted" />
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-2 my-1">
                    {calc.totalCoins > 0 && (
                      <div className="flex items-center gap-1 font-display font-bold text-sm text-[#8F5906] dark:text-[#F5BC38] tabular-nums">
                        <Coins className="w-4 h-4 text-[#E59B14]" />
                        <span>+{calc.totalCoins}</span>
                      </div>
                    )}
                    {calc.lives > 0 && (
                      <div className="flex items-center gap-1 font-display font-bold text-sm text-[#B82843] dark:text-[#FF7894] tabular-nums">
                        <Heart className="w-4 h-4 text-[#D93D59] fill-[#D93D59]" />
                        <span>+{calc.lives}</span>
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] font-semibold theme-ink-secondary tabular-nums">
                    {calc.bonusCoins > 0
                      ? `${calc.multiplier}× (+${calc.bonusCoins} streak)`
                      : tier.rewardType === 'bundle'
                      ? 'Coins & Lives'
                      : tier.rewardType === 'lives'
                      ? tier.lives === 1
                        ? 'Bonus Life'
                        : 'Bonus Lives'
                      : 'Bonus Coins'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="p-5 pt-3 border-t theme-border theme-surface">
          {status.canClaim ? (
            <button
              type="button"
              onClick={onClaim}
              className="w-full min-h-[52px] rounded-2xl btn-tactile-coral text-white font-display text-lg font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Gift className="w-5 h-5" />
              <span>
                Claim{' '}
                {todayReward.totalCoins > 0 ? `+${todayReward.totalCoins} Coins` : ''}
                {todayReward.totalCoins > 0 && todayReward.lives > 0 ? ' & ' : ''}
                {todayReward.lives > 0
                  ? `+${todayReward.lives} ${todayReward.lives === 1 ? 'Life' : 'Lives'}`
                  : ''}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[48px] rounded-2xl btn-tactile-emerald text-white font-display text-base font-bold cursor-pointer"
            >
              Continue to Journey
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
