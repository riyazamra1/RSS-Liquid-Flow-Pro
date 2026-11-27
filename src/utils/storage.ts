import {
  CalculatedDailyReward,
  DailyMissionDefinition,
  DailyMissionProgress,
  DailyRewardTier,
  FriendEntry,
  GameSettings,
  PlayerProgress,
  SpinWheelRecord,
  SpinWheelSegment,
} from '../types/game';
import { ACHIEVEMENTS, GARDEN_PLANTS } from './levelGenerator';
import { normalizeThemeId } from './themes';

// Preserve exact RSS LIQUID FLOW localStorage keys so existing progress is NEVER lost or wiped
const KEY_PROGRESS_V3 = 'liquid-flow-progress-v3';
const KEY_LEGACY_STATE = 'liquid-flow-progress';
const KEY_DAILY_LOGIN = 'liquid-flow-login';
const KEY_SETTINGS = 'liquid-flow-settings';

export const MAX_STANDARD_LIVES = 5;
export const LIFE_REFILL_MS = 30 * 60 * 1000; // 30 minutes per life
export const MAX_FRIEND_LIVES_PER_DAY = 2;

const FRIEND_AVATAR_COLORS = [
  '#E01E37',
  '#1FA84F',
  '#7B2CBF',
  '#E59B14',
  '#0E9AA7',
  '#D94929',
];

export const DEFAULT_STARTER_FRIENDS: FriendEntry[] = [];

/**
 * 7-Day Daily Login Reward Schedule granting escalating coins and bonus lives.
 */
export const DAILY_REWARD_SCHEDULE: DailyRewardTier[] = [
  { day: 1, label: 'Day 1', rewardType: 'coins', coins: 50, lives: 0 },
  { day: 2, label: 'Day 2', rewardType: 'lives', coins: 0, lives: 1 },
  { day: 3, label: 'Day 3', rewardType: 'coins', coins: 100, lives: 0 },
  { day: 4, label: 'Day 4', rewardType: 'lives', coins: 0, lives: 2 },
  { day: 5, label: 'Day 5', rewardType: 'coins', coins: 150, lives: 0 },
  { day: 6, label: 'Day 6', rewardType: 'bundle', coins: 75, lives: 2 },
  { day: 7, label: 'Day 7', rewardType: 'bundle', coins: 300, lives: 3, highlight: true },
];

export const DAILY_MISSIONS_DEFINITIONS: DailyMissionDefinition[] = [
  {
    id: 'solve_levels',
    title: 'Solve 3 levels',
    description: 'Complete any 3 liquid sorting levels today.',
    metric: 'levelsSolved',
    target: 3,
    rewardCoins: 120,
    rewardXp: 150,
  },
  {
    id: 'earn_coins',
    title: 'Earn 500 coins',
    description: 'Collect 500 coins from puzzles or daily bonuses today.',
    metric: 'coinsEarned',
    target: 500,
    rewardCoins: 150,
    rewardXp: 200,
  },
  {
    id: 'gift_lives',
    title: 'Gift 2 lives',
    description: 'Send 2 lives to your friends today.',
    metric: 'livesGifted',
    target: 2,
    rewardCoins: 100,
    rewardXp: 125,
  },
];

export const XP_PER_LEVEL = 250;

export function getXpLevelInfo(xp: number) {
  const safeXp = Math.max(0, Math.floor(Number(xp) || 0));
  const level = Math.floor(safeXp / XP_PER_LEVEL) + 1;
  const currentLevelXp = safeXp % XP_PER_LEVEL;
  const progressPct = Math.round((currentLevelXp / XP_PER_LEVEL) * 100);
  return {
    totalXp: safeXp,
    level,
    currentLevelXp,
    nextLevelXp: XP_PER_LEVEL,
    xpToNext: XP_PER_LEVEL - currentLevelXp,
    progressPct,
  };
}

export function normalizeDailyMissions(
  raw: unknown,
  dateKey: string = formatDateKey()
): DailyMissionProgress {
  if (!raw || typeof raw !== 'object') {
    return {
      dateKey,
      levelsSolved: 0,
      coinsEarned: 0,
      livesGifted: 0,
      claimedMissionIds: [],
    };
  }
  const obj = raw as Record<string, unknown>;
  if (obj.dateKey !== dateKey) {
    return {
      dateKey,
      levelsSolved: 0,
      coinsEarned: 0,
      livesGifted: 0,
      claimedMissionIds: [],
    };
  }
  return {
    dateKey,
    levelsSolved: Math.max(0, Math.floor(Number(obj.levelsSolved) || 0)),
    coinsEarned: Math.max(0, Math.floor(Number(obj.coinsEarned) || 0)),
    livesGifted: Math.max(0, Math.floor(Number(obj.livesGifted) || 0)),
    claimedMissionIds: Array.isArray(obj.claimedMissionIds)
      ? obj.claimedMissionIds.filter((id): id is string => typeof id === 'string')
      : [],
  };
}

