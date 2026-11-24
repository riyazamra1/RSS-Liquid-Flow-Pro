import {
  AchievementItem,
  DifficultyLabel,
  GardenPlant,
  GeneratedLevel,
  WorldTheme,
} from '../types/game';

/**
 * Bright, juicy candy-glossy liquid palette for 3D jars — vibrant, high-contrast, zero blue background conflict.
 */
export const LIQUID_COLORS: {
  id: number;
  name: string;
  hex: string;
  light: string;
  dark: string;
  glow: string;
}[] = [
  { id: 0, name: 'Ruby Red', hex: '#E01E37', light: '#FF7A8A', dark: '#8F0A1B', glow: 'rgba(224, 30, 55, 0.42)' },
  { id: 1, name: 'Emerald Green', hex: '#12A850', light: '#7CEBA8', dark: '#07632D', glow: 'rgba(18, 168, 80, 0.42)' },
  { id: 2, name: 'Sunburst Yellow', hex: '#FFD200', light: '#FFF49C', dark: '#C49200', glow: 'rgba(255, 210, 0, 0.44)' },
  { id: 3, name: 'Royal Purple', hex: '#7E2CE8', light: '#C79CFF', dark: '#4A0D9E', glow: 'rgba(126, 44, 232, 0.42)' },
  { id: 4, name: 'Jade Mint', hex: '#00A896', light: '#78EFE2', dark: '#006358', glow: 'rgba(0, 168, 150, 0.42)' },
  { id: 5, name: 'Rich Chocolate', hex: '#8A4B1E', light: '#C98B5E', dark: '#4F260A', glow: 'rgba(138, 75, 30, 0.42)' },
  { id: 6, name: 'Orchid Lavender', hex: '#E066C8', light: '#FFBDF2', dark: '#94247E', glow: 'rgba(224, 102, 200, 0.42)' },
  { id: 7, name: 'Lime Chartreuse', hex: '#8CD615', light: '#D6FA87', dark: '#4F8500', glow: 'rgba(140, 214, 21, 0.42)' },
];

export const WORLDS: WorldTheme[] = [
  {
    id: 1,
    name: 'Sunlit Gardens',
    subtitle: 'World 1 · Keep the flow going',
    levelStart: 1,
    levelEnd: 20,
    palette: {
      backdropFrom: '#FFFDF5',
      backdropVia: '#FBF3DF',
      backdropTo: '#F2E7CA',
      hillFar: '#E9DFC3',
      hillMid: '#D8E3C4',
      hillNear: '#C3D7A8',
      pathStroke: '#D8C7A8',
      pathGlow: '#E8A317',
      accent: '#2E8555',
      badgeBg: '#E6F2E9',
      badgeText: '#1F633D',
    },
  },
  {
    id: 2,
    name: 'Amber Terraces',
    subtitle: 'World 2 · Golden nectar streams',
    levelStart: 21,
    levelEnd: 40,
    palette: {
      backdropFrom: '#FFFBF2',
      backdropVia: '#FBEBD1',
      backdropTo: '#F5DAB5',
      hillFar: '#F0D5B2',
      hillMid: '#E9C394',
      hillNear: '#DFAD76',
      pathStroke: '#D9B996',
      pathGlow: '#E55A3C',
      accent: '#C96A1B',
      badgeBg: '#FCECD9',
      badgeText: '#96490C',
    },
  },
  {
    id: 3,
    name: 'Blossom Springs',
    subtitle: 'World 3 · Petal breeze pathways',
    levelStart: 41,
    levelEnd: 60,
    palette: {
      backdropFrom: '#FFF9F8',
      backdropVia: '#FCECE8',
      backdropTo: '#F6DBD5',
      hillFar: '#F1CFC9',
      hillMid: '#E8C5B8',
      hillNear: '#D7CCA8',
      pathStroke: '#DFC4BC',
      pathGlow: '#D93D59',
      accent: '#B83952',
      badgeBg: '#FCE6EA',
      badgeText: '#8E243B',
    },
  },
  {
    id: 4,
    name: 'Golden Orchard',
    subtitle: 'World 4 · Harvest summit trials',
    levelStart: 61,
    levelEnd: 80,
    palette: {
      backdropFrom: '#FCFBF3',
      backdropVia: '#F4F1DA',
      backdropTo: '#E8E4BE',
      hillFar: '#E3DFB6',
      hillMid: '#CFD59E',
      hillNear: '#B6C584',
      pathStroke: '#CFCAA3',
      pathGlow: '#D98E16',
      accent: '#6E7F1E',
      badgeBg: '#EEF2D8',
      badgeText: '#4B5911',
    },
  },
  {
    id: 5,
    name: 'Cinnamon Cliffs',
    subtitle: 'World 5 · Master artisan basins',
    levelStart: 81,
    levelEnd: 100,
    palette: {
      backdropFrom: '#FDF8F2',
      backdropVia: '#F7E7D8',
      backdropTo: '#EED5BF',
      hillFar: '#E6C6AC',
      hillMid: '#D9AF91',
      hillNear: '#C99878',
      pathStroke: '#D1B39C',
      pathGlow: '#D44D2B',
      accent: '#A33E22',
      badgeBg: '#F9E5DA',
      badgeText: '#7D2C16',
    },
  },
  {
    id: 6,
    name: 'Honeycomb Sanctuary',
    subtitle: 'World 6 · Grand liquid mastery',
    levelStart: 101,
    levelEnd: 120,
    palette: {
      backdropFrom: '#FFFDF3',
      backdropVia: '#FCF2CE',
      backdropTo: '#F5E2A6',
      hillFar: '#EDD698',
      hillMid: '#E4C57D',
      hillNear: '#D4B263',
      pathStroke: '#D6BF8B',
      pathGlow: '#C97B0C',
      accent: '#9E5D08',
      badgeBg: '#FBF0CC',
      badgeText: '#784505',
    },
  },
];

