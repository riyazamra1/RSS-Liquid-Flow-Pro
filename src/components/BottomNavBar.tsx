import React from 'react';
import { Home, Play, Sprout, Trophy, User } from 'lucide-react';
import { AppScreen } from '../types/game';

interface BottomNavBarProps {
  activeScreen: AppScreen;
  onSelect: (screen: AppScreen) => void;
}

const NAV_ITEMS: {
  id: AppScreen;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}[] = [
  { id: 'home', label: 'Map', icon: Home },
  { id: 'garden', label: 'Garden', icon: Sprout },
  { id: 'play', label: 'Play', icon: Play },
  { id: 'rewards', label: 'Rewards', icon: Trophy },
  { id: 'profile', label: 'Profile', icon: User },
];

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeScreen, onSelect }) => {
  return (
    <nav
      aria-label="Primary navigation"
      className="fixed bottom-0 left-0 right-0 z-40 w-full pointer-events-none"
    >
      <div className="relative w-full h-[84px] pointer-events-auto drop-shadow-[0_-4px_20px_rgba(15,23,42,0.14)] dark:drop-shadow-[0_-6px_24px_rgba(0,0,0,0.5)]">
        {/* Seamless Full-Width Bar Silhouette with Curved Center Crest */}
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-end pointer-events-none"
        >
          <div
            className="flex-1 h-[64px] rounded-tl-[18px] -mr-px transition-colors duration-200"
            style={{ backgroundColor: 'var(--bg-surface)' }}
          />
          <svg
            viewBox="0 0 112 84"
            className="w-[112px] h-[84px] shrink-0 transition-colors duration-200"
            style={{ color: 'var(--bg-surface)' }}
            fill="currentColor"
          >
            <path d="M 0 20 L 10 20 C 24 20, 26 2, 56 2 C 86 2, 88 20, 102 20 L 112 20 L 112 84 L 0 84 Z" />
          </svg>
          <div
            className="flex-1 h-[64px] rounded-tr-[18px] -ml-px transition-colors duration-200"
            style={{ backgroundColor: 'var(--bg-surface)' }}
          />
        </div>

        {/* 5 Interactive Navigation Slots */}
        <div className="relative z-10 grid grid-cols-5 items-end h-full w-full px-1.5 sm:px-6">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isCenterPlay = item.id === 'play';
            const isActive = activeScreen === item.id;

            if (isCenterPlay) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                  aria-label="Play current level"
                  className="relative h-full flex flex-col items-center justify-end pb-2 cursor-pointer group focus-visible:outline-2 rounded-2xl"
                >
                  <span
                    className="absolute top-[5px] w-[50px] h-[50px] rounded-full flex items-center justify-center text-white transition-transform duration-150 group-hover:scale-105 group-active:scale-95"
                    style={{
                      background:
                        'linear-gradient(145deg, color-mix(in srgb, var(--accent-primary) 82%, #ffffff) 0%, var(--accent-primary) 55%, color-mix(in srgb, var(--accent-primary) 75%, #000000) 100%)',
                      boxShadow:
                        '0 6px 18px color-mix(in srgb, var(--accent-primary) 48%, transparent), inset 0 1px 2px rgba(255, 255, 255, 0.35)',
                    }}
                  >
                    <Icon className="w-5 h-5 fill-current ml-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.28)]" />
                  </span>
                  <span
                    className="text-[11px] font-semibold leading-none whitespace-nowrap transition-colors"
                    style={{
                      color: isActive ? 'var(--accent-primary)' : 'var(--ink-secondary)',
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className="relative h-[64px] flex flex-col items-center justify-between pt-1.5 pb-2 cursor-pointer group focus-visible:outline-2 rounded-2xl"
              >
                {/* Top Active Indicator Bar */}
                <span
                  aria-hidden="true"
                  className="w-5 h-[2.5px] rounded-full transition-all duration-150"
                  style={{
                    backgroundColor: isActive ? 'var(--accent-primary)' : 'transparent',
                    opacity: isActive ? 1 : 0,
                  }}
                />

                <Icon
                  className={`w-5 h-5 transition-colors duration-150 ${
                    isActive ? 'stroke-[2.3]' : 'stroke-[1.75] group-hover:opacity-80'
                  }`}
                  style={{
                    color: isActive ? 'var(--accent-primary)' : 'var(--ink-muted)',
                  }}
                />

                <span
                  className="text-[11px] font-semibold leading-none whitespace-nowrap transition-colors duration-150 group-hover:opacity-80"
                  style={{
                    color: isActive ? 'var(--accent-primary)' : 'var(--ink-muted)',
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