export function formatDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getOffsetDateKey(baseDateKey: string, dayDelta: number): string {
  const [y, m, d] = baseDateKey.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, (d || 1) + dayDelta);
  return formatDateKey(dt);
}

function safeParse<T>(raw: string | null): Partial<T> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function recomputeLives(lifeState: { count: number; lastRefillAt: number }): {
  count: number;
  lastRefillAt: number;
  nextRefillAt: number;
} {
  const now = Date.now();
  let count = Number.isFinite(lifeState.count)
    ? Math.max(0, Math.floor(lifeState.count))
    : MAX_STANDARD_LIVES;
  let lastRefillAt = Number(lifeState.lastRefillAt) || 0;

  if (count < MAX_STANDARD_LIVES) {
    if (!lastRefillAt) lastRefillAt = now;
    const elapsed = Math.max(0, now - lastRefillAt);
    const gained = Math.floor(elapsed / LIFE_REFILL_MS);
    if (gained > 0) {
      count = Math.min(MAX_STANDARD_LIVES, count + gained);
      lastRefillAt = count >= MAX_STANDARD_LIVES ? 0 : lastRefillAt + gained * LIFE_REFILL_MS;
    }
  } else {
    lastRefillAt = 0;
  }

  return {
    count,
    lastRefillAt,
    nextRefillAt: count < MAX_STANDARD_LIVES ? lastRefillAt + LIFE_REFILL_MS : 0,
  };
}

function normalizeFriends(raw: unknown): FriendEntry[] {
  if (!Array.isArray(raw)) return [];
  const DEMO_NAMES = ['maya', 'arjun', 'lina', 'omar'];
  const DEMO_IDS = ['f-maya', 'f-arjun', 'f-lina', 'f-omar'];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .filter((item) => {
      const name = String(item.name || '').toLowerCase();
      const id = String(item.id || '');
      return !DEMO_NAMES.includes(name) && !DEMO_IDS.includes(id);
    })
    .map((item, idx) => ({
      id: typeof item.id === 'string' && item.id ? item.id : `friend-${idx + 1}`,
      name: typeof item.name === 'string' && item.name.trim() ? item.name.trim().slice(0, 20) : `Friend ${idx + 1}`,
      level: Math.max(1, Math.min(999, Math.floor(Number(item.level) || 1))),
      avatarColor:
        typeof item.avatarColor === 'string' && item.avatarColor
          ? item.avatarColor
          : FRIEND_AVATAR_COLORS[idx % FRIEND_AVATAR_COLORS.length],
      sentDates:
        item.sentDates && typeof item.sentDates === 'object'
          ? { ...(item.sentDates as Record<string, number>) }
          : {},
      receivedDates:
        item.receivedDates && typeof item.receivedDates === 'object'
          ? { ...(item.receivedDates as Record<string, number>) }
          : {},
    }));
}

/**
 * Loads existing player progress from RSS LIQUID FLOW localStorage keys without overwriting or resetting.
 */
