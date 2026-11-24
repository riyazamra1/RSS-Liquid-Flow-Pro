import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Clock,
  Coins,
  FastForward,
  Footprints,
  Heart,
  Lightbulb,
  Lock,
  PlusCircle,
  RotateCcw,
  Shuffle,
  Sparkles,
  Star,
  Target,
  Tv,
  Undo2,
  X,
} from 'lucide-react';
import { GeneratedLevel, PlayerProgress } from '../types/game';
import {
  analyzeBoardMoves,
  calculateStars,
  canPour,
  generateLevel,
  isBoardSolved,
  isJarCompleteAndSealed,
  LIQUID_COLORS,
} from '../utils/levelGenerator';
import { soundFx } from '../utils/sound';
import { AnimatedDashboardBackdrop } from './AnimatedDashboardBackdrop';
import { VictoryConfetti } from './VictoryConfetti';

interface PuzzleScreenProps {
  levelId: number;
  isDaily: boolean;
  dailyDate?: string;
  progress: PlayerProgress;
  sfxEnabled: boolean;
  vibrationEnabled: boolean;
  vibrationIntensity: number;
  showHints: boolean;
  reduceMotion: boolean;
  onExit: () => void;
  onCompleteLevel: (payload: {
    levelId: number;
    isDaily: boolean;
    dailyDate?: string;
    moves: number;
    stars: number;
    scoreEarned: number;
    coinsEarned: number;
  }) => void;
  onSpendLifeForRetry: (levelId: number) => boolean;
  availableLives: number;
  onGrantAdLife: () => void;
  onNextLevel: (nextLevelId: number) => void;
  onToast: (message: string) => void;
}

interface PourAnimationState {
  id: number;
  fromIdx: number;
  toIdx: number;
  colorId: number;
  pouredUnits: number;
  phase: 'glide' | 'pouring' | 'returning';
  dx: number;
  dy: number;
  tiltDeg: number;
  streamX: number;
  streamTopY: number;
  streamBottomY: number;
  pourDir: 1 | -1;
  speedMultiplier: 1 | 2;
}

type AdPurpose = 'extra-jar' | 'extra-time' | 'extra-moves' | 'extra-life';

function buildCenteredRows<T>(items: T[], maxPerRow = 5): T[][] {
  if (items.length <= maxPerRow) return [items];
  const rowCount = Math.ceil(items.length / maxPerRow);
  const baseSize = Math.floor(items.length / rowCount);
  const extra = items.length % rowCount;
  const rows: T[][] = [];
  let cursor = 0;
  for (let r = 0; r < rowCount; r++) {
    const len = Math.min(maxPerRow, baseSize + (r < extra ? 1 : 0));
    rows.push(items.slice(cursor, cursor + len));
    cursor += len;
  }
  return rows;
}

