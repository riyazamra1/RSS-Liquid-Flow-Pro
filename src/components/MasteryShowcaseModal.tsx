import React from 'react';
import {
  Award,
  Check,
  Clock,
  Coins,
  Crown,
  Footprints,
  Play,
  RotateCcw,
  Sparkles,
  Star,
  Timer,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { PlayerProgress } from '../types/game';
import {
  generateLevel,
  getDifficultyConstraints,
  getDifficultyForLevel,
  getStarMasteryTargets,
  getWorldForLevel,
} from '../utils/levelGenerator';

export interface MasteryShowcaseModalProps {
  open: boolean;
  levelId: number | null;
  progress: PlayerProgress;
  onClose: () => void;
  onPlay: (levelId: number) => void;
  onOpenDetails?: (levelId: number) => void;
}

function formatDuration(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * MasteryShowcaseModal
 * Displays detailed performance breakdown when a user clicks a level with a 'Perfect' score badge,
 * highlighting Move Count Efficiency, Time Saved, Speedrun Best, and 3-Star Clean Sweep metrics.
 */
export const MasteryShowcaseModal: React.FC<MasteryShowcaseModalProps> = ({
  open,
  levelId,
  progress,
  onClose,
  onPlay,
  onOpenDetails,
}) => {
  if (!open || levelId === null) return null;

  const difficulty = getDifficultyForLevel(levelId);
  const world = getWorldForLevel(levelId);
  const levelData = generateLevel(levelId, false);
  const constraints = getDifficultyConstraints(levelId, difficulty, false);
  const { moveTarget, speedTargetSec } = getStarMasteryTargets(
    levelData.moveLimit,
    levelData.timeLimit
  );

  const bestScore = Number(progress.levelScores?.[String(levelId)]) || 0;
  const bestStars = Math.min(3, Math.max(0, Number(progress.levelStars?.[String(levelId)]) || 3));

  // Move statistics
  const moveBudget = levelData.moveLimit;
  const recordedMoves = Number(progress.levelBestMoves?.[String(levelId)]) || 0;
  // If not explicitly recorded yet, a perfect clear is guaranteed to be <= moveTarget
  const bestMoves = recordedMoves > 0 ? recordedMoves : moveTarget;
  const movesSaved = Math.max(0, moveBudget - bestMoves);
  const movesUnderPar = Math.max(0, moveTarget - bestMoves);
  const moveEfficiencyPct = Math.min(
    100,
    Math.max(0, Math.round((moveTarget / Math.max(1, bestMoves)) * 100))
  );

  // Time & Speedrun statistics
  const timeLimit = levelData.timeLimit;
  const recordedTime = Number(progress.levelBestTimes?.[String(levelId)]) || 0;
  const fastestTimeSec = recordedTime > 0 ? recordedTime : speedTargetSec;
  const timeSavedSec = Math.max(0, timeLimit - fastestTimeSec);
  const timeSavedVsGoal = Math.max(0, speedTargetSec - fastestTimeSec);
  const speedEfficiencyPct = Math.min(
    100,
    Math.max(0, Math.round(((timeLimit - fastestTimeSec) / Math.max(1, timeLimit)) * 100))
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mastery-showcase-title"
    >
      <div className="relative w-full max-w-md rounded-3xl theme-surface border-2 p-6 shadow-2xl animate-victory-card max-h-[92dvh] overflow-y-auto">
        {/* Decorative Crown Ambient Glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-14 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full bg-radial from-[#FFD54F]/40 via-[#F59E0B]/15 to-transparent blur-xl"
        />

        {/* Modal Header */}
        <div className="relative flex items-start justify-between pb-3 border-b theme-border">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#D97706] dark:text-[#FBBF24]">
              <Crown className="w-3.5 h-3.5 fill-current" />
              <span>{world.name} · World {world.id}</span>
            </div>
            <h2 id="mastery-showcase-title" className="font-display text-2xl font-bold theme-ink leading-tight mt-0.5">
              Level {levelId} Mastery
            </h2>
            <p className="text-xs theme-ink-secondary mt-0.5">
              Flawless completion without resets · 3-Star Clean Sweep
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close mastery showcase"
            className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl theme-surface-muted border cursor-pointer hover:opacity-80 transition-opacity"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hero Banner: Perfect Score & Badges */}
        <div className="relative mt-4 rounded-2xl bg-gradient-to-r from-[#FFF4CC] via-[#FFE380] to-[#F59E0B] p-4 text-[#422006] shadow-sm border border-[#FCD34D]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#FFFDF0] to-[#FDE68A] border-2 border-white shadow-md flex items-center justify-center text-[#B45309] shrink-0">
                <Trophy className="w-6 h-6 fill-[#F59E0B] text-[#92400E]" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#92400E] leading-none">
                  ★ PERFECT RUN ★
                </span>
                <div className="font-display text-lg font-extrabold text-[#451A03] leading-tight">
                  Mastery Achieved
                </div>
                <div className="text-xs font-semibold text-[#78350F] flex items-center gap-1 mt-0.5">
                  <Coins className="w-3.5 h-3.5 text-[#B45309]" />
                  <span>+25 Bonus Coins Earned</span>
                </div>
              </div>
            </div>

            {bestScore > 0 && (
              <div className="text-right shrink-0">
                <div className="text-[10px] font-bold text-[#78350F] uppercase">Best Score</div>
                <div className="font-display text-xl font-black text-[#451A03] tabular-nums leading-none">
                  {bestScore.toLocaleString()}
                </div>
                <div className="text-[10px] font-semibold text-[#92400E]">points</div>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Stats Grid: Move Count Efficiency & Time Saved */}
        <div className="mt-4 space-y-3">
          {/* Card 1: Move Count Efficiency */}
          <div className="rounded-2xl theme-surface-muted border p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FFE7DF] dark:bg-[#3D1A16] text-[#E55A3C] flex items-center justify-center shrink-0">
                  <Footprints className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold theme-ink leading-tight">
                    Move Count Efficiency
                  </h3>
                  <p className="text-[11px] theme-ink-secondary">
                    Par Goal: ≤ {moveTarget} moves (Limit: {moveBudget})
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E2F3E8] dark:bg-[#143D31] text-[#1D633B] dark:text-[#5EEAD4] text-[10px] font-bold shrink-0">
                <Check className="w-3 h-3" />
                <span>{moveEfficiencyPct}% Par</span>
              </span>
            </div>

            {/* Metric Readout */}
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="rounded-xl theme-surface border p-2">
                <div className="text-[10px] theme-ink-secondary">Poured</div>
                <div className="font-display text-base font-bold theme-ink tabular-nums">
                  {bestMoves}
                </div>
                <div className="text-[10px] theme-ink-muted">moves</div>
              </div>
              <div className="rounded-xl theme-surface border p-2">
                <div className="text-[10px] theme-ink-secondary">Par Target</div>
                <div className="font-display text-base font-bold text-[#E8A317] tabular-nums">
                  {moveTarget}
                </div>
                <div className="text-[10px] theme-ink-muted">par goal</div>
              </div>
              <div className="rounded-xl bg-[#EAF7EF] dark:bg-[#13382D] border border-[#A5D6B5] dark:border-[#1F5F4B] p-2">
                <div className="text-[10px] text-[#1D633B] dark:text-[#5EEAD4] font-bold">Saved</div>
                <div className="font-display text-base font-bold text-[#1D633B] dark:text-[#5EEAD4] tabular-nums">
                  +{movesSaved}
                </div>
                <div className="text-[10px] text-[#1D633B] dark:text-[#5EEAD4]">under max</div>
              </div>
            </div>

            {/* Move Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-semibold theme-ink-secondary tabular-nums">
                <span>Move Usage: {bestMoves} / {moveBudget} max</span>
                <span className="text-[#2E8555] dark:text-[#5EEAD4]">
                  {movesUnderPar > 0 ? `${movesUnderPar} below par target` : 'Met par target'}
                </span>
              </div>
              <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#2E8555] to-[#4ADE80]"
                  style={{
                    width: `${Math.min(100, Math.max(10, Math.round((bestMoves / moveBudget) * 100)))}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Time Saved / Speedrun Performance */}
          <div className="rounded-2xl theme-surface-muted border p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FFF3CE] dark:bg-[#382B14] text-[#D97706] dark:text-[#FBBF24] flex items-center justify-center shrink-0">
                  <Timer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold theme-ink leading-tight">
                    Time Saved &amp; Speed Mastery
                  </h3>
                  <p className="text-[11px] theme-ink-secondary">
                    Speed Goal: ≤ {formatDuration(speedTargetSec)} (Limit: {formatDuration(timeLimit)})
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E2F3E8] dark:bg-[#143D31] text-[#1D633B] dark:text-[#5EEAD4] text-[10px] font-bold shrink-0">
                <Zap className="w-3 h-3 fill-current" />
                <span>{speedEfficiencyPct}% Speed</span>
              </span>
            </div>

            {/* Time Metric Readout */}
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="rounded-xl theme-surface border p-2">
                <div className="text-[10px] theme-ink-secondary">Fastest Clear</div>
                <div className="font-display text-base font-bold theme-ink tabular-nums">
                  {formatDuration(fastestTimeSec)}
                </div>
                <div className="text-[10px] theme-ink-muted">personal best</div>
              </div>
              <div className="rounded-xl theme-surface border p-2">
                <div className="text-[10px] theme-ink-secondary">Speed Goal</div>
                <div className="font-display text-base font-bold text-[#E8A317] tabular-nums">
                  {formatDuration(speedTargetSec)}
                </div>
                <div className="text-[10px] theme-ink-muted">3-star target</div>
              </div>
              <div className="rounded-xl bg-[#EAF7EF] dark:bg-[#13382D] border border-[#A5D6B5] dark:border-[#1F5F4B] p-2">
                <div className="text-[10px] text-[#1D633B] dark:text-[#5EEAD4] font-bold">Time Saved</div>
                <div className="font-display text-base font-bold text-[#1D633B] dark:text-[#5EEAD4] tabular-nums">
                  +{timeSavedSec}s
                </div>
                <div className="text-[10px] text-[#1D633B] dark:text-[#5EEAD4]">under limit</div>
              </div>
            </div>

            {/* Speed Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-semibold theme-ink-secondary tabular-nums">
                <span>Elapsed: {formatDuration(fastestTimeSec)} / {formatDuration(timeLimit)}</span>
                <span className="text-[#2E8555] dark:text-[#5EEAD4]">
                  {timeSavedVsGoal > 0 ? `${timeSavedVsGoal}s faster than 3★ goal` : 'Met 3★ speed goal'}
                </span>
              </div>
              <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#F59E0B] via-[#10B981] to-[#2BD4C5]"
                  style={{
                    width: `${Math.min(100, Math.max(10, Math.round((fastestTimeSec / timeLimit) * 100)))}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* 3-Star Clean Sweep Badges Summary */}
          <div className="rounded-2xl theme-surface-muted border p-3 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold theme-ink">
              <div className="flex items-center text-[#E8A317]">
                <Star className="w-4 h-4 fill-[#F5BC38]" />
                <Star className="w-4 h-4 fill-[#F5BC38]" />
                <Star className="w-4 h-4 fill-[#F5BC38]" />
              </div>
              <span>Clean Sweep Stars</span>
            </div>
            <span className="font-bold text-[#2E8555] dark:text-[#5EEAD4] tabular-nums">
              3 / 3 Stars Earned
            </span>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onPlay(levelId);
            }}
            className="w-full min-h-[48px] rounded-2xl btn-tactile-coral text-white font-display text-base font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md hover:scale-[1.02] active:scale-95 transition-transform"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Replay Level {levelId}</span>
          </button>

          <div className="flex gap-2">
            {onOpenDetails && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDetails(levelId);
                }}
                className="flex-1 min-h-[42px] rounded-2xl theme-surface-muted border font-display text-xs sm:text-sm font-bold theme-ink cursor-pointer hover:opacity-90"
              >
                View Level Rules
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[42px] rounded-2xl theme-surface-muted border font-display text-xs sm:text-sm font-bold theme-ink cursor-pointer hover:opacity-90"
            >
              Back to Map
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