export function loadProgress(): PlayerProgress {
  if (typeof window === 'undefined') {
    return createDefaultProgress();
  }

  const v3 = safeParse<Record<string, unknown>>(localStorage.getItem(KEY_PROGRESS_V3));
  const legacy = safeParse<Record<string, unknown>>(localStorage.getItem(KEY_LEGACY_STATE));
  const loginRaw = safeParse<Record<string, unknown>>(localStorage.getItem(KEY_DAILY_LOGIN));

  const completedLevels: Record<string, boolean> =
    v3.completedLevels && typeof v3.completedLevels === 'object'
      ? { ...(v3.completedLevels as Record<string, boolean>) }
      : {};

  const levelStars: Record<string, number> =
    v3.levelStars && typeof v3.levelStars === 'object'
      ? { ...(v3.levelStars as Record<string, number>) }
      : {};

  const levelScores: Record<string, number> =
    v3.levelScores && typeof v3.levelScores === 'object'
      ? { ...(v3.levelScores as Record<string, number>) }
      : {};

  const levelBestTimes: Record<string, number> =
    v3.levelBestTimes && typeof v3.levelBestTimes === 'object'
      ? { ...(v3.levelBestTimes as Record<string, number>) }
      : {};

  const levelBestMoves: Record<string, number> =
    v3.levelBestMoves && typeof v3.levelBestMoves === 'object'
      ? { ...(v3.levelBestMoves as Record<string, number>) }
      : {};

  const perfectLevels: Record<string, boolean> =
    v3.perfectLevels && typeof v3.perfectLevels === 'object'
      ? { ...(v3.perfectLevels as Record<string, boolean>) }
      : {};

  const legacyLevel = Math.max(1, Number(legacy.level) || 1);
  const storedBestLevel = Math.max(1, Number(v3.bestLevel) || legacyLevel);

  if (Object.keys(completedLevels).length === 0 && storedBestLevel > 1) {
    for (let i = 1; i < storedBestLevel; i++) {
      completedLevels[String(i)] = true;
      if (!levelStars[String(i)]) levelStars[String(i)] = 1;
    }
  }

  const levelsCleared = Math.max(
    Number(v3.levelsCleared) || 0,
    Object.values(completedLevels).filter(Boolean).length
  );

  const highestCompleted = Object.keys(completedLevels)
    .filter((k) => completedLevels[k])
    .reduce((acc, k) => Math.max(acc, Number(k) || 0), 0);

  const currentLevel = Math.max(1, Number(legacy.level) || highestCompleted + 1);
  const bestLevel = Math.max(storedBestLevel, highestCompleted + 1, currentLevel);

  const rawLife = (v3.lifeState as { count?: number; lastRefillAt?: number } | undefined) || {
    count: MAX_STANDARD_LIVES,
    lastRefillAt: 0,
  };
  const syncedLife = recomputeLives({
    count: rawLife.count === 0 ? 0 : Number(rawLife.count) || MAX_STANDARD_LIVES,
    lastRefillAt: Number(rawLife.lastRefillAt) || 0,
  });

  const achievements: Record<string, boolean> = {
    ...((v3.achievements as Record<string, boolean>) || {}),
  };
  ACHIEVEMENTS.forEach((a) => {
    if (levelsCleared >= a.target) achievements[a.id] = true;
  });

  const collections: Record<string, boolean> = {
    ...((v3.collections as Record<string, boolean>) || {}),
  };
  GARDEN_PLANTS.forEach((p) => {
    if (levelsCleared >= p.unlockAt) collections[p.id] = true;
  });

  const lastClaimDate =
    (typeof loginRaw.lastClaimDate === 'string' ? loginRaw.lastClaimDate : null) ||
    (typeof loginRaw.last === 'string' ? loginRaw.last : null) ||
    (typeof v3.loginDate === 'string' ? v3.loginDate : null);

  const loginStreak = Math.max(0, Number(loginRaw.streak) || Number(v3.streak) || 0);

  const totalClaims = Math.max(
    0,
    Number(loginRaw.totalClaims) || Number(v3.loginClaims) || (lastClaimDate ? 1 : 0)
  );

  const claimedDates = Array.isArray(loginRaw.claimedDates)
    ? (loginRaw.claimedDates as string[])
    : lastClaimDate
    ? [lastClaimDate]
    : [];

  const rawSpinWheel =
    v3.spinWheel && typeof v3.spinWheel === 'object'
      ? (v3.spinWheel as Record<string, unknown>)
      : {};
  const spinWheel: SpinWheelRecord = {
    lastFreeSpinDate:
      typeof rawSpinWheel.lastFreeSpinDate === 'string' ? rawSpinWheel.lastFreeSpinDate : null,
    totalSpins: Math.max(0, Math.floor(Number(rawSpinWheel.totalSpins) || 0)),
    lastOutcomeLabel:
      typeof rawSpinWheel.lastOutcomeLabel === 'string'
        ? rawSpinWheel.lastOutcomeLabel
        : undefined,
  };

  return {
    playerName: typeof v3.playerName === 'string' && v3.playerName.trim() ? v3.playerName : 'Guest',
    currentLevel,
    bestLevel,
    levelsCleared,
    completedLevels,
    levelStars,
    levelScores,
    levelBestTimes,
    levelBestMoves,
    coins: Math.max(0, Number(legacy.coins ?? v3.coins) || 0),
    xp: Math.max(0, Number(v3.xp) || 0),
    bestScore: Math.max(0, Number(legacy.bestScore ?? legacy.score ?? v3.bestScore) || 0),
    score: Math.max(0, Number(legacy.score) || 0),
    totalMoves: Math.max(0, Number(v3.totalMoves ?? legacy.moves) || 0),
    lifeState: {
      count: syncedLife.count,
      lastRefillAt: syncedLife.lastRefillAt,
    },
    achievements,
    collections,
    dailyClears: (v3.dailyClears as Record<string, boolean>) || {},
    dailyChallengeStreak: Math.max(0, Number(v3.dailyChallengeStreak) || 0),
    perfectLevels,
    lastMode: (v3.lastMode as PlayerProgress['lastMode']) || 'relaxed',
    dailyLogin: {
      lastClaimDate,
      streak: loginStreak,
      totalClaims,
      claimedDates,
      lastRewardSummary:
        typeof loginRaw.lastRewardSummary === 'string' ? loginRaw.lastRewardSummary : undefined,
    },
    dailyMissions: normalizeDailyMissions(v3.dailyMissions, formatDateKey()),
    spinWheel,
    friends: normalizeFriends(v3.friends),
  };
}

