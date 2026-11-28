import React, { useEffect, useRef, useState } from 'react';
import { Clock, Coins, Gift, RotateCw, Sparkles, X } from 'lucide-react';
import { PlayerProgress, SpinWheelSegment } from '../types/game';
import { soundFx } from '../utils/sound';
import {
  getDailySpinStatus,
  pickWeightedSpinSegment,
  SPIN_WHEEL_SEGMENTS,
} from '../utils/storage';

interface SpinWheelModalProps {
  open: boolean;
  progress: PlayerProgress;
  referenceDateKey: string;
  sfxEnabled: boolean;
  reduceMotion: boolean;
  onSpinOutcome: (segment: SpinWheelSegment, usedFreeSpin: boolean) => void;
  onClose: () => void;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeSlice(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = polarToCartesian(cx, cy, r, startDeg);
  const end = polarToCartesian(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg <= 180 ? '0' : '1';
  return `M ${cx} ${cy} L ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)} Z`;
}

export const SpinWheelModal: React.FC<SpinWheelModalProps> = ({
  open,
  progress,
  referenceDateKey,
  sfxEnabled,
  reduceMotion,
  onSpinOutcome,
  onClose,
}) => {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<SpinWheelSegment | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      setIsSpinning(false);
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [open]);

  if (!open) return null;

  const spinStatus = getDailySpinStatus(progress, referenceDateKey);
  const canSpin = !isSpinning && spinStatus.canSpinToday;

  const sliceAngle = 360 / SPIN_WHEEL_SEGMENTS.length;

  const handleSpin = () => {
    if (!canSpin) return;
    const { segment, index } = pickWeightedSpinSegment();

    soundFx.tap(sfxEnabled);
    setIsSpinning(true);
    setLastResult(null);

    const targetMod = (360 - ((index * sliceAngle) % 360)) % 360;
    const jitter = (Math.random() - 0.5) * 18; // keeps pointer squarely inside wedge
    const currentBase = rotation - (rotation % 360);
    const fullSpins = reduceMotion ? 360 : 5 * 360;
    const nextRotation = currentBase + fullSpins + targetMod + jitter;
    setRotation(nextRotation);

    const durationMs = reduceMotion ? 160 : 3400;
    timerRef.current = window.setTimeout(() => {
      setIsSpinning(false);
      setLastResult(segment);
      if (segment.category === 'luck') {
        soundFx.locked(sfxEnabled);
      } else {
        soundFx.reward(sfxEnabled);
      }
      onSpinOutcome(segment, true);
      timerRef.current = null;
    }, durationMs);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/55 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="spin-wheel-title"
    >
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl theme-surface border p-5 sm:p-6 shadow-2xl max-h-[92dvh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-[#E55A3C] dark:text-[#2BD4C5] inline-flex items-center gap-1 tabular-nums">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {spinStatus.canSpinToday
                  ? `${spinStatus.remainingToday} of ${spinStatus.maxDailySpins} Daily Spins Left`
                  : `Daily Limit Reached (${spinStatus.usedToday}/${spinStatus.maxDailySpins})`}
              </span>
            </p>
            <h2 id="spin-wheel-title" className="font-display text-2xl font-bold theme-ink leading-tight">
              Prize Wheel
            </h2>
            <p className="text-xs theme-ink-secondary mt-0.5">
              {spinStatus.canSpinToday
                ? 'Up to 3 daily spins for coins, bonus lives, or luck.'
                : 'No more spin chances today. Come back tomorrow for 3 fresh spins.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSpinning}
            aria-label="Close prize wheel"
            className="min-w-[40px] min-h-[40px] rounded-xl theme-surface-muted border flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Daily Limit Progress Bar (3 Spins Only) */}
        <div className="mt-3.5 flex items-center justify-between gap-3 rounded-2xl theme-surface-muted border px-3.5 py-2.5 text-xs tabular-nums">
          <span className="font-semibold theme-ink">Daily Spin Allowance</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1" aria-hidden="true">
              {Array.from({ length: spinStatus.maxDailySpins }, (_, idx) => {
                const available = idx < spinStatus.remainingToday;
                return (
                  <span
                    key={idx}
                    className={`w-4 h-2 rounded-full transition-colors ${
                      available
                        ? 'bg-[#2E8555] dark:bg-[#2BD4C5]'
                        : 'bg-black/15 dark:bg-white/15'
                    }`}
                  />
                );
              })}
            </div>
            <span className="font-bold theme-ink">
              {spinStatus.remainingToday}/{spinStatus.maxDailySpins}
            </span>
          </div>
        </div>

        {/* Interactive Wheel Container */}
        <div className="relative mt-5 flex flex-col items-center">
          {/* Top Pointer Indicator */}
          <div
            aria-hidden="true"
            className="relative z-20 -mb-3.5 flex flex-col items-center pointer-events-none"
          >
            <div className="w-6 h-6 rounded-full bg-white border-[3px] border-[#E55A3C] shadow-md flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#E55A3C]" />
            </div>
            <div
              className="w-0 h-0 -mt-1 border-l-[11px] border-l-transparent border-r-[11px] border-r-transparent border-t-[16px] border-t-[#E55A3C] drop-shadow-md"
            />
          </div>

          {/* Rotating Wheel Disc */}
          <div className="relative w-[276px] h-[276px] sm:w-[300px] sm:h-[300px] rounded-full p-2 bg-gradient-to-b from-[#FFE680] via-[#F59E0B] to-[#B45309] shadow-[0_14px_34px_-6px_rgba(120,62,8,0.5),inset_0_2px_4px_rgba(255,255,255,0.85)]">
            {/* Rim Stud Lights */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              {Array.from({ length: 16 }, (_, idx) => {
                const angle = (idx * 360) / 16;
                return (
                  <span
                    key={idx}
                    className="absolute left-1/2 top-1/2 w-2.5 h-2.5 -ml-1.25 -mt-1.25 rounded-full bg-[#FFFDF0] border border-[#92400E]/40 shadow-xs"
                    style={{
                      transform: `rotate(${angle}deg) translateY(-134px)`,
                    }}
                  />
                );
              })}
            </div>

            <div
              className="w-full h-full rounded-full overflow-hidden border-[3px] border-white shadow-inner"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning
                  ? `transform ${reduceMotion ? '150ms' : '3400ms'} cubic-bezier(0.12, 0.85, 0.18, 1)`
                  : 'none',
                willChange: 'transform',
              }}
            >
              <svg viewBox="0 0 320 320" className="w-full h-full">
                {SPIN_WHEEL_SEGMENTS.map((seg, i) => {
                  const centerDeg = i * sliceAngle - 90;
                  const startDeg = centerDeg - sliceAngle / 2;
                  const endDeg = centerDeg + sliceAngle / 2;
                  const pathD = describeSlice(160, 160, 158, startDeg, endDeg);

                  return (
                    <g key={seg.id}>
                      <path
                        d={pathD}
                        fill={seg.color}
                        stroke="#FFFFFF"
                        strokeWidth="2.5"
                      />
                      <g transform={`rotate(${i * sliceAngle} 160 160)`}>
                        <text
                          x="160"
                          y="54"
                          textAnchor="middle"
                          fill={seg.textColor}
                          fontSize="13"
                          fontWeight="800"
                          fontFamily="Fredoka, system-ui, sans-serif"
                        >
                          {seg.category === 'coins'
                            ? `${seg.shortLabel}`
                            : seg.category === 'gift'
                            ? seg.shortLabel
                            : 'Better'}
                        </text>
                        <text
                          x="160"
                          y="72"
                          textAnchor="middle"
                          fill={seg.textColor}
                          fontSize="11"
                          fontWeight="700"
                          opacity="0.92"
                          fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
                        >
                          {seg.category === 'coins'
                            ? 'Coins'
                            : seg.category === 'gift'
                            ? 'Gift'
                            : 'Luck'}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Center Cap */}
            <button
              type="button"
              onClick={handleSpin}
              disabled={!canSpin}
              aria-label={spinStatus.canSpinToday ? 'Spin wheel' : 'No spins left today'}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-to-b from-[#FFFDF7] to-[#F3E2BA] border-[4px] border-[#D97706] shadow-xl flex items-center justify-center font-display text-xs font-extrabold text-[#7C2D12] cursor-pointer hover:scale-105 active:scale-95 transition-transform disabled:opacity-65 disabled:cursor-not-allowed"
            >
              {isSpinning ? (
                <RotateCw className="w-5 h-5 animate-spin" />
              ) : spinStatus.canSpinToday ? (
                'SPIN'
              ) : (
                '0/3'
              )}
            </button>
          </div>
        </div>

        {/* Result Banner */}
        {lastResult && !isSpinning && (
          <div
            className={`mt-4 rounded-2xl border p-3.5 text-center ${
              lastResult.category === 'luck'
                ? 'theme-surface-muted border'
                : lastResult.category === 'gift'
                ? 'bg-[#FDF2F8] dark:bg-[#3A192E] border-[#F472B6]'
                : 'bg-[#FFF5D6] dark:bg-[#2F2A14] border-[#F59E0B]'
            }`}
          >
            <div className="inline-flex items-center justify-center gap-1.5 font-display text-base font-bold theme-ink">
              {lastResult.category === 'gift' ? (
                <Gift className="w-4 h-4 text-[#DB2777]" />
              ) : lastResult.category === 'coins' ? (
                <Coins className="w-4 h-4 text-[#D97706]" />
              ) : (
                <Sparkles className="w-4 h-4 theme-ink-secondary" />
              )}
              <span>{lastResult.label}</span>
            </div>
            <p className="mt-0.5 text-xs theme-ink-secondary">
              {lastResult.category === 'luck'
                ? spinStatus.canSpinToday
                  ? `No prize this spin — ${spinStatus.remainingToday} ${spinStatus.remainingToday === 1 ? 'spin' : 'spins'} remaining today.`
                  : 'No more spins left today — come back tomorrow!'
                : lastResult.lives > 0 && lastResult.coins > 0
                ? 'Coins & bonus life added to your inventory!'
                : lastResult.lives > 0
                ? 'Bonus life added to your hearts!'
                : 'Coins added to your balance!'}
            </p>
          </div>
        )}

        {/* Primary Action Button (Strict 3/day Limit — No Paid Extra Spins) */}
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleSpin}
            disabled={!canSpin}
            className={`w-full min-h-[48px] rounded-2xl font-display text-base font-bold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
              spinStatus.canSpinToday
                ? 'btn-tactile-emerald text-white'
                : 'theme-surface-muted border theme-ink-secondary'
            }`}
          >
            {isSpinning ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Spinning…</span>
              </>
            ) : spinStatus.canSpinToday ? (
              <>
                <Gift className="w-4 h-4" />
                <span>
                  Spin Wheel ({spinStatus.remainingToday}/{spinStatus.maxDailySpins} Left)
                </span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4" />
                <span>No More Spins Today · Limit 3/3</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-between text-[11px] theme-ink-secondary px-1 tabular-nums">
            <span>Coins: {progress.coins.toLocaleString()}</span>
            <span>
              Today: {spinStatus.usedToday}/{spinStatus.maxDailySpins} · Total: {progress.spinWheel?.totalSpins || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
