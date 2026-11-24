import React from 'react';
import { WorldTheme } from '../types/game';

export const RssDropletEmblem: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <defs>
      <radialGradient id="rssMedallion" cx="35%" cy="28%" r="72%">
        <stop offset="0%" stopColor="#FFF8E3" />
        <stop offset="68%" stopColor="#F8E4B7" />
        <stop offset="100%" stopColor="#E6C27A" />
      </radialGradient>
      <linearGradient id="rssDropGrad" x1="32" y1="12" x2="32" y2="52" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFC857" />
        <stop offset="55%" stopColor="#F07D28" />
        <stop offset="100%" stopColor="#D94528" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="30" fill="url(#rssMedallion)" stroke="#C9963B" strokeWidth="2.5" />
    <circle cx="32" cy="32" r="25.5" fill="none" stroke="#FFFDF7" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.8" />
    {/* Botanical leaves */}
    <path d="M16 42C12 34 14 25 21 22C21 30 20 38 16 42Z" fill="#46A16B" />
    <path d="M48 42C52 34 50 25 43 22C43 30 44 38 48 42Z" fill="#2E8555" />
    {/* Warm golden-coral liquid drop */}
    <path
      d="M32 12C32 12 19 27.2 19 36.5C19 43.96 24.82 50 32 50C39.18 50 45 43.96 45 36.5C45 27.2 32 12 32 12Z"
      fill="url(#rssDropGrad)"
      stroke="#9E2D18"
      strokeWidth="1.6"
    />
    {/* Specular glass highlight */}
    <path
      d="M25.5 34.5C25.5 29.8 28.5 24 30.8 20.4C27.2 26.2 24.4 31.2 25.5 34.5Z"
      fill="#FFF9EB"
      opacity="0.85"
    />
    <ellipse cx="26.2" cy="37" rx="2.4" ry="4.2" transform="rotate(-14 26.2 37)" fill="#FFF4D6" opacity="0.7" />
  </svg>
);

export const DailyChestIllustration: React.FC<{ className?: string }> = ({ className = 'w-20 h-20' }) => (
  <svg viewBox="0 0 96 96" fill="none" className={className} aria-hidden="true">
    <defs>
      <radialGradient id="chestSun" cx="50%" cy="46%" r="48%">
        <stop offset="0%" stopColor="#FFE9A3" stopOpacity="0.95" />
        <stop offset="70%" stopColor="#FCE1A4" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#FAF6EC" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="woodBody" x1="48" y1="44" x2="48" y2="82" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#B86230" />
        <stop offset="100%" stopColor="#7C3C1A" />
      </linearGradient>
      <linearGradient id="woodLid" x1="48" y1="20" x2="48" y2="46" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#D67C3E" />
        <stop offset="100%" stopColor="#9A4B20" />
      </linearGradient>
      <linearGradient id="goldTrim" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FFE680" />
        <stop offset="55%" stopColor="#F2AF22" />
        <stop offset="100%" stopColor="#B8760B" />
      </linearGradient>
    </defs>
    <circle cx="48" cy="48" r="45" fill="url(#chestSun)" />
    {/* Open chest lid */}
    <path d="M18 42C18 28 30 22 48 22C66 22 78 28 78 42H18Z" fill="url(#woodLid)" stroke="#6B3014" strokeWidth="2.5" />
    <path d="M22 42C22 31 32 26 48 26C64 26 74 31 74 42H22Z" fill="#5E2912" />
    {/* Overflowing coins & ruby hearts */}
    <circle cx="34" cy="41" r="7" fill="url(#goldTrim)" stroke="#9C6308" strokeWidth="1.5" />
    <circle cx="46" cy="37" r="8" fill="url(#goldTrim)" stroke="#9C6308" strokeWidth="1.5" />
    <circle cx="59" cy="40" r="7.5" fill="url(#goldTrim)" stroke="#9C6308" strokeWidth="1.5" />
    <path
      d="M52 29.5C52 26.8 54.4 25 56.8 25C58.6 25 59.8 26.1 60.5 27.3C61.2 26.1 62.4 25 64.2 25C66.6 25 69 26.8 69 29.5C69 33.4 63.5 36.8 60.5 39C57.5 36.8 52 33.4 52 29.5Z"
      fill="#E63E5C"
      stroke="#961B34"
      strokeWidth="1.5"
    />
    <path
      d="M27 31C27 29.1 28.7 27.8 30.4 27.8C31.7 27.8 32.5 28.6 33 29.5C33.5 28.6 34.3 27.8 35.6 27.8C37.3 27.8 39 29.1 39 31C39 33.8 35.1 36.2 33 37.8C30.9 36.2 27 33.8 27 31Z"
      fill="#F25C76"
      stroke="#961B34"
      strokeWidth="1.4"
    />
    {/* Chest base */}
    <rect x="16" y="42" width="64" height="36" rx="8" fill="url(#woodBody)" stroke="#6B3014" strokeWidth="2.5" />
    {/* Gold bands */}
    <rect x="16" y="42" width="64" height="7" rx="3" fill="url(#goldTrim)" stroke="#8F5807" strokeWidth="1.4" />
    <rect x="26" y="42" width="7" height="36" fill="url(#goldTrim)" stroke="#8F5807" strokeWidth="1.2" />
    <rect x="63" y="42" width="7" height="36" fill="url(#goldTrim)" stroke="#8F5807" strokeWidth="1.2" />
    {/* Center clasp */}
    <rect x="41" y="44" width="14" height="15" rx="4" fill="url(#goldTrim)" stroke="#7D4C05" strokeWidth="1.8" />
    <circle cx="48" cy="51.5" r="2.5" fill="#5E2912" />
  </svg>
);

