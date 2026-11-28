import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  Coins,
  Crown,
  Eye,
  EyeOff,
  Flame,
  Gift,
  Heart,
  Loader2,
  Lock,
  Mail,
  MailCheck,
  Pause,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trophy,
  User,
  Users,
} from 'lucide-react';
import { VictoryConfetti } from './VictoryConfetti';

export interface OnboardingAuthResult {
  mode: 'register' | 'login';
  email: string;
  displayName: string;
  continueLevel: number;
  sessionToken?: string;
}

interface OnboardingFlowProps {
  currentSavedLevel: number;
  reduceMotion: boolean;
  initialStep?: 'splash' | 'features' | 'auth';
  onComplete: (result: OnboardingAuthResult) => void;
  onSkipToPlay?: () => void;
}

type FlowStep = 'splash' | 'features' | 'auth' | 'verify' | 'welcome';

// Hold Bearer session token strictly in memory (never in localStorage)
let inMemorySessionToken: string | null = null;

export function setAuthSessionToken(token: string | null): void {
  inMemorySessionToken = token;
}

export async function syncAccountLevel(_email: string, level: number): Promise<void> {
  if (!inMemorySessionToken || !Number.isFinite(level) || level < 1) return;
  try {
    await fetch('/api/auth/sync-level', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${inMemorySessionToken}`,
      },
      body: JSON.stringify({ level: Math.floor(level) }),
    });
  } catch {
    // Non-blocking background sync
  }
}

interface FeatureSlide {
  id: string;
  indexLabel: string;
  kicker: string;
  title: string;
  description: string;
  highlights: string[];
  backdrop: string;
  orbPrimary: string;
  orbSecondary: string;
  accentHex: string;
}

const FEATURE_SLIDES: FeatureSlide[] = [
  {
    id: 'pour',
    indexLabel: '01 / 04',
    kicker: 'Tactile Liquid Physics',
    title: 'Pour, Match & Master Crystal Jars',
    description:
      'Sort vibrant layered elixirs into gleaming glass jars with fluid pouring streams, dynamic splash droplets, and infinite handcrafted puzzles.',
    highlights: [
      'Fluid multi-layer pouring physics & jar seals',
      'Infinite progressive levels with smart hints',
      'Relaxing tactile soundscape & color clarity',
    ],
    backdrop: 'from-[#061829] via-[#0E3552] to-[#081F33]',
    orbPrimary: 'rgba(56, 189, 248, 0.24)',
    orbSecondary: 'rgba(245, 158, 11, 0.22)',
    accentHex: '#38BDF8',
  },
  {
    id: 'worlds',
    indexLabel: '02 / 04',
    kicker: 'World Biomes & Speedruns',
    title: 'Journey Across Scenic World Biomes',
    description:
      'Chart your path through tropical lagoons, blossom springs, and sunlit peaks while earning golden Mastery Crowns and setting personal best times.',
    highlights: [
      'Scrollable World Biome Atlas with island chapters',
      'Perfect 3-star Mastery Badges & Showcase stats',
      'Live Best Time trophy & speedrun record alerts',
    ],
    backdrop: 'from-[#0B1E36] via-[#13475C] to-[#123633]',
    orbPrimary: 'rgba(45, 212, 191, 0.24)',
    orbSecondary: 'rgba(250, 204, 21, 0.20)',
    accentHex: '#2DD4BF',
  },
  {
    id: 'rewards',
    indexLabel: '03 / 04',
    kicker: 'Lucky Prize Wheel & Streaks',
    title: 'Spin Daily & Build Winning Streaks',
    description:
      'Take up to 3 spins every day on the Lucky Prize Wheel, climb the 30-day login calendar, and collect coins, gems, and booster refills.',
    highlights: [
      'Lucky Prize Wheel with 3 daily spins',
      'Escalating 7-day & 30-day streak rewards',
      'Daily missions & treasure milestones',
    ],
    backdrop: 'from-[#180E30] via-[#2C1A52] to-[#112442]',
    orbPrimary: 'rgba(245, 158, 11, 0.26)',
    orbSecondary: 'rgba(236, 72, 153, 0.22)',
    accentHex: '#FBBF24',
  },
  {
    id: 'community',
    indexLabel: '04 / 04',
    kicker: 'Friends & Social Badges',
    title: 'Gift Lives & Unlock Social Badges',
    description:
      'Add fellow players to your circle, send and claim free heart lives every day, and unlock metallic community achievement medallions.',
    highlights: [
      'Exchange heart lives daily with friends',
      'Unlock Bronze to Platinum Social Achievements',
      'Cloud-synced level progress on your account',
    ],
    backdrop: 'from-[#072124] via-[#10423E] to-[#091D2E]',
    orbPrimary: 'rgba(52, 211, 153, 0.24)',
    orbSecondary: 'rgba(251, 113, 133, 0.20)',
    accentHex: '#34D399',
  },
];

const SLIDE_AUTOPLAY_MS = 5600;

/* =========================================================================
 * FULL-SCALE ANIMATED FEATURE DIORAMAS (Compositor-only transforms/opacity)
 * ========================================================================= */
const FullscreenFeatureScene: React.FC<{ slideIndex: number; reduceMotion: boolean }> = ({
  slideIndex,
  reduceMotion,
}) => {
  if (slideIndex === 0) {
    return (
      <div className="relative w-full max-w-xl mx-auto h-[290px] sm:h-[380px] lg:h-[440px] flex items-center justify-center select-none">
        {/* Soft stage reflection */}
        <div
          aria-hidden="true"
          className="absolute bottom-6 w-[82%] h-10 rounded-full bg-black/35 blur-xl"
        />

        <div className="relative flex items-end justify-center gap-6 sm:gap-10">
          {/* JAR 1: Animated pouring crystal jar */}
          <motion.div
            animate={
              reduceMotion
                ? { rotate: 16, y: -22 }
                : {
                    rotate: [0, 22, 22, 0],
                    y: [0, -28, -28, 0],
                    x: [0, 8, 8, 0],
                  }
            }
            transition={{
              duration: 3.8,
              repeat: Infinity,
              ease: 'easeInOut',
              times: [0, 0.25, 0.72, 1],
            }}
            className="relative w-20 sm:w-24 h-44 sm:h-56 rounded-b-[28px] rounded-t-xl border-2 border-white/75 bg-white/10 backdrop-blur-sm p-1.5 flex flex-col justify-end gap-1 shadow-[0_24px_45px_-12px_rgba(0,0,0,0.55)]"
          >
            {/* Glass rim */}
            <div className="absolute -top-2.5 inset-x-[-4px] h-3 rounded-full bg-white/85 shadow-sm" />
            {/* Specular highlight */}
            <div className="absolute inset-y-3 left-2 w-1.5 rounded-full bg-white/40 pointer-events-none" />
            {/* Liquid layers */}
            <motion.div
              animate={
                reduceMotion
                  ? { scaleY: 0.7 }
                  : { scaleY: [1, 0.2, 0.2, 1] }
              }
              transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', times: [0, 0.25, 0.72, 1] }}
              style={{ transformOrigin: 'bottom' }}
              className="h-9 sm:h-11 rounded-md bg-gradient-to-r from-[#F59E0B] via-[#FBBF24] to-[#FDE047]"
            />
            <div className="h-9 sm:h-11 rounded-md bg-gradient-to-r from-[#0284C7] via-[#38BDF8] to-[#7DD3FC]" />
            <div className="h-10 sm:h-12 rounded-b-[20px] rounded-t-md bg-gradient-to-r from-[#059669] via-[#10B981] to-[#34D399]" />
          </motion.div>

          {/* Animated pouring arc stream + splash droplets */}
          <svg
            viewBox="0 0 96 140"
            className="w-16 sm:w-24 h-28 sm:h-40 -mx-5 sm:-mx-7 mb-20 sm:mb-24 z-10 overflow-visible pointer-events-none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="pourGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FDE047" />
                <stop offset="55%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
            </defs>
            <motion.path
              d="M 6 18 Q 52 8 82 128"
              fill="none"
              stroke="url(#pourGrad)"
              strokeWidth="9"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={
                reduceMotion
                  ? { pathLength: 1, opacity: 0.9 }
                  : {
                      pathLength: [0, 1, 1, 0],
                      opacity: [0, 1, 1, 0],
                    }
              }
              transition={{
                duration: 3.8,
                repeat: Infinity,
                ease: 'easeInOut',
                times: [0.16, 0.34, 0.68, 0.82],
              }}
            />
            {!reduceMotion && (
              <>
                <motion.circle
                  cx="78"
                  cy="122"
                  r="4.5"
                  fill="#FDE047"
                  animate={{ y: [0, -18, 4], x: [0, -14, -20], opacity: [0, 1, 0] }}
                  transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 0.4 }}
                />
                <motion.circle
                  cx="84"
                  cy="122"
                  r="3.5"
                  fill="#FBBF24"
                  animate={{ y: [0, -22, 6], x: [0, 12, 18], opacity: [0, 1, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0.2, repeatDelay: 0.3 }}
                />
              </>
            )}
          </svg>

          {/* JAR 2: Receiving amber-gold elixir with rising wave */}
          <div className="relative w-20 sm:w-24 h-44 sm:h-56 rounded-b-[28px] rounded-t-xl border-2 border-[#FDE68A]/90 bg-white/12 backdrop-blur-sm p-1.5 flex flex-col justify-end gap-1 shadow-[0_24px_45px_-12px_rgba(245,158,11,0.32)]">
            <div className="absolute -top-2.5 inset-x-[-4px] h-3 rounded-full bg-white/90 shadow-sm" />
            <div className="absolute inset-y-3 left-2 w-1.5 rounded-full bg-white/40 pointer-events-none" />
            <motion.div
              animate={
                reduceMotion
                  ? { scaleY: 1, opacity: 1 }
                  : { scaleY: [0.15, 1, 1, 0.15], opacity: [0.5, 1, 1, 0.5] }
              }
              transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', times: [0, 0.35, 0.75, 1] }}
              style={{ transformOrigin: 'bottom' }}
              className="h-10 sm:h-12 rounded-md bg-gradient-to-r from-[#F59E0B] via-[#FBBF24] to-[#FDE047]"
            />
            <div className="h-10 sm:h-12 rounded-md bg-gradient-to-r from-[#EA580C] via-[#F59E0B] to-[#FBBF24]" />
            <div className="h-10 sm:h-12 rounded-b-[20px] rounded-t-md bg-gradient-to-r from-[#D97706] via-[#F59E0B] to-[#FBBF24]" />
          </div>

          {/* JAR 3: Completed sealed emerald crystal jar with animated golden cap */}
          <div className="relative w-20 sm:w-24 h-44 sm:h-56 rounded-b-[28px] rounded-t-xl border-2 border-[#6EE7B7] bg-white/12 backdrop-blur-sm p-1.5 flex flex-col justify-end shadow-[0_24px_50px_-10px_rgba(16,185,129,0.4)]">
            {/* Animated golden cap dropping to seal */}
            <motion.div
              animate={
                reduceMotion
                  ? { y: 0, opacity: 1 }
                  : { y: [-24, 0, 0, -24], opacity: [0, 1, 1, 0] }
              }
              transition={{ duration: 3.8, repeat: Infinity, ease: 'easeOut', times: [0, 0.25, 0.8, 1] }}
              className="absolute -top-6 left-1/2 -translate-x-1/2 w-14 sm:w-16 h-5 rounded-t-xl rounded-b-sm bg-gradient-to-b from-[#FEF08A] via-[#F59E0B] to-[#B45309] border border-white/60 shadow-lg"
            />
            <div className="absolute -top-2.5 inset-x-[-4px] h-3 rounded-full bg-white/90 shadow-sm" />
            <div className="absolute inset-y-3 left-2 w-1.5 rounded-full bg-white/40 pointer-events-none" />
            <div className="relative h-full w-full rounded-b-[20px] rounded-t-lg bg-gradient-to-b from-[#6EE7B7] via-[#10B981] to-[#047857] overflow-hidden flex items-center justify-center">
              <Check className="w-8 h-8 text-white/95 drop-shadow" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (slideIndex === 1) {
    return (
      <div className="relative w-full max-w-xl mx-auto h-[290px] sm:h-[380px] lg:h-[440px] flex items-center justify-center select-none">
        <svg viewBox="0 0 520 340" className="w-full h-full overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id="trailGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="50%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#FBBF24" />
            </linearGradient>
          </defs>

          {/* Island Silhouettes */}
          <ellipse cx="95" cy="260" rx="76" ry="26" fill="rgba(16,185,129,0.22)" />
          <ellipse cx="255" cy="182" rx="88" ry="30" fill="rgba(56,189,248,0.22)" />
          <ellipse cx="425" cy="108" rx="78" ry="26" fill="rgba(251,191,36,0.22)" />

          {/* Animated winding path */}
          <motion.path
            d="M 74 256 C 145 256, 152 142, 248 178 C 335 212, 345 96, 444 102"
            fill="none"
            stroke="url(#trailGrad)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray="14 14"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: reduceMotion ? 0 : 1.8, ease: 'easeOut' }}
          />

          {/* Level Nodes */}
          {[
            { cx: 78, cy: 252, r: 26, fill: '#10B981', label: '1', delay: 0.1 },
            { cx: 165, cy: 192, r: 24, fill: '#0EA5E9', label: '15', delay: 0.25 },
            { cx: 260, cy: 178, r: 28, fill: '#F59E0B', label: '41', delay: 0.4 },
            { cx: 358, cy: 140, r: 25, fill: '#EC4899', label: '75', delay: 0.55 },
            { cx: 444, cy: 102, r: 29, fill: '#E55A3C', label: '∞', delay: 0.7 },
          ].map((node) => (
            <motion.g
              key={node.label}
              initial={reduceMotion ? false : { scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: reduceMotion ? 0 : node.delay, type: 'spring', stiffness: 260, damping: 18 }}
            >
              <circle cx={node.cx} cy={node.cy + 5} r={node.r} fill="rgba(0,0,0,0.35)" />
              <circle cx={node.cx} cy={node.cy} r={node.r} fill={node.fill} stroke="#FFFFFF" strokeWidth="4" />
              <text
                x={node.cx}
                y={node.cy + 6}
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="18"
                fontWeight="800"
              >
                {node.label}
              </text>
            </motion.g>
          ))}
        </svg>

        {/* Floating Animated Best Time & Mastery Callouts */}
        <motion.div
          animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-6 left-4 sm:left-8 flex items-center gap-2.5 rounded-2xl bg-[#0B2239]/85 backdrop-blur-md border border-[#FDE047]/45 px-4 py-2.5 shadow-xl"
        >
          <Crown className="w-5 h-5 text-[#FDE047] shrink-0" />
          <div className="text-left">
            <div className="text-xs font-bold text-white">Perfect Mastery</div>
            <div className="text-[11px] text-sky-200 tabular-nums">3 Stars · Zero Undo</div>
          </div>
        </motion.div>

        <motion.div
          animate={reduceMotion ? undefined : { y: [0, 8, 0] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
          className="absolute bottom-6 right-4 sm:right-8 flex items-center gap-2.5 rounded-2xl bg-[#0B2239]/85 backdrop-blur-md border border-[#5EEAD4]/45 px-4 py-2.5 shadow-xl"
        >
          <Trophy className="w-5 h-5 text-[#5EEAD4] shrink-0" />
          <div className="text-left">
            <div className="text-xs font-bold text-white">New Best Time</div>
            <div className="text-[11px] text-[#5EEAD4] font-semibold tabular-nums">0:24 · 8s faster</div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (slideIndex === 2) {
    const wheelColors = [
      '#F59E0B',
      '#10B981',
      '#0EA5E9',
      '#EC4899',
      '#8B5CF6',
      '#EF4444',
      '#14B8A6',
      '#F97316',
    ];
    return (
      <div className="relative w-full max-w-xl mx-auto h-[290px] sm:h-[380px] lg:h-[440px] flex items-center justify-center select-none">
        {/* Top pointer */}
        <motion.div
          animate={reduceMotion ? undefined : { rotate: [0, -14, 0, -10, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: 'top center' }}
          className="absolute top-5 sm:top-9 z-20 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[24px] border-l-transparent border-r-transparent border-t-[#FFE680] drop-shadow-[0_6px_12px_rgba(0,0,0,0.5)]"
        />

        {/* Rotating 3D Lucky Prize Wheel */}
        <motion.div
          animate={reduceMotion ? undefined : { rotate: 360 }}
          transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
          className="relative w-52 h-52 sm:w-68 sm:h-68 rounded-full p-2.5 bg-gradient-to-b from-[#FEF08A] via-[#F59E0B] to-[#92400E] shadow-[0_30px_65px_-14px_rgba(245,158,11,0.48)]"
        >
          <svg viewBox="0 0 200 200" className="w-full h-full rounded-full" aria-hidden="true">
            {wheelColors.map((color, idx) => {
              const startAngle = (idx * 45 * Math.PI) / 180;
              const endAngle = ((idx + 1) * 45 * Math.PI) / 180;
              const x1 = 100 + 96 * Math.cos(startAngle);
              const y1 = 100 + 96 * Math.sin(startAngle);
              const x2 = 100 + 96 * Math.cos(endAngle);
              const y2 = 100 + 96 * Math.sin(endAngle);
              return (
                <path
                  key={color + idx}
                  d={`M 100 100 L ${x1} ${y1} A 96 96 0 0 1 ${x2} ${y2} Z`}
                  fill={color}
                  stroke="#FFFDF7"
                  strokeWidth="2"
                />
              );
            })}
            <circle cx="100" cy="100" r="24" fill="#FFFDF7" stroke="#B45309" strokeWidth="5" />
            <text
              x="100"
              y="105"
              textAnchor="middle"
              fill="#92400E"
              fontSize="14"
              fontWeight="900"
            >
              3/3
            </text>
          </svg>
        </motion.div>

        {/* Orbiting Reward Cards */}
        <motion.div
          animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-12 left-2 sm:left-6 flex items-center gap-2 rounded-2xl bg-[#1D1138]/85 backdrop-blur-md border border-[#FBBF24]/45 px-3.5 py-2 shadow-xl"
        >
          <Coins className="w-4 h-4 text-[#FBBF24]" />
          <span className="text-xs font-bold text-white tabular-nums">+500 Coins</span>
        </motion.div>

        <motion.div
          animate={reduceMotion ? undefined : { y: [0, 10, 0] }}
          transition={{ duration: 3.3, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
          className="absolute bottom-10 left-4 sm:left-10 flex items-center gap-2 rounded-2xl bg-[#1D1138]/85 backdrop-blur-md border border-[#F472B6]/45 px-3.5 py-2 shadow-xl"
        >
          <Flame className="w-4 h-4 text-[#FB7185]" />
          <span className="text-xs font-bold text-white tabular-nums">30-Day Streak</span>
        </motion.div>

        <motion.div
          animate={reduceMotion ? undefined : { y: [0, -9, 0] }}
          transition={{ duration: 3.1, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
          className="absolute bottom-12 right-2 sm:right-6 flex items-center gap-2 rounded-2xl bg-[#1D1138]/85 backdrop-blur-md border border-[#5EEAD4]/45 px-3.5 py-2 shadow-xl"
        >
          <Gift className="w-4 h-4 text-[#5EEAD4]" />
          <span className="text-xs font-bold text-white tabular-nums">3 Daily Spins</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-xl mx-auto h-[290px] sm:h-[380px] lg:h-[440px] flex flex-col items-center justify-center gap-6 select-none">
      {/* Animated Friend Heart Gifting Row */}
      <div className="relative flex items-center justify-center gap-10 sm:gap-16">
        {[
          { initials: 'AM', color: 'from-[#38BDF8] to-[#0284C7]', name: 'Amina' },
          { initials: 'YOU', color: 'from-[#F59E0B] to-[#E55A3C]', name: 'You' },
          { initials: 'RK', color: 'from-[#34D399] to-[#059669]', name: 'Raza' },
        ].map((friend, i) => (
          <motion.div
            key={friend.name}
            animate={reduceMotion ? undefined : { y: [0, i === 1 ? -10 : -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.35, ease: 'easeInOut' }}
            className="flex flex-col items-center gap-1.5"
          >
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br ${friend.color} border-2 border-white/85 shadow-xl flex items-center justify-center font-display text-base sm:text-lg font-bold text-white`}
            >
              {friend.initials}
            </div>
            <span className="text-xs font-semibold text-emerald-100">{friend.name}</span>
          </motion.div>
        ))}

        {/* Floating Heart Life flying across */}
        {!reduceMotion && (
          <motion.div
            animate={{ x: [-72, 0, 72], y: [-12, -46, -12], scale: [0.85, 1.2, 0.85] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-2 pointer-events-none"
          >
            <div className="w-10 h-10 rounded-full bg-[#F43F5E] border-2 border-white flex items-center justify-center shadow-[0_10px_25px_rgba(244,63,94,0.55)]">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
          </motion.div>
        )}
      </div>

      {/* Metallic Social Achievement Medallions */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-md px-2">
        {[
          {
            title: '5 Friends Added',
            tier: 'Silver Medal',
            icon: Users,
            gradient: 'from-[#E2E8F0] to-[#94A3B8]',
            text: 'text-slate-900',
          },
          {
            title: '100 Lives Sent',
            tier: 'Platinum Medal',
            icon: Award,
            gradient: 'from-[#A5F3FC] via-[#38BDF8] to-[#818CF8]',
            text: 'text-slate-950',
          },
        ].map((badge, idx) => {
          const Icon = badge.icon;
          return (
            <motion.div
              key={badge.title}
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : 0.25 + idx * 0.15 }}
              className="flex items-center gap-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-3 shadow-lg"
            >
              <div
                className={`w-11 h-11 rounded-xl bg-gradient-to-br ${badge.gradient} ${badge.text} flex items-center justify-center shrink-0 shadow-md`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0 text-left">
                <div className="text-xs font-bold text-white truncate">{badge.title}</div>
                <div className="text-[11px] text-emerald-200">{badge.tier}</div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  currentSavedLevel,
  reduceMotion,
  initialStep = 'splash',
  onComplete,
}) => {
  const [step, setStep] = useState<FlowStep>(initialStep);
  const [splashProgress, setSplashProgress] = useState(0);
  const [featureIdx, setFeatureIdx] = useState(0);
  const [featureAutoPlay, setFeatureAutoPlay] = useState(true);
  const [slideDirection, setSlideDirection] = useState<1 | -1>(1);
  const touchStartXRef = useRef<number | null>(null);

  // Email delivery configuration status from server
  const [emailConfigured, setEmailConfigured] = useState<boolean | null>(null);

  // Auth form state
  const [authTab, setAuthTab] = useState<'register' | 'login'>('register');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [needsEmailConfigNotice, setNeedsEmailConfigNotice] = useState(false);

  // Real Email OTP verification state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [otpExpiresSec, setOtpExpiresSec] = useState(600);
  const [resendCooldownSec, setResendCooldownSec] = useState(0);

  // Final celebration payload
  const [welcomePayload, setWelcomePayload] = useState<OnboardingAuthResult | null>(null);

  // Query server email delivery status once
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/email-status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.configured === 'boolean') {
          setEmailConfigured(data.configured);
        }
      })
      .catch(() => {
        if (!cancelled) setEmailConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Step 1: Splash screen smooth progress -> auto advance to Step 2
  useEffect(() => {
    if (step !== 'splash') return;
    if (reduceMotion) {
      setSplashProgress(100);
      const t = window.setTimeout(() => setStep('features'), 850);
      return () => window.clearTimeout(t);
    }
    const start = Date.now();
    const duration = 2000;
    const interval = window.setInterval(() => {
      const pct = Math.min(100, Math.round(((Date.now() - start) / duration) * 100));
      setSplashProgress(pct);
      if (pct >= 100) {
        window.clearInterval(interval);
        window.setTimeout(() => setStep('features'), 240);
      }
    }, 45);
    return () => window.clearInterval(interval);
  }, [step, reduceMotion]);

  // Step 2: Full-screen feature slide navigation helpers
  const goToSlide = useCallback(
    (nextIndex: number, pauseAuto = true) => {
      if (pauseAuto) setFeatureAutoPlay(false);
      const bounded = Math.max(0, Math.min(FEATURE_SLIDES.length - 1, nextIndex));
      setSlideDirection(bounded >= featureIdx ? 1 : -1);
      setFeatureIdx(bounded);
    },
    [featureIdx]
  );

  // Auto-advance feature flow animation smoothly
  useEffect(() => {
    if (step !== 'features' || !featureAutoPlay) return;
    const timer = window.setTimeout(() => {
      if (featureIdx < FEATURE_SLIDES.length - 1) {
        setSlideDirection(1);
        setFeatureIdx((prev) => prev + 1);
      } else {
        setFeatureAutoPlay(false);
      }
    }, SLIDE_AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [step, featureIdx, featureAutoPlay]);

  // Keyboard navigation on Full-Screen Features Flow
  useEffect(() => {
    if (step !== 'features') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        if (featureIdx < FEATURE_SLIDES.length - 1) {
          goToSlide(featureIdx + 1, true);
        } else {
          setStep('auth');
        }
      } else if (e.key === 'ArrowLeft' && featureIdx > 0) {
        goToSlide(featureIdx - 1, true);
      } else if (e.key === 'Escape') {
        setStep('auth');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [step, featureIdx, goToSlide]);

  // OTP timers (expiration & resend cooldown)
  useEffect(() => {
    if (step !== 'verify') return;
    const interval = window.setInterval(() => {
      setOtpExpiresSec((prev) => (prev > 0 ? prev - 1 : 0));
      setResendCooldownSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [step]);

  const activeSlide = useMemo(() => FEATURE_SLIDES[featureIdx], [featureIdx]);

  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setNeedsEmailConfigNotice(false);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setAuthError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    if (authTab === 'register') {
      const cleanName = displayName.trim();
      if (cleanName.length < 2) {
        setAuthError('Please enter your player name (at least 2 characters).');
        return;
      }
      if (password !== confirmPassword) {
        setAuthError('Passwords do not match.');
        return;
      }

      setAuthSubmitting(true);
      try {
        const res = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normalizedEmail,
            displayName: cleanName,
            password,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          if (data.code === 'EMAIL_NOT_CONFIGURED') {
            setNeedsEmailConfigNotice(true);
          }
          setAuthError(data.error || 'Could not send verification email. Please try again.');
          return;
        }

        setOtpDigits(['', '', '', '', '', '']);
        setVerifyError(null);
        setOtpExpiresSec(typeof data.expiresInSeconds === 'number' ? data.expiresInSeconds : 600);
        setResendCooldownSec(typeof data.cooldownSeconds === 'number' ? data.cooldownSeconds : 45);
        setVerifyMessage(
          `We sent a real 6-digit verification code to ${normalizedEmail}. Check your inbox (and spam folder).`
        );
        setStep('verify');
        window.setTimeout(() => otpInputRefs.current[0]?.focus(), 120);
      } catch {
        setAuthError('Network error while contacting the verification server. Please retry.');
      } finally {
        setAuthSubmitting(false);
      }
      return;
    }

    // Existing account login via server API
    setAuthSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok || !data.user) {
        setAuthError(data.error || 'Login failed. Please verify your email and password.');
        return;
      }

      if (typeof data.token === 'string') {
        setAuthSessionToken(data.token);
      }
      setWelcomePayload({
        mode: 'login',
        email: data.user.email,
        displayName: data.user.displayName,
        continueLevel: data.user.continueLevel,
        sessionToken: data.token,
      });
      setStep('welcome');
    } catch {
      setAuthError('Network error while signing in. Please try again.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleOtpDigitChange = (index: number, rawValue: string) => {
    const clean = rawValue.replace(/\D/g, '');
    if (!clean) {
      setOtpDigits((prev) => {
        const next = [...prev];
        next[index] = '';
        return next;
      });
      return;
    }

    // Handle paste of multiple digits
    if (clean.length > 1) {
      const chars = clean.slice(0, 6).split('');
      setOtpDigits((prev) => {
        const next = [...prev];
        for (let i = 0; i < 6; i++) {
          next[i] = chars[i] ?? '';
        }
        return next;
      });
      const focusIdx = Math.min(5, chars.length);
      otpInputRefs.current[focusIdx]?.focus();
      return;
    }

    setOtpDigits((prev) => {
      const next = [...prev];
      next[index] = clean;
      return next;
    });
    if (index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError(null);

    const otpCode = otpDigits.join('');
    if (!/^\d{6}$/.test(otpCode)) {
      setVerifyError('Please enter all 6 digits from your verification email.');
      return;
    }

    setVerifySubmitting(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otpCode,
          displayName: displayName.trim(),
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok || !data.user) {
        setVerifyError(data.error || 'Verification failed. Please check your OTP and try again.');
        return;
      }

      if (typeof data.token === 'string') {
        setAuthSessionToken(data.token);
      }
      setWelcomePayload({
        mode: 'register',
        email: data.user.email,
        displayName: data.user.displayName,
        continueLevel: data.user.continueLevel,
        sessionToken: data.token,
      });
      setStep('welcome');
    } catch {
      setVerifyError('Network error while verifying OTP. Please try again.');
    } finally {
      setVerifySubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldownSec > 0 || resendingOtp) return;
    setResendingOtp(true);
    setVerifyError(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          displayName: displayName.trim(),
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (typeof data.retryAfterSeconds === 'number') {
          setResendCooldownSec(data.retryAfterSeconds);
        }
        setVerifyError(data.error || 'Could not resend OTP email right now.');
        return;
      }
      setOtpDigits(['', '', '', '', '', '']);
      setOtpExpiresSec(typeof data.expiresInSeconds === 'number' ? data.expiresInSeconds : 600);
      setResendCooldownSec(typeof data.cooldownSeconds === 'number' ? data.cooldownSeconds : 45);
      setVerifyMessage(`A fresh 6-digit OTP has been sent to ${normalizedEmail}.`);
      otpInputRefs.current[0]?.focus();
    } catch {
      setVerifyError('Network error while resending verification code.');
    } finally {
      setResendingOtp(false);
    }
  };

  /* =========================================================================
   * STEP 1: SPLASH SCREEN WITH GAME LOGO
   * ========================================================================= */
  if (step === 'splash') {
    return (
      <main
        onClick={() => setStep('features')}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 bg-gradient-to-b from-[#081524] via-[#0E2842] to-[#091A2B] text-white cursor-pointer select-none overflow-hidden"
      >
        <div
          aria-hidden="true"
          className="absolute w-96 h-96 rounded-full bg-[#2BD4C5]/15 blur-3xl pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute bottom-12 right-12 w-80 h-80 rounded-full bg-[#F59E0B]/15 blur-3xl pointer-events-none"
        />

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.92, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex flex-col items-center text-center max-w-sm"
        >
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-[28px] bg-white/95 border-2 border-[#FFE680]/80 p-3.5 shadow-[0_20px_50px_-10px_rgba(43,212,197,0.38)] flex items-center justify-center">
            <img
              src="/logo.png"
              alt="RSS Liquid Flow Logo"
              className="w-full h-full object-contain drop-shadow-sm"
            />
          </div>

          <p className="mt-6 text-xs font-bold tracking-[0.22em] text-[#5EEAD4]">
            RAZEEN SMART SOLUTION
          </p>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
            RSS Liquid Flow
          </h1>
          <p className="mt-1.5 text-sm text-[#A9CBE0]">
            Crystal Glass Liquid Sorting Adventure
          </p>

          <div className="mt-8 w-56">
            <div className="w-full h-2 rounded-full bg-white/15 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#2BD4C5] via-[#38BDF8] to-[#F5BC38] transition-all duration-100"
                style={{ width: `${splashProgress}%` }}
              />
            </div>
            <p className="mt-2.5 text-xs text-[#A9CBE0] tabular-nums">
              Preparing your sanctuary · {splashProgress}%
            </p>
          </div>
        </motion.div>
      </main>
    );
  }

  /* =========================================================================
   * STEP 2: FULL-SCREEN ANIMATED GAME FEATURES FLOW
   * ========================================================================= */
  if (step === 'features') {
    const isLastSlide = featureIdx === FEATURE_SLIDES.length - 1;

    return (
      <main
        aria-label="Game features showcase"
        onTouchStart={(e) => {
          touchStartXRef.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (touchStartXRef.current === null) return;
          const deltaX = (e.changedTouches[0]?.clientX ?? 0) - touchStartXRef.current;
          touchStartXRef.current = null;
          if (Math.abs(deltaX) > 48) {
            if (deltaX < 0) {
              if (featureIdx < FEATURE_SLIDES.length - 1) goToSlide(featureIdx + 1, true);
              else setStep('auth');
            } else if (featureIdx > 0) {
              goToSlide(featureIdx - 1, true);
            }
          }
        }}
        className={`fixed inset-0 z-50 w-screen h-dvh flex flex-col justify-between overflow-hidden bg-gradient-to-br ${activeSlide.backdrop} text-white transition-colors duration-700`}
      >
        {/* Full-screen ambient animated background orbs & crystal bubbles */}
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            key={`orb-a-${activeSlide.id}`}
            initial={{ opacity: 0.4, scale: 0.9 }}
            animate={
              reduceMotion
                ? { opacity: 0.8, scale: 1 }
                : { opacity: [0.6, 0.95, 0.6], scale: [1, 1.12, 1], x: [0, 28, 0], y: [0, 18, 0] }
            }
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            style={{ backgroundColor: activeSlide.orbPrimary }}
            className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full blur-3xl"
          />
          <motion.div
            key={`orb-b-${activeSlide.id}`}
            initial={{ opacity: 0.4, scale: 0.9 }}
            animate={
              reduceMotion
                ? { opacity: 0.75, scale: 1 }
                : { opacity: [0.55, 0.9, 0.55], scale: [1, 1.1, 1], x: [0, -24, 0], y: [0, -22, 0] }
            }
            transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
            style={{ backgroundColor: activeSlide.orbSecondary }}
            className="absolute -bottom-24 -right-24 w-[460px] h-[460px] rounded-full blur-3xl"
          />

          {/* Subtle rising effervescent crystal bubbles */}
          {!reduceMotion &&
            [
              { left: '12%', size: 12, dur: 9, delay: 0 },
              { left: '28%', size: 18, dur: 12, delay: 1.5 },
              { left: '54%', size: 10, dur: 8, delay: 0.8 },
              { left: '74%', size: 16, dur: 11, delay: 2.2 },
              { left: '89%', size: 14, dur: 10, delay: 0.4 },
            ].map((b, idx) => (
              <motion.span
                key={idx}
                animate={{ y: ['105vh', '-10vh'], opacity: [0, 0.35, 0.35, 0] }}
                transition={{
                  duration: b.dur,
                  repeat: Infinity,
                  delay: b.delay,
                  ease: 'linear',
                }}
                style={{ left: b.left, width: b.size, height: b.size }}
                className="absolute bottom-0 rounded-full border border-white/30 bg-white/10"
              />
            ))}
        </div>

        {/* TOP HEADER: Full-width animated story progress bars + brand + skip */}
        <header className="relative z-20 w-full max-w-6xl mx-auto px-5 sm:px-8 pt-4 sm:pt-6">
          {/* Animated story progress bars */}
          <div
            className="grid grid-cols-4 gap-2 mb-4"
            role="tablist"
            aria-label="Game feature chapters"
          >
            {FEATURE_SLIDES.map((s, idx) => {
              const isPast = idx < featureIdx;
              const isCurrent = idx === featureIdx;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={isCurrent}
                  aria-label={`Chapter ${idx + 1}: ${s.title}`}
                  onClick={() => goToSlide(idx, true)}
                  className="h-1.5 rounded-full bg-white/20 overflow-hidden cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
                >
                  {isPast ? (
                    <div className="w-full h-full bg-white rounded-full" />
                  ) : isCurrent ? (
                    <motion.div
                      key={`bar-${featureIdx}-${featureAutoPlay ? 'auto' : 'manual'}`}
                      initial={{ scaleX: featureAutoPlay && !reduceMotion ? 0 : 1 }}
                      animate={{ scaleX: 1 }}
                      transition={{
                        duration: featureAutoPlay && !reduceMotion ? SLIDE_AUTOPLAY_MS / 1000 : 0.25,
                        ease: 'linear',
                      }}
                      style={{ transformOrigin: 'left', backgroundColor: activeSlide.accentHex }}
                      className="w-full h-full rounded-full"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
              <img
                src="/logo.png"
                alt="RSS Liquid Flow"
                className="w-9 h-9 object-contain drop-shadow-sm"
              />
              <span className="font-display text-base sm:text-lg font-bold tracking-tight text-white">
                RSS Liquid Flow
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setFeatureAutoPlay((v) => !v)}
                aria-label={featureAutoPlay ? 'Pause feature animation' : 'Resume feature animation'}
                className="min-w-[40px] min-h-[40px] rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 flex items-center justify-center text-white/90 transition-colors cursor-pointer"
              >
                {featureAutoPlay ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => setStep('auth')}
                className="min-h-[40px] px-4 rounded-xl text-sm font-semibold text-white/85 hover:text-white hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap"
              >
                Skip Intro
              </button>
            </div>
          </div>
        </header>

        {/* CENTER FULL-SCREEN ANIMATED THEATER */}
        <section className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-5 sm:px-8 flex items-center overflow-y-auto no-scrollbar py-2">
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
            {/* Animated Visual Diorama (60% width on desktop) */}
            <div className="lg:col-span-7 flex items-center justify-center">
              <AnimatePresence mode="wait" custom={slideDirection}>
                <motion.div
                  key={activeSlide.id}
                  initial={
                    reduceMotion
                      ? false
                      : { opacity: 0, x: slideDirection * 48, scale: 0.96 }
                  }
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={
                    reduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, x: slideDirection * -48, scale: 0.96 }
                  }
                  transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full"
                >
                  <FullscreenFeatureScene slideIndex={featureIdx} reduceMotion={reduceMotion} />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Editorial Copy & Feature Highlights (40% width on desktop) */}
            <div className="lg:col-span-5 text-left">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`copy-${activeSlide.id}`}
                  initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -16 }}
                  transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-4 sm:space-y-5"
                >
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold tracking-wide text-sky-200 tabular-nums">
                    <span style={{ color: activeSlide.accentHex }}>{activeSlide.indexLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeSlide.kicker}</span>
                  </div>

                  <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-[1.08] tracking-tight text-balance">
                    {activeSlide.title}
                  </h1>

                  <p className="text-sm sm:text-base text-sky-100/85 leading-relaxed max-w-lg">
                    {activeSlide.description}
                  </p>

                  <ul className="space-y-2.5 pt-1">
                    {activeSlide.highlights.map((item, idx) => (
                      <motion.li
                        key={item}
                        initial={reduceMotion ? false : { opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: reduceMotion ? 0 : 0.1 + idx * 0.08 }}
                        className="flex items-center gap-2.5 text-sm font-semibold text-white/95"
                      >
                        <span
                          style={{ color: activeSlide.accentHex }}
                          className="shrink-0"
                          aria-hidden="true"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </span>
                        <span>{item}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* BOTTOM EDGE-TO-EDGE ACTION DOCK */}
        <footer className="relative z-20 w-full max-w-6xl mx-auto px-5 sm:px-8 pb-5 sm:pb-8 pt-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {featureIdx > 0 ? (
                <button
                  type="button"
                  onClick={() => goToSlide(featureIdx - 1, true)}
                  className="min-h-[48px] px-4 sm:px-5 rounded-2xl bg-white/10 hover:bg-white/18 border border-white/20 text-white font-display text-sm sm:text-base font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              ) : (
                <span className="hidden sm:inline text-xs font-medium text-sky-200/75">
                  Swipe or use arrow keys to explore
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setFeatureAutoPlay(false);
                if (isLastSlide) {
                  setStep('auth');
                } else {
                  goToSlide(featureIdx + 1, true);
                }
              }}
              className="min-h-[50px] px-7 sm:px-9 rounded-2xl btn-tactile-coral text-white font-display text-base font-bold inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <span>{isLastSlide ? 'Continue to Account' : 'Next Feature'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </footer>
      </main>
    );
  }

  /* =========================================================================
   * STEP 3: REGISTRATION OR LOGIN PAGE
   * ========================================================================= */
  if (step === 'auth') {
    return (
      <main className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-gradient-to-b from-[#081524] via-[#0F2B46] to-[#091A2B] overflow-y-auto">
        <section
          aria-labelledby="onboarding-auth-title"
          className={`w-full max-w-md rounded-3xl theme-surface border p-6 shadow-2xl ${
            reduceMotion ? '' : 'animate-screen-transition'
          }`}
        >
          <div className="text-center">
            <img
              src="/logo.png"
              alt="RSS Liquid Flow"
              className="w-16 h-16 object-contain mx-auto mb-3 drop-shadow-sm"
            />
            <h1 id="onboarding-auth-title" className="font-display text-2xl font-bold theme-ink">
              {authTab === 'register' ? 'Create Player Account' : 'Welcome Back'}
            </h1>
            <p className="text-xs theme-ink-secondary mt-1">
              {authTab === 'register'
                ? 'We will send a real 6-digit OTP to your email address to verify your account.'
                : 'Sign in with your verified account to continue from your exact saved level.'}
            </p>
          </div>

          {/* Segmented Tab Switcher */}
          <div
            className="mt-5 grid grid-cols-2 gap-1 p-1 rounded-2xl theme-surface-muted border"
            role="tablist"
            aria-label="Account mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={authTab === 'register'}
              onClick={() => {
                setAuthTab('register');
                setAuthError(null);
                setNeedsEmailConfigNotice(false);
              }}
              className={`min-h-[42px] rounded-xl font-display text-sm font-bold transition-colors cursor-pointer ${
                authTab === 'register'
                  ? 'theme-surface theme-ink shadow-xs'
                  : 'theme-ink-secondary'
              }`}
            >
              Register
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={authTab === 'login'}
              onClick={() => {
                setAuthTab('login');
                setAuthError(null);
                setNeedsEmailConfigNotice(false);
              }}
              className={`min-h-[42px] rounded-xl font-display text-sm font-bold transition-colors cursor-pointer ${
                authTab === 'login'
                  ? 'theme-surface theme-ink shadow-xs'
                  : 'theme-ink-secondary'
              }`}
            >
              Login
            </button>
          </div>

          {authTab === 'register' && (emailConfigured === false || needsEmailConfigNotice) && (
            <div className="mt-4 p-3 rounded-2xl bg-[#FFF6E5] dark:bg-[#2F2411] border border-[#F3D19C] dark:border-[#6B4E1B] text-[#7A4F0B] dark:text-[#FDE68A] text-xs leading-relaxed">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Email OTP Server Setup Needed</strong>
                  Add <code className="font-mono">RESEND_API_KEY</code> and{' '}
                  <code className="font-mono">SENDER_EMAIL</code> in AI Studio{' '}
                  <strong>Settings → Secrets</strong> so OTP codes can be delivered to real inboxes.
                </div>
              </div>
            </div>
          )}

          {authError && (
            <div
              role="alert"
              className="mt-4 p-3 rounded-2xl bg-[#FFE7EC] dark:bg-[#3A1E33] border border-[#F3BCC8] dark:border-[#6A3256] text-[#B82843] dark:text-[#FF8AA1] text-xs font-semibold text-center"
            >
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="mt-4 space-y-3.5">
            {authTab === 'register' && (
              <div>
                <label className="block text-xs font-bold theme-ink mb-1">Player Name</label>
                <div className="relative">
                  <User className="w-4 h-4 theme-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={32}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                    className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 rounded-xl theme-surface-muted border theme-border text-sm font-semibold theme-ink focus:outline-2 focus:outline-[#E55A3C]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold theme-ink mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 theme-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 rounded-xl theme-surface-muted border theme-border text-sm font-semibold theme-ink focus:outline-2 focus:outline-[#E55A3C]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold theme-ink mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 theme-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete={authTab === 'register' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full min-h-[44px] pl-10 pr-11 py-2.5 rounded-xl theme-surface-muted border theme-border text-sm font-semibold theme-ink focus:outline-2 focus:outline-[#E55A3C]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 min-w-[32px] min-h-[32px] flex items-center justify-center theme-ink-muted cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authTab === 'register' && (
              <div>
                <label className="block text-xs font-bold theme-ink mb-1">Confirm Password</label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 theme-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 rounded-xl theme-surface-muted border theme-border text-sm font-semibold theme-ink focus:outline-2 focus:outline-[#E55A3C]"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full min-h-[48px] rounded-2xl btn-tactile-coral text-white font-display text-base font-bold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-65 mt-2"
            >
              {authSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{authTab === 'register' ? 'Sending OTP Email…' : 'Signing In…'}</span>
                </>
              ) : (
                <>
                  <span>
                    {authTab === 'register' ? 'Send Verification OTP' : 'Login & Continue'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 pt-3 border-t theme-border flex items-center justify-between text-xs theme-ink-secondary">
            <button
              type="button"
              onClick={() => {
                setFeatureIdx(0);
                setFeatureAutoPlay(true);
                setStep('features');
              }}
              className="font-semibold hover:underline cursor-pointer"
            >
              ← Replay Features
            </button>
            <span>Existing users resume saved level</span>
          </div>
        </section>
      </main>
    );
  }

  /* =========================================================================
   * STEP 4A: REAL EMAIL OTP VERIFICATION (6-BOX INPUT)
   * ========================================================================= */
  if (step === 'verify') {
    const isCodeComplete = otpDigits.every((d) => /^\d$/.test(d));
    return (
      <main className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-gradient-to-b from-[#081524] via-[#0F2B46] to-[#091A2B] overflow-y-auto">
        <section
          aria-labelledby="verify-email-title"
          className={`w-full max-w-md rounded-3xl theme-surface border p-6 shadow-2xl ${
            reduceMotion ? '' : 'animate-screen-transition'
          }`}
        >
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto">
              <div className="w-20 h-20 rounded-2xl bg-white border-2 border-[#FFE680] p-2 shadow-md flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="RSS Liquid Flow"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-xl bg-[#2E8555] text-white border-2 border-white dark:border-[#0D2235] flex items-center justify-center shadow-sm">
                <MailCheck className="w-4 h-4" />
              </div>
            </div>
            <h1 id="verify-email-title" className="mt-4 font-display text-2xl font-bold theme-ink">
              Check Your Email
            </h1>
            <p className="mt-1 text-xs sm:text-sm theme-ink-secondary">
              Enter the 6-digit OTP we emailed to{' '}
              <strong className="theme-ink">{email.trim().toLowerCase()}</strong>.
            </p>
          </div>

          {verifyMessage && (
            <div className="mt-4 rounded-2xl theme-surface-muted border p-3 text-xs theme-ink-secondary text-center leading-relaxed">
              <p>{verifyMessage}</p>
              <p className="mt-1 font-semibold theme-ink tabular-nums">
                {otpExpiresSec > 0
                  ? `Code expires in ${formatCountdown(otpExpiresSec)}`
                  : 'This code has expired. Tap Resend OTP below.'}
              </p>
            </div>
          )}

          {verifyError && (
            <div
              role="alert"
              className="mt-3 p-3 rounded-2xl bg-[#FFE7EC] dark:bg-[#3A1E33] border border-[#F3BCC8] dark:border-[#6A3256] text-[#B82843] dark:text-[#FF8AA1] text-xs font-semibold text-center"
            >
              {verifyError}
            </div>
          )}

          <form onSubmit={handleVerifyEmail} className="mt-5 space-y-5">
            <div>
              <label className="block text-xs font-bold theme-ink mb-2 text-center">
                6-Digit Email OTP
              </label>
              <div className="grid grid-cols-6 gap-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpInputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                    aria-label={`OTP digit ${idx + 1}`}
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-full h-14 rounded-2xl theme-surface-muted border theme-border text-center font-display text-2xl font-bold theme-ink tabular-nums focus:outline-2 focus:outline-[#2E8555]"
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={verifySubmitting || !isCodeComplete || otpExpiresSec === 0}
              className="w-full min-h-[48px] rounded-2xl btn-tactile-emerald text-white font-display text-base font-bold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {verifySubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Verifying OTP…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Verify &amp; Complete Registration</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setVerifyError(null);
                setStep('auth');
              }}
              className="theme-ink-secondary hover:underline cursor-pointer"
            >
              ← Change Email
            </button>
            <button
              type="button"
              disabled={resendCooldownSec > 0 || resendingOtp}
              onClick={handleResendCode}
              className="inline-flex items-center gap-1 text-[#E55A3C] dark:text-[#2BD4C5] hover:underline cursor-pointer disabled:opacity-50 disabled:no-underline tabular-nums"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resendingOtp ? 'animate-spin' : ''}`} />
              <span>
                {resendCooldownSec > 0
                  ? `Resend in ${resendCooldownSec}s`
                  : resendingOtp
                    ? 'Sending…'
                    : 'Resend OTP'}
              </span>
            </button>
          </div>
        </section>
      </main>
    );
  }

  /* =========================================================================
   * STEP 4B: WELCOME / WELCOME BACK + CONGRATS 🎉 CELEBRATION SCREEN
   * ========================================================================= */
  const isRegister = welcomePayload?.mode === 'register';

  return (
    <main className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-gradient-to-b from-[#081524] via-[#0F2B46] to-[#091A2B] overflow-y-auto">
      <VictoryConfetti active={!reduceMotion} stars={3} reduceMotion={reduceMotion} />
      <section
        aria-labelledby="welcome-congrats-title"
        className={`relative z-10 w-full max-w-md rounded-3xl theme-surface border p-6 sm:p-7 shadow-2xl text-center ${
          reduceMotion ? '' : 'animate-victory-card'
        }`}
      >
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-[#FFE896] via-[#F59E0B] to-[#E55A3C] border-2 border-white shadow-lg flex items-center justify-center text-white">
          <Sparkles className="w-10 h-10" />
        </div>

        <p className="mt-4 text-xs font-bold text-[#2E8555] dark:text-[#5EEAD4]">
          {isRegister ? 'Email Verified Successfully' : 'Account Restored'}
        </p>

        <h1
          id="welcome-congrats-title"
          className="mt-1.5 font-display text-2xl sm:text-3xl font-bold theme-ink text-balance"
        >
          {isRegister
            ? `Welcome, ${welcomePayload?.displayName}! Congrats 🎉`
            : `Welcome Back, ${welcomePayload?.displayName}! Congrats 🎉`}
        </h1>

        <p className="mt-2 text-sm theme-ink-secondary leading-relaxed">
          {isRegister
            ? 'Your RSS Liquid Flow email is verified and your account is ready. Jump into the dashboard and begin pouring!'
            : 'Great to see you again! Your progress is synced and ready to continue right where you left off.'}
        </p>

        <div className="mt-5 rounded-2xl theme-surface-muted border p-4 flex items-center justify-between text-left tabular-nums">
          <div>
            <div className="text-xs font-semibold theme-ink-secondary">
              {isRegister ? 'Starting Adventure' : 'Continuing Progress'}
            </div>
            <div className="font-display text-lg font-bold theme-ink">
              Level {welcomePayload?.continueLevel ?? 1}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold theme-ink-secondary">Verified Email</div>
            <div className="text-xs font-bold text-[#2E8555] dark:text-[#5EEAD4] truncate max-w-[165px]">
              {welcomePayload?.email}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (welcomePayload) {
              onComplete(welcomePayload);
            }
          }}
          className="mt-6 w-full min-h-[50px] rounded-2xl btn-tactile-coral text-white font-display text-base font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>
            {isRegister
              ? 'Enter Dashboard & Play'
              : `Continue to Level ${welcomePayload?.continueLevel ?? 1}`}
          </span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </section>
    </main>
  );
};
