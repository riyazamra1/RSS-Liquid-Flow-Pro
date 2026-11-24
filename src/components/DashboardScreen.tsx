import React, { useState } from 'react';
import { Play, Star } from 'lucide-react';
import { PlayerProgress } from '../types/game';
import { getStarRankInfo, getTotalStars } from '../utils/storage';
import { FriendsLeaderboard } from './FriendsLeaderboard';
import { LevelJourneyMap } from './LevelJourneyMap';

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
  onSendFriendLife: (friendId: string) => void;
  onClaimFriendLife: (friendId: string) => void;
  onAddFriend: (name: string, level: number) => void;
}

/**
 * Clean, distraction-free Dashboard:
 * - Full-screen responsive map centerpiece over the live animated theme backdrop
 * - Compact Player Details bar & Friends Leaderboard (with friend levels shown on the map)
 * - Lives & Coins live in the top-right header; Daily Challenge & Login Rewards live in the Rewards tab
 * - Zero bottom unwanted captions or extra clutter
 */
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
  onSendFriendLife,
  onClaimFriendLife,
  onAddFriend,
}) => {
  const [focusLevel, setFocusLevel] = useState<number | null>(null);
  const totalStars = getTotalStars(progress);
  const starRank = getStarRankInfo(totalStars);

  return (
    <div className="relative z-10 w-full max-w-7xl mx-auto px-3 sm:px-6 pt-3 sm:pt-4 pb-20 lg:pb-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Centerpiece Winding Level Map (dominant focal anchor) */}
        <div className="lg:col-span-8 xl:col-span-8">
          <LevelJourneyMap
            progress={progress}
            maxUnlocked={maxUnlocked}
            visibleLimit={visibleLimit}
            focusLevel={focusLevel}
            onSelectLevel={onSelectLevel}
            onLockedTap={onLockedTap}
            onLoadMore={onLoadMore}
            reduceMotion={reduceMotion}
          />
        </div>

        {/* Right Column: Player Details + Friends Leaderboard Only */}
        <div className="lg:col-span-4 xl:col-span-4 space-y-4 lg:sticky lg:top-20">
          {/* Compact Player Details Card */}
          <section
            aria-label="Player Details"
            className="rounded-3xl theme-surface-glass backdrop-blur-md border p-4 shadow-[0_12px_30px_-16px_rgba(24,18,12,0.28)]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src="/logo.png"
                  alt="RSS Liquid Flow"
                  className="w-12 h-12 object-contain shrink-0 drop-shadow-sm"
                />
                <div className="min-w-0">
                  <div className="text-xs font-semibold theme-ink-secondary truncate">
                    {progress.playerName} · {starRank.current.title}
                  </div>
                  <h1 className="font-display text-xl font-bold theme-ink leading-tight tabular-nums">
                    Level {progress.currentLevel}
                  </h1>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="inline-flex items-center gap-1 font-display text-base font-bold theme-ink tabular-nums">
                  <Star className="w-4 h-4 text-[#E8A317] fill-[#F5BC38]" />
                  <span>{totalStars}</span>
                </div>
                <div className="text-[11px] font-semibold theme-ink-secondary tabular-nums">
                  {progress.levelsCleared} cleared
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onPlayCurrent}
              className="mt-3.5 w-full min-h-[48px] px-5 py-2.5 rounded-2xl btn-tactile-coral text-white font-display text-base font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {progress.levelsCleared > 0
                  ? `Continue Level ${progress.currentLevel}`
                  : `Play Level ${progress.currentLevel}`}
              </span>
            </button>
          </section>

          {/* Friends Leaderboard (ranked by level progress, jumps to friend on map, 2 lives/day sharing) */}
          <FriendsLeaderboard
            progress={progress}
            referenceDateKey={referenceDateKey}
            onSendLife={onSendFriendLife}
            onClaimLife={onClaimFriendLife}
            onAddFriend={onAddFriend}
            onJumpToLevel={(lv) => setFocusLevel(lv)}
            compact
          />
        </div>
      </div>
    </div>
  );
};