export function getWorldForLevel(level: number): WorldTheme {
  const worldIdx = Math.floor((Math.max(1, level) - 1) / 20);
  if (worldIdx < WORLDS.length) return WORLDS[worldIdx];
  const base = WORLDS[worldIdx % WORLDS.length];
  const worldNum = worldIdx + 1;
  return {
    ...base,
    id: worldNum,
    name: `${base.name} ${Math.floor(worldIdx / WORLDS.length) + 1}`,
    subtitle: `World ${worldNum} · Endless flow`,
    levelStart: (worldNum - 1) * 20 + 1,
    levelEnd: worldNum * 20,
  };
}

export function getDifficultyForLevel(level: number): DifficultyLabel {
  if (level === 1) return 'Easy';
  const h = hashString(`rss-diff-v2:${level}`);
  const roll = h % 100;
  if (level <= 4) {
    return roll < 55 ? 'Easy' : 'Normal';
  }
  if (level <= 12) {
    if (roll < 25) return 'Easy';
    if (roll < 62) return 'Normal';
    if (roll < 88) return 'Hard';
    return 'Expert';
  }
  // Randomized difficulty mix across higher levels so every stage feels surprising
  if (roll < 15) return 'Easy';
  if (roll < 40) return 'Normal';
  if (roll < 68) return 'Hard';
  if (roll < 88) return 'Expert';
  return 'Master';
}

export const GARDEN_PLANTS: GardenPlant[] = [
  { id: 'sprout', name: 'Dew Sprout', unlockAt: 0, description: 'Your very first garden shoot, awakened by Level 1.', accentColor: '#48AF75' },
  { id: 'herb', name: 'Golden Sage', unlockAt: 3, description: 'Fragrant sunlit herb unlocked after clearing 3 levels.', accentColor: '#5B9A58' },
  { id: 'tulip', name: 'Coral Tulip', unlockAt: 8, description: 'Warm coral blossom celebrating 8 completed stages.', accentColor: '#E55A3C' },
  { id: 'sunflower', name: 'Amber Sunflower', unlockAt: 15, description: 'Radiant sun-seeker unlocked at 15 cleared levels.', accentColor: '#E8A317' },
  { id: 'tree', name: 'Orchard Fig', unlockAt: 25, description: 'Shady sanctuary tree grown at 25 cleared levels.', accentColor: '#2E8555' },
  { id: 'palm', name: 'Terrace Palm', unlockAt: 40, description: 'Graceful warm oasis frond at 40 cleared levels.', accentColor: '#88A832' },
  { id: 'cactus', name: 'Sunburst Agave', unlockAt: 60, description: 'Sculptural desert jewel unlocked at 60 cleared levels.', accentColor: '#C96A1B' },
  { id: 'clover', name: 'Gilded Clover', unlockAt: 90, description: 'Rare master botanical emblem at 90 cleared levels.', accentColor: '#B8860B' },
];

