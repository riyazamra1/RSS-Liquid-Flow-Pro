import React from 'react';
import { AppThemeId } from '../types/game';
import { getThemeConfig } from '../utils/themes';

interface AnimatedDashboardBackdropProps {
  themeId?: AppThemeId;
  reduceMotion?: boolean;
}

/**
 * Ultra-lightweight, zero-blur, hardware-composited theme backdrop.
 * Renders via a single static multi-stop CSS gradient + lightweight SVG horizon
 * so scrolling and glass surfaces stay instant and smooth.
 */
export const AnimatedDashboardBackdrop: React.FC<AnimatedDashboardBackdropProps> = ({
  themeId = 'botanical',
}) => {
  const theme = getThemeConfig(themeId);

  const stars = [
    { x: 110, y: 42, r: 2.2 },
    { x: 260, y: 88, r: 1.6 },
    { x: 420, y: 36, r: 2.0 },
    { x: 590, y: 62, r: 1.5 },
    { x: 740, y: 30, r: 2.4 },
    { x: 920, y: 74, r: 1.8 },
    { x: 1080, y: 44, r: 2.0 },
    { x: 1330, y: 66, r: 1.9 },
  ];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 w-screen h-[100dvh] z-0 overflow-hidden select-none"
      style={{
        contain: 'strict',
        backgroundImage: [
          `radial-gradient(520px 520px at 88% 8%, ${theme.orbPrimary} 0%, transparent 72%)`,
          `radial-gradient(540px 540px at 6% 36%, ${theme.orbSecondary} 0%, transparent 72%)`,
          `radial-gradient(640px 420px at 52% 94%, ${theme.orbTertiary} 0%, transparent 72%)`,
          `linear-gradient(180deg, ${theme.skyFrom} 0%, ${theme.skyVia} 54%, ${theme.skyTo} 100%)`,
        ].join(', '),
      }}
    >
      {/* Celestial Body & Soft Clouds */}
      <svg
        viewBox="0 0 1440 340"
        preserveAspectRatio="xMidYMin slice"
        className="absolute top-6 left-0 w-full h-72 sm:h-80"
      >
        {theme.isDark &&
          stars.map((s, idx) => (
            <circle
              key={idx}
              cx={s.x}
              cy={s.y}
              r={s.r}
              fill="#DDF8FF"
              opacity={0.75}
            />
          ))}

        <circle
          cx="1220"
          cy="82"
          r="62"
          fill={theme.celestialGlow}
          opacity={theme.isDark ? '0.32' : '0.68'}
        />
        <circle cx="1220" cy="82" r="34" fill={theme.celestialFill} opacity="0.96" />

        <g>
          <ellipse cx="190" cy="92" rx="98" ry="26" fill={theme.cloudFill} opacity={theme.isDark ? '0.55' : '0.88'} />
          <ellipse cx="256" cy="82" rx="58" ry="22" fill={theme.cloudFill} opacity={theme.isDark ? '0.62' : '0.92'} />
          <ellipse cx="890" cy="72" rx="110" ry="28" fill={theme.cloudFill} opacity={theme.isDark ? '0.5' : '0.84'} />
          <ellipse cx="962" cy="64" rx="64" ry="22" fill={theme.cloudFill} opacity={theme.isDark ? '0.56' : '0.88'} />
          <ellipse cx="560" cy="144" rx="84" ry="20" fill={theme.cloudFill} opacity={theme.isDark ? '0.42' : '0.78'} />
          <ellipse cx="1320" cy="134" rx="92" ry="22" fill={theme.cloudFill} opacity={theme.isDark ? '0.45' : '0.8'} />
        </g>
      </svg>

      {/* Layered Landscape Horizon */}
      <svg
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        className="absolute bottom-0 left-0 w-full h-[38vh] min-h-[220px] max-h-[380px]"
      >
        <path
          d="M0 148 Q260 66 560 128 T1160 98 T1440 134 L1440 320 L0 320 Z"
          fill={theme.hillFar}
        />
        {theme.id !== 'midnight' ? (
          <g fill={theme.archFill} opacity="0.88">
            <path d="M160 210 V142 A28 28 0 0 1 216 142 V210 H202 V146 A14 14 0 0 0 174 146 V210 Z" />
            <path d="M220 210 V142 A28 28 0 0 1 276 142 V210 H262 V146 A14 14 0 0 0 234 146 V210 Z" />
            <path d="M1160 205 V138 A28 28 0 0 1 1216 138 V205 H1202 V142 A14 14 0 0 0 1174 142 V205 Z" />
          </g>
        ) : (
          <g stroke="#5EEAD4" strokeOpacity="0.22" strokeWidth="3" fill="none">
            <path d="M120 190 Q240 170 360 190 T600 190" />
            <path d="M840 175 Q980 155 1120 175 T1380 175" />
          </g>
        )}
        <path
          d="M0 198 Q340 118 720 178 T1440 156 L1440 320 L0 320 Z"
          fill={theme.hillMid}
        />
        <path
          d="M0 248 Q380 184 820 236 T1440 212 L1440 320 L0 320 Z"
          fill={theme.hillNear}
        />
        <g>
          <circle cx="96" cy="252" r="6.5" fill={theme.flowerColors[0]} />
          <circle cx="118" cy="264" r="5" fill={theme.flowerColors[1]} />
          <circle cx="388" cy="238" r="5.5" fill={theme.flowerColors[0]} />
          <circle cx="1064" cy="244" r="6.5" fill={theme.flowerColors[1]} />
          <circle cx="1090" cy="256" r="5" fill={theme.flowerColors[0]} />
          <circle cx="1340" cy="236" r="7" fill={theme.flowerColors[0]} />
        </g>
      </svg>
    </div>
  );
};