export function createDefaultProgress(): PlayerProgress {
  return {
    playerName: 'Guest',
    currentLevel: 1,
    bestLevel: 1,
    levelsCleared: 0,
    completedLevels: {},
    levelStars: {},
    levelScores: {},
    levelBestTimes: {},
    levelBestMoves: {},
    coins: 0,
    xp: 0,
    bestScore: 0,
    score: 0,
    totalMoves: 0,
    lifeState: { count: MAX_STANDARD_LIVES, lastRefillAt: 0 },
    achievements: {},
    collections: { sprout: true },
    dailyClears: {},
    dailyChallengeStreak: 0,
    perfectLevels: {},
    lastMode: 'relaxed',
    dailyLogin: {
      lastClaimDate: null,
      streak: 0,
      totalClaims: 0,
      claimedDates: [],
    },
    dailyMissions: normalizeDailyMissions(null, formatDateKey()),
    spinWheel: {
      lastFreeSpinDate: null,
      totalSpins: 0,
    },
    friends: DEFAULT_STARTER_FRIENDS.map((f) => ({
      ...f,
      sentDates: {},
      receivedDates: {},
    })),
  };
}

/**
 * Merges updated fields into existing RSS LIQUID FLOW storage keys safely.
 */
export function saveProgress(progress: PlayerProgress): void {
  if (typeof window === 'undefined') return;
  try {
    const existingV3 = safeParse<Record<string, unknown>>(localStorage.getItem(KEY_PROGRESS_V3));
    const mergedV3 = {
      ...existingV3,
      playerName: progress.playerName,
      bestLevel: progress.bestLevel,
      levelsCleared: progress.levelsCleared,
      completedLevels: progress.completedLevels,
      levelStars: progress.levelStars,
      levelScores: progress.levelScores,
      levelBestTimes: progress.levelBestTimes,
      levelBestMoves: progress.levelBestMoves,
      coins: progress.coins,
      xp: progress.xp,
      bestScore: progress.bestScore,
      totalMoves: progress.totalMoves,
      lifeState: progress.lifeState,
      achievements: progress.achievements,
      collections: progress.collections,
      dailyClears: progress.dailyClears,
      dailyChallengeStreak: progress.dailyChallengeStreak,
      perfectLevels: progress.perfectLevels,
      lastMode: progress.lastMode,
      loginDate: progress.dailyLogin.lastClaimDate,
      streak: progress.dailyLogin.streak,
      loginClaims: progress.dailyLogin.totalClaims,
      dailyMissions: progress.dailyMissions,
      spinWheel: progress.spinWheel,
      friends: progress.friends,
    };
    localStorage.setItem(KEY_PROGRESS_V3, JSON.stringify(mergedV3));

    const existingLegacy = safeParse<Record<string, unknown>>(localStorage.getItem(KEY_LEGACY_STATE));
    const mergedLegacy = {
      ...existingLegacy,
      level: progress.currentLevel,
      coins: progress.coins,
      score: progress.score,
      bestScore: progress.bestScore,
      moves: progress.totalMoves,
    };
    localStorage.setItem(KEY_LEGACY_STATE, JSON.stringify(mergedLegacy));

    const existingLogin = safeParse<Record<string, unknown>>(localStorage.getItem(KEY_DAILY_LOGIN));
    const mergedLogin = {
      ...existingLogin,
      last: progress.dailyLogin.lastClaimDate,
      lastClaimDate: progress.dailyLogin.lastClaimDate,
      streak: progress.dailyLogin.streak,
      totalClaims: progress.dailyLogin.totalClaims,
      claimedDates: progress.dailyLogin.claimedDates,
      lastRewardSummary: progress.dailyLogin.lastRewardSummary,
    };
    localStorage.setItem(KEY_DAILY_LOGIN, JSON.stringify(mergedLogin));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadSettings(): GameSettings {
  const defaults: GameSettings = {
    sfx: true,
    vibration: true,
    vibrationIntensity: 70,
    reduceMotion: false,
    showHints: true,
    autoAdvance: true,
    autoUpdate: true,
    mode: 'relaxed',
    theme: 'botanical',
  };
  if (typeof window === 'undefined') return defaults;
  const parsed = safeParse<GameSettings>(localStorage.getItem(KEY_SETTINGS));
  const merged = { ...defaults, ...parsed };
  const rawIntensity = Number(merged.vibrationIntensity);
  merged.vibrationIntensity = Number.isFinite(rawIntensity)
    ? Math.max(10, Math.min(100, Math.round(rawIntensity)))
    : defaults.vibrationIntensity;
  merged.theme = normalizeThemeId(merged.theme);
  return merged;
}

export function saveSettings(settings: GameSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));
  } catch {
    // Ignore
  }
}

/* ============================================================================
 * LIFE MANAGEMENT & FRIEND LIFE SHARING (2 LIVES / DAY PER FRIEND)
 * ========================================================================== */

