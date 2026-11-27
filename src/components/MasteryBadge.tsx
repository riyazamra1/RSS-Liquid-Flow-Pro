import React from 'react';
import { Crown, Sparkles } from 'lucide-react';

export interface MasteryBadgeProps {
  level: number;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

/**
 * MasteryBadge
 * Displayed on the level progression map for levels completed with a perfect score,
 * providing rich visual progression feedback and opening the Mastery Showcase on click.
 */
export const MasteryBadge: React.FC<MasteryBadgeProps> = ({
  level,
  onClick,
  className = '',
  size = 'sm',
  showLabel = true,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.();
  };

  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  return (
    <button
      type="button"
      onClick={handleClick}
      title={`Level ${level} Perfect Score · Click to view Mastery Showcase`}
      aria-label={`Level ${level} Perfect Score · Click to view Mastery Showcase`}
      className={`group relative z-15 inline-flex items-center gap-1 rounded-full border border-[#FFF3B0] bg-gradient-to-r from-[#FFD54F] via-[#F59E0B] to-[#D97706] text-[#422006] shadow-[0_3px_10px_rgba(217,119,6,0.48),inset_0_1px_2px_rgba(255,255,255,0.85)] ring-1 ring-[#FFE082]/75 cursor-pointer transition-all duration-150 select-none hover:scale-105 hover:shadow-[0_4px_14px_rgba(217,119,6,0.65)] active:scale-95 ${
        isSmall
          ? 'px-2 py-0.5 text-[9px]'
          : isLarge
          ? 'px-3.5 py-1.5 text-xs'
          : 'px-2.5 py-1 text-[10px]'
      } ${className}`}
    >
      {/* Glossy top reflective highlight */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-1 top-0.5 h-1/2 rounded-full bg-gradient-to-b from-white/60 to-transparent"
      />

      <Crown
        aria-hidden="true"
        className={`fill-[#FFF7CC] text-[#854D0E] shrink-0 drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)] group-hover:rotate-12 transition-transform duration-200 ${
          isSmall ? 'w-2.5 h-2.5' : isLarge ? 'w-4 h-4' : 'w-3 h-3'
        }`}
      />

      {showLabel && (
        <span
          className={`relative font-display font-extrabold uppercase tracking-wider leading-none drop-shadow-[0_1px_0_rgba(255,255,255,0.4)] ${
            isSmall ? 'text-[8.5px]' : isLarge ? 'text-xs' : 'text-[10px]'
          }`}
        >
          PERFECT
        </span>
      )}

      <Sparkles
        aria-hidden="true"
        className={`text-[#FFFBEB] shrink-0 opacity-90 group-hover:scale-125 transition-transform duration-200 ${
          isSmall ? 'w-2 h-2' : isLarge ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'
        }`}
      />
    </button>
  );
};