export const ACHIEVEMENTS: AchievementItem[] = [
  { id: 'clear-1', title: 'First Pour', target: 1, rewardCoins: 25 },
  { id: 'clear-5', title: 'Garden Apprentice', target: 5, rewardCoins: 50 },
  { id: 'clear-10', title: 'Flow Weaver', target: 10, rewardCoins: 75 },
  { id: 'clear-25', title: 'Terrace Explorer', target: 25, rewardCoins: 150 },
  { id: 'clear-50', title: 'Nectar Artisan', target: 50, rewardCoins: 250 },
  { id: 'clear-100', title: 'Grand Liquid Master', target: 100, rewardCoins: 500 },
];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function isJarCompleteAndSealed(
  tubes: number[][],
  index: number,
  capacity: number,
  jarTargetColors?: (number | null)[]
): boolean {
  const tube = tubes[index];
  if (!tube || tube.length !== capacity) return false;
  const color = tube[0];
  if (!tube.every((c) => c === color)) return false;

  if (jarTargetColors) {
    const thisJarRequired = jarTargetColors[index] ?? null;
    if (thisJarRequired !== null) {
      return color === thisJarRequired;
    }
    // If this color has a dedicated Colored Target Jar elsewhere, keep clear jars unsealed
    // so the player can still pour the full stack into the required Colored Target Jar!
    const dedicatedIdx = jarTargetColors.findIndex((c) => c === color);
    if (dedicatedIdx !== -1 && dedicatedIdx !== index) {
      return false;
    }
  }
  return true;
}

export function isBoardSolved(
  tubes: number[][],
  capacity: number,
  jarTargetColors?: (number | null)[]
): boolean {
  const seen = new Set<number>();
  for (let i = 0; i < tubes.length; i++) {
    const tube = tubes[i];
    const requiredColor = jarTargetColors ? jarTargetColors[i] ?? null : null;

    // Every Colored Target Jar MUST finish full (5/5) with its exact matching color; otherwise incomplete!
    if (requiredColor !== null) {
      if (tube.length !== capacity || !tube.every((c) => c === requiredColor)) {
        return false;
      }
    }

    if (tube.length === 0) continue;
    if (tube.length !== capacity) return false;
    const c = tube[0];
    if (seen.has(c)) return false;
    for (let j = 1; j < tube.length; j++) {
      if (tube[j] !== c) return false;
    }
    seen.add(c);
  }
  return seen.size > 0;
}

export function canPour(
  tubes: number[][],
  from: number,
  to: number,
  capacity: number,
  jarTargetColors?: (number | null)[]
): boolean {
  if (from === to) return false;
  const src = tubes[from];
  const dst = tubes[to];
  if (!src || !dst || src.length === 0 || dst.length >= capacity) return false;

  // Completed sealed jars are locked and cannot be poured from or into
  if (isJarCompleteAndSealed(tubes, from, capacity, jarTargetColors)) return false;
  if (isJarCompleteAndSealed(tubes, to, capacity, jarTargetColors)) return false;

  const pourColor = src[src.length - 1];

  // Colored Target Jar is strictly locked to ONLY its single assigned color
  const dstRequiredColor = jarTargetColors ? jarTargetColors[to] ?? null : null;
  if (dstRequiredColor !== null && pourColor !== dstRequiredColor) {
    return false;
  }

  if (dst.length === 0) return true;
  return dst[dst.length - 1] === pourColor;
}

/**
 * Analyzes whether the current board has any legal pours and whether at least one
 * move can actually make productive progress (combining stacks, filling a Colored
 * Target Jar, or uncovering a hidden color in a mixed jar).
 */
export function analyzeBoardMoves(
  tubes: number[][],
  capacity: number,
  jarTargetColors?: (number | null)[]
): { hasAnyLegalMove: boolean; hasProductiveMove: boolean } {
  let hasAnyLegalMove = false;
  let hasProductiveMove = false;

  for (let from = 0; from < tubes.length; from++) {
    const src = tubes[from];
    if (!src || src.length === 0) continue;
    const srcIsMono = src.every((c) => c === src[0]);

    for (let to = 0; to < tubes.length; to++) {
      if (!canPour(tubes, from, to, capacity, jarTargetColors)) continue;
      hasAnyLegalMove = true;

      const dst = tubes[to];
      const dstIsTargetJar = Boolean(jarTargetColors && jarTargetColors[to] !== null);
      // Productive if combining onto existing liquid, pouring into a locked Colored Target Jar,
      // or pouring off the top of a mixed jar into an empty jar to uncover the color below.
      if (dst.length > 0 || dstIsTargetJar || !srcIsMono) {
        hasProductiveMove = true;
        return { hasAnyLegalMove: true, hasProductiveMove: true };
      }
    }
  }

  return { hasAnyLegalMove, hasProductiveMove };
}

function colorCountForDifficulty(diff: DifficultyLabel, rng: () => number): number {
  switch (diff) {
    case 'Easy':
      return 3;
    case 'Normal':
      return 4;
    case 'Hard':
      return rng() < 0.5 ? 4 : 5;
    case 'Expert':
      return 5;
    case 'Master':
      return 6;
  }
}