export function deductOneLife(progress: PlayerProgress): {
  updated: PlayerProgress;
  remaining: number;
} {
  const livesNow = recomputeLives(progress.lifeState);
  const nextCount = Math.max(0, livesNow.count - 1);
  const nextRefillAt =
    nextCount >= MAX_STANDARD_LIVES ? 0 : livesNow.lastRefillAt || Date.now();
  const updated: PlayerProgress = {
    ...progress,
    lifeState: {
      count: nextCount,
      lastRefillAt: nextRefillAt,
    },
  };
  saveProgress(updated);
  return { updated, remaining: nextCount };
}

export function addOneLife(progress: PlayerProgress): {
  updated: PlayerProgress;
  count: number;
} {
  const livesNow = recomputeLives(progress.lifeState);
  const nextCount = livesNow.count + 1;
  const updated: PlayerProgress = {
    ...progress,
    lifeState: {
      count: nextCount,
      lastRefillAt: nextCount >= MAX_STANDARD_LIVES ? 0 : livesNow.lastRefillAt,
    },
  };
  saveProgress(updated);
  return { updated, count: nextCount };
}

export function getFriendDailyQuota(friend: FriendEntry, dateKey: string) {
  const sentToday = Math.max(0, Number(friend.sentDates[dateKey]) || 0);
  const receivedToday = Math.max(0, Number(friend.receivedDates[dateKey]) || 0);
  return {
    sentToday,
    receivedToday,
    canSend: sentToday < MAX_FRIEND_LIVES_PER_DAY,
    canReceive: receivedToday < MAX_FRIEND_LIVES_PER_DAY,
    remainingSend: Math.max(0, MAX_FRIEND_LIVES_PER_DAY - sentToday),
    remainingReceive: Math.max(0, MAX_FRIEND_LIVES_PER_DAY - receivedToday),
  };
}

export function sendLifeToFriend(
  progress: PlayerProgress,
  friendId: string,
  dateKey: string = formatDateKey()
): { updated: PlayerProgress; friendName: string; sentToday: number } | null {
  const target = progress.friends.find((f) => f.id === friendId);
  if (!target) return null;
  const quota = getFriendDailyQuota(target, dateKey);
  if (!quota.canSend) return null;

  const nextSent = quota.sentToday + 1;
  const nextFriends = progress.friends.map((f) =>
    f.id === friendId
      ? { ...f, sentDates: { ...f.sentDates, [dateKey]: nextSent } }
      : f
  );
  const currentMissions = normalizeDailyMissions(progress.dailyMissions, dateKey);
  const updated: PlayerProgress = {
    ...progress,
    friends: nextFriends,
    dailyMissions: {
      ...currentMissions,
      livesGifted: currentMissions.livesGifted + 1,
    },
  };
  saveProgress(updated);
  return { updated, friendName: target.name, sentToday: nextSent };
}

export function claimLifeFromFriend(
  progress: PlayerProgress,
  friendId: string,
  dateKey: string = formatDateKey()
): { updated: PlayerProgress; friendName: string; receivedToday: number } | null {
  const target = progress.friends.find((f) => f.id === friendId);
  if (!target) return null;
  const quota = getFriendDailyQuota(target, dateKey);
  if (!quota.canReceive) return null;

  const nextReceived = quota.receivedToday + 1;
  const livesNow = recomputeLives(progress.lifeState);
  const nextLifeCount = livesNow.count + 1;
  const nextFriends = progress.friends.map((f) =>
    f.id === friendId
      ? { ...f, receivedDates: { ...f.receivedDates, [dateKey]: nextReceived } }
      : f
  );

  const updated: PlayerProgress = {
    ...progress,
    lifeState: {
      count: nextLifeCount,
      lastRefillAt: nextLifeCount >= MAX_STANDARD_LIVES ? 0 : livesNow.lastRefillAt,
    },
    friends: nextFriends,
  };
  saveProgress(updated);
  return { updated, friendName: target.name, receivedToday: nextReceived };
}

export function addFriendEntry(
  progress: PlayerProgress,
  name: string,
  level: number
): PlayerProgress {
  const trimmed = name.trim().slice(0, 20);
  if (!trimmed) return progress;
  const safeLevel = Math.max(1, Math.min(999, Math.floor(level) || 1));
  const color = FRIEND_AVATAR_COLORS[progress.friends.length % FRIEND_AVATAR_COLORS.length];
  const entry: FriendEntry = {
    id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: trimmed,
    level: safeLevel,
    avatarColor: color,
    sentDates: {},
    receivedDates: {},
  };
  const updated: PlayerProgress = {
    ...progress,
    friends: [...progress.friends, entry],
  };
  saveProgress(updated);
  return updated;
}

export function removeFriendEntry(progress: PlayerProgress, friendId: string): PlayerProgress {
  const updated: PlayerProgress = {
    ...progress,
    friends: progress.friends.filter((f) => f.id !== friendId),
  };
  saveProgress(updated);
  return updated;
}

