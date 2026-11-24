import React, { useMemo } from 'react';

interface VictoryConfettiProps {
  active: boolean;
  stars: number;
  reduceMotion?: boolean;
}

type SvgParticleShape = 'ribbon' | 'star' | 'droplet' | 'diamond' | 'circle';

interface SvgConfettiPiece {
  id: number;
  originX: number;
  originY: number;
  tx: number;
  ty: number;
  fall: number;
  rot: number;
  dur: number;
  delay: number;
  size: number;
  shape: SvgParticleShape;
  fill: string;
  highlight: string;
}

// Warm bright candy celebration palette — strictly zero blue
const CELEBRATION_PALETTE: { fill: string; highlight: string }[] = [
  { fill: '#FFC714', highlight: '#FFF29C' }, // Sunny Lemon
  { fill: '#FF3D5E', highlight: '#FF9EB0' }, // Strawberry Pop
  { fill: '#1ED16E', highlight: '#92F9BE' }, // Mint Emerald
  { fill: '#FF7B19', highlight: '#FFC98A' }, // Tangerine Crush
  { fill: '#F73EA8', highlight: '#FFA6DA' }, // Berry Pink
  { fill: '#E8A317', highlight: '#FFE38E' }, // Honey Gold
  { fill: '#A54AFF', highlight: '#DEB5FF' }, // Grape Fizz
  { fill: '#8EDB1A', highlight: '#D8FA8C' }, // Lime Zest
];

function createSeededRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildStarPoints(cx: number, cy: number, outerR: number, innerR: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    pts.push(`${(cx + Math.cos(angle) * r).toFixed(1)},${(cy + Math.sin(angle) * r).toFixed(1)}`);
  }
  return pts.join(' ');
}

