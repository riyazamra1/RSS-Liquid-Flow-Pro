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

export interface DailyMissionProgress {
  dateKey: string; // YYYY-MM-DD
  levelsSolved: number;
  coinsEarned: number;
  livesGifted: number;
  claimedMissionIds: string[];
}

export type SpinWheelCategory = 'coins' | 'gift' | 'luck';

export interface SpinWheelSegment {
  id: string;
  label: string;
  shortLabel: string;
  category: SpinWheelCategory;
  coins: number;
  lives: number;
  weight: number;
  color: string;
  textColor: string;
}

export interface SpinWheelRecord {
  lastFreeSpinDate: string | null; // YYYY-MM-DD
  lastSpinDate?: string | null; // YYYY-MM-DD
  spinsToday?: number; // 0..3 daily spins used on lastSpinDate
  totalSpins: number;
  lastOutcomeLabel?: string;
}

export interface DailyMissionDefinition {
  id: 'solve_levels' | 'earn_coins' | 'gift_lives';
  title: string;
  description: string;
  metric: 'levelsSolved' | 'coinsEarned' | 'livesGifted';
  target: number;
  rewardCoins: number;
  rewardXp: number;
}

export type SocialAchievementMetric =
  | 'totalFriendsAdded'
  | 'totalLivesSent'
  | 'totalLivesClaimed'
  | 'totalShares';

export type SocialBadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface SocialAchievementDefinition {
  id: string;
  title: string;
  milestoneLabel: string;
  description: string;
  metric: SocialAchievementMetric;
  target: number;
  rewardCoins: number;
  rewardXp: number;
  tier: SocialBadgeTier;
  icon: 'user-plus' | 'users' | 'crown' | 'heart' | 'send' | 'handshake' | 'gift' | 'share';
}

export interface SocialStats {
  totalLivesSent: number;
  totalLivesClaimed: number;
  totalFriendsAdded: number;
  totalShares: number;
  claimedBadgeIds: string[];
}

export interface PlayerProgress {
  playerName: string;
  currentLevel: number;
  bestLevel: number;
  levelsCleared: number;
  completedLevels: Record<string, boolean>;
  levelStars: Record<string, number>;
  levelScores: Record<string, number>;
  levelBestTimes: Record<string, number>;
  levelBestMoves: Record<string, number>;
  coins: number;
  xp: number;
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
  dailyMissions: DailyMissionProgress;
  spinWheel: SpinWheelRecord;
  friends: FriendEntry[];
  socialStats: SocialStats;
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