/* ============================================================================
 * DAILY LOGIN STREAK MULTIPLIER & STAR RANKS
 * ========================================================================== */

export const STREAK_MULTIPLIER_LADDER = [1.0, 1.1, 1.25, 1.4, 1.5, 1.75, 2.0] as const;

export function getDailyStreakMultiplier(streakDay: number): number {
  const safeDay = Math.max(1, Math.floor(streakDay));
  if (safeDay >= 14) return 2.5;
  if (safeDay >= 10) return 2.25;
  if (safeDay >= 7) return 2.0;
  return STREAK_MULTIPLIER_LADDER[safeDay - 1] ?? 1.0;
}

export function calculateStreakReward(
  tier: DailyRewardTier,
  streakDay: number
): CalculatedDailyReward {
  const safeDay = Math.max(1, Math.floor(streakDay));
  const multiplier = getDailyStreakMultiplier(safeDay);
  const baseCoins = tier.coins;

  let bonusCoins = 0;
  if (multiplier > 1) {
    if (baseCoins > 0) {
      bonusCoins = Math.max(5, Math.round((baseCoins * (multiplier - 1)) / 5) * 5);
    } else {
      bonusCoins = Math.max(15, Math.round((50 * (multiplier - 1) * 2) / 5) * 5);
    }
  }

  return {
    day: tier.day,
    label: tier.label,
    baseCoins,
    bonusCoins,
    totalCoins: baseCoins + bonusCoins,
    lives: tier.lives,
    multiplier,
  };
}

export function getDailyLoginStatus(
  progress: PlayerProgress,
  referenceDateKey: string = formatDateKey()
) {
  const { lastClaimDate, streak } = progress.dailyLogin;
  const alreadyClaimedToday = lastClaimDate === referenceDateKey;
  const yesterdayKey = getOffsetDateKey(referenceDateKey, -1);

  const projectedStreak = alreadyClaimedToday
    ? Math.max(1, streak)
    : lastClaimDate === yesterdayKey
    ? streak + 1
    : 1;

  const activeDayIndex = (projectedStreak - 1) % 7;
  const todayTier = DAILY_REWARD_SCHEDULE[activeDayIndex];
  const streakMultiplier = getDailyStreakMultiplier(projectedStreak);
  const nextMultiplier = getDailyStreakMultiplier(projectedStreak + 1);
  const todayReward = calculateStreakReward(todayTier, projectedStreak);
  const cycleStartStreak = projectedStreak - activeDayIndex;

  return {
    canClaim: !alreadyClaimedToday,
    alreadyClaimedToday,
    projectedStreak,
    activeDayNumber: activeDayIndex + 1,
    cycleStartStreak,
    todayTier,
    streakMultiplier,
    nextMultiplier,
    todayReward,
    referenceDateKey,
  };
}

export function applyDailyLoginClaim(
  progress: PlayerProgress,
  referenceDateKey: string = formatDateKey()
): { updated: PlayerProgress; granted: CalculatedDailyReward; newStreak: number } | null {
  const realToday = formatDateKey();
  // Strictly prevent claiming any future calendar date
  if (referenceDateKey > realToday) return null;
  const status = getDailyLoginStatus(progress, realToday);
  if (!status.canClaim) return null;

  const reward = status.todayReward;
  const syncedLives = recomputeLives(progress.lifeState);
  const newLifeCount = syncedLives.count + reward.lives;
  const newLastRefillAt = newLifeCount >= MAX_STANDARD_LIVES ? 0 : syncedLives.lastRefillAt;

  const parts: string[] = [];
  if (reward.totalCoins > 0) {
    parts.push(
      reward.bonusCoins > 0
        ? `+${reward.totalCoins} Coins (${reward.multiplier}×)`
        : `+${reward.totalCoins} Coins`
    );
  }
  if (reward.lives > 0) {
    parts.push(`+${reward.lives} Bonus ${reward.lives === 1 ? 'Life' : 'Lives'}`);
  }
  const summary = parts.join(' & ');

  const claimedDates = Array.from(
    new Set([...progress.dailyLogin.claimedDates, referenceDateKey])
  ).slice(-30);

  const currentMissions = normalizeDailyMissions(progress.dailyMissions, referenceDateKey);

  const updated: PlayerProgress = {
    ...progress,
    coins: progress.coins + reward.totalCoins,
    lifeState: {
      count: newLifeCount,
      lastRefillAt: newLastRefillAt,
    },
    dailyLogin: {
      lastClaimDate: referenceDateKey,
      streak: status.projectedStreak,
      totalClaims: progress.dailyLogin.totalClaims + 1,
      claimedDates,
      lastRewardSummary: summary,
    },
    dailyMissions: {
      ...currentMissions,
      coinsEarned: currentMissions.coinsEarned + reward.totalCoins,
    },
  };

  saveProgress(updated);
  return { updated, granted: reward, newStreak: status.projectedStreak };
}

