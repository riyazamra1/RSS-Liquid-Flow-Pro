import React, { useMemo, useState } from 'react';
import { Crown, Heart, Plus, Send, Trophy, Users, X } from 'lucide-react';
import { FriendEntry, PlayerProgress } from '../types/game';
import { getFriendDailyQuota, MAX_FRIEND_LIVES_PER_DAY } from '../utils/storage';

interface FriendsLeaderboardProps {
  progress: PlayerProgress;
  referenceDateKey: string;
  onSendLife: (friendId: string) => void;
  onClaimLife: (friendId: string) => void;
  onAddFriend: (name: string, level: number) => void;
  onJumpToLevel?: (level: number) => void;
  compact?: boolean;
}

interface RankedEntry {
  id: string;
  name: string;
  level: number;
  avatarColor: string;
  isPlayer: boolean;
  friend?: FriendEntry;
}

export const FriendsLeaderboard: React.FC<FriendsLeaderboardProps> = ({
  progress,
  referenceDateKey,
  onSendLife,
  onClaimLife,
  onAddFriend,
  onJumpToLevel,
  compact = false,
}) => {
  const [adding, setAdding] = useState(false);
  const [friendName, setFriendName] = useState('');
  const [friendLevel, setFriendLevel] = useState(String(Math.max(1, progress.currentLevel)));

  const ranked = useMemo<RankedEntry[]>(() => {
    const entries: RankedEntry[] = [
      {
        id: '__player__',
        name: `${progress.playerName} (You)`,
        level: progress.currentLevel,
        avatarColor: '#E55A3C',
        isPlayer: true,
      },
      ...progress.friends.map((f) => ({
        id: f.id,
        name: f.name,
        level: f.level,
        avatarColor: f.avatarColor,
        isPlayer: false,
        friend: f,
      })),
    ];
    return entries.sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      return a.isPlayer ? -1 : 1;
    });
  }, [progress.friends, progress.playerName, progress.currentLevel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = friendName.trim();
    if (!cleaned) return;
    const lv = Math.max(1, Math.min(999, Number(friendLevel) || 1));
    onAddFriend(cleaned, lv);
    setFriendName('');
    setFriendLevel(String(progress.currentLevel));
    setAdding(false);
  };

  return (
    <section
      aria-label="Friends Leaderboard"
      className="rounded-3xl theme-surface-glass backdrop-blur-md border p-4 shadow-[0_12px_30px_-16px_rgba(30,22,12,0.28)]"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="w-4 h-4 text-[#E55A3C] dark:text-[#2BD4C5] shrink-0" />
          <h2 className="font-display text-base font-bold theme-ink truncate">
            Friends Leaderboard
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          aria-label={adding ? 'Close add friend form' : 'Add friend'}
          className="min-h-[34px] px-2.5 py-1 rounded-xl theme-surface-muted border text-xs font-bold inline-flex items-center gap-1 cursor-pointer hover:opacity-90 whitespace-nowrap shrink-0"
        >
          {adding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          <span>{adding ? 'Close' : 'Add'}</span>
        </button>
      </div>

      {adding && (
        <form
          onSubmit={handleSubmit}
          className="mb-3 p-2.5 rounded-2xl theme-surface-muted border flex flex-wrap items-center gap-2"
        >
          <input
            type="text"
            value={friendName}
            onChange={(e) => setFriendName(e.target.value)}
            placeholder="Friend name"
            maxLength={18}
            required
            className="flex-1 min-w-[110px] px-2.5 py-1.5 rounded-xl theme-surface border text-xs font-semibold focus:outline-2 focus:outline-[#E55A3C]"
          />
          <input
            type="number"
            min={1}
            max={999}
            value={friendLevel}
            onChange={(e) => setFriendLevel(e.target.value)}
            aria-label="Friend level"
            className="w-16 px-2 py-1.5 rounded-xl theme-surface border text-xs font-bold tabular-nums text-center focus:outline-2 focus:outline-[#E55A3C]"
          />
          <button
            type="submit"
            className="min-h-[34px] px-3 py-1 rounded-xl btn-tactile-emerald text-white font-display text-xs font-bold cursor-pointer whitespace-nowrap"
          >
            Save
          </button>
        </form>
      )}

      <div className={`space-y-2 ${compact ? 'max-h-[260px] overflow-y-auto pr-0.5' : ''}`}>
        {ranked.map((entry, idx) => {
          const rank = idx + 1;
          const quota = entry.friend
            ? getFriendDailyQuota(entry.friend, referenceDateKey)
            : null;
          const initials = entry.name.replace(' (You)', '').slice(0, 2).toUpperCase();

          return (
            <div
              key={entry.id}
              className={`rounded-2xl px-2.5 py-2 border flex items-center justify-between gap-2 transition-colors ${
                entry.isPlayer
                  ? 'bg-[#FFF3CE]/90 dark:bg-[#173D57]/90 border-[#E5B043] dark:border-[#2BD4C5]'
                  : 'theme-surface-muted'
              }`}
            >
              <button
                type="button"
                onClick={() => onJumpToLevel?.(entry.level)}
                className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
                title={`View Level ${entry.level} on map`}
              >
                <span className="w-5 text-center font-display text-xs font-bold theme-ink-secondary tabular-nums shrink-0">
                  {rank === 1 ? (
                    <Crown className="w-4 h-4 text-[#E8A317] inline" />
                  ) : (
                    `#${rank}`
                  )}
                </span>

                <span
                  className="w-8 h-8 rounded-full border-2 border-white/90 text-white font-display text-xs font-bold flex items-center justify-center shadow-xs shrink-0"
                  style={{ backgroundColor: entry.avatarColor }}
                >
                  {initials}
                </span>

                <div className="min-w-0">
                  <div className="font-display text-xs sm:text-sm font-bold theme-ink truncate">
                    {entry.name}
                  </div>
                  <div className="text-[11px] font-semibold theme-ink-secondary tabular-nums flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-[#E8A317]" />
                    <span>Level {entry.level}</span>
                  </div>
                </div>
              </button>

              {entry.friend && quota && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onSendLife(entry.friend!.id)}
                    disabled={!quota.canSend}
                    title={`Send 1 life (${quota.sentToday}/${MAX_FRIEND_LIVES_PER_DAY} today)`}
                    className="min-h-[32px] px-2 py-1 rounded-xl bg-[#FBEBD0] dark:bg-[#183C57] hover:opacity-90 disabled:opacity-45 text-[#7E4B0A] dark:text-[#7CE8FF] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer tabular-nums whitespace-nowrap"
                  >
                    <Send className="w-3 h-3" />
                    <span>{quota.remainingSend}/{MAX_FRIEND_LIVES_PER_DAY}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onClaimLife(entry.friend!.id)}
                    disabled={!quota.canReceive}
                    title={`Receive 1 shared life (${quota.receivedToday}/${MAX_FRIEND_LIVES_PER_DAY} today)`}
                    className="min-h-[32px] px-2 py-1 rounded-xl bg-[#FFE7EC] dark:bg-[#3A1E33] hover:opacity-90 disabled:opacity-45 text-[#B82843] dark:text-[#FF8AA1] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer tabular-nums whitespace-nowrap"
                  >
                    <Heart className="w-3 h-3 fill-current" />
                    <span>+{quota.remainingReceive}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
