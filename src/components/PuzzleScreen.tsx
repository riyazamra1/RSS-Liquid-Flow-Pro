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
  Users,
} from 'lucide-react';
import { AppThemeId, GeneratedLevel, PlayerProgress } from '../types/game';
import {
  analyzeBoardMoves,
  canPour,
  evaluateLevelResult,
  generateLevel,
  isBoardSolved,
  isJarCompleteAndSealed,
  LevelScoreBreakdown,
  LIQUID_COLORS,
} from '../utils/levelGenerator';
import { getTelegramWebApp, triggerPlatformHaptic } from '../utils/platform';
import { requestRewardedAd, RewardedAdPlacement } from '../utils/rewardedAds';
import { soundFx } from '../utils/sound';
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
  themeId: AppThemeId;
  availableLives: number;
  onExit: () => void;
  onCompleteLevel: (payload: {
    levelId: number;
    isDaily: boolean;
    dailyDate?: string;
    moves: number;
    stars: number;
    scoreEarned: number;
    coinsEarned: number;
    xpEarned: number;
    timeTakenSec: number;
    isPerfect?: boolean;
  }) => void;
  onSpendLifeForRetry: (levelId: number) => boolean;
  onLoseLifeOnFailure: (levelId: number) => number;
  onGrantAdLife: () => void;
  onOpenLivesModal: () => void;
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
  themeId,
  availableLives,
  onExit,
  onCompleteLevel,
  onSpendLifeForRetry,
  onLoseLifeOnFailure,
  onGrantAdLife,
  onOpenLivesModal,
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
  const [elapsedSec, setElapsedSec] = useState(0);
  const [hintPair, setHintPair] = useState<[number, number] | null>(null);
  const [extraJarUnlocked, setExtraJarUnlocked] = useState(false);
  const [justUnlockedExtra, setJustUnlockedExtra] = useState(false);
  const [adLoading, setAdLoading] = useState<RewardedAdPlacement | null>(null);
  const [adErrorMessage, setAdErrorMessage] = useState<string | null>(null);
  const [fastForward, setFastForward] = useState(false);
  const [shakeIdx, setShakeIdx] = useState<number | null>(null);
  const [pourAnim, setPourAnim] = useState<PourAnimationState | null>(null);
  const [failReason, setFailReason] = useState<'time' | 'moves' | null>(null);
  const [outOfLivesLocked, setOutOfLivesLocked] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetUsed, setResetUsed] = useState(false);
  const [stuckReason, setStuckReason] = useState<'no-moves' | 'impossible' | null>(null);
  const [dismissedStuckSig, setDismissedStuckSig] = useState<string | null>(null);
  const [victoryInfo, setVictoryInfo] = useState<{
    breakdown: LevelScoreBreakdown;
    coinsEarned: number;
    xpEarned: number;
    isPerfect: boolean;
    timeTakenSec: number;
    isNewBestTime: boolean;
  } | null>(null);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const jarRefs = useRef<Map<number, HTMLButtonElement | null>>(new Map());
  const timersRef = useRef<number[]>([]);
  const pourIdCounter = useRef(0);
  const failureLifeChargedRef = useRef(false);

  const clearPourTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    clearPourTimers();
    failureLifeChargedRef.current = false;
    setPourAnim(null);
    setTubes(levelData.tubes.map((t) => [...t]));
    setJarTargetColors([...levelData.jarTargetColors]);
    setHistory([]);
    setSelected(null);
    setMoves(0);
    setMoveBudget(levelData.moveLimit);
    setTimeLeft(levelData.timeLimit);
    setElapsedSec(0);
    setHintPair(null);
    setExtraJarUnlocked(false);
    setJustUnlockedExtra(false);
    setAdLoading(null);
    setAdErrorMessage(null);
    setFailReason(null);
    setOutOfLivesLocked(false);
    setResetConfirmOpen(false);
    setStuckReason(null);
    setDismissedStuckSig(null);
    setShakeIdx(null);
    setResetUsed(false);
    setVictoryInfo(null);
  }, [levelData, clearPourTimers]);

  useEffect(() => {
    return () => clearPourTimers();
  }, [clearPourTimers]);

  // If user gains a life externally (e.g. via LivesModal friend share or timer), unlock Out-of-Lives gate
  useEffect(() => {
    if (outOfLivesLocked && availableLives > 0) {
      setOutOfLivesLocked(false);
    }
  }, [outOfLivesLocked, availableLives]);

  // Wire Telegram Mini App BackButton to return cleanly to the map
  useEffect(() => {
    const tg = getTelegramWebApp();
    if (!tg?.BackButton) return;
    const handleBack = () => onExit();
    try {
      tg.BackButton.show();
      tg.BackButton.onClick(handleBack);
    } catch {
      // Ignore on unsupported clients
    }
    return () => {
      try {
        tg.BackButton?.offClick(handleBack);
        tg.BackButton?.hide();
      } catch {
        // Ignore
      }
    };
  }, [onExit]);

  const haptic = useCallback(
    (kind: 'light' | 'medium' | 'heavy' | 'success' | 'error') => {
      triggerPlatformHaptic(kind, vibrationEnabled, vibrationIntensity);
    },
    [vibrationEnabled, vibrationIntensity]
  );

  const boardSignature = useMemo(
    () => `${tubes.map((t) => t.join(',')).join('|')}::${jarTargetColors.join(',')}`,
    [tubes, jarTargetColors]
  );

  // Detect no valid moves or impossible-to-complete deadlocks after every board change
  useEffect(() => {
    if (victoryInfo || failReason || pourAnim || adLoading || resetConfirmOpen || outOfLivesLocked) {
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
    adLoading,
    resetConfirmOpen,
    outOfLivesLocked,
  ]);

  // Live level timer:
  // - On timed levels, counts down `timeLeft` and triggers Time Out at 0.
  // - On untimed levels, tracks `elapsedSec` so Time Balance star & score conversion work accurately.
  useEffect(() => {
    if (
      victoryInfo ||
      failReason ||
      adLoading ||
      resetConfirmOpen ||
      stuckReason ||
      outOfLivesLocked
    ) {
      return;
    }

    if (levelData.hasTimeLimit && timeLeft <= 0) {
      soundFx.locked(sfxEnabled);
      haptic('error');
      failureLifeChargedRef.current = false;
      setAdErrorMessage(null);
      setFailReason('time');
      return;
    }

    const id = window.setInterval(() => {
      setElapsedSec((prev) => prev + 1);
      if (levelData.hasTimeLimit) {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            soundFx.locked(sfxEnabled);
            haptic('error');
            failureLifeChargedRef.current = false;
            setAdErrorMessage(null);
            setFailReason('time');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [
    levelData.hasTimeLimit,
    victoryInfo,
    failReason,
    adLoading,
    resetConfirmOpen,
    stuckReason,
    outOfLivesLocked,
    timeLeft,
    sfxEnabled,
    haptic,
  ]);

  // Play pouring audio + haptic pulse the moment liquid starts moving
  useEffect(() => {
    if (pourAnim && pourAnim.phase === 'pouring') {
      const pourSoundMs = Math.round(270 / pourAnim.speedMultiplier);
      soundFx.pouring(sfxEnabled, pourSoundMs, pourAnim.pouredUnits);
      haptic('medium');
    }
  }, [
    pourAnim?.id,
    pourAnim?.phase,
    pourAnim?.pouredUnits,
    pourAnim?.speedMultiplier,
    sfxEnabled,
    haptic,
  ]);

  const triggerShake = useCallback((idx: number) => {
    setShakeIdx(idx);
    window.setTimeout(() => {
      setShakeIdx((curr) => (curr === idx ? null : curr));
    }, 320);
  }, []);

  const checkBoardOutcome = useCallback(
    (nextBoard: number[][], nextMoves: number, targetsMap: (number | null)[]) => {
      const won = isBoardSolved(nextBoard, levelData.capacity, targetsMap);

      if (won) {
        const timeTakenSec = Math.max(1, elapsedSec);
        const remainingTimeSec = levelData.hasTimeLimit
          ? timeLeft
          : Math.max(0, levelData.timeLimit - elapsedSec);
        const breakdown = evaluateLevelResult(
          nextMoves,
          moveBudget,
          remainingTimeSec,
          levelData.timeLimit
        );
        const alreadyCleared = isDaily
          ? Boolean(dailyDate && progress.dailyClears[dailyDate])
          : Boolean(progress.completedLevels[String(levelId)]);
        const prevBestTime = Number(progress.levelBestTimes?.[String(levelId)]) || 0;
        const isNewBestTime = !isDaily && (prevBestTime === 0 || timeTakenSec < prevBestTime);
        const isPerfect = !isDaily && !resetUsed;
        const perfectBonus = isPerfect ? 25 : 0;
        const coinsEarned =
          (isDaily
            ? alreadyCleared
              ? 0
              : 25
            : alreadyCleared
            ? 10
            : 20 + breakdown.stars * 10) + 15 + perfectBonus;
        const xpEarned = 15 + breakdown.stars * 15 + (isPerfect ? 15 : 0);

        soundFx.victory(sfxEnabled);
        haptic('success');
        setVictoryInfo({
          breakdown,
          coinsEarned,
          xpEarned,
          isPerfect,
          timeTakenSec,
          isNewBestTime,
        });
        onCompleteLevel({
          levelId,
          isDaily,
          dailyDate,
          moves: nextMoves,
          stars: breakdown.stars,
          scoreEarned: breakdown.totalScore,
          coinsEarned,
          xpEarned,
          timeTakenSec,
          isPerfect,
        });
        return;
      }

      if (levelData.hasMoveLimit && nextMoves >= moveBudget) {
        soundFx.locked(sfxEnabled);
        haptic('error');
        failureLifeChargedRef.current = false;
        setAdErrorMessage(null);
        setFailReason('moves');
      }
    },
    [
      dailyDate,
      elapsedSec,
      haptic,
      isDaily,
      levelData.capacity,
      levelData.hasMoveLimit,
      levelData.hasTimeLimit,
      levelData.timeLimit,
      levelId,
      moveBudget,
      onCompleteLevel,
      progress.completedLevels,
      progress.dailyClears,
      progress.levelBestTimes,
      resetUsed,
      sfxEnabled,
      timeLeft,
    ]
  );

  const resetBoardFresh = useCallback(() => {
    clearPourTimers();
    failureLifeChargedRef.current = false;
    setResetUsed(true);
    setPourAnim(null);
    setTubes(levelData.tubes.map((t) => [...t]));
    setJarTargetColors([...levelData.jarTargetColors]);
    setHistory([]);
    setMoves(0);
    setMoveBudget(levelData.moveLimit);
    setTimeLeft(levelData.timeLimit);
    setElapsedSec(0);
    setFailReason(null);
    setOutOfLivesLocked(false);
    setResetConfirmOpen(false);
    setStuckReason(null);
    setDismissedStuckSig(null);
    setAdErrorMessage(null);
    setSelected(null);
    setHintPair(null);
    setExtraJarUnlocked(false);
    soundFx.tap(sfxEnabled);
  }, [clearPourTimers, levelData, sfxEnabled]);

  /**
   * Real Rewarded Ad Request — strictly zero fake countdowns.
   * Only grants the reward when a genuine ad SDK returns `{ status: 'rewarded' }`.
   */
  const handleWatchRewardedAd = async (placement: RewardedAdPlacement) => {
    if (adLoading) return;
    if (placement === 'extra-jar' && extraJarUnlocked) return;
    if (victoryInfo || pourAnim) return;

    soundFx.tap(sfxEnabled);
    setAdErrorMessage(null);
    setAdLoading(placement);

    const result = await requestRewardedAd(placement);
    setAdLoading(null);

    if (result.status !== 'rewarded') {
      soundFx.locked(sfxEnabled);
      haptic('error');
      setAdErrorMessage(result.message);
      onToast(result.message);
      return;
    }

    // Genuine ad completed -> grant exact single reward
    if (placement === 'extra-jar' && !extraJarUnlocked) {
      setHistory((h) => [...h, tubes.map((t) => [...t])]);
      setTubes((prev) => [...prev, []]);
      setJarTargetColors((prev) => [...prev, null]);
      setExtraJarUnlocked(true);
      setJustUnlockedExtra(true);
      setStuckReason(null);
      setDismissedStuckSig(null);
      soundFx.reward(sfxEnabled);
      haptic('success');
      onToast('Extra jar unlocked!');
      window.setTimeout(() => setJustUnlockedExtra(false), 600);
    } else if (placement === 'extra-time') {
      setTimeLeft((t) => t + 30);
      setFailReason(null);
      failureLifeChargedRef.current = false;
      soundFx.reward(sfxEnabled);
      haptic('success');
      onToast('+30 seconds added!');
    } else if (placement === 'extra-moves') {
      setMoveBudget((m) => m + 5);
      setFailReason(null);
      failureLifeChargedRef.current = false;
      soundFx.reward(sfxEnabled);
      haptic('success');
      onToast('+5 moves added!');
    } else if (placement === 'extra-life') {
      onGrantAdLife();
      setOutOfLivesLocked(false);
      setFailReason(null);
      setResetConfirmOpen(false);
      resetBoardFresh();
      soundFx.reward(sfxEnabled);
      haptic('success');
    }
  };

  const handleTubeClick = (index: number) => {
    if (
      victoryInfo ||
      failReason ||
      pourAnim ||
      resetConfirmOpen ||
      stuckReason ||
      adLoading ||
      outOfLivesLocked
    ) {
      return;
    }
    setHintPair(null);

    const clickedTube = tubes[index];
    if (!clickedTube) return;

    if (isJarCompleteAndSealed(tubes, index, levelData.capacity, jarTargetColors)) {
      soundFx.locked(sfxEnabled);
      haptic('light');
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
      haptic('light');
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
        haptic('medium');
        if (targetJustSealed && !willWin) {
          soundFx.jarComplete(sfxEnabled);
          haptic('success');
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
          haptic('success');
        } else {
          haptic('light');
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
      const dstLockedColor = jarTargetColors[index] ?? null;
      const srcTopColor = tubes[selected]?.[tubes[selected].length - 1];
      if (dstLockedColor !== null && srcTopColor !== undefined && srcTopColor !== dstLockedColor) {
        const colName = LIQUID_COLORS[dstLockedColor % LIQUID_COLORS.length].name;
        soundFx.locked(sfxEnabled);
        haptic('error');
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
        haptic('error');
        triggerShake(index);
        setSelected(null);
      }
    }
  };

  const handleUndo = () => {
    if (history.length === 0 || victoryInfo || failReason || pourAnim || adLoading) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setTubes(prev);
    if (prev.length < jarTargetColors.length) {
      setJarTargetColors((cols) => cols.slice(0, prev.length));
      setExtraJarUnlocked(false);
    }
    setMoves((m) => Math.max(0, m - 1));
    setSelected(null);
    setHintPair(null);
    soundFx.tap(sfxEnabled);
  };

  const isCompletedLevel = Boolean(progress.completedLevels[String(levelId)]);
  const isFreeRetry = isDaily || isCompletedLevel || moves === 0;
  const needsLifeForRetry = !isFreeRetry;
  const hasLifeForRetry = !needsLifeForRetry || availableLives > 0;
  const chargesLifeOnFailure = !isDaily && !isCompletedLevel;

  const handleRequestReset = () => {
    if (victoryInfo || pourAnim || adLoading) return;
    soundFx.tap(sfxEnabled);
    setAdErrorMessage(null);
    setResetConfirmOpen(true);
  };

  const handleConfirmRestart = () => {
    if (victoryInfo || pourAnim || adLoading) return;
    if (needsLifeForRetry) {
      const ok = onSpendLifeForRetry(levelId);
      if (!ok) {
        soundFx.locked(sfxEnabled);
        setResetConfirmOpen(false);
        setOutOfLivesLocked(true);
        onToast('No lives left. Wait for refill, watch an ad, or claim from friends.');
        return;
      }
    }
    resetBoardFresh();
  };

  // Failing a level without watching an ad strictly costs 1 life on uncompleted standard levels
  const handleFailRetry = () => {
    if (adLoading) return;
    if (chargesLifeOnFailure && !failureLifeChargedRef.current) {
      const remaining = onLoseLifeOnFailure(levelId);
      failureLifeChargedRef.current = true;
      if (remaining <= 0) {
        soundFx.locked(sfxEnabled);
        setFailReason(null);
        setOutOfLivesLocked(true);
        onToast('Life lost (0 left). Wait for refill, watch an ad, or claim from friends.');
        return;
      }
      onToast(`-1 Life (${remaining} left)`);
      resetBoardFresh();
      return;
    }

    if (chargesLifeOnFailure && availableLives <= 0) {
      setFailReason(null);
      setOutOfLivesLocked(true);
      return;
    }

    resetBoardFresh();
  };

  const handleFailExitToMap = () => {
    if (chargesLifeOnFailure && !failureLifeChargedRef.current) {
      const remaining = onLoseLifeOnFailure(levelId);
      failureLifeChargedRef.current = true;
      onToast(`Level failed · -1 Life (${remaining} left)`);
    }
    onExit();
  };

  const handleContinueTrying = () => {
    soundFx.tap(sfxEnabled);
    setDismissedStuckSig(boardSignature);
    setStuckReason(null);
  };

  const handleHint = () => {
    if (!showHints || victoryInfo || failReason || pourAnim || adLoading) return;
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
    if (victoryInfo || failReason || pourAnim || adLoading) return;
    const prevSnapshot = tubes.map((t) => [...t]);
    const next = tubes.map((t) => [...t]);
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
  const displayTimeBalance = levelData.hasTimeLimit
    ? timeLeft
    : Math.max(0, levelData.timeLimit - elapsedSec);

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
  // Bigger screen-fitting crystal glass jars sized cleanly with clamp() for zero scroll
  const jarSizeClass = isTwoRows
    ? 'w-[clamp(56px,15.5vw,94px)] h-[clamp(142px,27dvh,218px)]'
    : 'w-[clamp(66px,16.5vw,108px)] h-[clamp(196px,44dvh,296px)]';

  return (
    <div className="relative z-10 h-full w-full overflow-hidden flex flex-col items-center justify-between px-2.5 sm:px-6 py-2 sm:py-3">
      <div className="relative z-10 w-full max-w-4xl h-full flex flex-col justify-between gap-2">
        {/* Top Compact HUD + Level Targets Panel */}
        <div className="shrink-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2 rounded-2xl theme-surface-glass backdrop-blur-md border px-3 py-1.5 shadow-[0_6px_16px_-10px_rgba(24,18,12,0.28)]">
            <button
              type="button"
              onClick={onExit}
              aria-label="Back to map"
              className="min-h-[38px] px-3 py-1 rounded-xl theme-surface-muted border text-xs sm:text-sm font-bold inline-flex items-center gap-1 cursor-pointer hover:opacity-90"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Map</span>
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <h1 className="font-display text-base sm:text-xl font-bold theme-ink truncate">
                {isDaily ? 'Daily Challenge' : `Level ${levelId}`}
              </h1>
              <span className="text-xs font-bold theme-ink-secondary whitespace-nowrap">
                · {levelData.difficulty}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  soundFx.tap(sfxEnabled);
                  haptic('light');
                  setFastForward((prev) => !prev);
                }}
                aria-pressed={fastForward}
                aria-label={fastForward ? 'Fast-forward 2x enabled' : 'Enable 2x fast-forward pouring'}
                title="Toggle 2× pouring speed"
                className={`min-h-[38px] px-2.5 py-1 rounded-xl font-display text-xs sm:text-sm font-bold inline-flex items-center gap-1 cursor-pointer transition-all ${
                  fastForward
                    ? 'btn-tactile-gold text-[#472904]'
                    : 'theme-surface-muted border theme-ink'
                }`}
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>2×</span>
              </button>

              <button
                type="button"
                onClick={onOpenLivesModal}
                aria-label={`${availableLives} lives`}
                className="min-h-[38px] inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#FFE7EC] dark:bg-[#3A1E33] border border-[#F3BCC8] dark:border-[#6A3256] font-display text-sm font-bold text-[#B82843] dark:text-[#FF8AA1] tabular-nums shrink-0 cursor-pointer"
              >
                <Heart className="w-4 h-4 fill-current" />
                <span>{availableLives}</span>
              </button>
            </div>
          </div>

          {/* Level Targets Panel: Non-scrolling required jars + Time & Move Balance */}
          <div className="rounded-2xl theme-surface-glass backdrop-blur-md border px-2.5 py-1.5 shadow-[0_6px_16px_-10px_rgba(24,18,12,0.25)] flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-1 shrink-0">
                <Target className="w-4 h-4 text-[#E55A3C] dark:text-[#2BD4C5]" />
                <span className="font-display text-xs sm:text-sm font-bold theme-ink whitespace-nowrap">
                  Targets
                </span>
                <span className="text-xs font-bold theme-ink-secondary tabular-nums whitespace-nowrap">
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
                        ? 'bg-[#EAF7EF] dark:bg-[#143D38] border-[#2E8555] dark:border-[#2BD4C5]'
                        : target.isColorLockedJar
                        ? 'bg-[#FFF5DA] dark:bg-[#332B14] border-[#E8A317]'
                        : 'theme-surface-muted'
                    }`}
                  >
                    <div
                      className="relative w-3.5 h-5 rounded-b-md rounded-t-xs border overflow-hidden flex items-end bg-white/85 dark:bg-black/35"
                      style={{
                        borderColor: target.sealed
                          ? '#2E8555'
                          : target.isColorLockedJar
                          ? target.swatch.hex
                          : 'var(--border-strong)',
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
                        target.sealed
                          ? 'text-[#1D633B] dark:text-[#5EEAD4]'
                          : 'theme-ink'
                      }`}
                    >
                      {target.isColorLockedJar && !target.sealed && (
                        <Lock
                          className="w-2.5 h-2.5"
                          style={{ color: target.swatch.hex }}
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

            {/* Live Time Balance & Moves Balance Counters (drive 3-Star Policy + Score) */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div
                title={
                  levelData.hasTimeLimit
                    ? 'Time Limit (remaining seconds convert to score + 1 Star)'
                    : 'Time Balance for Bonus Star & Score'
                }
                className={`rounded-xl px-2 py-1 border flex items-center gap-1 tabular-nums ${
                  levelData.hasTimeLimit && timeLeft <= 15
                    ? 'bg-[#FFE7E2] dark:bg-[#4A1C1C] border-[#E55A3C] text-[#B82818] dark:text-[#FF9E8A]'
                    : levelData.hasTimeLimit
                    ? 'bg-[#FFF3CE] dark:bg-[#332B14] border-[#E8A317] text-[#5C3A06] dark:text-[#F5BC38]'
                    : 'theme-surface-muted theme-ink'
                }`}
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span className="font-display text-xs sm:text-sm font-bold">
                  {formatSeconds(displayTimeBalance)}
                </span>
              </div>

              <div
                title={
                  levelData.hasMoveLimit
                    ? 'Moves Remaining (unused moves convert to score + 1 Star)'
                    : 'Moves Balance for Bonus Star & Score'
                }
                className={`rounded-xl px-2 py-1 border flex items-center gap-1 tabular-nums ${
                  levelData.hasMoveLimit && movesLeft <= 4
                    ? 'bg-[#FFE7E2] dark:bg-[#4A1C1C] border-[#E55A3C] text-[#B82818] dark:text-[#FF9E8A]'
                    : levelData.hasMoveLimit
                    ? 'bg-[#FFF3CE] dark:bg-[#332B14] border-[#E8A317] text-[#5C3A06] dark:text-[#F5BC38]'
                    : 'theme-surface-muted theme-ink'
                }`}
              >
                <Footprints className="w-3.5 h-3.5 shrink-0" />
                <span className="font-display text-xs sm:text-sm font-bold">
                  {movesLeft}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Centered Optical Crystal Glass Jar Arena (zero scroll) */}
        <div className="relative flex-1 min-h-0 rounded-[28px] overflow-hidden theme-puzzle-stage backdrop-blur-xs border px-2 sm:px-6 py-2 flex items-center justify-center shadow-[0_18px_42px_-16px_rgba(16,14,12,0.38)]">
          <div
            ref={boardRef}
            className={`relative w-full h-full flex flex-col items-center justify-center ${
              isTwoRows ? 'gap-3.5 sm:gap-6' : 'gap-6'
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
                  strokeWidth="16"
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
                  strokeWidth="9.5"
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
                  strokeOpacity="0.9"
                  strokeWidth="2.8"
                  strokeDasharray="11 13"
                  strokeLinecap="round"
                  className="animate-stream-flow"
                />

                <g transform={`translate(${pourAnim.streamX}, ${pourAnim.streamBottomY})`}>
                  <ellipse
                    cx="0"
                    cy="0"
                    rx="17"
                    ry="4.8"
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
                    const busy = adLoading === 'extra-jar';
                    return (
                      <div key="locked-extra-jar" className="relative flex flex-col items-center">
                        <button
                          type="button"
                          onClick={() => handleWatchRewardedAd('extra-jar')}
                          disabled={Boolean(adLoading)}
                          aria-label="Unlock extra jar by watching a rewarded ad"
                          className={`relative flex flex-col items-center justify-end ${jarSizeClass} transition-transform duration-150 hover:scale-105 active:scale-95 disabled:opacity-60 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E55A3C]`}
                        >
                          <div className="jar-3d-locked-ad relative w-[60%] h-[14%] rounded-t-md border-[2px] border-b-0 border-dashed border-[#B89048] dark:border-[#539AB8] flex items-start justify-center">
                            <span
                              aria-hidden="true"
                              className="jar-3d-rim absolute -top-1 -left-1 -right-1 h-2 rounded-full border border-[#B89048] dark:border-[#62B5D4]"
                            />
                          </div>
                          <div className="jar-3d-locked-ad relative w-full h-[86%] rounded-t-[20px] rounded-b-[32px] border-[2px] border-dashed border-[#B89048] dark:border-[#539AB8] flex flex-col items-center justify-center">
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute top-3 bottom-4 left-1.5 w-1 rounded-full bg-white/65"
                            />
                            <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-b from-[#FFE68C] to-[#E8A017] border border-[#FFFDF8] shadow-md flex items-center justify-center text-[#5A3404]">
                              <Lock className="w-4 h-4" />
                            </span>
                            <span className="mt-1 font-display text-[11px] font-bold text-[#9B3616] dark:text-[#7CE8FF]">
                              {busy ? 'AD…' : 'AD'}
                            </span>
                          </div>
                        </button>
                        <span
                          aria-hidden="true"
                          className="mt-1 w-12 h-2 rounded-full bg-black/20 dark:bg-black/50 blur-[2px]"
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
                    : 'var(--jar-edge)';

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

                        {/* Slender High-Contrast Crystal Glass Neck */}
                        <div
                          style={{
                            borderColor: glassBorderColor,
                            background: lockedSwatch
                              ? `linear-gradient(90deg, ${lockedSwatch.light}55, rgba(255,255,255,0.22), ${lockedSwatch.hex}33)`
                              : undefined,
                          }}
                          className="jar-3d-shell relative w-[60%] h-[14%] rounded-t-md border-[2px] border-b-0 z-20 flex items-center justify-center"
                        >
                          <span
                            aria-hidden="true"
                            style={{
                              borderColor: lockedSwatch ? lockedSwatch.hex : 'var(--jar-rim-border)',
                            }}
                            className="jar-3d-rim absolute -top-1 -left-1 -right-1 h-2.5 rounded-full border-[1.5px]"
                          />
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

                        {/* Tall Sculpted Optical Crystal Glass Jar Body */}
                        <div
                          style={{
                            borderColor: glassBorderColor,
                            background: lockedSwatch
                              ? `linear-gradient(180deg, ${lockedSwatch.light}38 0%, ${lockedSwatch.hex}24 65%, ${lockedSwatch.dark}30 100%)`
                              : undefined,
                            boxShadow:
                              isSelected && topLiquidColor
                                ? `0 20px 30px -8px ${topLiquidColor.glow}, inset 2px 0 6px rgba(255,255,255,0.92)`
                                : lockedSwatch
                                ? `0 16px 28px -10px ${lockedSwatch.glow}, inset 2px 0 6px rgba(255,255,255,0.82)`
                                : undefined,
                          }}
                          className={`jar-3d-shell relative w-full h-[86%] rounded-t-[20px] rounded-b-[32px] border-[2px] p-[2.5px] flex flex-col justify-end overflow-hidden ${
                            isSealed ? 'jar-3d-complete' : ''
                          }`}
                        >
                          {/* Optical glass specular reflections */}
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute top-2.5 bottom-4 left-1.5 w-[3.5px] rounded-full bg-gradient-to-b from-white/95 via-white/55 to-white/10 z-20"
                          />
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute top-4 bottom-6 right-1.5 w-[1.5px] rounded-full bg-white/55 z-20"
                          />

                          {/* Subtle 75% Max Fill Etch Line */}
                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute top-[15%] left-1.5 right-1.5 border-t border-dashed border-black/20 dark:border-white/25 z-20"
                          />

                          {/* Colored Target Jar watermark when empty */}
                          {lockedSwatch && displayTube.length === 0 && (
                            <div
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-0 flex items-center justify-center z-10"
                            >
                              <span
                                className="w-8 h-8 rounded-full border-2 border-white/90 shadow-sm flex items-center justify-center"
                                style={{
                                  background: `radial-gradient(circle at 35% 30%, ${lockedSwatch.light}, ${lockedSwatch.hex} 68%, ${lockedSwatch.dark})`,
                                }}
                              >
                                <Lock className="w-4 h-4 text-white" />
                              </span>
                            </div>
                          )}

                          {/* Liquid Interior */}
                          <div className="relative flex flex-col-reverse gap-[1px] w-full h-[85%] justify-start rounded-b-[28px] overflow-hidden z-10">
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
                                    isBottom ? 'rounded-b-[27px]' : ''
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
                        className={`mt-1 h-2 rounded-full bg-black/25 dark:bg-black/55 blur-[2px] transition-all duration-150 ${
                          isSelected || isPourSource ? 'w-7 opacity-40' : 'w-14 sm:w-16 opacity-80'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Compact Action Bar */}
        <div className="shrink-0 grid grid-cols-5 gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length === 0 || Boolean(pourAnim) || Boolean(failReason) || Boolean(adLoading)}
            aria-label="Undo"
            className="min-h-[44px] px-2 py-1.5 rounded-2xl theme-surface-strong disabled:opacity-45 border font-display text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 cursor-pointer"
          >
            <Undo2 className="w-4 h-4 text-[#E55A3C] dark:text-[#FF785A]" />
            <span>Undo</span>
          </button>

          <button
            type="button"
            onClick={handleRequestReset}
            disabled={Boolean(pourAnim) || Boolean(adLoading)}
            aria-label="Restart"
            className="min-h-[44px] px-2 py-1.5 rounded-2xl theme-surface-strong disabled:opacity-45 border font-display text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-[#C96A1B] dark:text-[#F5BC38]" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={handleHint}
            disabled={!showHints || Boolean(pourAnim) || Boolean(failReason) || Boolean(adLoading)}
            aria-label="Hint"
            className="min-h-[44px] px-2 py-1.5 rounded-2xl btn-tactile-gold disabled:opacity-45 text-[#472904] font-display text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 cursor-pointer"
          >
            <Lightbulb className="w-4 h-4" />
            <span>Hint</span>
          </button>

          <button
            type="button"
            onClick={handleShuffle}
            disabled={Boolean(pourAnim) || Boolean(failReason) || Boolean(adLoading)}
            aria-label="Shuffle"
            className="min-h-[44px] px-2 py-1.5 rounded-2xl btn-tactile-coral disabled:opacity-45 text-white font-display text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 cursor-pointer"
          >
            <Shuffle className="w-4 h-4" />
            <span>Shuffle</span>
          </button>

          <button
            type="button"
            onClick={() => handleWatchRewardedAd('extra-jar')}
            disabled={extraJarUnlocked || Boolean(pourAnim) || Boolean(failReason) || Boolean(adLoading)}
            aria-label="Unlock extra jar by watching ad"
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
                <span>{adLoading === 'extra-jar' ? 'Ad…' : '+Jar'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {resetConfirmOpen && !victoryInfo && !outOfLivesLocked && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-confirm-title"
        >
          <div className="w-full max-w-sm rounded-3xl theme-surface border-2 p-6 text-center shadow-2xl animate-victory-card">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-[#FFF2D4] dark:bg-[#332B14] border border-[#E8C987] dark:border-[#6A5624] flex items-center justify-center text-[#C96A1B] dark:text-[#F5BC38] mb-3">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h2 id="reset-confirm-title" className="font-display text-2xl font-bold theme-ink">
              Restart Level?
            </h2>
            <p className="mt-1.5 text-sm theme-ink-secondary">
              {!needsLifeForRetry
                ? 'Your current jars will reset to the start.'
                : hasLifeForRetry
                ? 'Restarting uses 1 life and resets all jars.'
                : 'No lives left. Watch a real ad for +1 life or claim from friends.'}
            </p>
            {adErrorMessage && (
              <p className="mt-2 text-xs font-semibold text-[#C93B22] dark:text-[#FF8A75]">
                {adErrorMessage}
              </p>
            )}
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
                <>
                  <button
                    type="button"
                    onClick={() => handleWatchRewardedAd('extra-life')}
                    disabled={Boolean(adLoading)}
                    className="w-full min-h-[48px] rounded-2xl btn-tactile-emerald disabled:opacity-60 text-white font-display text-base font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Tv className="w-4 h-4" />
                    <span>{adLoading === 'extra-life' ? 'Checking Ad…' : 'Watch Ad · +1 Life'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResetConfirmOpen(false);
                      onOpenLivesModal();
                    }}
                    className="w-full min-h-[44px] rounded-2xl btn-tactile-gold text-[#472904] font-display text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Users className="w-4 h-4" />
                    <span>Lives &amp; Friends</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  soundFx.tap(sfxEnabled);
                  setResetConfirmOpen(false);
                }}
                className="w-full min-h-[44px] rounded-2xl theme-surface-muted border font-display text-sm font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No Valid Moves / Cannot Complete Prompt */}
      {stuckReason && !failReason && !resetConfirmOpen && !victoryInfo && !outOfLivesLocked && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stuck-title"
        >
          <div className="w-full max-w-sm rounded-3xl theme-surface border-2 p-6 text-center shadow-2xl animate-victory-card">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-[#FFEED8] dark:bg-[#3A2814] border border-[#E8B872] dark:border-[#6E4D24] flex items-center justify-center text-[#D46218] dark:text-[#FF9E5E] mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 id="stuck-title" className="font-display text-2xl font-bold theme-ink">
              {stuckReason === 'no-moves' ? 'No Moves Left' : 'Cannot Complete'}
            </h2>
            <p className="mt-1.5 text-sm theme-ink-secondary">
              No winning pours remain from this state. Restart now or continue trying with Undo,
              Shuffle, or +Jar.
            </p>
            {adErrorMessage && (
              <p className="mt-2 text-xs font-semibold text-[#C93B22] dark:text-[#FF8A75]">
                {adErrorMessage}
              </p>
            )}
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
                  onClick={() => handleWatchRewardedAd('extra-life')}
                  disabled={Boolean(adLoading)}
                  className="w-full min-h-[46px] rounded-2xl btn-tactile-emerald disabled:opacity-60 text-white font-display text-base font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Tv className="w-4 h-4" />
                  <span>
                    {adLoading === 'extra-life' ? 'Checking Ad…' : 'Watch Ad · +1 Life & Restart'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Level Failed Overlay (Strict 1-life loss if exiting/retrying without watching a real ad) */}
      {failReason && !victoryInfo && !outOfLivesLocked && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fail-title"
        >
          <div className="w-full max-w-sm rounded-3xl theme-surface border-2 p-6 text-center shadow-2xl animate-victory-card">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-[#FFE7E2] dark:bg-[#4A1C1C] border border-[#F0A899] dark:border-[#7A3232] flex items-center justify-center text-[#C93B22] dark:text-[#FF8A75] mb-3">
              {failReason === 'time' ? (
                <Clock className="w-6 h-6" />
              ) : (
                <Footprints className="w-6 h-6" />
              )}
            </div>
            <h2 id="fail-title" className="font-display text-2xl font-bold theme-ink">
              Level Failed
            </h2>
            <p className="mt-1 text-sm font-semibold text-[#8A462B] dark:text-[#FF9E8A] tabular-nums">
              {failReason === 'time' ? 'Time ran out' : 'Out of moves'} · {completedTargetsCount}/
              {targetProgressList.length} jars complete
            </p>
            {chargesLifeOnFailure && (
              <p className="mt-1 text-xs theme-ink-secondary">
                Watch an ad to continue, or retrying/exiting costs 1 life.
              </p>
            )}
            {adErrorMessage && (
              <p className="mt-2 text-xs font-semibold text-[#C93B22] dark:text-[#FF8A75]">
                {adErrorMessage}
              </p>
            )}
            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                onClick={() =>
                  handleWatchRewardedAd(failReason === 'time' ? 'extra-time' : 'extra-moves')
                }
                disabled={Boolean(adLoading)}
                className="w-full min-h-[48px] rounded-2xl btn-tactile-emerald disabled:opacity-60 text-white font-display text-base font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Tv className="w-4 h-4" />
                <span>
                  {adLoading === 'extra-time' || adLoading === 'extra-moves'
                    ? 'Checking Ad…'
                    : failReason === 'time'
                    ? 'Watch Ad · +30s Continue'
                    : 'Watch Ad · +5 Moves'}
                </span>
              </button>
              <button
                type="button"
                onClick={handleFailRetry}
                disabled={Boolean(adLoading)}
                className="w-full min-h-[46px] rounded-2xl btn-tactile-coral disabled:opacity-60 text-white font-display text-base font-bold cursor-pointer"
              >
                {chargesLifeOnFailure ? 'Retry Level (-1 Life)' : 'Retry Level'}
              </button>
              <button
                type="button"
                onClick={handleFailExitToMap}
                className="w-full min-h-[44px] rounded-2xl theme-surface-muted border font-display text-sm font-bold cursor-pointer"
              >
                {chargesLifeOnFailure ? 'Map (-1 Life)' : 'Map'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Out of Lives Gate (When all 5 lives are gone) */}
      {outOfLivesLocked && !victoryInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="out-of-lives-title"
        >
          <div className="w-full max-w-sm rounded-3xl theme-surface border-2 p-6 text-center shadow-2xl animate-victory-card">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-[#FFE7EC] dark:bg-[#3A1E33] border border-[#F3BCC8] dark:border-[#6A3256] flex items-center justify-center text-[#D93D59] mb-3">
              <Heart className="w-6 h-6" />
            </div>
            <h2 id="out-of-lives-title" className="font-display text-2xl font-bold theme-ink">
              Out of Lives
            </h2>
            <p className="mt-1.5 text-sm theme-ink-secondary">
              Wait for your next free life refill, watch a rewarded ad (+1 life per ad), or claim a shared life from friends.
            </p>
            {adErrorMessage && (
              <p className="mt-2 text-xs font-semibold text-[#C93B22] dark:text-[#FF8A75]">
                {adErrorMessage}
              </p>
            )}
            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                onClick={() => handleWatchRewardedAd('extra-life')}
                disabled={Boolean(adLoading)}
                className="w-full min-h-[48px] rounded-2xl btn-tactile-emerald disabled:opacity-60 text-white font-display text-base font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Tv className="w-4 h-4" />
                <span>{adLoading === 'extra-life' ? 'Checking Ad…' : 'Watch Ad · +1 Life'}</span>
              </button>
              <button
                type="button"
                onClick={onOpenLivesModal}
                className="w-full min-h-[46px] rounded-2xl btn-tactile-gold text-[#472904] font-display text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Users className="w-4 h-4" />
                <span>Refill Timer &amp; Friends</span>
              </button>
              <button
                type="button"
                onClick={onExit}
                className="w-full min-h-[44px] rounded-2xl theme-surface-muted border font-display text-sm font-bold cursor-pointer"
              >
                Back to Map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fast Winning Celebration Confetti & 3-Star Score Breakdown Modal */}
      {victoryInfo && (
        <>
          <VictoryConfetti
            active={Boolean(victoryInfo)}
            stars={victoryInfo.breakdown.stars}
            themeId={themeId}
            reduceMotion={reduceMotion}
          />
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
            aria-labelledby="victory-title"
          >
            <div
              className={`relative z-[60] w-full max-w-sm rounded-3xl theme-surface border-2 p-6 text-center shadow-[0_24px_64px_-12px_rgba(16,14,12,0.48)] overflow-hidden ${
                reduceMotion ? '' : 'animate-level-cleared'
              }`}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-40 rounded-full bg-radial from-[#FFE6A3]/65 via-[#FDE4B2]/25 to-transparent blur-xl"
              />

              <div className="relative flex items-center justify-center gap-2.5 mb-2 pt-1">
                {[1, 2, 3].map((s) => {
                  const earned = s <= victoryInfo.breakdown.stars;
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
                          : 'text-[#C8BCA6] dark:text-[#2B4E68] fill-transparent'
                      }`}
                    />
                  );
                })}
              </div>

              <h2
                id="victory-title"
                className="relative font-display text-2xl font-bold theme-ink"
              >
                {isDaily ? 'Daily Clear!' : `Level ${levelId} Clear!`}
              </h2>

              <div className="relative mt-3.5 rounded-2xl theme-surface-muted border p-3 text-left space-y-1.5 text-xs tabular-nums">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 font-semibold theme-ink">
                    <Star className="w-3.5 h-3.5 text-[#E8A317] fill-[#F5BC38]" />
                    Level Complete
                  </span>
                  <span className="font-bold theme-ink">+{String(victoryInfo.breakdown.baseScore).padStart(5, '0')}</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 font-semibold theme-ink">
                    <Star
                      className={`w-3.5 h-3.5 ${
                        victoryInfo.breakdown.moveEfficiencyStar
                          ? 'text-[#E8A317] fill-[#F5BC38]'
                          : 'text-[#B5A996] dark:text-[#3A5B73]'
                      }`}
                    />
                    Move Efficiency ({victoryInfo.breakdown.movesUsed}/{victoryInfo.breakdown.moveTarget} par)
                  </span>
                  <span className="font-bold theme-ink">
                    {victoryInfo.breakdown.moveEfficiencyStar
                      ? `+${String(victoryInfo.breakdown.movesScore).padStart(5, '0')}`
                      : 'Missed'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 font-semibold theme-ink">
                    <Star
                      className={`w-3.5 h-3.5 ${
                        victoryInfo.breakdown.speedStar
                          ? 'text-[#E8A317] fill-[#F5BC38]'
                          : 'text-[#B5A996] dark:text-[#3A5B73]'
                      }`}
                    />
                    Speed ({formatSeconds(victoryInfo.timeTakenSec)}/{formatSeconds(victoryInfo.breakdown.speedTargetSec)})
                  </span>
                  <span className="font-bold theme-ink">
                    {victoryInfo.breakdown.speedStar
                      ? `+${String(victoryInfo.breakdown.timeScore).padStart(5, '0')}`
                      : 'Missed'}
                  </span>
                </div>

                {!isDaily && (
                  <div className="flex items-center justify-between gap-2 text-[11px] pt-0.5">
                    <span className="font-semibold theme-ink-secondary">
                      Clear Time: {formatSeconds(victoryInfo.timeTakenSec)}
                    </span>
                    {victoryInfo.isNewBestTime && (
                      <span className="font-bold text-[#2E8555] dark:text-[#5EEAD4]">
                        ★ New Fastest Time!
                      </span>
                    )}
                  </div>
                )}

                <div className="pt-1.5 mt-1 border-t theme-border flex items-center justify-between font-display text-sm font-bold">
                  <span className="theme-ink">Level Score</span>
                  <span className="text-[#2E8555] dark:text-[#5EEAD4]">
                    {String(victoryInfo.breakdown.totalScore).padStart(5, '0')} pts
                  </span>
                </div>
              </div>

              <div className="relative mt-2.5 flex items-center justify-center gap-3 text-xs font-bold tabular-nums">
                <span className="inline-flex items-center gap-1 text-[#9A5F0A] dark:text-[#F5BC38]">
                  <Coins className="w-3.5 h-3.5 text-[#E59B14]" />
                  <span>+{victoryInfo.coinsEarned} coins</span>
                </span>
                <span aria-hidden="true" className="theme-ink-muted">·</span>
                <span className="inline-flex items-center gap-1 text-[#2E8555] dark:text-[#5EEAD4]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>+{victoryInfo.xpEarned} XP</span>
                </span>
              </div>

              {victoryInfo.isPerfect && (
                <div className="relative mt-2 px-3 py-1 rounded-2xl bg-gradient-to-r from-[#FFF5D6] via-[#FFE380] to-[#FCA311] border border-[#E5A317] text-[#5A3404] font-display text-xs font-extrabold shadow-sm flex items-center justify-center gap-1.5 animate-unlock-pop">
                  <Star className="w-4 h-4 fill-current text-[#C97B0C]" />
                  <span>★ PERFECT CLEAR! (+25 Bonus Coins) ★</span>
                </div>
              )}

              <div className="relative mt-4 space-y-2.5">
                {!isDaily && (
                  <button
                    type="button"
                    onClick={() => onNextLevel(levelId + 1)}
                    className={`w-full min-h-[50px] rounded-2xl btn-tactile-coral text-white font-display text-lg font-bold cursor-pointer ${
                      reduceMotion ? '' : 'animate-button-bounce'
                    }`}
                  >
                    Next Level ({levelId + 1})
                  </button>
                )}
                <button
                  type="button"
                  onClick={onExit}
                  className="w-full min-h-[46px] rounded-2xl theme-surface-muted border font-display text-base font-bold cursor-pointer"
                >
                  Back to Map
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
