import React from 'react';
import { Award, Clock, Coins, Crown, Footprints, Play, Sparkles, Star, Timer, X } from 'lucide-react';
import { PlayerProgress } from '../types/game';
import {
  generateLevel,
  getDifficultyConstraints,
  getDifficultyForLevel,
  getStarMasteryTargets,
  getWorldForLevel,
} from '../utils/levelGenerator';

interface LevelDetailsModalProps {
  open: boolean;
  levelId: number | null;
  progress: PlayerProgress;
  onClose: () => void;
  onPlay: (levelId: number) => void;
  onOpenMasteryShowcase?: (levelId: number) => void;
}

function formatTargetTime(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const LevelDetailsModal: React.FC<LevelDetailsModalProps> = ({
  open,
  levelId,
  progress,
  onClose,
  onPlay,
  onOpenMasteryShowcase,
}) => {
  if (!open || levelId === null) return null;

  const difficulty = getDifficultyForLevel(levelId);
  const constraints = getDifficultyConstraints(levelId, difficulty, false);
  const levelData = generateLevel(levelId, false);
  const { moveTarget, speedTargetSec } = getStarMasteryTargets(
    levelData.moveLimit,
    levelData.timeLimit
  );
  const world = getWorldForLevel(levelId);
  const isCompleted = Boolean(progress.completedLevels[String(levelId)]);
  const isPerfect = Boolean(progress.perfectLevels?.[String(levelId)]);
  const bestStars = Math.min(3, Math.max(0, Number(progress.levelStars[String(levelId)]) || 0));
  const bestScore = Number(progress.levelScores?.[String(levelId)]) || 0;
  const fastestTimeSec = Number(progress.levelBestTimes?.[String(levelId)]) || 0;
  const hasFastestTime = fastestTimeSec > 0;
  const beatSpeedGoal = hasFastestTime && fastestTimeSec <= speedTargetSec;

  const masteryLabel =
    bestStars >= 3
      ? 'Mastered'
      : bestStars === 2
      ? 'Skilled'
      : bestStars === 1
      ? 'Cleared'
      : 'Not Cleared';

  const expectedCoins = isCompleted ? 15 : 30;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-details-title"
    >
      <div className="w-full max-w-sm rounded-3xl theme-surface border-2 p-6 shadow-2xl animate-victory-card">
        <div className="flex items-center justify-between pb-3 border-b theme-border">
          <div>
            <span className="text-xs font-semibold theme-ink-secondary">
              {world.name}
            </span>
            <h2 id="level-details-title" className="font-display text-xl font-bold theme-ink">
              Level {levelId}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close level details"
            className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl theme-surface-muted cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3.5">
          {/* Difficulty & Mastery Star Status */}
          <div className="flex items-center justify-between gap-2 rounded-2xl theme-surface-muted border p-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-[#E55A3C] text-white flex items-center justify-center font-display text-xs font-bold shrink-0">
                {levelId}
              </span>
              <div>
                <div className="font-display text-sm font-bold theme-ink">
                  Difficulty: {difficulty}
                </div>
                <div className="text-xs theme-ink-secondary">
                  {isCompleted ? `${masteryLabel} · Replay` : 'Unlocked & Ready'}
                </div>
              </div>
            </div>

            {isCompleted && (
              <div className="text-right">
                <div className="flex items-center justify-end gap-0.5 text-[#E8A317]">
                  {[1, 2, 3].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${
                        s <= bestStars ? 'fill-[#F5BC38] text-[#E8A317]' : 'text-black/20 dark:text-white/20'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-[11px] font-bold theme-ink tabular-nums">
                  {bestScore > 0 ? `${bestScore.toLocaleString()} pts` : `${bestStars}/3 Stars`}
                </div>
              </div>
            )}
          </div>

          {/* Perfect Mastery Showcase Shortcut Banner */}
          {isPerfect && onOpenMasteryShowcase && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenMasteryShowcase(levelId);
              }}
              className="w-full min-h-[42px] px-3.5 py-2 rounded-2xl bg-gradient-to-r from-[#FFF4CC] via-[#FFE380] to-[#F59E0B] border border-[#FCD34D] text-[#422006] font-display text-xs font-bold flex items-center justify-between cursor-pointer shadow-xs hover:scale-[1.01] active:scale-98 transition-transform"
            >
              <span className="flex items-center gap-1.5 font-extrabold">
                <Crown className="w-3.5 h-3.5 fill-[#B45309] text-[#78350F]" />
                <span>★ PERFECT SCORE ACHIEVED</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-[#78350F] font-bold">
                <span>View Mastery Showcase</span>
                <Sparkles className="w-3 h-3" />
              </span>
            </button>
          )}

          {/* Fastest Time Speedrun Statistic */}
          <div className="flex items-center justify-between gap-3 rounded-2xl theme-surface-muted border p-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  beatSpeedGoal
                    ? 'bg-[#E2F3E8] dark:bg-[#14453B] text-[#1D633B] dark:text-[#5EEAD4]'
                    : 'bg-[#FFF3CE] dark:bg-[#2F2A14] text-[#9A5F0A] dark:text-[#F5BC38]'
                }`}
              >
                <Timer className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-display text-xs font-bold theme-ink">Fastest Time</div>
                <div className="text-[11px] theme-ink-secondary truncate tabular-nums">
                  {hasFastestTime
                    ? beatSpeedGoal
                      ? `Under ${formatTargetTime(speedTargetSec)} speed par`
                      : `Beat ${formatTargetTime(speedTargetSec)} to earn 3★ speed`
                    : isCompleted
                    ? 'Replay level to record time'
                    : 'Clear level to set speed record'}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div
                className={`font-display text-lg font-extrabold tabular-nums leading-none ${
                  hasFastestTime
                    ? beatSpeedGoal
                      ? 'text-[#1D633B] dark:text-[#5EEAD4]'
                      : 'theme-ink'
                    : 'theme-ink-muted'
                }`}
              >
                {hasFastestTime ? formatTargetTime(fastestTimeSec) : '--:--'}
              </div>
              {hasFastestTime && (
                <div className="mt-0.5 text-[10px] font-semibold theme-ink-muted">
                  Personal Best
                </div>
              )}
            </div>
          </div>

          {/* 3-Star Mastery Targets (Move Efficiency & Speed) */}
          <div className="rounded-2xl theme-surface-muted border p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold theme-ink">
              <span className="inline-flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-[#E59B14]" />
                <span>3-Star Mastery Goals</span>
              </span>
              <span className="text-[11px] theme-ink-secondary tabular-nums">
                {bestStars}/3 Earned
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold theme-ink-secondary tabular-nums pt-0.5">
              <div className="flex items-center gap-1">
                <Footprints className="w-3.5 h-3.5 text-[#E55A3C] shrink-0" />
                <span>Moves: ≤ {moveTarget}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#E8A317] shrink-0" />
                <span>Speed: ≤ {formatTargetTime(speedTargetSec)}</span>
              </div>
            </div>
          </div>

          {/* Expected Rewards & Constraints */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl theme-surface-muted border p-3 text-center">
              <div className="text-[11px] theme-ink-secondary">Expected Reward</div>
              <div className="mt-1 flex items-center justify-center gap-1 font-display text-base font-bold text-[#9A5F0A] dark:text-[#F5BC38] tabular-nums">
                <Coins className="w-4 h-4 text-[#E59B14]" />
                <span>+{expectedCoins} Coins</span>
              </div>
              <div className="text-[10px] theme-ink-muted mt-0.5">+ up to 3 Stars</div>
            </div>

            <div className="rounded-2xl theme-surface-muted border p-3 text-center">
              <div className="text-[11px] theme-ink-secondary">Level Rules</div>
              <div className="mt-1 flex items-center justify-center gap-1.5 text-xs font-bold theme-ink">
                {constraints.hasTimeLimit ? (
                  <span className="inline-flex items-center gap-0.5">
                    <Clock className="w-3.5 h-3.5 text-[#E8A317]" /> Timed
                  </span>
                ) : (
                  <span>Relaxed</span>
                )}
                {constraints.hasMoveLimit && (
                  <span className="inline-flex items-center gap-0.5">
                    <Footprints className="w-3.5 h-3.5 text-[#E55A3C]" /> Moves
                  </span>
                )}
              </div>
              <div className="text-[10px] theme-ink-muted mt-0.5">
                {constraints.hasColoredJar ? 'Colored Target Jar' : 'Standard Jars'}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onPlay(levelId);
            }}
            className="w-full min-h-[48px] rounded-2xl btn-tactile-coral text-white font-display text-base font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Play Level {levelId}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[42px] rounded-2xl theme-surface-muted border font-display text-sm font-bold cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