export const WorldChapterScenery: React.FC<{ world: WorldTheme }> = ({ world }) => {
  const { palette } = world;
  return (
    <svg
      viewBox="0 0 600 110"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`wbg-${world.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette.backdropFrom} />
          <stop offset="55%" stopColor={palette.backdropVia} />
          <stop offset="100%" stopColor={palette.backdropTo} />
        </linearGradient>
      </defs>
      <rect width="600" height="110" fill={`url(#wbg-${world.id})`} />
      {/* Warm sunlit orb */}
      <circle cx="520" cy="24" r="32" fill="#FFE7A8" opacity="0.65" />
      <circle cx="520" cy="24" r="20" fill="#FFF4CF" opacity="0.85" />
      {/* Rolling sunlit terrace hills */}
      <path d="M0 84 Q140 36 290 74 T600 66 L600 110 L0 110 Z" fill={palette.hillFar} opacity="0.72" />
      <path d="M0 94 Q190 54 380 86 T600 80 L600 110 L0 110 Z" fill={palette.hillMid} opacity="0.82" />
      <path d="M0 104 Q160 80 340 98 T600 94 L600 110 L0 110 Z" fill={palette.hillNear} opacity="0.78" />
      {/* Warm botanical leaf accents */}
      <g opacity="0.55" fill={palette.accent}>
        <ellipse cx="42" cy="86" rx="14" ry="6" transform="rotate(-24 42 86)" />
        <ellipse cx="58" cy="92" rx="11" ry="5" transform="rotate(18 58 92)" />
        <ellipse cx="556" cy="82" rx="15" ry="6" transform="rotate(22 556 82)" />
        <ellipse cx="540" cy="90" rx="10" ry="5" transform="rotate(-18 540 90)" />
      </g>
    </svg>
  );
};

export const GardenSanctuaryBanner: React.FC = () => (
  <svg
    viewBox="0 0 800 220"
    preserveAspectRatio="xMidYMid slice"
    className="w-full h-full"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="gardenSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFF7E2" />
        <stop offset="65%" stopColor="#FCE7C8" />
        <stop offset="100%" stopColor="#F5D9B5" />
      </linearGradient>
    </defs>
    <rect width="800" height="220" fill="url(#gardenSky)" />
    {/* Rising warm sun */}
    <circle cx="650" cy="64" r="54" fill="#FFE6A1" opacity="0.6" />
    <circle cx="650" cy="64" r="34" fill="#FFF4CC" opacity="0.9" />
    {/* Soft warm clouds (ivory, zero blue) */}
    <g fill="#FFFDF7" opacity="0.72">
      <ellipse cx="150" cy="52" rx="54" ry="18" />
      <ellipse cx="188" cy="48" rx="34" ry="15" />
      <ellipse cx="430" cy="42" rx="46" ry="14" />
    </g>
    {/* Distant limestone arches */}
    <g fill="#EFE2CA" opacity="0.85">
      <path d="M510 155 V98 A32 32 0 0 1 574 98 V155 H558 V102 A16 16 0 0 0 526 102 V155 Z" />
      <path d="M578 155 V98 A32 32 0 0 1 642 98 V155 H626 V102 A16 16 0 0 0 594 102 V155 Z" />
    </g>
    {/* Rolling botanical terraces */}
    <path d="M0 150 Q180 105 380 142 T800 130 L800 220 L0 220 Z" fill="#D4DFB4" />
    <path d="M0 176 Q220 132 460 166 T800 158 L800 220 L0 220 Z" fill="#B2C98A" />
    <path d="M0 198 Q260 168 540 192 T800 186 L800 220 L0 220 Z" fill="#89AF66" />
    {/* Marigold & coral blossoms */}
    <circle cx="112" cy="176" r="7" fill="#F2B229" />
    <circle cx="132" cy="184" r="5.5" fill="#E55A3C" />
    <circle cx="318" cy="188" r="6" fill="#F2B229" />
    <circle cx="678" cy="176" r="7" fill="#E55A3C" />
    <circle cx="702" cy="185" r="5.5" fill="#F5BC38" />
  </svg>
);

export const PlantIllustration: React.FC<{ id: string; unlocked: boolean }> = ({ id, unlocked }) => {
  const leaf = unlocked ? '#37995E' : '#C5BBA8';
  const leafDark = unlocked ? '#247243' : '#ABA08C';
  const bloom = unlocked
    ? id === 'tulip'
      ? '#E55A3C'
      : id === 'sunflower'
      ? '#F2B229'
      : id === 'cactus'
      ? '#D96B27'
      : id === 'clover'
      ? '#D99A18'
      : '#E2567A'
    : '#CFC5B2';

  return (
    <svg viewBox="0 0 64 64" fill="none" className="w-12 h-12" aria-hidden="true">
      {/* Terracotta pot */}
      <path d="M20 44 H44 L40 58 H24 L20 44 Z" fill={unlocked ? '#C96A3A' : '#CFC5B2'} />
      <rect x="18" y="40" width="28" height="5" rx="2.5" fill={unlocked ? '#DE824F' : '#DBD2C1'} />
      {/* Stem & leaves */}
      <path d="M32 40 V21" stroke={leafDark} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M32 34 C24 34 19 29 20 24 C26 24 31 28 32 34 Z" fill={leaf} />
      <path d="M32 31 C40 31 45 26 44 21 C38 21 33 25 32 31 Z" fill={leafDark} />
      {/* Crown */}
      {id === 'sprout' || id === 'herb' ? (
        <circle cx="32" cy="18" r="5" fill={leaf} />
      ) : (
        <>
          <circle cx="32" cy="16" r="7" fill={bloom} />
          <circle cx="32" cy="16" r="3" fill={unlocked ? '#FFF4CC' : '#E8E0D0'} />
        </>
      )}
    </svg>
  );
};