export const VictoryConfetti: React.FC<VictoryConfettiProps> = ({
  active,
  stars,
  reduceMotion = false,
}) => {
  const pieces = useMemo<SvgConfettiPiece[]>(() => {
    if (!active) return [];

    const rng = createSeededRng(7319 + stars * 997);
    const list: SvgConfettiPiece[] = [];
    let idCounter = 0;

    const addBurst = (
      originX: number,
      originY: number,
      count: number,
      angleMin: number,
      angleMax: number,
      distMin: number,
      distMax: number,
      delayBase: number,
      preferStars = false
    ) => {
      for (let i = 0; i < count; i++) {
        const angle = angleMin + rng() * (angleMax - angleMin);
        const dist = distMin + rng() * (distMax - distMin);
        const swatch = preferStars
          ? CELEBRATION_PALETTE[rng() < 0.72 ? 0 : 5]
          : CELEBRATION_PALETTE[Math.floor(rng() * CELEBRATION_PALETTE.length)];

        const roll = rng();
        const shape: SvgParticleShape = preferStars
          ? 'star'
          : roll < 0.36
          ? 'ribbon'
          : roll < 0.58
          ? 'star'
          : roll < 0.76
          ? 'droplet'
          : roll < 0.9
          ? 'diamond'
          : 'circle';

        list.push({
          id: idCounter++,
          originX: originX + (rng() - 0.5) * 28,
          originY: originY + (rng() - 0.5) * 24,
          tx: Math.cos(angle) * dist,
          ty: Math.sin(angle) * dist,
          fall: 90 + rng() * 145,
          rot: (rng() < 0.5 ? -1 : 1) * (180 + rng() * 440),
          dur: 920 + Math.round(rng() * 540),
          delay: delayBase + Math.round(rng() * 90),
          size: shape === 'ribbon' ? 8 + rng() * 7 : 6 + rng() * 6,
          shape,
          fill: swatch.fill,
          highlight: swatch.highlight,
        });
      }
    };

    // Wave 1 (0ms): Immediate full-screen radial burst + twin lower side cannons
    addBurst(500, 440, 34 + stars * 6, 0, Math.PI * 2, 140, 410, 0);
    addBurst(80, 760, 18, -Math.PI * 0.45, -Math.PI * 0.16, 260, 520, 10);
    addBurst(920, 760, 18, -Math.PI * 0.84, -Math.PI * 0.55, 260, 520, 10);

    // Wave 2 (95ms): Rapid golden star flourish over the victory modal
    addBurst(500, 350, 12 + stars * 4, -Math.PI * 0.95, -Math.PI * 0.05, 110, 290, 95, stars >= 2);

    return list;
  }, [active, stars]);

  if (!active) return null;

  const prefersReduced =
    reduceMotion ||
    (typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  if (prefersReduced) {
    // Gentle static celebratory SVG sparkle frame for reduced-motion users
    return (
      <svg
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        className="fixed inset-0 z-[65] w-full h-full pointer-events-none"
      >
        {[
          { x: 240, y: 260, r: 12, fill: '#FFC714' },
          { x: 760, y: 250, r: 14, fill: '#FF3D5E' },
          { x: 210, y: 690, r: 11, fill: '#1ED16E' },
          { x: 790, y: 680, r: 13, fill: '#FF7B19' },
          { x: 500, y: 170, r: 15, fill: '#F5BC38' },
        ].map((s, idx) => (
          <polygon
            key={idx}
            points={buildStarPoints(s.x, s.y, s.r, s.r * 0.46)}
            fill={s.fill}
            opacity="0.88"
          />
        ))}
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className="fixed inset-0 z-[65] w-full h-full pointer-events-none overflow-visible"
    >
      {/* Instant golden celebratory shockwave ring */}
      <circle
        cx="500"
        cy="440"
        r="110"
        fill="none"
        stroke="#FFC714"
        strokeWidth="6"
        strokeDasharray="16 14"
        className="animate-svg-burst-ring"
      />
      <circle
        cx="500"
        cy="440"
        r="76"
        fill="none"
        stroke="#FF7B19"
        strokeWidth="4"
        className="animate-svg-burst-ring"
        style={{ animationDelay: '55ms' }}
      />

      {pieces.map((p) => {
        const animStyle = {
          '--tx': `${p.tx.toFixed(1)}px`,
          '--ty': `${p.ty.toFixed(1)}px`,
          '--fall': `${p.fall.toFixed(1)}px`,
          '--rot': `${p.rot.toFixed(0)}deg`,
          '--dur': `${p.dur}ms`,
          '--delay': `${p.delay}ms`,
        } as React.CSSProperties;

        return (
          <g key={p.id} className="animate-svg-confetti" style={animStyle}>
            {p.shape === 'ribbon' && (
              <rect
                x={p.originX - p.size}
                y={p.originY - p.size * 0.42}
                width={p.size * 2}
                height={p.size * 0.84}
                rx={p.size * 0.24}
                fill={p.fill}
                stroke={p.highlight}
                strokeWidth="1"
              />
            )}

            {p.shape === 'star' && (
              <polygon
                points={buildStarPoints(p.originX, p.originY, p.size, p.size * 0.45)}
                fill={p.fill}
                stroke={p.highlight}
                strokeWidth="0.9"
              />
            )}

            {p.shape === 'droplet' && (
              <g transform={`translate(${p.originX}, ${p.originY})`}>
                <path
                  d={`M 0 ${-p.size} C ${p.size * 0.82} ${-p.size * 0.12}, ${p.size * 0.82} ${
                    p.size * 0.85
                  }, 0 ${p.size * 0.92} C ${-p.size * 0.82} ${p.size * 0.85}, ${-p.size * 0.82} ${
                    -p.size * 0.12
                  }, 0 ${-p.size} Z`}
                  fill={p.fill}
                />
                <circle cx={-p.size * 0.2} cy={p.size * 0.15} r={p.size * 0.22} fill={p.highlight} />
              </g>
            )}

            {p.shape === 'diamond' && (
              <polygon
                points={`${p.originX},${p.originY - p.size} ${p.originX + p.size * 0.72},${
                  p.originY
                } ${p.originX},${p.originY + p.size} ${p.originX - p.size * 0.72},${p.originY}`}
                fill={p.fill}
                stroke={p.highlight}
                strokeWidth="0.9"
              />
            )}

            {p.shape === 'circle' && (
              <circle
                cx={p.originX}
                cy={p.originY}
                r={p.size * 0.58}
                fill={p.fill}
                stroke={p.highlight}
                strokeWidth="1"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
};
