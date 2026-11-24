import React, { useEffect, useState } from 'react';
import { Clock, Coins, Heart, Tv, Users, X } from 'lucide-react';
import { PlayerProgress } from '../types/game';
import { requestRewardedAd } from '../utils/rewardedAds';
import {
  getFriendDailyQuota,
  MAX_FRIEND_LIVES_PER_DAY,
  MAX_STANDARD_LIVES,
  recomputeLives,
} from '../utils/storage';

interface LivesModalProps {
  open: boolean;
  progress: PlayerProgress;
  referenceDateKey: string;
  onClose: () => void;
  onGrantAdLife: () => void;
  onClaimFriendLife: (friendId: string) => void;
  onRefillWithCoins: () => void;
  onToast: (msg: string) => void;
}

function formatCountdown(msRemaining: number): string {
  const totalSec = Math.max(0, Math.ceil(msRemaining / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const LivesModal: React.FC<LivesModalProps> = ({
  open,
  progress,
  referenceDateKey,
  onClose,
  onGrantAdLife,
  onClaimFriendLife,
  onRefillWithCoins,
  onToast,
}) => {
  const [now, setNow] = useState(() => Date.now());
  const [checkingAd, setCheckingAd] = useState(false);
  const [adNotice, setAdNotice] = useState<string | null>(null);

  const lifeInfo = recomputeLives(progress.lifeState);
  const needsCountdown = lifeInfo.count < MAX_STANDARD_LIVES && lifeInfo.nextRefillAt > 0;

  useEffect(() => {
    if (!open) {
      setAdNotice(null);
      return;
    }
    if (!needsCountdown) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [open, needsCountdown]);

  if (!open) return null;

  const handleWatchAdForLife = async () => {
    if (checkingAd) return;
    setCheckingAd(true);
    setAdNotice(null);
    const result = await requestRewardedAd('extra-life');
    setCheckingAd(false);
    if (result.status === 'rewarded') {
      onGrantAdLife();
      setAdNotice(null);
    } else {
      setAdNotice(result.message);
      onToast(result.message);
    }
  };

  const claimableFriends = progress.friends.filter(
    (f) => getFriendDailyQuota(f, referenceDateKey).canReceive
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lives-modal-title"
    >
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl theme-surface border p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b theme-border">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-[#D93D59] fill-[#D93D59]" />
            <h2 id="lives-modal-title" className="font-display text-xl font-bold theme-ink">
              Lives &amp; Refill
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close lives panel"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl theme-surface-muted cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 5-Heart Status Row */}
        <div className="mt-4 rounded-2xl theme-surface-muted border p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: MAX_STANDARD_LIVES }, (_, idx) => {
              const filled = idx < lifeInfo.count;
              return (
                <Heart
                  key={idx}
                  className={`w-7 h-7 ${
                    filled
                      ? 'text-[#D93D59] fill-[#E84D6A]'
                      : 'text-[#C8B9A2] dark:text-[#2D4F68] fill-transparent'
                  }`}
                />
              );
            })}
          </div>
          <div className="mt-2 font-display text-lg font-bold theme-ink tabular-nums">
            {lifeInfo.count} / {MAX_STANDARD_LIVES} Lives
            {lifeInfo.count > MAX_STANDARD_LIVES && (
              <span className="text-sm text-[#D93D59] ml-1.5">
                (+{lifeInfo.count - MAX_STANDARD_LIVES} bonus)
              </span>
            )}
          </div>
          {needsCountdown ? (
            <div className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold theme-ink-secondary tabular-nums">
              <Clock className="w-3.5 h-3.5" />
              <span>Next free life in {formatCountdown(lifeInfo.nextRefillAt - now)}</span>
            </div>
          ) : (
            <p className="mt-1 text-xs theme-ink-secondary">
              Lives are full. Failing a level without watching an ad loses 1 life.
            </p>
          )}
        </div>

        {/* Real Rewarded Ad — Strictly 1 Ad = 1 Life, No Fake Countdown */}
        <div className="mt-4 space-y-2.5">
          <button
            type="button"
            onClick={handleWatchAdForLife}
            disabled={checkingAd}
            className="w-full min-h-[48px] px-4 py-2.5 rounded-2xl btn-tactile-emerald disabled:opacity-60 text-white font-display text-sm sm:text-base font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Tv className="w-4 h-4" />
            <span>{checkingAd ? 'Checking Ad Availability…' : 'Watch Ad · +1 Life'}</span>
          </button>

          {adNotice && (
            <p className="text-xs font-semibold text-[#C93B22] dark:text-[#FF8A75] text-center px-2">
              {adNotice}
            </p>
          )}

          {lifeInfo.count < MAX_STANDARD_LIVES && (
            <button
              type="button"
              onClick={onRefillWithCoins}
              disabled={progress.coins < 50}
              className="w-full min-h-[44px] px-4 py-2 rounded-2xl btn-tactile-gold disabled:opacity-45 text-[#472904] font-display text-sm font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer tabular-nums"
            >
              <Coins className="w-4 h-4" />
              <span>Refill +1 Life · 50 Coins</span>
            </button>
          )}
        </div>

        {/* Friend Shared Lives (2 lives/day per friend) */}
        <div className="mt-5 pt-4 border-t theme-border">
          <div className="flex items-center justify-between mb-2.5">
            <span className="inline-flex items-center gap-1.5 font-display text-sm font-bold theme-ink">
              <Users className="w-4 h-4 text-[#E55A3C] dark:text-[#2BD4C5]" />
              <span>Friend Shared Lives</span>
            </span>
            <span className="text-[11px] font-semibold theme-ink-secondary tabular-nums">
              Up to {MAX_FRIEND_LIVES_PER_DAY}/day per friend
            </span>
          </div>

          {claimableFriends.length === 0 ? (
            <p className="text-xs theme-ink-secondary py-2">
              You have claimed today&apos;s shared lives from all friends. Add more friends or check back tomorrow!
            </p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {claimableFriends.map((friend) => {
                const quota = getFriendDailyQuota(friend, referenceDateKey);
                return (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between gap-2 rounded-2xl theme-surface-muted border px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-7 h-7 rounded-full text-white font-display text-xs font-bold flex items-center justify-center shrink-0"
                        style={{ backgroundColor: friend.avatarColor }}
                      >
                        {friend.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold theme-ink truncate">{friend.name}</div>
                        <div className="text-[11px] theme-ink-secondary tabular-nums">
                          {quota.remainingReceive} of {MAX_FRIEND_LIVES_PER_DAY} left today
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onClaimFriendLife(friend.id)}
                      className="min-h-[34px] px-3 py-1 rounded-xl bg-[#FFE7EC] dark:bg-[#3A1E33] text-[#B82843] dark:text-[#FF8AA1] text-xs font-bold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <Heart className="w-3.5 h-3.5 fill-current" />
                      <span>Claim +1</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
