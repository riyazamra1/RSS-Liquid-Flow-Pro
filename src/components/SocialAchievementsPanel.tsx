import React, { useMemo, useState } from 'react';
import {
  Check,
  Coins,
  Crown,
  Gift,
  Heart,
  HeartHandshake,
  Lock,
  Send,
  Share2,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  PlayerProgress,
  SocialAchievementDefinition,
  SocialBadgeTier,
} from '../types/game';
import { getSocialAchievementProgress } from '../utils/storage';

interface SocialAchievementsPanelProps {
  progress: PlayerProgress;
  onClaimBadge: (badgeId: string) => void;
  onOpenFriends?: () => void;
  onShare?: () => void;
}

type BadgeFilter = 'all' | 'unlocked' | 'locked';

const TIER_STYLES: Record<
  SocialBadgeTier,
  {
    label: string;
    medallionBg: string;
    medallionRing: string;
    iconColor: string;
    barColor: string;
    accentText: string;
  }
> = {
  bronze: {
    label: 'Bronze',
    medallionBg: 'linear-gradient(145deg, #F4C495 0%, #C97942 62%, #914B1E 100%)',
    medallionRing: 'rgba(201, 121, 66, 0.45)',
    iconColor: '#FFF7ED',
    barColor: '#C97942',
    accentText: 'text-[#9A4E1C] dark:text-[#F4BA86]',
  },
  silver: {
    label: 'Silver',
    medallionBg: 'linear-gradient(145deg, #F1F5F9 0%, #94A3B8 58%, #475569 100%)',
    medallionRing: 'rgba(148, 163, 184, 0.5)',
    iconColor: '#FFFFFF',
    barColor: '#64748B',
    accentText: 'text-[#475569] dark:text-[#CBD5E1]',
  },
  gold: {
    label: 'Gold',
    medallionBg: 'linear-gradient(145deg, #FFE896 0%, #E59B14 58%, #A66506 100%)',
    medallionRing: 'rgba(229, 155, 20, 0.55)',
    iconColor: '#FFFDF5',
    barColor: '#E59B14',
    accentText: 'text-[#9A5F0A] dark:text-[#F5BC38]',
  },
  platinum: {
    label: 'Platinum',
    medallionBg: 'linear-gradient(145deg, #A7F3D0 0%, #10B981 52%, #0F766E 100%)',
    medallionRing: 'rgba(16, 185, 129, 0.55)',
    iconColor: '#FFFFFF',
    barColor: '#10B981',
    accentText: 'text-[#0F766E] dark:text-[#5EEAD4]',
  },
};

function renderBadgeIcon(icon: SocialAchievementDefinition['icon'], className: string) {
  switch (icon) {
    case 'user-plus':
      return <UserPlus className={className} />;
    case 'users':
      return <Users className={className} />;
    case 'crown':
      return <Crown className={className} />;
    case 'heart':
      return <Heart className={className} />;
    case 'send':
      return <Send className={className} />;
    case 'handshake':
      return <HeartHandshake className={className} />;
    case 'gift':
      return <Gift className={className} />;
    case 'share':
      return <Share2 className={className} />;
  }
}

