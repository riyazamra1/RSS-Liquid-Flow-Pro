import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppThemeId } from '../types/game';
import { getThemeConfig } from '../utils/themes';

interface VictoryConfettiProps {
  active: boolean;
  stars: number;
  themeId?: AppThemeId;
  reduceMotion?: boolean;
}

type ParticleShape = 'star' | 'ribbon' | 'orb' | 'diamond' | 'droplet';

interface ExplosionParticle {
  id: number;
  originLeftPct: number;
  originTopPct: number;
  dx: number;
  dy: number;
  gravityDrop: number;
  rotateTo: number;
  duration: number;
  delay: number;
  size: number;
  shape: ParticleShape;
  color: string;
  glow: string;
}

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
  themeId = 'botanical',
  reduceMotion = false,
}) => {
  const themeConfig = useMemo(() => getThemeConfig(themeId), [themeId]);

  const themePalette = useMemo(() => {
    const raw = [
      ...themeConfig.particleColors,
      themeConfig.accentHex,
      themeConfig.celestialGlow,
      ...themeConfig.flowerColors,
    ];
    return Array.from(new Set(raw));
  }, [themeConfig]);

  const particles = useMemo<ExplosionParticle[]>(() => {
    if (!active) return [];

    const rng = createSeededRng(8423 + stars * 1013 + themeId.length * 97);
    const list: ExplosionParticle[] = [];
    let idCounter = 0;

    const addBurst = (
      originLeftPct: number,
      originTopPct: number,
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
        const color = preferStars && rng() < 0.55
          ? themeConfig.celestialGlow
          : themePalette[Math.floor(rng() * themePalette.length)];

        const roll = rng();
        const shape: ParticleShape = preferStars
          ? 'star'
          : roll < 0.28
          ? 'star'
          : roll < 0.54
          ? 'ribbon'
          : roll < 0.74
          ? 'orb'
          : roll < 0.9
          ? 'diamond'
          : 'droplet';

        list.push({
          id: idCounter++,
          originLeftPct: originLeftPct + (rng() - 0.5) * 3,
          originTopPct: originTopPct + (rng() - 0.5) * 3,
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist,
          gravityDrop: 75 + rng() * 140,
          rotateTo: (rng() < 0.5 ? -1 : 1) * (180 + rng() * 480),
          duration: 0.95 + rng() * 0.65,
          delay: delayBase + rng() * 0.1,
          size: shape === 'ribbon' ? 11 + rng() * 7 : 9 + rng() * 8,
          shape,
          color,
          glow: color,
        });
      }
    };

    // Wave 1 (0s): Central 360-degree explosion burst
    addBurst(50, 44, 38 + stars * 8, 0, Math.PI * 2, 110, 340, 0);

    // Wave 2 (0.06s): Twin side cannons shooting upward & inward
    addBurst(12, 82, 16, -Math.PI * 0.44, -Math.PI * 0.14, 180, 400, 0.06);
    addBurst(88, 82, 16, -Math.PI * 0.86, -Math.PI * 0.56, 180, 400, 0.06);

    // Wave 3 (0.14s): Celebratory star halo above victory card
    addBurst(50, 34, 14 + stars * 4, -Math.PI * 0.95, -Math.PI * 0.05, 90, 240, 0.14, true);

    return list;
  }, [active, stars, themeId, themeConfig.celestialGlow, themePalette]);

  const prefersReduced =
    reduceMotion ||
    (typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  return (
    <AnimatePresence>
      {active && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-[65] pointer-events-none overflow-hidden"
        >
          {prefersReduced ? (
            <svg
              viewBox="0 0 1000 1000"
              preserveAspectRatio="xMidYMid slice"
              className="w-full h-full"
            >
              {[
                { x: 240, y: 260, r: 12, color: themePalette[0] },
                { x: 760, y: 250, r: 14, color: themePalette[1] ?? themeConfig.accentHex },
                { x: 210, y: 690, r: 11, color: themePalette[2] ?? themeConfig.celestialGlow },
                { x: 790, y: 680, r: 13, color: themePalette[3] ?? themeConfig.accentHex },
                { x: 500, y: 170, r: 15, color: themeConfig.celestialGlow },
              ].map((s, idx) => (
                <polygon
                  key={idx}
                  points={buildStarPoints(s.x, s.y, s.r, s.r * 0.46)}
                  fill={s.color}
                  opacity="0.88"
                />
              ))}
            </svg>
          ) : (
            <>
              {/* Central Radial Theme Flash */}
              <motion.div
                initial={{ scale: 0.15, opacity: 0.85 }}
                animate={{ scale: 2.2, opacity: 0 }}
                transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1] }}
                className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full blur-2xl"
                style={{
                  background: `radial-gradient(circle, ${themeConfig.celestialGlow} 0%, ${themeConfig.accentHex} 45%, transparent 75%)`,
                }}
              />

              {/* Concentric Theme Shockwave Rings */}
              <motion.div
                initial={{ scale: 0.2, opacity: 0.95 }}
                animate={{ scale: 2.8, opacity: 0 }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border-[5px] border-dashed"
                style={{ borderColor: themeConfig.celestialGlow }}
              />
              <motion.div
                initial={{ scale: 0.2, opacity: 0.9 }}
                animate={{ scale: 2.4, opacity: 0 }}
                transition={{ duration: 0.6, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
                className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-full border-4"
                style={{ borderColor: themeConfig.accentHex }}
              />

              {/* Framer Motion Explosion Particles */}
              {particles.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{
                    x: 0,
                    y: 0,
                    scale: 0.2,
                    rotate: 0,
                    opacity: 0,
                  }}
                  animate={{
                    x: [0, p.dx * 0.72, p.dx],
                    y: [0, p.dy * 0.75, p.dy + p.gravityDrop],
                    scale: [0.35, 1.15, 0.65],
                    rotate: [0, p.rotateTo * 0.6, p.rotateTo],
                    opacity: [0, 1, 1, 0],
                  }}
                  transition={{
                    duration: p.duration,
                    delay: p.delay,
                    times: [0, 0.38, 0.78, 1],
                    ease: [0.16, 0.9, 0.3, 1],
                  }}
                  style={{
                    position: 'absolute',
                    left: `${p.originLeftPct}%`,
                    top: `${p.originTopPct}%`,
                    width: p.size,
                    height: p.size,
                    marginLeft: -p.size / 2,
                    marginTop: -p.size / 2,
                    willChange: 'transform, opacity',
                  }}
                >
                  {p.shape === 'orb' && (
                    <div
                      className="w-full h-full rounded-full"
                      style={{
                        backgroundColor: p.color,
                        boxShadow: `0 0 10px ${p.glow}`,
                      }}
                    />
                  )}

                  {p.shape === 'ribbon' && (
                    <div
                      className="w-full rounded-sm"
                      style={{
                        height: Math.max(4, p.size * 0.45),
                        backgroundColor: p.color,
                        boxShadow: `0 0 8px ${p.glow}`,
                      }}
                    />
                  )}

                  {p.shape === 'diamond' && (
                    <div
                      className="w-full h-full rotate-45 rounded-[2px]"
                      style={{
                        backgroundColor: p.color,
                        boxShadow: `0 0 8px ${p.glow}`,
                      }}
                    />
                  )}

                  {p.shape === 'star' && (
                    <svg viewBox="0 0 24 24" className="w-full h-full overflow-visible">
                      <polygon
                        points={buildStarPoints(12, 12, 11, 5)}
                        fill={p.color}
                        style={{ filter: `drop-shadow(0 0 4px ${p.glow})` }}
                      />
                    </svg>
                  )}

                  {p.shape === 'droplet' && (
                    <svg viewBox="0 0 24 24" className="w-full h-full overflow-visible">
                      <path
                        d="M12 2 C18 9, 19 19, 12 21 C5 19, 6 9, 12 2 Z"
                        fill={p.color}
                        style={{ filter: `drop-shadow(0 0 4px ${p.glow})` }}
                      />
                    </svg>
                  )}
                </motion.div>
              ))}
            </>
          )}
        </div>
      )}
    </AnimatePresence>
  );
};