export function applyDailyMissionDelta(
  progress: PlayerProgress,
  delta: { levelsSolved?: number; coinsEarned?: number; livesGifted?: number },
  dateKey: string = formatDateKey()
): DailyMissionProgress {
  const current = normalizeDailyMissions(progress.dailyMissions, dateKey);
  return {
    ...current,
    levelsSolved: current.levelsSolved + (delta.levelsSolved || 0),
    coinsEarned: current.coinsEarned + (delta.coinsEarned || 0),
    livesGifted: current.livesGifted + (delta.livesGifted || 0),
  };
}

export function claimDailyMissionReward(
  progress: PlayerProgress,
  missionId: DailyMissionDefinition['id'],
  dateKey: string = formatDateKey()
): { updated: PlayerProgress; mission: DailyMissionDefinition } | null {
  const mission = DAILY_MISSIONS_DEFINITIONS.find((m) => m.id === missionId);
  if (!mission) return null;

  const currentMissions = normalizeDailyMissions(progress.dailyMissions, dateKey);
  if (currentMissions.claimedMissionIds.includes(missionId)) return null;

  const currentMetricVal = currentMissions[mission.metric];
  if (currentMetricVal < mission.target) return null;

  const updated: PlayerProgress = {
    ...progress,
    coins: progress.coins + mission.rewardCoins,
    xp: (Number(progress.xp) || 0) + mission.rewardXp,
    dailyMissions: {
      ...currentMissions,
      claimedMissionIds: [...currentMissions.claimedMissionIds, missionId],
    },
  };

  saveProgress(updated);
  return { updated, mission };
}

export function getMaxUnlockedLevel(progress: PlayerProgress): number {
  const highestCompleted = Object.keys(progress.completedLevels)
    .filter((k) => progress.completedLevels[k])
    .reduce((acc, k) => Math.max(acc, Number(k) || 0), 0);
  return Math.max(1, progress.bestLevel, progress.currentLevel, highestCompleted + 1);
}

export function getTotalStars(progress: PlayerProgress): number {
  return Object.values(progress.levelStars).reduce((sum, s) => sum + (Number(s) || 0), 0);
}

export interface StarRankTier {
  id: 'novice' | 'apprentice' | 'adept' | 'master' | 'grandmaster';
  title: string;
  minStars: number;
  subtitle: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  barColor: string;
}

export const STAR_RANK_TIERS: StarRankTier[] = [
  {
    id: 'novice',
    title: 'Novice',
    minStars: 0,
    subtitle: 'Just beginning your liquid sorting journey',
    badgeBg: '#F6EEDB',
    badgeBorder: '#DFCCA4',
    badgeText: '#6B5233',
    barColor: '#8B7355',
  },
  {
    id: 'apprentice',
    title: 'Apprentice',
    minStars: 15,
    subtitle: 'Steady hand across crystal glass jars',
    badgeBg: '#E6F5EC',
    badgeBorder: '#9ED6B3',
    badgeText: '#1D633B',
    barColor: '#2E8555',
  },
  {
    id: 'adept',
    title: 'Adept',
    minStars: 40,
    subtitle: 'Skilled tactician of color & flow',
    badgeBg: '#FFF2CC',
    badgeBorder: '#E5B043',
    badgeText: '#8C5306',
    barColor: '#E59B14',
  },
  {
    id: 'master',
    title: 'Master',
    minStars: 90,
    subtitle: 'Elite puzzle solver with precision pours',
    badgeBg: '#FFE7DF',
    badgeBorder: '#E68A6E',
    badgeText: '#A83219',
    barColor: '#E55A3C',
  },
  {
    id: 'grandmaster',
    title: 'Grandmaster',
    minStars: 180,
    subtitle: 'Legendary artisan of RSS Liquid Flow',
    badgeBg: '#FDE8B4',
    badgeBorder: '#D48F0C',
    badgeText: '#6E3E02',
    barColor: '#C97B0C',
  },
];

export function getStarRankInfo(totalStars: number) {
  let currentIdx = 0;
  for (let i = STAR_RANK_TIERS.length - 1; i >= 0; i--) {
    if (totalStars >= STAR_RANK_TIERS[i].minStars) {
      currentIdx = i;
      break;
    }
  }
  const current = STAR_RANK_TIERS[currentIdx];
  const next = STAR_RANK_TIERS[currentIdx + 1] ?? null;

  const progressPct = next
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(
            ((totalStars - current.minStars) / Math.max(1, next.minStars - current.minStars)) * 100
          )
        )
      )
    : 100;

  return {
    current,
    next,
    starsToNext: next ? Math.max(0, next.minStars - totalStars) : 0,
    progressPct,
  };
}