function formatSeconds(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export const PuzzleScreen: React.FC<PuzzleScreenProps> = ({
  levelId,
  isDaily,
  dailyDate,
  progress,
  sfxEnabled,
  vibrationEnabled,
  vibrationIntensity,
  showHints,
  reduceMotion,
  onExit,
  onCompleteLevel,
  onSpendLifeForRetry,
  availableLives,
  onGrantAdLife,
  onNextLevel,
  onToast,
}) => {
  const levelData: GeneratedLevel = useMemo(
    () => generateLevel(levelId, isDaily, dailyDate),
    [levelId, isDaily, dailyDate]
  );

  const [tubes, setTubes] = useState<number[][]>(() => levelData.tubes.map((t) => [...t]));
  const [jarTargetColors, setJarTargetColors] = useState<(number | null)[]>(() => [
    ...levelData.jarTargetColors,
  ]);
  const [history, setHistory] = useState<number[][][]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [moveBudget, setMoveBudget] = useState(levelData.moveLimit);
  const [timeLeft, setTimeLeft] = useState(levelData.timeLimit);
  const [hintPair, setHintPair] = useState<[number, number] | null>(null);
  const [extraJarUnlocked, setExtraJarUnlocked] = useState(false);
  const [justUnlockedExtra, setJustUnlockedExtra] = useState(false);
  const [adPurpose, setAdPurpose] = useState<AdPurpose | null>(null);
  const [adSecondsLeft, setAdSecondsLeft] = useState(3);
  const [fastForward, setFastForward] = useState(false);
  const [shakeIdx, setShakeIdx] = useState<number | null>(null);
  const [pourAnim, setPourAnim] = useState<PourAnimationState | null>(null);
  const [failReason, setFailReason] = useState<'time' | 'moves' | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [stuckReason, setStuckReason] = useState<'no-moves' | 'impossible' | null>(null);
  const [dismissedStuckSig, setDismissedStuckSig] = useState<string | null>(null);
  const [victoryInfo, setVictoryInfo] = useState<{
    stars: number;
    coinsEarned: number;
    scoreEarned: number;
  } | null>(null);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const jarRefs = useRef<Map<number, HTMLButtonElement | null>>(new Map());
  const timersRef = useRef<number[]>([]);
  const pourIdCounter = useRef(0);

  const clearPourTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    clearPourTimers();
    setPourAnim(null);
    setTubes(levelData.tubes.map((t) => [...t]));
    setJarTargetColors([...levelData.jarTargetColors]);
    setHistory([]);
    setSelected(null);
    setMoves(0);
    setMoveBudget(levelData.moveLimit);
    setTimeLeft(levelData.timeLimit);
    setHintPair(null);
    setExtraJarUnlocked(false);
    setJustUnlockedExtra(false);
    setAdPurpose(null);
    setFailReason(null);
    setResetConfirmOpen(false);
    setStuckReason(null);
    setDismissedStuckSig(null);
    setShakeIdx(null);
    setVictoryInfo(null);
  }, [levelData, clearPourTimers]);

  useEffect(() => {
    return () => clearPourTimers();
  }, [clearPourTimers]);

  const boardSignature = useMemo(
    () => `${tubes.map((t) => t.join(',')).join('|')}::${jarTargetColors.join(',')}`,
    [tubes, jarTargetColors]
  );

  // Detect no valid moves or impossible-to-complete deadlocks after every board change
  useEffect(() => {
    if (victoryInfo || failReason || pourAnim || adPurpose || resetConfirmOpen) {
      return;
    }
    if (isBoardSolved(tubes, levelData.capacity, jarTargetColors)) {
      setStuckReason(null);
      return;
    }
    const { hasAnyLegalMove, hasProductiveMove } = analyzeBoardMoves(
      tubes,
      levelData.capacity,
      jarTargetColors
    );
    if (!hasAnyLegalMove || !hasProductiveMove) {
      if (dismissedStuckSig !== boardSignature) {
        setStuckReason(!hasAnyLegalMove ? 'no-moves' : 'impossible');
      }
    } else {
      setStuckReason(null);
    }
  }, [
    tubes,
    jarTargetColors,
    levelData.capacity,
    boardSignature,
    dismissedStuckSig,
    victoryInfo,
    failReason,
    pourAnim,
    adPurpose,
    resetConfirmOpen,
  ]);

  // Vibration API haptic helper (scaled by user-configured vibration intensity)
  const triggerHaptic = useCallback(
    (pattern: number | number[]) => {
      if (
        !vibrationEnabled ||
        typeof navigator === 'undefined' ||
        typeof navigator.vibrate !== 'function'
      ) {
        return;
      }
      const clamped = Math.max(10, Math.min(100, vibrationIntensity));
      const scale = 0.35 + (clamped / 100) * 1.15; // 10% -> 0.46x gentle, 70% -> 1.15x, 100% -> 1.5x strong
      const scaledPattern = Array.isArray(pattern)
        ? pattern.map((ms, idx) =>
            idx % 2 === 0 ? Math.max(5, Math.round(ms * scale)) : ms
          )
        : Math.max(5, Math.round(pattern * scale));
      try {
        navigator.vibrate(scaledPattern);
      } catch {
        // Ignore on browsers that restrict vibration without gesture
      }
    },
    [vibrationEnabled, vibrationIntensity]
  );

  // Live level countdown timer (ONLY active when this difficulty includes a time limit)
  useEffect(() => {
    if (
      !levelData.hasTimeLimit ||
      victoryInfo ||
      failReason ||
      adPurpose ||
      resetConfirmOpen ||
      stuckReason
    ) {
      return;
    }
    if (timeLeft <= 0) {
      soundFx.locked(sfxEnabled);
      setFailReason('time');
      return;
    }
    const id = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          soundFx.locked(sfxEnabled);
          setFailReason('time');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [
    levelData.hasTimeLimit,
    victoryInfo,
    failReason,
    adPurpose,
    resetConfirmOpen,
    stuckReason,
    timeLeft,
    sfxEnabled,
  ]);

  // Rewarded Ad countdown timer (ONLY runs after player explicitly clicks Watch Ad)
  useEffect(() => {
    if (!adPurpose) return;
    if (adSecondsLeft <= 0) return;
    const t = window.setTimeout(() => {
      setAdSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearTimeout(t);
  }, [adPurpose, adSecondsLeft]);

  // Play pouring audio + start haptic pulse the moment liquid starts moving
  useEffect(() => {
    if (pourAnim && pourAnim.phase === 'pouring') {
      const pourSoundMs = Math.round(270 / pourAnim.speedMultiplier);
      soundFx.pouring(sfxEnabled, pourSoundMs, pourAnim.pouredUnits);
      triggerHaptic(16);
    }
  }, [
    pourAnim?.id,
    pourAnim?.phase,
    pourAnim?.pouredUnits,
    pourAnim?.speedMultiplier,
    sfxEnabled,
    triggerHaptic,
  ]);

  const triggerShake = useCallback((idx: number) => {
    setShakeIdx(idx);
    window.setTimeout(() => {
      setShakeIdx((curr) => (curr === idx ? null : curr));
    }, 320);
  }, []);

  const checkBoardOutcome = useCallback(
    (nextBoard: number[][], nextMoves: number, targetsMap: (number | null)[]) => {
      // Final color inside every Colored Target Jar MUST match its locked color,
      // and all jars must be cleanly sorted — otherwise the level remains incomplete!
      const won = isBoardSolved(nextBoard, levelData.capacity, targetsMap);

      if (won) {
        const stars = calculateStars(nextMoves, moveBudget);
        const alreadyCleared = isDaily
          ? Boolean(dailyDate && progress.dailyClears[dailyDate])
          : Boolean(progress.completedLevels[String(levelId)]);
        const coinsEarned =
          (isDaily
            ? alreadyCleared
              ? 0
              : 25
            : alreadyCleared
            ? 10
            : 20 + stars * 10) + 15;
        const scoreEarned = Math.max(
          120,
          (moveBudget - nextMoves + 10) * 25 +
            stars * 100 +
            (levelData.hasTimeLimit ? timeLeft * 2 : 0)
        );

        soundFx.victory(sfxEnabled);
        triggerHaptic([25, 40, 25, 40, 45]);
        setVictoryInfo({ stars, coinsEarned, scoreEarned });
        onCompleteLevel({
          levelId,
          isDaily,
          dailyDate,
          moves: nextMoves,
          stars,
          scoreEarned,
          coinsEarned,
        });
        return;
      }

      if (levelData.hasMoveLimit && nextMoves >= moveBudget) {
        soundFx.locked(sfxEnabled);
        setFailReason('moves');
      }
    },
    [
      dailyDate,
      isDaily,
      levelData.capacity,
      levelData.hasMoveLimit,
      levelData.hasTimeLimit,
      levelId,
      moveBudget,
      onCompleteLevel,
      progress.completedLevels,
      progress.dailyClears,
      sfxEnabled,
      timeLeft,
      triggerHaptic,
    ]
  );

  const resetBoardFresh = useCallback(() => {
    clearPourTimers();
    setPourAnim(null);
    setTubes(levelData.tubes.map((t) => [...t]));
    setJarTargetColors([...levelData.jarTargetColors]);
    setHistory([]);
    setMoves(0);
    setMoveBudget(levelData.moveLimit);
    setTimeLeft(levelData.timeLimit);
    setFailReason(null);
    setResetConfirmOpen(false);
    setStuckReason(null);
    setDismissedStuckSig(null);
    setSelected(null);
    setHintPair(null);
    setExtraJarUnlocked(false);
    soundFx.tap(sfxEnabled);
  }, [clearPourTimers, levelData, sfxEnabled]);

  const handleOpenWatchAd = (purpose: AdPurpose) => {
    if (purpose === 'extra-jar' && extraJarUnlocked) return;
    if (victoryInfo || pourAnim) return;
    soundFx.tap(sfxEnabled);
    setResetConfirmOpen(false);
    setStuckReason(null);
    setAdSecondsLeft(3);
    setAdPurpose(purpose);
  };

  const handleClaimAdReward = () => {
    if (adSecondsLeft > 0 || !adPurpose) return;
    const purpose = adPurpose;
    setAdPurpose(null);

    if (purpose === 'extra-jar' && !extraJarUnlocked) {
      setHistory((h) => [...h, tubes.map((t) => [...t])]);
      setTubes((prev) => [...prev, []]);
      setJarTargetColors((prev) => [...prev, null]);
      setExtraJarUnlocked(true);
      setJustUnlockedExtra(true);
      setStuckReason(null);
      setDismissedStuckSig(null);
      soundFx.reward(sfxEnabled);
      window.setTimeout(() => setJustUnlockedExtra(false), 600);
    } else if (purpose === 'extra-time') {
      setTimeLeft((t) => t + 30);
      setFailReason(null);
      soundFx.reward(sfxEnabled);
    } else if (purpose === 'extra-moves') {
      setMoveBudget((m) => m + 5);
      setFailReason(null);
      soundFx.reward(sfxEnabled);
    } else if (purpose === 'extra-life') {
      onGrantAdLife();
      resetBoardFresh();
      soundFx.reward(sfxEnabled);
    }
  };

  const handleTubeClick = (index: number) => {
    if (victoryInfo || failReason || pourAnim || resetConfirmOpen || stuckReason) return;
    setHintPair(null);

    const clickedTube = tubes[index];
    if (!clickedTube) return;

    if (isJarCompleteAndSealed(tubes, index, levelData.capacity, jarTargetColors)) {
      soundFx.locked(sfxEnabled);
      triggerShake(index);
      setSelected(null);
      return;
    }

    if (selected === null) {
      if (clickedTube.length === 0) {
        soundFx.locked(sfxEnabled);
        triggerShake(index);
        return;
      }
      soundFx.tap(sfxEnabled);
      setSelected(index);
      return;
    }

    if (selected === index) {
      soundFx.tap(sfxEnabled);
      setSelected(null);
      return;
    }

    if (canPour(tubes, selected, index, levelData.capacity, jarTargetColors)) {
      const fromIdx = selected;
      const toIdx = index;
      const prevSnapshot = tubes.map((t) => [...t]);
      const next = tubes.map((t) => [...t]);
      const src = next[fromIdx];
      const dst = next[toIdx];
      const topColor = src[src.length - 1];
      const dstInitialLen = dst.length;

      let pouredUnits = 0;
      while (
        src.length > 0 &&
        src[src.length - 1] === topColor &&
        dst.length < levelData.capacity
      ) {
        dst.push(src.pop()!);
        pouredUnits += 1;
      }

      const targetJustSealed = isJarCompleteAndSealed(
        next,
        toIdx,
        levelData.capacity,
        jarTargetColors
      );
      const nextMoves = moves + 1;
      const willWin = isBoardSolved(next, levelData.capacity, jarTargetColors);

      const prefersReduced =
        reduceMotion ||
        (typeof window !== 'undefined' &&
          window.matchMedia &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches);

      const boardEl = boardRef.current;
      const srcEl = jarRefs.current.get(fromIdx);
      const dstEl = jarRefs.current.get(toIdx);

      if (prefersReduced || !boardEl || !srcEl || !dstEl) {
        setHistory((h) => [...h, prevSnapshot]);
        setTubes(next);
        setMoves(nextMoves);
        setSelected(null);
        soundFx.pouring(sfxEnabled, fastForward ? 110 : 200, pouredUnits);
        triggerHaptic(16);
        if (targetJustSealed && !willWin) {
          soundFx.jarComplete(sfxEnabled);
          triggerHaptic([24, 35, 36]);
        }
        checkBoardOutcome(next, nextMoves, jarTargetColors);
        return;
      }

      const boardRect = boardEl.getBoundingClientRect();
      const srcRect = srcEl.getBoundingClientRect();
      const dstRect = dstEl.getBoundingClientRect();

      const restingSrcTop = srcRect.top + 16;
      const srcCenterX = srcRect.left + srcRect.width / 2 - boardRect.left;
      const srcCenterY = restingSrcTop + srcRect.height / 2 - boardRect.top;

      const dstCenterX = dstRect.left + dstRect.width / 2 - boardRect.left;
      const dstTopY = dstRect.top - boardRect.top;

      const pourDir: 1 | -1 = srcCenterX <= dstCenterX ? 1 : -1;
      const tiltDeg = pourDir * 60;
      const rad = (tiltDeg * Math.PI) / 180;

      const halfW = srcRect.width / 2;
      const halfH = srcRect.height / 2;
      const lipLocalX = pourDir * (halfW - 6);
      const lipLocalY = -halfH + 4;
      const rotatedLipX = lipLocalX * Math.cos(rad) - lipLocalY * Math.sin(rad);
      const rotatedLipY = lipLocalX * Math.sin(rad) + lipLocalY * Math.cos(rad);

      const targetSpoutX = dstCenterX - pourDir * 3;
      const targetSpoutY = dstTopY - 12;

      const dx = targetSpoutX - (srcCenterX + rotatedLipX);
      const dy = targetSpoutY - (srcCenterY + rotatedLipY);

      const innerPad = 4;
      const innerHeight = dstRect.height - innerPad * 2;
      const fillZoneHeight = innerHeight * 0.75;
      const targetFillRatio = Math.min(
        1,
        (dstInitialLen + pouredUnits * 0.55) / levelData.capacity
      );
      const streamBottomY =
        dstTopY + dstRect.height - innerPad - fillZoneHeight * targetFillRatio;

      pourIdCounter.current += 1;
      const animId = pourIdCounter.current;
      const speedMultiplier: 1 | 2 = fastForward ? 2 : 1;
      const glideMs = Math.round(130 / speedMultiplier);
      const returnAtMs = Math.round(400 / speedMultiplier);
      const doneAtMs = Math.round(520 / speedMultiplier);

      setSelected(null);
      setHistory((h) => [...h, prevSnapshot]);
      setMoves(nextMoves);

      setPourAnim({
        id: animId,
        fromIdx,
        toIdx,
        colorId: topColor,
        pouredUnits,
        phase: 'glide',
        dx,
        dy,
        tiltDeg,
        streamX: dstCenterX,
        streamTopY: targetSpoutY + 2,
        streamBottomY,
        pourDir,
        speedMultiplier,
      });

      const tPour = window.setTimeout(() => {
        setPourAnim((prev) => (prev ? { ...prev, phase: 'pouring' } : null));
      }, glideMs);

      const tReturn = window.setTimeout(() => {
        setTubes(next);
        if (willWin) {
          setPourAnim(null);
          checkBoardOutcome(next, nextMoves, jarTargetColors);
          return;
        }
        if (targetJustSealed) {
          soundFx.jarComplete(sfxEnabled);
          triggerHaptic([24, 35, 36]);
        } else {
          // Short haptic pulse when liquid pouring stops
          triggerHaptic(12);
        }
        setPourAnim((prev) => (prev ? { ...prev, phase: 'returning' } : null));
      }, returnAtMs);

      const tDone = window.setTimeout(() => {
        if (willWin) return;
        setPourAnim(null);
        checkBoardOutcome(next, nextMoves, jarTargetColors);
      }, doneAtMs);

      timersRef.current = [tPour, tReturn, tDone];
    } else {
      // Check if blocked specifically because the target jar is color-locked to another color
      const dstLockedColor = jarTargetColors[index] ?? null;
      const srcTopColor = tubes[selected]?.[tubes[selected].length - 1];
      if (dstLockedColor !== null && srcTopColor !== undefined && srcTopColor !== dstLockedColor) {
        const colName = LIQUID_COLORS[dstLockedColor % LIQUID_COLORS.length].name;
        soundFx.locked(sfxEnabled);
        triggerShake(index);
        onToast(`${colName} only`);
        return;
      }

      if (
        clickedTube.length > 0 &&
        !isJarCompleteAndSealed(tubes, index, levelData.capacity, jarTargetColors)
      ) {
        soundFx.tap(sfxEnabled);
        setSelected(index);
      } else {
        soundFx.locked(sfxEnabled);
        triggerShake(index);
        setSelected(null);
      }
    }
  };

  const handleUndo = () => {
    if (history.length === 0 || victoryInfo || failReason || pourAnim) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setTubes(prev);
    // Keep jarTargetColors synced if Undo reverted the extra jar addition
    if (prev.length < jarTargetColors.length) {
      setJarTargetColors((cols) => cols.slice(0, prev.length));
      setExtraJarUnlocked(false);
    }
    setMoves((m) => Math.max(0, m - 1));
    setSelected(null);
    setHintPair(null);
    soundFx.tap(sfxEnabled);
  };

  const isFreeRetry = isDaily || Boolean(progress.completedLevels[String(levelId)]) || moves === 0;
  const needsLifeForRetry = !isFreeRetry;
  const hasLifeForRetry = !needsLifeForRetry || availableLives > 0;

  const handleRequestReset = () => {
    if (victoryInfo || pourAnim) return;
    soundFx.tap(sfxEnabled);
    setResetConfirmOpen(true);
  };

  const handleConfirmRestart = () => {
    if (victoryInfo || pourAnim) return;
    if (needsLifeForRetry) {
      const ok = onSpendLifeForRetry(levelId);
      if (!ok) {
        soundFx.locked(sfxEnabled);
        onToast('No lives left — watch an ad for +1 life');
        return;
      }
    }
    resetBoardFresh();
  };

  const handleContinueTrying = () => {
    soundFx.tap(sfxEnabled);
    setDismissedStuckSig(boardSignature);
    setStuckReason(null);
  };

  const handleHint = () => {
    if (!showHints || victoryInfo || failReason || pourAnim) return;
    let fallback: [number, number] | null = null;
    for (let f = 0; f < tubes.length; f++) {
      const src = tubes[f];
      if (
        src.length === 0 ||
        isJarCompleteAndSealed(tubes, f, levelData.capacity, jarTargetColors)
      ) {
        continue;
      }
      const isMono = src.every((c) => c === src[0]);
      for (let t = 0; t < tubes.length; t++) {
        if (!canPour(tubes, f, t, levelData.capacity, jarTargetColors)) continue;
        // Prioritize pouring into matching Colored Target Jar!
        if (jarTargetColors[t] !== null && src[src.length - 1] === jarTargetColors[t]) {
          setHintPair([f, t]);
          setSelected(f);
          soundFx.tap(sfxEnabled);
          return;
        }
        if (tubes[t].length > 0) {
          setHintPair([f, t]);
          setSelected(f);
          soundFx.tap(sfxEnabled);
          return;
        }
        if (!isMono && !fallback) {
          fallback = [f, t];
        }
      }
    }
    if (fallback) {
      setHintPair(fallback);
      setSelected(fallback[0]);
      soundFx.tap(sfxEnabled);
    } else {
      onToast('Try Shuffle or +Jar');
    }
  };

  const handleShuffle = () => {
    if (victoryInfo || failReason || pourAnim) return;
    const prevSnapshot = tubes.map((t) => [...t]);
    const next = tubes.map((t) => [...t]);
    // Do not shuffle sealed jars OR color-locked jars (keep color-locked jars pure!)
    const movableIndices = next
      .map((t, idx) => ({ t, idx }))
      .filter(
        ({ idx }) =>
          jarTargetColors[idx] === null &&
          !isJarCompleteAndSealed(next, idx, levelData.capacity, jarTargetColors)
      );

    const pool: number[] = [];
    movableIndices.forEach(({ t }) => t.forEach((c) => pool.push(c)));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    let cursor = 0;
    movableIndices.forEach(({ idx }) => {
      const count = next[idx].length;
      next[idx] = pool.slice(cursor, cursor + count);
      cursor += count;
    });

    setHistory((h) => [...h, prevSnapshot]);
    setTubes(next);
    setSelected(null);
    setHintPair(null);
    soundFx.pouring(sfxEnabled, 220, 2);
  };

  const activePourColor = pourAnim
    ? LIQUID_COLORS[pourAnim.colorId % LIQUID_COLORS.length]
    : null;

  // Dynamic real-time progress toward every required colored jar in Level Targets
  const targetProgressList = useMemo(() => {
    const previewTubes =
      pourAnim && pourAnim.phase === 'pouring'
        ? tubes.map((t, idx) =>
            idx === pourAnim.toIdx
              ? [...t, ...Array(pourAnim.pouredUnits).fill(pourAnim.colorId)]
              : t
          )
        : tubes;

    return levelData.targetColorIds.map((colorId) => {
      const swatch = LIQUID_COLORS[colorId % LIQUID_COLORS.length];
      const dedicatedJarIdx = jarTargetColors.findIndex((c) => c === colorId);
      const isColorLockedJar = dedicatedJarIdx !== -1;

      let count = 0;
      let sealed = false;

      if (isColorLockedJar) {
        // Track exact fill progress inside the dedicated single-color Colored Target Jar!
        const targetTube = previewTubes[dedicatedJarIdx] || [];
        count = targetTube.filter((c) => c === colorId).length;
        sealed =
          targetTube.length === levelData.capacity &&
          targetTube.every((c) => c === colorId);
      } else {
        for (let i = 0; i < previewTubes.length; i++) {
          const tube = previewTubes[i];
          if (tube.length === 0) continue;
          if (tube.every((c) => c === colorId)) {
            count = Math.max(count, tube.length);
            if (tube.length >= levelData.capacity) sealed = true;
          }
        }
      }

      return {
        colorId,
        swatch,
        count: Math.min(levelData.capacity, count),
        sealed,
        isColorLockedJar,
        pct: Math.round((Math.min(levelData.capacity, count) / levelData.capacity) * 100),
      };
    });
  }, [tubes, pourAnim, levelData.targetColorIds, levelData.capacity, jarTargetColors]);

  const completedTargetsCount = targetProgressList.filter((t) => t.sealed).length;
  const movesLeft = Math.max(0, moveBudget - moves);

  type BoardSlot =
    | { kind: 'jar'; tubeIdx: number; tube: number[] }
    | { kind: 'locked-extra' };

  const boardSlots: BoardSlot[] = useMemo(() => {
    const list: BoardSlot[] = tubes.map((tube, tubeIdx) => ({
      kind: 'jar',
      tubeIdx,
      tube,
    }));
    if (!extraJarUnlocked) {
      list.push({ kind: 'locked-extra' });
    }
    return list;
  }, [tubes, extraJarUnlocked]);

  const centeredRows = useMemo(() => buildCenteredRows(boardSlots, 5), [boardSlots]);
  const isTwoRows = centeredRows.length > 1;
  // Bigger, sleeker sculpted glass bottle-jars while fitting cleanly inside fixed non-scrolling screen
  const jarSizeClass = isTwoRows
    ? 'w-[60px] sm:w-[76px] h-[156px] sm:h-[192px]'
    : 'w-[68px] sm:w-[84px] h-[192px] sm:h-[226px]';

  return (
    <div className="relative h-full w-full overflow-hidden flex flex-col items-center justify-between px-2.5 sm:px-6 py-2 sm:py-3.5">
      <AnimatedDashboardBackdrop reduceMotion={reduceMotion} />

      <div className="relative z-10 w-full max-w-3xl h-full flex flex-col justify-between gap-2">
        {/* Top Compact HUD + Level Targets Panel */}
        <div className="shrink-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2 rounded-2xl bg-[#FFFDF8]/92 backdrop-blur-md border border-[#E6D4AE] px-3 py-1.5 shadow-[0_6px_16px_-10px_rgba(148,101,34,0.24)]">
            <button
              type="button"
              onClick={onExit}
              aria-label="Back to map"
              className="min-h-[38px] px-3 py-1 rounded-xl btn-candy-cream border border-[#E2CFA8] text-[#4C3A26] text-xs sm:text-sm font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Map</span>
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <h1 className="font-display text-base sm:text-xl font-bold text-[#2D2218] truncate">
                {isDaily ? 'Daily' : `Level ${levelId}`}
              </h1>
              <span className="text-xs font-bold text-[#8A673B] whitespace-nowrap">
                · {levelData.difficulty}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* 2x Fast-Forward Pour Speed Toggle */}
              <button
                type="button"
                onClick={() => {
                  soundFx.tap(sfxEnabled);
                  triggerHaptic(10);
                  setFastForward((prev) => !prev);
                }}
                aria-pressed={fastForward}
                aria-label={fastForward ? 'Fast-forward 2x enabled' : 'Enable 2x fast-forward pouring'}
                title="Toggle 2× pouring speed"
                className={`min-h-[38px] px-2.5 py-1 rounded-xl font-display text-xs sm:text-sm font-bold inline-flex items-center gap-1 cursor-pointer transition-all ${
                  fastForward
                    ? 'btn-tactile-gold text-[#472904]'
                    : 'btn-candy-cream border border-[#E2CFA8] text-[#5C4327]'
                }`}
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>2×</span>
              </button>

              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#FFF6DC] border border-[#ECCB82] font-display text-sm font-bold text-[#9A5F0A] tabular-nums shrink-0">
                <Coins className="w-4 h-4 text-[#F2A916]" />
                <span>{progress.coins}</span>
              </div>
            </div>
          </div>

          {/* Level Targets Panel: Non-scrolling required jars + difficulty-based Time / Moves */}
          <div className="rounded-2xl bg-[#FFFDF8]/92 backdrop-blur-md border border-[#E6D4AE] px-2.5 py-1.5 shadow-[0_6px_16px_-10px_rgba(148,101,34,0.22)] flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-1 shrink-0">
                <Target className="w-4 h-4 text-[#D64B2C]" />
                <span className="font-display text-xs sm:text-sm font-bold text-[#2D2218] whitespace-nowrap">
                  Level Targets
                </span>
                <span className="text-xs font-bold text-[#8A673B] tabular-nums whitespace-nowrap">
                  {completedTargetsCount}/{targetProgressList.length}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                {targetProgressList.map((target) => (
                  <div
                    key={target.colorId}
                    title={`${target.swatch.name}: ${target.count}/${levelData.capacity}`}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-xl border transition-all duration-200 ${
                      target.sealed
                        ? 'bg-[#EAF7EF] border-[#2E8555]'
                        : target.isColorLockedJar
                        ? 'bg-[#FFF5DA] border-[#E8A317]'
                        : 'bg-[#FAF4E7] border-[#E5D7B9]'
                    }`}
                  >
                    {/* Mini Live-Filling Thin-Glass Target Jar */}
                    <div
                      className="relative w-3.5 h-5 rounded-b-md rounded-t-xs border overflow-hidden flex items-end bg-white/85"
                      style={{
                        borderColor: target.sealed
                          ? '#2E8555'
                          : target.isColorLockedJar
                          ? target.swatch.hex
                          : '#CBB68E',
                      }}
                    >
                      {target.sealed && (
                        <span
                          aria-hidden="true"
                          className="absolute top-0 left-0 right-0 h-1 bg-[#F2AD22] z-20"
                        />
                      )}
                      <div
                        className="w-full transition-all duration-200 ease-out"
                        style={{
                          height: `${Math.round(target.pct * 0.78)}%`,
                          background: `linear-gradient(180deg, ${target.swatch.light} 0%, ${target.swatch.hex} 50%, ${target.swatch.dark} 100%)`,
                        }}
                      />
                    </div>

                    <span
                      className={`font-display text-[11px] font-bold tabular-nums leading-none flex items-center gap-0.5 ${
                        target.sealed ? 'text-[#1D633B]' : 'text-[#4C3A26]'
                      }`}
                    >
                      {target.isColorLockedJar && !target.sealed && (
                        <Lock
                          className="w-2.5 h-2.5"
                          style={{ color: target.swatch.dark }}
                        />
                      )}
                      {target.sealed ? (
                        <Check className="w-3 h-3 stroke-[3]" />
                      ) : (
                        `${target.count}/${levelData.capacity}`
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {(levelData.hasTimeLimit || levelData.hasMoveLimit) && (
              <div className="flex items-center gap-1.5 shrink-0">
                {levelData.hasTimeLimit && (
                  <div
                    className={`rounded-xl px-2 py-1 border flex items-center gap-1 tabular-nums ${
                      timeLeft <= 15
                        ? 'bg-[#FFE7E2] border-[#E55A3C] text-[#B82818]'
                        : levelData.targetType === 'time'
                        ? 'bg-[#FFF3CE] border-[#E8A317] text-[#5C3A06]'
                        : 'bg-[#FAF4E7] border-[#E5D7B9] text-[#3F2F1E]'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-display text-xs sm:text-sm font-bold">
                      {formatSeconds(timeLeft)}
                    </span>
                  </div>
                )}

                {levelData.hasMoveLimit && (
                  <div
                    className={`rounded-xl px-2 py-1 border flex items-center gap-1 tabular-nums ${
                      movesLeft <= 4
                        ? 'bg-[#FFE7E2] border-[#E55A3C] text-[#B82818]'
                        : levelData.targetType === 'moves'
                        ? 'bg-[#FFF3CE] border-[#E8A317] text-[#5C3A06]'
                        : 'bg-[#FAF4E7] border-[#E5D7B9] text-[#3F2F1E]'
                    }`}
                  >
                    <Footprints className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-display text-xs sm:text-sm font-bold">
                      {movesLeft}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Fixed Centered Thin-Glass Bottle-Jar Arena (zero scroll) */}
        <div className="relative flex-1 min-h-0 rounded-[28px] overflow-hidden bg-gradient-to-b from-[#FFFDF6]/78 via-[#FCEFD2]/74 to-[#F3DFB6]/80 backdrop-blur-xs border border-[#E8D5AB] px-2.5 sm:px-5 py-2 flex items-center justify-center shadow-[0_16px_38px_-16px_rgba(148,98,32,0.3)]">
          <div
            ref={boardRef}
            className={`relative w-full h-full flex flex-col items-center justify-center ${
              isTwoRows ? 'gap-4 sm:gap-7' : 'gap-6'
            }`}
          >
            {/* Active Glossy Liquid Pouring Stream & Splash Droplets SVG Layer */}
            {pourAnim && pourAnim.phase === 'pouring' && activePourColor && (
              <svg
                className="pointer-events-none absolute inset-0 w-full h-full z-30 overflow-visible"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="activePourStream" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={activePourColor.light} />
                    <stop offset="45%" stopColor={activePourColor.hex} />
                    <stop offset="100%" stopColor={activePourColor.dark} />
                  </linearGradient>
                </defs>

                <path
                  d={`M ${pourAnim.streamX - pourAnim.pourDir * 4} ${pourAnim.streamTopY} Q ${
                    pourAnim.streamX
                  } ${(pourAnim.streamTopY + pourAnim.streamBottomY) / 2}, ${
                    pourAnim.streamX
                  } ${pourAnim.streamBottomY}`}
                  fill="none"
                  stroke={activePourColor.glow}
                  strokeWidth="15"
                  strokeLinecap="round"
                />

                <path
                  d={`M ${pourAnim.streamX - pourAnim.pourDir * 4} ${pourAnim.streamTopY} Q ${
                    pourAnim.streamX
                  } ${(pourAnim.streamTopY + pourAnim.streamBottomY) / 2}, ${
                    pourAnim.streamX
                  } ${pourAnim.streamBottomY}`}
                  fill="none"
                  stroke="url(#activePourStream)"
                  strokeWidth="9"
                  strokeLinecap="round"
                />

                <path
                  d={`M ${pourAnim.streamX - pourAnim.pourDir * 4 - 2} ${
                    pourAnim.streamTopY + 3
                  } Q ${pourAnim.streamX - 2} ${
                    (pourAnim.streamTopY + pourAnim.streamBottomY) / 2
                  }, ${pourAnim.streamX - 2} ${pourAnim.streamBottomY - 3}`}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeOpacity="0.88"
                  strokeWidth="2.8"
                  strokeDasharray="11 13"
                  strokeLinecap="round"
                  className="animate-stream-flow"
                />

                <g transform={`translate(${pourAnim.streamX}, ${pourAnim.streamBottomY})`}>
                  <ellipse
                    cx="0"
                    cy="0"
                    rx="16"
                    ry="4.5"
                    fill={activePourColor.light}
                    opacity="0.92"
                    className="animate-surface-wave"
                  />
                  <circle
                    cx="-5"
                    cy="-3"
                    r="3.5"
                    fill={activePourColor.light}
                    className="animate-splash-left"
                  />
                  <circle
                    cx="5"
                    cy="-3"
                    r="3.2"
                    fill={activePourColor.hex}
                    className="animate-splash-right"
                  />
                  <circle
                    cx="0"
                    cy="-6"
                    r="2.4"
                    fill="#FFFFFF"
                    className="animate-splash-left"
                  />
                </g>
              </svg>
            )}

            {centeredRows.map((row, rowIdx) => (
              <div
                key={`row-${rowIdx}`}
                className="w-full flex items-end justify-center gap-2 sm:gap-5"
              >
                {row.map((slot) => {
                  if (slot.kind === 'locked-extra') {
                    return (
                      <div key="locked-extra-jar" className="relative flex flex-col items-center">
                        <button
                          type="button"
                          onClick={() => handleOpenWatchAd('extra-jar')}
                          aria-label="Unlock extra jar by watching ad"
                          className={`relative flex flex-col items-center justify-end ${jarSizeClass} transition-transform duration-150 hover:scale-105 active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E55A3C]`}
                        >
                          {/* Slender bottle neck */}
                          <div className="jar-3d-locked-ad relative w-[62%] h-[14%] rounded-t-md border-[1.5px] border-b-0 border-dashed border-[#CCA968] flex items-start justify-center">
                            <span
                              aria-hidden="true"
                              className="jar-3d-rim absolute -top-1 -left-1 -right-1 h-2 rounded-full border border-[#DEC9A0]"
                            />
                          </div>
                          {/* Wider sculpted thin-glass body */}
                          <div className="jar-3d-locked-ad relative w-full h-[86%] rounded-t-[18px] rounded-b-[30px] border-[1.5px] border-dashed border-[#CCA968] flex flex-col items-center justify-center">
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute top-3 bottom-4 left-1.5 w-1 rounded-full bg-white/65"
                            />
                            <span className="w-8 h-8 rounded-full bg-gradient-to-b from-[#FFE68C] to-[#E8A017] border border-[#FFFDF8] shadow-md flex items-center justify-center text-[#5A3404]">
                              <Lock className="w-4 h-4" />
                            </span>
                            <span className="mt-1 font-display text-[11px] font-bold text-[#B84119]">
                              AD
                            </span>
                          </div>
                        </button>
                        <span
                          aria-hidden="true"
                          className="mt-1 w-11 h-2 rounded-full bg-[#B58C52]/25 blur-[2px]"
                        />
                      </div>
                    );
                  }

                  const idx = slot.tubeIdx;
                  const tube = slot.tube;
                  const lockedColorId = jarTargetColors[idx] ?? null;
                  const lockedSwatch =
                    lockedColorId !== null
                      ? LIQUID_COLORS[lockedColorId % LIQUID_COLORS.length]
                      : null;

                  const isSelected = selected === idx && !pourAnim;
                  const isPourSource = pourAnim?.fromIdx === idx;
                  const isPourTarget = pourAnim?.toIdx === idx;
                  const isHintSrc = hintPair?.[0] === idx;
                  const isHintDst = hintPair?.[1] === idx;
                  const isSealed = isJarCompleteAndSealed(
                    tubes,
                    idx,
                    levelData.capacity,
                    jarTargetColors
                  );
                  const isShaking = shakeIdx === idx;
                  const isNewlyUnlockedJar =
                    justUnlockedExtra && extraJarUnlocked && idx === tubes.length - 1;

                  let jarTransform: string | undefined;
                  const activeSpeed = pourAnim?.speedMultiplier ?? (fastForward ? 2 : 1);
                  let jarTransitionDuration = `${Math.round(140 / activeSpeed)}ms`;
                  if (isPourSource && pourAnim) {
                    if (pourAnim.phase === 'glide' || pourAnim.phase === 'pouring') {
                      jarTransform = `translate3d(${pourAnim.dx}px, ${pourAnim.dy}px, 0) rotate(${pourAnim.tiltDeg}deg) scale(1.04)`;
                      jarTransitionDuration = `${Math.round(140 / pourAnim.speedMultiplier)}ms`;
                    } else {
                      jarTransform = 'translate3d(0px, 0px, 0) rotate(0deg) scale(1)';
                      jarTransitionDuration = `${Math.round(125 / pourAnim.speedMultiplier)}ms`;
                    }
                  } else if (isSelected) {
                    jarTransform = 'translate3d(0px, -16px, 0) scale(1.05)';
                  }

                  const showIncomingPreview =
                    isPourTarget && pourAnim?.phase === 'pouring';
                  const displayTube = showIncomingPreview
                    ? [...tube, ...Array(pourAnim.pouredUnits).fill(pourAnim.colorId)]
                    : tube;

                  const drainingStartIdx =
                    isPourSource && pourAnim?.phase === 'pouring'
                      ? Math.max(0, tube.length - pourAnim.pouredUnits)
                      : Infinity;

                  const topLiquidColor =
                    displayTube.length > 0
                      ? LIQUID_COLORS[displayTube[displayTube.length - 1] % LIQUID_COLORS.length]
                      : null;

                  // Thin glass border color: stained target color for Colored Target Jar, coral for active, gold for sealed, ultra-crisp translucent white for clear crystal glass
                  const glassBorderColor = isSealed
                    ? '#F2B229'
                    : isSelected || isPourSource
                    ? '#FF6D3B'
                    : isPourTarget && pourAnim?.phase === 'pouring'
                    ? '#F5B014'
                    : isHintSrc || isHintDst
                    ? '#F59E0B'
                    : lockedSwatch
                    ? lockedSwatch.hex
                    : 'rgba(255, 255, 255, 0.92)';

                  return (
                    <div key={idx} className="relative flex flex-col items-center">
                      <button
                        ref={(el) => {
                          jarRefs.current.set(idx, el);
                        }}
                        type="button"
                        onClick={() => handleTubeClick(idx)}
                        aria-label={
                          lockedSwatch
                            ? `Colored jar locked to ${lockedSwatch.name}, ${tube.length} of ${levelData.capacity}`
                            : isSealed
                            ? `Jar ${idx + 1}, sealed`
                            : `Jar ${idx + 1}, ${tube.length} of ${levelData.capacity}`
                        }
                        style={{
                          transform: jarTransform,
                          transitionDuration: jarTransitionDuration,
                          zIndex: isPourSource ? 40 : isSelected ? 30 : isPourTarget ? 20 : 10,
                        }}
                        className={`relative flex flex-col items-center justify-end ${jarSizeClass} transition-transform ease-out focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E55A3C] ${
                          isShaking ? 'animate-jar-shake' : ''
                        } ${isNewlyUnlockedJar ? 'animate-unlock-pop' : ''} ${
                          isSealed ? 'cursor-default' : 'hover:scale-[1.03] cursor-pointer'
                        }`}
                      >
                        {/* Animated Closed Cap & Lock Seal on 5/5 Complete */}
                        {isSealed && !isPourSource && (
                          <div
                            aria-hidden="true"
                            className={`absolute -top-5 left-[14%] right-[14%] z-30 flex flex-col items-center ${
                              reduceMotion ? '' : 'animate-cap-seal'
                            }`}
                          >
                            <span className="mb-0.5 flex items-center gap-0.5 text-[#D68900]">
                              <Star className="w-3 h-3 fill-[#FFC714]" />
                              <Sparkles className="w-2.5 h-2.5 text-[#E55A3C]" />
                            </span>
                            <div className="jar-sealed-cap w-full h-4 rounded-t-xl rounded-b-md border border-[#FFF4CE] flex items-center justify-center">
                              <Lock className="w-2.5 h-2.5 text-[#5C3503]" />
                            </div>
                          </div>
                        )}

                        {/* Slender Sculpted Thin-Glass Neck */}
                        <div
                          style={{
                            borderColor: glassBorderColor,
                            background: lockedSwatch
                              ? `linear-gradient(90deg, ${lockedSwatch.light}55, rgba(255,255,255,0.22), ${lockedSwatch.hex}33)`
                              : undefined,
                          }}
                          className="jar-3d-shell relative w-[60%] h-[14%] rounded-t-md border-[1.5px] border-b-0 z-20 flex items-center justify-center"
                        >
                          {/* Delicate Thin Crystal Mouth Lip */}
                          <span
                            aria-hidden="true"
                            style={{ borderColor: lockedSwatch ? lockedSwatch.hex : '#E2D0B0' }}
                            className="jar-3d-rim absolute -top-1 -left-1 -right-1 h-2 rounded-full border"
                          />
                          {/* Single-Color Lock Gem on Neck of Colored Target Jar */}
                          {lockedSwatch && !isSealed && (
                            <span
                              aria-hidden="true"
                              className="w-4 h-4 rounded-full border border-white shadow-sm flex items-center justify-center"
                              style={{ backgroundColor: lockedSwatch.hex }}
                            >
                              <Lock className="w-2.5 h-2.5 text-white" />
                            </span>
                          )}
                        </div>

                        {/* Tall Sculpted Thin-Glass Potion-Jar Body */}
                        <div
                          style={{
                            borderColor: glassBorderColor,
                            background: lockedSwatch
                              ? `linear-gradient(180deg, ${lockedSwatch.light}38 0%, ${lockedSwatch.hex}24 65%, ${lockedSwatch.dark}30 100%)`
                              : undefined,
                            boxShadow:
                              isSelected && topLiquidColor
                                ? `0 18px 28px -8px ${topLiquidColor.glow}, inset 2px 0 5px rgba(255,255,255,0.92)`
                                : lockedSwatch
                                ? `0 14px 26px -10px ${lockedSwatch.glow}, inset 2px 0 6px rgba(255,255,255,0.82)`
                                : undefined,
                          }}
                          className={`jar-3d-shell relative w-full h-[86%] rounded-t-[18px] rounded-b-[30px] border-[1.5px] p-[2px] flex flex-col justify-end overflow-hidden ${
                            isSealed ? 'jar-3d-complete' : ''
                          }`}
                        >
                          {/* Razor-thin crystal glass specular reflections */}
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute top-2.5 bottom-4 left-1.5 w-[3px] rounded-full bg-gradient-to-b from-white/95 via-white/55 to-white/10 z-20"
                          />
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute top-4 bottom-6 right-1.5 w-[1.5px] rounded-full bg-white/50 z-20"
                          />

                          {/* Subtle 75% Max Fill Etch Line (top 25% of jar stays empty glass) */}
                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute top-[15%] left-1.5 right-1.5 border-t border-dashed border-[#CBB58A]/55 z-20"
                          />

                          {/* Colored Target Jar subtle center color-lock watermark when empty */}
                          {lockedSwatch && displayTube.length === 0 && (
                            <div
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-0 flex items-center justify-center z-10"
                            >
                              <span
                                className="w-7 h-7 rounded-full border-2 border-white/90 shadow-sm flex items-center justify-center"
                                style={{
                                  background: `radial-gradient(circle at 35% 30%, ${lockedSwatch.light}, ${lockedSwatch.hex} 68%, ${lockedSwatch.dark})`,
                                }}
                              >
                                <Lock className="w-3.5 h-3.5 text-white" />
                              </span>
                            </div>
                          )}

                          {/* Liquid Interior: Lower 85% of body (= 75% of full bottle height including neck!) holds 5 units */}
                          <div className="relative flex flex-col-reverse gap-[1px] w-full h-[85%] justify-start rounded-b-[27px] overflow-hidden z-10">
                            {displayTube.map((colorId, slotIdx) => {
                              const col = LIQUID_COLORS[colorId % LIQUID_COLORS.length];
                              const isBottom = slotIdx === 0;
                              const isTop = slotIdx === displayTube.length - 1;
                              const isIncoming = showIncomingPreview && slotIdx >= tube.length;
                              const isDraining = slotIdx >= drainingStartIdx;

                              return (
                                <div
                                  key={slotIdx}
                                  className={`relative w-full ${
                                    isBottom ? 'rounded-b-[26px]' : ''
                                  } ${isTop ? 'rounded-t-md' : ''} ${
                                    isIncoming ? 'animate-liquid-rise' : ''
                                  } ${isDraining ? 'animate-liquid-drain' : ''}`}
                                  style={{
                                    height: '19.8%',
                                    animationDuration:
                                      (isIncoming || isDraining) && pourAnim
                                        ? `${Math.round(
                                            (isIncoming ? 300 : 280) / pourAnim.speedMultiplier
                                          )}ms`
                                        : undefined,
                                    backgroundImage: `
                                      linear-gradient(90deg, rgba(255,255,255,0.48) 0%, rgba(255,255,255,0.08) 24%, rgba(0,0,0,0) 64%, rgba(0,0,0,0.2) 100%),
                                      linear-gradient(180deg, ${col.light} 0%, ${col.hex} 38%, ${col.dark} 100%)
                                    `,
                                    boxShadow: isTop
                                      ? 'inset 0 2px 3px rgba(255,255,255,0.72)'
                                      : 'inset 0 1px 1.5px rgba(255,255,255,0.24)',
                                  }}
                                >
                                  {isTop && (
                                    <span
                                      aria-hidden="true"
                                      className={`pointer-events-none absolute -top-1 left-0.5 right-0.5 h-2 rounded-full ${
                                        isIncoming ? 'animate-surface-wave' : ''
                                      }`}
                                      style={{
                                        background: `radial-gradient(ellipse at 35% 40%, rgba(255,255,255,0.92) 0%, ${col.light} 55%, ${col.hex} 100%)`,
                                      }}
                                    />
                                  )}

                                  {!reduceMotion && (slotIdx + idx) % 2 === 0 && (
                                    <span
                                      aria-hidden="true"
                                      style={{
                                        animationDelay: `${(idx * 310 + slotIdx * 420) % 1800}ms`,
                                      }}
                                      className="pointer-events-none absolute bottom-0.5 left-2.5 w-1.5 h-1.5 rounded-full bg-white/75 animate-bubble-rise"
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </button>

                      {/* Grounded 3D Contact Shadow */}
                      <span
                        aria-hidden="true"
                        className={`mt-1 h-2 rounded-full bg-[#B58C52]/30 blur-[2px] transition-all duration-150 ${
                          isSelected || isPourSource ? 'w-7 opacity-40' : 'w-12 sm:w-14 opacity-80'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Compact 3D Candy Action Bar */}
        <div className="shrink-0 grid grid-cols-5 gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length === 0 || Boolean(pourAnim) || Boolean(failReason)}
            aria-label="Undo"
            className="min-h-[44px] px-2 py-1.5 rounded-2xl btn-candy-cream disabled:opacity-45 border border-[#DFC99E] text-[#4C3A26] font-display text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 cursor-pointer"
          >
            <Undo2 className="w-4 h-4 text-[#E55A3C]" />
            <span>Undo</span>
          </button>

          <button
            type="button"
            onClick={handleRequestReset}
            disabled={Boolean(pourAnim)}
            aria-label="Restart"
            className="min-h-[44px] px-2 py-1.5 rounded-2xl btn-candy-cream disabled:opacity-45 border border-[#DFC99E] text-[#4C3A26] font-display text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-[#C96A1B]" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={handleHint}
            disabled={!showHints || Boolean(pourAnim) || Boolean(failReason)}
            aria-label="Hint"
            className="min-h-[44px] px-2 py-1.5 rounded-2xl btn-tactile-gold disabled:opacity-45 text-[#472904] font-display text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 cursor-pointer"
          >
            <Lightbulb className="w-4 h-4" />
            <span>Hint</span>
          </button>

          <button
            type="button"
            onClick={handleShuffle}
            disabled={Boolean(pourAnim) || Boolean(failReason)}
            aria-label="Shuffle"
            className="min-h-[44px] px-2 py-1.5 rounded-2xl btn-tactile-coral disabled:opacity-45 text-white font-display text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 cursor-pointer"
          >
            <Shuffle className="w-4 h-4" />
            <span>Shuffle</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenWatchAd('extra-jar')}
            disabled={extraJarUnlocked || Boolean(pourAnim) || Boolean(failReason)}
            aria-label="Unlock extra jar"
            className="min-h-[44px] px-2 py-1.5 rounded-2xl btn-tactile-emerald disabled:opacity-45 text-white font-display text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 cursor-pointer"
          >
            {extraJarUnlocked ? (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Open</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>+Jar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {resetConfirmOpen && !adPurpose && !victoryInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D2218]/45 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-confirm-title"
        >
          <div className="w-full max-w-sm rounded-3xl bg-[#FFFDF8] border-2 border-[#EBD6AC] p-6 text-center shadow-2xl animate-victory-card">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-[#FFF2D4] border border-[#E8C987] flex items-center justify-center text-[#C96A1B] mb-3">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h2 id="reset-confirm-title" className="font-display text-2xl font-bold text-[#2D2218]">
              Restart Level?
            </h2>
            <p className="mt-1.5 text-sm text-[#6E5B47]">
              {!needsLifeForRetry
                ? 'Your current jars will reset to the start.'
                : hasLifeForRetry
                ? 'Restarting uses 1 life and resets all jars.'
                : 'No lives left. Watch an ad to get +1 life and restart.'}
            </p>
            <div className="mt-5 space-y-2.5">
              {hasLifeForRetry ? (
                <button
                  type="button"
                  onClick={handleConfirmRestart}
                  className="w-full min-h-[48px] rounded-2xl btn-tactile-coral text-white font-display text-base font-bold cursor-pointer"
                >
                  Yes, Restart
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleOpenWatchAd('extra-life')}
                  className="w-full min-h-[48px] rounded-2xl btn-tactile-emerald text-white font-display text-base font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Tv className="w-4 h-4" />
                  <span>Watch Ad · +1 Life</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  soundFx.tap(sfxEnabled);
                  setResetConfirmOpen(false);
                }}
                className="w-full min-h-[44px] rounded-2xl btn-candy-cream border border-[#DFC99E] text-[#4C3A26] font-display text-sm font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No Valid Moves / Not Possible to Complete Prompt */}
      {stuckReason && !failReason && !resetConfirmOpen && !adPurpose && !victoryInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D2218]/45 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stuck-title"
        >
          <div className="w-full max-w-sm rounded-3xl bg-[#FFFDF8] border-2 border-[#EBD6AC] p-6 text-center shadow-2xl animate-victory-card">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-[#FFEED8] border border-[#E8B872] flex items-center justify-center text-[#D46218] mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 id="stuck-title" className="font-display text-2xl font-bold text-[#2D2218]">
              {stuckReason === 'no-moves' ? 'No Moves Left' : 'Cannot Complete'}
            </h2>
            <p className="mt-1.5 text-sm text-[#6E5B47]">
              No winning pours remain from this state. Restart now or continue trying with Undo,
              Shuffle, or +Jar.
            </p>
            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                onClick={handleContinueTrying}
                className="w-full min-h-[48px] rounded-2xl btn-tactile-gold text-[#472904] font-display text-base font-bold cursor-pointer"
              >
                Continue Trying
              </button>
              {hasLifeForRetry ? (
                <button
                  type="button"
                  onClick={handleConfirmRestart}
                  className="w-full min-h-[46px] rounded-2xl btn-tactile-coral text-white font-display text-base font-bold cursor-pointer"
                >
                  Restart Level
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleOpenWatchAd('extra-life')}
                  className="w-full min-h-[46px] rounded-2xl btn-tactile-emerald text-white font-display text-base font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Tv className="w-4 h-4" />
                  <span>Watch Ad · +1 Life &amp; Restart</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Level Failed Overlay (Time Out or Out of Moves — NEVER auto-starts ads) */}
      {failReason && !adPurpose && !victoryInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D2218]/48 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fail-title"
        >
          <div className="w-full max-w-sm rounded-3xl bg-[#FFFDF8] border-2 border-[#EBD6AC] p-6 text-center shadow-2xl animate-victory-card">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-[#FFE7E2] border border-[#F0A899] flex items-center justify-center text-[#C93B22] mb-3">
              {failReason === 'time' ? (
                <Clock className="w-6 h-6" />
              ) : (
                <Footprints className="w-6 h-6" />
              )}
            </div>
            <h2 id="fail-title" className="font-display text-2xl font-bold text-[#2D2218]">
              Level Failed
            </h2>
            <p className="mt-1 text-sm font-semibold text-[#8A462B] tabular-nums">
              {failReason === 'time' ? 'Time ran out' : 'Out of moves'} · {completedTargetsCount}/
              {targetProgressList.length} jars complete
            </p>
            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                onClick={() =>
                  handleOpenWatchAd(failReason === 'time' ? 'extra-time' : 'extra-moves')
                }
                className="w-full min-h-[48px] rounded-2xl btn-tactile-emerald text-white font-display text-base font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Tv className="w-4 h-4" />
                <span>
                  {failReason === 'time' ? 'Watch Ad · +30s Continue' : 'Watch Ad · +5 Moves'}
                </span>
              </button>
              {hasLifeForRetry ? (
                <button
                  type="button"
                  onClick={handleConfirmRestart}
                  className="w-full min-h-[46px] rounded-2xl btn-tactile-coral text-white font-display text-base font-bold cursor-pointer"
                >
                  Retry Level
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleOpenWatchAd('extra-life')}
                  className="w-full min-h-[46px] rounded-2xl btn-tactile-gold text-[#472904] font-display text-base font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Heart className="w-4 h-4 text-[#D93D59] fill-[#D93D59]" />
                  <span>Watch Ad · +1 Life &amp; Retry</span>
                </button>
              )}
              <button
                type="button"
                onClick={onExit}
                className="w-full min-h-[44px] rounded-2xl btn-candy-cream border border-[#DFC99E] text-[#4C3A26] font-display text-sm font-bold cursor-pointer"
              >
                Map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rewarded Ad Modal (Only triggered by explicit player tap) */}
      {adPurpose && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D2218]/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ad-modal-title"
        >
          <div className="w-full max-w-sm rounded-3xl bg-[#FFFDF8] border-2 border-[#EBD6AC] p-6 text-center shadow-2xl">
            <div className="flex justify-end -mt-2 -mr-2">
              <button
                type="button"
                onClick={() => setAdPurpose(null)}
                aria-label="Close ad"
                className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl bg-[#F6EEDB] hover:bg-[#EFE2C6] text-[#4C3A26] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-b from-[#FFE68C] to-[#F0A518] border-2 border-[#FFFDF8] shadow-md flex items-center justify-center text-[#5A3404] mb-3">
              {adPurpose === 'extra-life' ? (
                <Heart className="w-7 h-7 text-[#D93D59] fill-[#D93D59]" />
              ) : (
                <Tv className="w-7 h-7" />
              )}
            </div>

            <h2 id="ad-modal-title" className="font-display text-xl font-bold text-[#2D2218]">
              {adPurpose === 'extra-jar'
                ? 'Unlock Extra Jar'
                : adPurpose === 'extra-time'
                ? '+30 Seconds'
                : adPurpose === 'extra-moves'
                ? '+5 Extra Moves'
                : '+1 Bonus Life'}
            </h2>

            <div className="mt-4 w-full h-3 rounded-full bg-[#EFE5D0] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#F59E0B] to-[#2E8555] transition-all duration-700"
                style={{ width: `${((3 - adSecondsLeft) / 3) * 100}%` }}
              />
            </div>

            <button
              type="button"
              onClick={handleClaimAdReward}
              disabled={adSecondsLeft > 0}
              className="mt-5 w-full min-h-[48px] rounded-2xl btn-tactile-emerald disabled:opacity-50 text-white font-display text-base font-bold cursor-pointer tabular-nums"
            >
              {adSecondsLeft > 0 ? `${adSecondsLeft}s…` : 'Claim Reward'}
            </button>
          </div>
        </div>
      )}

      {/* Fast Winning Celebration Confetti & Modal Overlay */}
      {victoryInfo && (
        <>
          <VictoryConfetti
            active={Boolean(victoryInfo)}
            stars={victoryInfo.stars}
            reduceMotion={reduceMotion}
          />
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D2218]/45 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
            aria-labelledby="victory-title"
          >
            <div
              className={`relative z-[60] w-full max-w-sm rounded-3xl bg-[#FFFDF8] border-2 border-[#EBD6AC] p-6 text-center shadow-[0_24px_64px_-12px_rgba(45,34,24,0.38)] overflow-hidden ${
                reduceMotion ? '' : 'animate-victory-card'
              }`}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-40 rounded-full bg-radial from-[#FFE6A3]/75 via-[#FDE4B2]/30 to-transparent blur-xl"
              />

              <div className="relative flex items-center justify-center gap-2.5 mb-2 pt-1">
                {[1, 2, 3].map((s) => {
                  const earned = s <= victoryInfo.stars;
                  return (
                    <Star
                      key={s}
                      style={{
                        animationDelay: !reduceMotion && earned ? `${45 * s}ms` : undefined,
                      }}
                      className={`w-11 h-11 ${
                        s === 2 ? '-translate-y-1.5 scale-110' : ''
                      } ${
                        earned
                          ? `text-[#E8A317] fill-[#F5BC38] drop-shadow-[0_3px_6px_rgba(232,163,23,0.42)] ${
                              reduceMotion ? '' : 'animate-victory-star'
                            }`
                          : 'text-[#DCD1BC] fill-[#EFE6D2]'
                      }`}
                    />
                  );
                })}
              </div>

              <h2
                id="victory-title"
                className="relative font-display text-2xl font-bold text-[#2D2218]"
              >
                {isDaily ? 'Daily Clear' : `Level ${levelId} Clear`}
              </h2>
              <p className="relative mt-1 text-sm font-semibold text-[#6E5B47] tabular-nums">
                +{victoryInfo.scoreEarned} · +{victoryInfo.coinsEarned} coins
              </p>

              <div className="relative mt-5 space-y-2.5">
                {!isDaily && (
                  <button
                    type="button"
                    onClick={() => onNextLevel(levelId + 1)}
                    className="w-full min-h-[50px] rounded-2xl btn-tactile-coral text-white font-display text-lg font-bold cursor-pointer"
                  >
                    Next Level ({levelId + 1})
                  </button>
                )}
                <button
                  type="button"
                  onClick={onExit}
                  className="w-full min-h-[46px] rounded-2xl btn-candy-cream border border-[#DFC99E] text-[#4C3A26] font-display text-base font-bold cursor-pointer"
                >
                  Dashboard
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