export function getDifficultyConstraints(
  levelId: number,
  difficulty: DifficultyLabel,
  isDaily = false
): {
  hasTimeLimit: boolean;
  hasMoveLimit: boolean;
  hasColoredJar: boolean;
  targetType: GeneratedLevel['targetType'];
} {
  if (isDaily) {
    return {
      hasTimeLimit: true,
      hasMoveLimit: true,
      hasColoredJar: true,
      targetType: 'combo',
    };
  }

  const variant = hashString(`rss-constraint:${levelId}`) % 2;

  switch (difficulty) {
    case 'Easy':
      // Easy levels are relaxed: no timer, no move cap, no locked colored jar
      return {
        hasTimeLimit: false,
        hasMoveLimit: false,
        hasColoredJar: false,
        targetType: 'relaxed',
      };
    case 'Normal':
      // Normal levels introduce ONE constraint (either Move Limit OR Time Limit)
      return variant === 0
        ? {
            hasTimeLimit: false,
            hasMoveLimit: true,
            hasColoredJar: false,
            targetType: 'moves',
          }
        : {
            hasTimeLimit: true,
            hasMoveLimit: false,
            hasColoredJar: false,
            targetType: 'time',
          };
    case 'Hard':
      // Hard levels introduce a Colored Target Jar paired with either Move Limit or Time Limit
      return variant === 0
        ? {
            hasTimeLimit: false,
            hasMoveLimit: true,
            hasColoredJar: true,
            targetType: 'color',
          }
        : {
            hasTimeLimit: true,
            hasMoveLimit: false,
            hasColoredJar: true,
            targetType: 'color',
          };
    case 'Expert':
    case 'Master':
      // Expert & Master levels engage Time Limit, Move Limit, and a Colored Target Jar
      return {
        hasTimeLimit: true,
        hasMoveLimit: true,
        hasColoredJar: true,
        targetType: 'combo',
      };
  }
}

/**
 * Generates a guaranteed-solvable Liquid Flow level with:
 * - 5 units per jar (75% max fill, 25% empty)
 * - Randomized difficulty determining whether Time Limit, Move Limit, and Colored Target Jar apply
 */
export function generateLevel(levelId: number, isDaily = false, dailyDate?: string): GeneratedLevel {
  const capacity = 5;
  const seed = isDaily && dailyDate
    ? hashString(`rss-liquid-flow:${dailyDate}`)
    : ((levelId * 2654435761) >>> 0) ^ 0x9e3779b9;
  const rng = mulberry32(seed);

  const difficulty: DifficultyLabel = isDaily
    ? (['Normal', 'Hard', 'Expert'][seed % 3] as DifficultyLabel)
    : getDifficultyForLevel(levelId);

  const { hasTimeLimit, hasMoveLimit, hasColoredJar, targetType } = getDifficultyConstraints(
    levelId,
    difficulty,
    isDaily
  );

  const colorCount = colorCountForDifficulty(difficulty, rng);
  // Keep total jars <= 9 (max 10 with unlocked AD extra jar -> max 2 centered rows of 5)
  const universalEmptyCount = hasColoredJar
    ? colorCount <= 3
      ? 1
      : 2
    : 2;

  const allBeads: number[] = [];
  for (let c = 0; c < colorCount; c++) {
    for (let u = 0; u < capacity; u++) {
      allBeads.push(c);
    }
  }

  const shufflePasses = difficulty === 'Easy' ? 1 : difficulty === 'Normal' ? 2 : 4;
  for (let pass = 0; pass < shufflePasses; pass++) {
    for (let i = allBeads.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [allBeads[i], allBeads[j]] = [allBeads[j], allBeads[i]];
    }
  }

  const finalTubes: number[][] = [];
  const jarTargetColors: (number | null)[] = [];

  for (let i = 0; i < colorCount; i++) {
    finalTubes.push(allBeads.slice(i * capacity, (i + 1) * capacity));
    jarTargetColors.push(null);
  }

  // Ensure no starting jar is already monochrome 5/5
  for (let i = 0; i < colorCount; i++) {
    const t = finalTubes[i];
    if (t.every((c) => c === t[0])) {
      const swapWith = (i + 1) % colorCount;
      const tmp = t[capacity - 1];
      t[capacity - 1] = finalTubes[swapWith][capacity - 1];
      finalTubes[swapWith][capacity - 1] = tmp;
    }
  }

  // Pick a locked color ONLY when this level's difficulty includes a Colored Target Jar
  const lockedColorId = hasColoredJar ? Math.floor(rng() * colorCount) : null;

  // Add universal empty clear glass jar(s)
  for (let e = 0; e < universalEmptyCount; e++) {
    finalTubes.push([]);
    jarTargetColors.push(null);
  }

  // Add the dedicated Colored Target Jar only when enabled for this difficulty
  if (hasColoredJar && lockedColorId !== null) {
    finalTubes.push([]);
    jarTargetColors.push(lockedColorId);
  }

  // Compute realistic tight move limit directly from actual starting color runs in the board
  let startingRuns = 0;
  for (let i = 0; i < colorCount; i++) {
    const t = finalTubes[i];
    if (t.length === 0) continue;
    startingRuns += 1;
    for (let u = 1; u < t.length; u++) {
      if (t[u] !== t[u - 1]) startingRuns += 1;
    }
  }
  const extraRunsToSeparate = Math.max(colorCount * 2, startingRuns - colorCount);
  const difficultyBuffer =
    difficulty === 'Easy'
      ? 4
      : difficulty === 'Normal'
      ? 3
      : difficulty === 'Hard'
      ? 3
      : 2;
  const moveLimit = Math.max(
    colorCount * 2 + 4,
    Math.min(colorCount * 4 + 4, extraRunsToSeparate + difficultyBuffer + (hasColoredJar ? 2 : 0))
  );

  const timeLimit =
    difficulty === 'Easy'
      ? 60
      : difficulty === 'Normal'
      ? 75
      : difficulty === 'Hard'
      ? 90
      : difficulty === 'Expert'
      ? 105
      : 120;

  const allColorIds = Array.from({ length: colorCount }, (_, idx) => idx);
  const targetColorIds =
    lockedColorId !== null
      ? [lockedColorId, ...allColorIds.filter((c) => c !== lockedColorId)]
      : allColorIds;

  return {
    id: levelId,
    capacity,
    tubes: finalTubes,
    jarTargetColors,
    difficulty,
    hasTimeLimit,
    hasMoveLimit,
    hasColoredJar,
    moveLimit,
    timeLimit,
    targetType,
    targetColorId: lockedColorId,
    targetColorIds,
    seed,
    isDaily,
    dailyDate,
  };
}

