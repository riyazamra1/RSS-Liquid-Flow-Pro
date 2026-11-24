import React from 'react';

interface AnimatedDashboardBackdropProps {
  reduceMotion?: boolean;
}

/**
 * Rich, unmistakably visible sunlit botanical animated scenery backdrop (strictly light theme, zero blue).
 * Renders warm golden sunrays, drifting ivory clouds, rolling orchard hills, terracotta garden arches,
 * and floating sunlit blossom petals across the full viewport.
 */
export const AnimatedDashboardBackdrop: React.FC<AnimatedDashboardBackdropProps> = ({
  reduceMotion = false,
}) => {
  const petals = [
    { left: '6%', top: '16%', size: 18, color: '#F5B82E', delay: '0s', dur: '9.5s' },
    { left: '19%', top: '42%', size: 14, color: '#F27D52', delay: '1.6s', dur: '11s' },
    { left: '34%', top: '14%', size: 16, color: '#4FB373', delay: '0.7s', dur: '10s' },
    { left: '53%', top: '22%', size: 17, color: '#F7B733', delay: '2.4s', dur: '12s' },
    { left: '72%', top: '14%', size: 15, color: '#F06A86', delay: '0.5s', dur: '9.8s' },
    { left: '89%', top: '26%', size: 19, color: '#58BA7A', delay: '3.1s', dur: '11.5s' },
    { left: '12%', top: '72%', size: 16, color: '#F7BE38', delay: '1.2s', dur: '10.8s' },
    { left: '46%', top: '68%', size: 14, color: '#F07554', delay: '2.1s', dur: '10.2s' },
    { left: '82%', top: '70%', size: 18, color: '#53B574', delay: '0.3s', dur: '11.8s' },
    { left: '94%', top: '54%', size: 15, color: '#F29A38', delay: '1.9s', dur: '10.6s' },
  ];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
    >
      {/* Rich Warm Sunlit Morning Sky Gradient (zero blue — golden cream to soft apricot peach) */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#FFF7DD] via-[#FDECC8] to-[#F3DCB0]" />

      {/* Warm Radiant Sun & Animated Sunbeam Glow */}
      <div
        className={`absolute -top-24 right-[8%] w-[460px] h-[460px] rounded-full bg-radial from-[#FFE17D]/85 via-[#FFD67A]/40 to-transparent blur-2xl ${
          reduceMotion ? '' : 'animate-orb-float-slow'
        }`}
      />
      <div
        className={`absolute top-1/4 -left-24 w-[480px] h-[480px] rounded-full bg-radial from-[#FFCBA0]/65 via-[#FCD2AE]/28 to-transparent blur-3xl ${
          reduceMotion ? '' : 'animate-orb-float-reverse'
        }`}
      />
      <div
        className={`absolute -bottom-24 left-1/3 w-[580px] h-[380px] rounded-full bg-radial from-[#B9DC9E]/65 via-[#D4E7B6]/32 to-transparent blur-3xl ${
          reduceMotion ? '' : 'animate-orb-float-slow'
        }`}
      />

      {/* Crisp Illustrated Sun & Drifting Warm Ivory Clouds */}
      <svg
        viewBox="0 0 1440 340"
        preserveAspectRatio="xMidYMin slice"
        className="absolute top-10 left-0 w-full h-72"
      >
        {/* Glowing sun disc */}
        <circle cx="1220" cy="78" r="56" fill="#FFE694" opacity="0.7" />
        <circle cx="1220" cy="78" r="34" fill="#FFF6CC" opacity="0.95" />

        <g className={reduceMotion ? '' : 'animate-cloud-drift'}>
          <ellipse cx="190" cy="86" rx="96" ry="28" fill="#FFFDF8" opacity="0.92" />
          <ellipse cx="256" cy="76" rx="58" ry="24" fill="#FFFDF8" opacity="0.95" />
          <ellipse cx="890" cy="68" rx="108" ry="30" fill="#FFFDF8" opacity="0.88" />
          <ellipse cx="962" cy="60" rx="64" ry="24" fill="#FFFDF8" opacity="0.92" />
        </g>
        <g className={reduceMotion ? '' : 'animate-cloud-drift-slow'}>
          <ellipse cx="560" cy="138" rx="84" ry="22" fill="#FFFDF8" opacity="0.82" />
          <ellipse cx="1320" cy="128" rx="92" ry="24" fill="#FFFDF8" opacity="0.84" />
        </g>
      </svg>

      {/* Lush Layered Sunlit Botanical Hills, Limestone Arches & Meadow Flowers */}
      <svg
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        className="absolute bottom-0 left-0 w-full h-56 sm:h-72"
      >
        {/* Far golden-sage ridge */}
        <path
          d="M0 150 Q260 68 560 130 T1160 100 T1440 136 L1440 320 L0 320 Z"
          fill="#DDE3B5"
        />
        {/* Subtle sunlit garden stone arches in distance */}
        <g fill="#EFE1C2" opacity="0.9">
          <path d="M160 210 V142 A28 28 0 0 1 216 142 V210 H202 V146 A14 14 0 0 0 174 146 V210 Z" />
          <path d="M220 210 V142 A28 28 0 0 1 276 142 V210 H262 V146 A14 14 0 0 0 234 146 V210 Z" />
          <path d="M1160 205 V138 A28 28 0 0 1 1216 138 V205 H1202 V142 A14 14 0 0 0 1174 142 V205 Z" />
        </g>
        {/* Mid lush meadow hill */}
        <path
          d="M0 198 Q340 120 720 178 T1440 158 L1440 320 L0 320 Z"
          fill="#C2D89B"
        />
        {/* Foreground warm botanical terrace */}
        <path
          d="M0 248 Q380 186 820 236 T1440 214 L1440 320 L0 320 Z"
          fill="#9FC379"
        />
        {/* Wildflower clusters */}
        <g>
          <circle cx="96" cy="252" r="7" fill="#FFC714" />
          <circle cx="118" cy="264" r="5.5" fill="#FF6A4A" />
          <circle cx="388" cy="238" r="6" fill="#FFE26A" />
          <circle cx="1064" cy="244" r="7" fill="#FF6A4A" />
          <circle cx="1090" cy="256" r="5.5" fill="#FFC714" />
          <circle cx="1340" cy="236" r="7.5" fill="#FFE26A" />
        </g>
      </svg>

      {/* Gently Floating Sunlit Petals & Glowing Nectar Droplets */}
      {!reduceMotion &&
        petals.map((p, i) => (
          <div
            key={i}
            style={{
              left: p.left,
              top: p.top,
              animationDelay: p.delay,
              animationDuration: p.dur,
            }}
            className="absolute animate-petal-float opacity-75"
          >
            <svg width={p.size} height={p.size} viewBox="0 0 24 24" fill="none">
              {i % 2 === 0 ? (
                <path
                  d="M12 2C12 2 5 10.5 5 15C5 18.87 8.13 22 12 22C15.87 22 19 18.87 19 15C19 10.5 12 2 12 2Z"
                  fill={p.color}
                />
              ) : (
                <path
                  d="M12 3C7 5 4 11 6 17C12 19 18 16 20 10C18 6 15 4 12 3Z"
                  fill={p.color}
                />
              )}
            </svg>
          </div>
        ))}
    </div>
  );
};
