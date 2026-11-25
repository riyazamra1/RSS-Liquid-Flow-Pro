import React from 'react';
import { Award, Clock, Coins, Footprints, Lock, Play, Star, Target, X } from 'lucide-react';
import { PlayerProgress } from '../types/game';
import { getDifficultyConstraints, getDifficultyForLevel, getWorldForLevel } from '../utils/levelGenerator';

interface LevelDetailsModalProps {
  open: boolean;
  levelId: number | null;
  progress: PlayerProgress;
  onClose: () => void;
  onPlay: (levelId: number) => void;
}

export const LevelDetailsModal: React.FC<LevelDetailsModalProps> = ({
  open,
  levelId,
  progress,
  onClose,
  onPlay,
}) => {
  if (!open || levelId === null) return null;

  const difficulty = getDifficultyForLevel(levelId);
  const constraints = getDifficultyConstraints(levelId, difficulty, false);
  const world = getWorldForLevel(levelId);
  const isCompleted = Boolean(progress.completedLevels[String(levelId)]);
  const bestStars = Number(progress.levelStars[String(levelId)]) || 0;
  const bestScore = Number(progress.levelScores?.[String(levelId)]) || 0;

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
          {/* Difficulty & Status Badge */}
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
                  {isCompleted ? 'Completed (Replay)' : 'Unlocked & Ready'}
                </div>
              </div>
            </div>

            {isCompleted && (
              <div className="text-right">
                <div className="flex items-center justify-end gap-0.5 text-[#E8A317]">
                  {[1, 2, 3].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${
                        s <= bestStars ? 'fill-[#F5BC38]' : 'text-black/20 dark:text-white/20'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-[11px] font-bold theme-ink tabular-nums">
                  {bestScore > 0 ? `${bestScore.toLocaleString()} pts` : ''}
                </div>
              </div>
            )}
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