export const SocialAchievementsPanel: React.FC<SocialAchievementsPanelProps> = ({
  progress,
  onClaimBadge,
  onOpenFriends,
  onShare,
}) => {
  const [filter, setFilter] = useState<BadgeFilter>('all');

  const summary = useMemo(() => getSocialAchievementProgress(progress), [progress]);

  const filteredItems = useMemo(() => {
    if (filter === 'unlocked') return summary.items.filter((item) => item.unlocked);
    if (filter === 'locked') return summary.items.filter((item) => !item.unlocked);
    return summary.items;
  }, [filter, summary.items]);

  const overallPct = Math.round((summary.unlockedCount / Math.max(1, summary.totalCount)) * 100);

  return (
    <section
      aria-label="Social Achievements"
      className="rounded-3xl theme-surface-glass backdrop-blur-md border p-5 sm:p-6 shadow-[0_12px_30px_-16px_rgba(24,18,12,0.25)] space-y-4"
    >
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[#2E8555] dark:text-[#5EEAD4]">
            Community Milestones
          </p>
          <h2 className="font-display text-xl sm:text-2xl font-bold theme-ink mt-0.5">
            Social Achievements
          </h2>
          <p className="mt-1 text-xs theme-ink-secondary tabular-nums">
            <span>{summary.stats.totalFriendsAdded} Friends Added</span>
            <span aria-hidden="true" className="mx-1.5">·</span>
            <span>{summary.stats.totalLivesSent} Lives Sent</span>
            <span aria-hidden="true" className="mx-1.5">·</span>
            <span>{summary.stats.totalLivesClaimed} Lives Claimed</span>
            <span aria-hidden="true" className="mx-1.5">·</span>
            <span>{summary.stats.totalShares} Invites Shared</span>
          </p>
        </div>

        <div className="sm:text-right shrink-0 tabular-nums">
          <div className="font-display text-2xl font-bold theme-ink leading-none">
            {summary.unlockedCount}
            <span className="text-sm font-semibold theme-ink-secondary">
              {' '}/ {summary.totalCount} Badges
            </span>
          </div>
          <div className="mt-1 text-xs font-semibold theme-ink-secondary">
            {summary.unclaimedCount > 0
              ? `${summary.unclaimedCount} ${summary.unclaimedCount === 1 ? 'reward' : 'rewards'} ready to claim`
              : `${overallPct}% complete`}
          </div>
        </div>
      </div>

      {/* Overall Completion Bar */}
      <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#2E8555] to-[#10B981] transition-all duration-300"
          style={{ width: `${Math.max(summary.unlockedCount > 0 ? 6 : 0, overallPct)}%` }}
        />
      </div>

      {/* Segmented Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div
          className="inline-flex items-center gap-1 p-1 rounded-xl theme-surface-muted border"
          role="tablist"
          aria-label="Filter social achievements"
        >
          {(
            [
              ['all', `All (${summary.totalCount})`],
              ['unlocked', `Unlocked (${summary.unlockedCount})`],
              ['locked', `In Progress (${summary.totalCount - summary.unlockedCount})`],
            ] as const
          ).map(([id, label]) => {
            const active = filter === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(id)}
                className={`min-h-[34px] px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'theme-surface theme-ink shadow-xs'
                    : 'theme-ink-secondary hover:opacity-100'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {(onOpenFriends || onShare) && (
          <div className="flex items-center gap-2">
            {onShare && (
              <button
                type="button"
                onClick={onShare}
                className="min-h-[38px] px-3.5 py-1.5 rounded-xl theme-surface-muted border text-xs font-semibold theme-ink inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer hover:opacity-90"
              >
                <Share2 className="w-3.5 h-3.5 text-[#E55A3C] dark:text-[#2BD4C5]" />
                <span>Share Invite</span>
              </button>
            )}
            {onOpenFriends && (
              <button
                type="button"
                onClick={onOpenFriends}
                className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#2E8555] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer hover:opacity-95"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Friends &amp; Gifting</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Unlockable Badges Grid */}
      {filteredItems.length === 0 ? (
        <div className="rounded-2xl theme-surface-muted border p-6 text-center">
          <p className="font-display text-base font-bold theme-ink">
            {filter === 'unlocked'
              ? 'No social badges unlocked yet'
              : 'All social badges unlocked'}
          </p>
          <p className="mt-1 text-xs theme-ink-secondary">
            {filter === 'unlocked'
              ? 'Add friends, share invites, and gift lives from the Rewards tab to earn community badges.'
              : 'You have completed every community milestone in RSS Liquid Flow!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredItems.map(({ badge, current, unlocked, claimed, canClaim, pct }) => {
            const tierStyle = TIER_STYLES[badge.tier];
            const displayCurrent = Math.min(current, badge.target);

            return (
              <article
                key={badge.id}
                className={`rounded-2xl border p-4 flex items-start gap-3.5 transition-colors ${
                  unlocked
                    ? 'theme-surface shadow-xs'
                    : 'theme-surface-muted opacity-90'
                }`}
              >
                {/* Unlockable Badge Medallion */}
                <div className="relative shrink-0 pt-0.5">
                  <div
                    className={`w-13 h-13 rounded-2xl flex items-center justify-center border-2 transition-transform ${
                      unlocked
                        ? 'border-white/80 dark:border-white/25 shadow-md'
                        : 'border-dashed theme-border bg-black/5 dark:bg-white/5 theme-ink-muted'
                    }`}
                    style={
                      unlocked
                        ? {
                            background: tierStyle.medallionBg,
                            boxShadow: `0 6px 16px -6px ${tierStyle.medallionRing}, inset 0 1px 2px rgba(255,255,255,0.55)`,
                          }
                        : undefined
                    }
                    aria-hidden="true"
                  >
                    {renderBadgeIcon(
                      badge.icon,
                      `w-6 h-6 ${unlocked ? 'drop-shadow-xs' : 'opacity-45'}`
                    )}
                  </div>
                  <span
                    aria-hidden="true"
                    className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border shadow-xs ${
                      unlocked
                        ? 'bg-[#2E8555] border-white dark:border-[#0D2235] text-white'
                        : 'theme-surface theme-border theme-ink-muted'
                    }`}
                  >
                    {unlocked ? (
                      <Check className="w-3 h-3 stroke-[3]" />
                    ) : (
                      <Lock className="w-2.5 h-2.5" />
                    )}
                  </span>
                </div>

                {/* Badge Details & Progress */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-display text-sm sm:text-base font-bold theme-ink leading-snug truncate">
                        {badge.title}
                      </h3>
                      <div className="mt-0.5 text-[11px] font-semibold theme-ink-secondary flex flex-wrap items-center gap-x-1.5">
                        <span className={unlocked ? tierStyle.accentText : 'theme-ink-secondary'}>
                          {badge.milestoneLabel}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{tierStyle.label}</span>
                        <span aria-hidden="true">·</span>
                        <span className={unlocked ? 'text-[#2E8555] dark:text-[#5EEAD4]' : ''}>
                          {unlocked ? 'Unlocked' : 'Locked'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="mt-1.5 text-xs theme-ink-secondary leading-relaxed">
                    {badge.description}
                  </p>

                  {/* Progress Track */}
                  <div className="mt-2.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold theme-ink-secondary tabular-nums mb-1">
                      <span>
                        {displayCurrent.toLocaleString()} / {badge.target.toLocaleString()}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[#9A5F0A] dark:text-[#F5BC38]">
                        <Coins className="w-3 h-3 text-[#E59B14]" />
                        <span>+{badge.rewardCoins} coins</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: unlocked ? tierStyle.barColor : '#94A3B8',
                        }}
                      />
                    </div>
                  </div>

                  {/* Interactive Claim Action or Claimed State */}
                  {canClaim && (
                    <button
                      type="button"
                      onClick={() => onClaimBadge(badge.id)}
                      className="mt-3 w-full min-h-[38px] px-3 py-1.5 rounded-xl btn-tactile-gold text-[#4A2D03] font-display text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>
                        Claim +{badge.rewardCoins} Coins &amp; +{badge.rewardXp} XP
                      </span>
                    </button>
                  )}

                  {claimed && (
                    <div className="mt-2.5 text-[11px] font-semibold text-[#2E8555] dark:text-[#5EEAD4] inline-flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Badge reward claimed</span>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
