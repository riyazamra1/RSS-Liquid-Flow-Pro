export type AppScreen = 'home' | 'play' | 'garden' | 'rewards' | 'profile';

export type DifficultyLabel = 'Easy' | 'Normal' | 'Hard' | 'Expert' | 'Master';

export type GameMode = 'relaxed' | 'challenge' | 'expert' | 'master';

export type AppThemeId = 'botanical' | 'midnight' | 'sunset' | 'neon' | 'sakura' | 'royal';

export interface LifeState {
  count: number;
  lastRefillAt: number;
}

export interface DailyLoginRecord {
  lastClaimDate: string | null; // YYYY-MM-DD
  streak: number; // consecutive days claimed
  totalClaims: number;
  claimedDates: string[];
  lastRewardSummary?: string;
}

export interface DailyRewardTier {
  day: number; // 1..7
  label: string;
  rewardType: 'coins' | 'lives' | 'bundle';
  coins: number;
  lives: number;
  highlight?: boolean;
}

export interface CalculatedDailyReward {
  day: number;
  label: string;
  baseCoins: number;
  bonusCoins: number;
  totalCoins: number;
  lives: number;
  multiplier: number;
}

export interface FriendEntry {
  id: string;
  name: string;
  level: number;
  avatarColor: string;
  sentDates: Record<string, number>; // YYYY-MM-DD -> count sent today (max 2)
  receivedDates: Record<string, number>; // YYYY-MM-DD -> count received today (max 2)
}

export interface PlayerProgress {
  playerName: string;
  currentLevel: number;
  bestLevel: number;
  levelsCleared: number;
  completedLevels: Record<string, boolean>;
  levelStars: Record<string, number>;
  levelScores: Record<string, number>;
  coins: number;
  bestScore: number;
  score: number;
  totalMoves: number;
  lifeState: LifeState;
  achievements: Record<string, boolean>;
  collections: Record<string, boolean>;
  dailyClears: Record<string, boolean>;
  dailyChallengeStreak: number;
  perfectLevels: Record<string, boolean>;
  lastMode: GameMode;
  dailyLogin: DailyLoginRecord;
  friends: FriendEntry[];
}

export interface GameSettings {
  sfx: boolean;
  vibration: boolean;
  vibrationIntensity: number; // 10..100 percentage
  reduceMotion: boolean;
  showHints: boolean;
  autoAdvance: boolean;
  autoUpdate: boolean;
  mode: GameMode;
  theme: AppThemeId;
}

export interface WorldTheme {
  id: number;
  name: string;
  subtitle: string;
  levelStart: number;
  levelEnd: number;
  palette: {
    backdropFrom: string;
    backdropVia: string;
    backdropTo: string;
    hillFar: string;
    hillMid: string;
    hillNear: string;
    pathStroke: string;
    pathGlow: string;
    accent: string;
    badgeBg: string;
    badgeText: string;
  };
}

export type LevelTargetType = 'relaxed' | 'color' | 'time' | 'moves' | 'combo';

export interface GeneratedLevel {
  id: number;
  capacity: number;
  tubes: number[][];
  jarTargetColors: (number | null)[]; // non-null means this colored jar is locked to that single color only
  difficulty: DifficultyLabel;
  hasTimeLimit: boolean;
  hasMoveLimit: boolean;
  hasColoredJar: boolean;
  moveLimit: number;
  timeLimit: number; // seconds
  targetType: LevelTargetType;
  targetColorId: number | null;
  targetColorIds: number[];
  seed: number;
  isDaily?: boolean;
  dailyDate?: string;
}

export interface GardenPlant {
  id: string;
  name: string;
  unlockAt: number;
  description: string;
  accentColor: string;
}

export interface AchievementItem {
  id: string;
  title: string;
  target: number;
  rewardCoins: number;
}