export interface LevelScoreBreakdown {
  stars: number;
  completeStar: boolean;
  timeBalanceStar: boolean;
  movesBalanceStar: boolean;
  remainingTimeSec: number;
  remainingMoves: number;
  baseScore: number;
  timeScore: number;
  movesScore: number;
  totalScore: number;
}

/**
 * Exact 3-Star Policy & Score Conversion:
 * - Star 1: Level Complete (always 1 star on clear)
 * - Star 2: Time Balance (1 star if remaining time > 0)
 * - Star 3: Moves Balance (1 star if remaining moves > 0)
 * - Remaining time (×10 pts/sec) + remaining moves (×25 pts/move) convert directly into Level Score.
 */
export function evaluateLevelResult(
  movesUsed: number,
  moveBudget: number,
  remainingTimeSec: number
): LevelScoreBreakdown {
  const safeRemainingTime = Math.max(0, Math.floor(remainingTimeSec));
  const safeRemainingMoves = Math.max(0, Math.floor(moveBudget - movesUsed));

  const completeStar = true;
  const timeBalanceStar = safeRemainingTime > 0;
  const movesBalanceStar = safeRemainingMoves > 0;

  const stars =
    (completeStar ? 1 : 0) + (timeBalanceStar ? 1 : 0) + (movesBalanceStar ? 1 : 0);

  const baseScore = 100;
  const timeScore = safeRemainingTime * 10;
  const movesScore = safeRemainingMoves * 25;
  const totalScore = baseScore + timeScore + movesScore;

  return {
    stars,
    completeStar,
    timeBalanceStar,
    movesBalanceStar,
    remainingTimeSec: safeRemainingTime,
    remainingMoves: safeRemainingMoves,
    baseScore,
    timeScore,
    movesScore,
    totalScore,
  };
}

export function calculateStars(moves: number, moveLimit: number, remainingTimeSec = 1): number {
  return evaluateLevelResult(moves, moveLimit, remainingTimeSec).stars;
}

export function getLevelObjectiveText(level: number): string {
  const diff = getDifficultyForLevel(level);
  const c = getDifficultyConstraints(level, diff, false);
  const parts: string[] = [];
  if (c.hasColoredJar) parts.push('Colored Jar');
  if (c.hasTimeLimit) parts.push('Timed');
  if (c.hasMoveLimit) parts.push('Move Limit');
  return `${diff} · ${parts.length > 0 ? parts.join(' + ') : 'Relaxed Sort'}`;
}