/* ============================================================================
 * LUCKY PRIZE WHEEL (GIFT, COINS, BETTER LUCK)
 * ========================================================================== */

export const SPIN_COST_COINS = 50;

export const SPIN_WHEEL_SEGMENTS: SpinWheelSegment[] = [
  {
    id: 'coins-50',
    label: '+50 Coins',
    shortLabel: '+50',
    category: 'coins',
    coins: 50,
    lives: 0,
    weight: 22,
    color: '#F59E0B',
    textColor: '#FFFDF7',
  },
  {
    id: 'gift-life',
    label: 'Gift · +1 Bonus Life',
    shortLabel: '+1 ♥',
    category: 'gift',
    coins: 0,
    lives: 1,
    weight: 14,
    color: '#EC4899',
    textColor: '#FFFDF7',
  },
  {
    id: 'luck-1',
    label: 'Better Luck Next Time',
    shortLabel: 'Better',
    category: 'luck',
    coins: 0,
    lives: 0,
    weight: 16,
    color: '#64748B',
    textColor: '#FFFDF7',
  },
  {
    id: 'coins-120',
    label: '+120 Coins',
    shortLabel: '+120',
    category: 'coins',
    coins: 120,
    lives: 0,
    weight: 14,
    color: '#10B981',
    textColor: '#FFFDF7',
  },
  {
    id: 'gift-mega',
    label: 'Mega Gift · +75 Coins & +1 Life',
    shortLabel: 'Mega',
    category: 'gift',
    coins: 75,
    lives: 1,
    weight: 8,
    color: '#0EA5E9',
    textColor: '#FFFDF7',
  },
  {
    id: 'coins-250',
    label: '+250 Coins Jackpot!',
    shortLabel: '+250',
    category: 'coins',
    coins: 250,
    lives: 0,
    weight: 6,
    color: '#8B5CF6',
    textColor: '#FFFDF7',
  },
  {
    id: 'luck-2',
    label: 'Better Luck Next Time',
    shortLabel: 'Better',
    category: 'luck',
    coins: 0,
    lives: 0,
    weight: 14,
    color: '#475569',
    textColor: '#FFFDF7',
  },
  {
    id: 'coins-80',
    label: '+80 Coins',
    shortLabel: '+80',
    category: 'coins',
    coins: 80,
    lives: 0,
    weight: 16,
    color: '#E55A3C',
    textColor: '#FFFDF7',
  },
];

export function canSpinFreeToday(
  progress: PlayerProgress,
  referenceDateKey: string = formatDateKey()
): boolean {
  return progress.spinWheel?.lastFreeSpinDate !== referenceDateKey;
}

export function pickWeightedSpinSegment(): { segment: SpinWheelSegment; index: number } {
  const totalWeight = SPIN_WHEEL_SEGMENTS.reduce((sum, s) => sum + s.weight, 0);
  let roll = Math.random() * totalWeight;
  for (let i = 0; i < SPIN_WHEEL_SEGMENTS.length; i++) {
    roll -= SPIN_WHEEL_SEGMENTS[i].weight;
    if (roll <= 0) {
      return { segment: SPIN_WHEEL_SEGMENTS[i], index: i };
    }
  }
  return { segment: SPIN_WHEEL_SEGMENTS[0], index: 0 };
}

export function applySpinWheelOutcome(
  progress: PlayerProgress,
  segment: SpinWheelSegment,
  usedFreeSpin: boolean,
  referenceDateKey: string = formatDateKey()
): PlayerProgress | null {
  if (usedFreeSpin && !canSpinFreeToday(progress, referenceDateKey)) {
    return null;
  }
  if (!usedFreeSpin && progress.coins < SPIN_COST_COINS) {
    return null;
  }

  const spinCost = usedFreeSpin ? 0 : SPIN_COST_COINS;
  const syncedLives = recomputeLives(progress.lifeState);
  const nextLifeCount = syncedLives.count + segment.lives;
  const nextLastRefillAt =
    nextLifeCount >= MAX_STANDARD_LIVES ? 0 : syncedLives.lastRefillAt;

  const currentMissions = normalizeDailyMissions(progress.dailyMissions, referenceDateKey);
  const updated: PlayerProgress = {
    ...progress,
    coins: Math.max(0, progress.coins - spinCost + segment.coins),
    lifeState: {
      count: nextLifeCount,
      lastRefillAt: nextLastRefillAt,
    },
    dailyMissions: {
      ...currentMissions,
      coinsEarned: currentMissions.coinsEarned + segment.coins,
    },
    spinWheel: {
      lastFreeSpinDate: usedFreeSpin
        ? referenceDateKey
        : progress.spinWheel?.lastFreeSpinDate ?? null,
      totalSpins: (progress.spinWheel?.totalSpins || 0) + 1,
      lastOutcomeLabel: segment.label,
    },
  };

  saveProgress(updated);
  return updated;
}
