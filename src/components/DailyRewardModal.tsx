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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#2D2218]/45 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-reward-heading"
    >
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-[#FFFDF8] border border-[#E7DAC0] shadow-[0_24px_60px_-16px_rgba(45,34,24,0.35)] overflow-hidden max-h-[92vh] flex flex-col">
        {/* Mobile grab handle */}
        <div className="sm:hidden flex justify-center pt-2.5">
          <div className="w-10 h-1.5 rounded-full bg-[#DED2BA]" />
        </div>

        {/* Warm Sunlit Header */}
        <div className="relative px-6 pt-5 pb-4 bg-gradient-to-b from-[#FFF3D1] via-[#FBF1DA] to-[#FFFDF8] border-b border-[#EFE3C8]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close daily rewards"
            className="absolute top-4 right-4 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-[#FFFDF8]/90 hover:bg-[#F5EBD6] border border-[#E5D7B9] text-[#5F4B37] cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4 pr-10">
            <DailyChestIllustration className="w-16 h-16 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-[#A36510] tabular-nums">
                Daily Login Streak · Day {status.projectedStreak} ({status.streakMultiplier}× Coins)
              </p>
              <h2
                id="daily-reward-heading"
                className="font-display text-2xl font-bold text-[#2D2218] leading-tight"
              >
                {justClaimedTier
                  ? 'Daily Reward Claimed'
                  : status.canClaim
                  ? 'Welcome Back Bonus'
                  : 'Daily Rewards Calendar'}
              </h2>
              <p className="mt-0.5 text-xs sm:text-sm text-[#6E5B47]">
                {justClaimedTier
                  ? 'Your streak-boosted bonus has been added to your wallet.'
                  : status.canClaim
                  ? 'Play consecutive days to grow your streak multiplier for bonus coins.'
                  : 'Today’s bonus is claimed. Return tomorrow to boost your streak multiplier.'}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Body: Streak Multiplier Meter + 7-Day Reward Grid */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Visual Streak Multiplier Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-[#FFF5D6] via-[#FDE8B4] to-[#FCE0A6] border border-[#E5B85B] p-3.5 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-[#E55A3C] text-white flex items-center justify-center shadow-xs shrink-0">
                  <Flame className="w-4 h-4 fill-current" />
                </span>
                <div>
                  <div className="font-display text-sm font-bold text-[#2D2218] tabular-nums">
                    {status.projectedStreak}-Day Streak Multiplier
                  </div>
                  <div className="text-[11px] font-medium text-[#7C4C0E] tabular-nums">
                    {status.streakMultiplier > 1
                      ? `Earning ${status.streakMultiplier}× coins (+${todayReward.bonusCoins} bonus today)`
                      : `Come back tomorrow for ${status.nextMultiplier}× bonus coins`}
                  </div>
                </div>
              </div>
              <div className="px-2.5 py-1 rounded-xl bg-[#FFFDF8] border border-[#E5B85B] font-display text-base font-bold text-[#C24522] tabular-nums shrink-0">
                {status.streakMultiplier}×
              </div>
            </div>

            {/* 7-Step Streak Multiplier Ladder */}
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
                        ? 'bg-[#FFFDF8] border-[#E0B354] text-[#8A4F07]'
                        : 'bg-[#FFFDF8]/55 border-[#E7D4A8] text-[#947A52]'
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
            <div className="p-4 rounded-2xl bg-[#ECF7F0] border border-[#BFE2CB] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2E8555] text-white flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-display text-base font-bold text-[#1D5736] tabular-nums">
                    {justClaimedTier.totalCoins > 0 && `+${justClaimedTier.totalCoins} Coins`}
                    {justClaimedTier.totalCoins > 0 && justClaimedTier.lives > 0 && ' & '}
                    {justClaimedTier.lives > 0 &&
                      `+${justClaimedTier.lives} Bonus ${justClaimedTier.lives === 1 ? 'Life' : 'Lives'}`}
                  </div>
                  <div className="text-xs text-[#316B4A] tabular-nums">
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
                      ? 'bg-gradient-to-b from-[#FFF5DA] to-[#FDE4B2] border-[#E59B14] shadow-sm'
                      : isClaimedTile
                      ? 'bg-[#F2F8F4] border-[#C6E3D0]'
                      : 'bg-[#FAF5EA] border-[#E7DCC4]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1.5">
                    <span className="text-[11px] font-bold text-[#6F583D] tabular-nums">
                      {tier.label}
                    </span>
                    {isClaimedTile ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#247243]">
                        <Check className="w-3 h-3" /> Done
                      </span>
                    ) : isClaimableTile ? (
                      <span className="text-[10px] font-bold text-[#C24522]">Today</span>
                    ) : (
                      <Lock className="w-3 h-3 text-[#A2937E]" />
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-2 my-1">
                    {calc.totalCoins > 0 && (
                      <div className="flex items-center gap-1 font-display font-bold text-sm text-[#8F5906] tabular-nums">
                        <Coins className="w-4 h-4 text-[#E59B14]" />
                        <span>+{calc.totalCoins}</span>
                      </div>
                    )}
                    {calc.lives > 0 && (
                      <div className="flex items-center gap-1 font-display font-bold text-sm text-[#B82843] tabular-nums">
                        <Heart className="w-4 h-4 text-[#D93D59] fill-[#D93D59]" />
                        <span>+{calc.lives}</span>
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] font-semibold text-[#8C5B14] tabular-nums">
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
        <div className="p-5 pt-3 border-t border-[#EFE3C8] bg-[#FFFDF8]">
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
