import { AppThemeId } from '../types/game';

export interface AppThemeConfig {
  id: AppThemeId;
  name: string;
  shortLabel: string;
  description: string;
  isDark: boolean;
  themeColorMeta: string;
  swatchGradient: string;
  accentHex: string;
  skyFrom: string;
  skyVia: string;
  skyTo: string;
  orbPrimary: string;
  orbSecondary: string;
  orbTertiary: string;
  celestialFill: string;
  celestialGlow: string;
  cloudFill: string;
  hillFar: string;
  hillMid: string;
  hillNear: string;
  archFill: string;
  flowerColors: [string, string];
  particleColors: string[];
}

export const APP_THEMES: AppThemeConfig[] = [
  {
    id: 'botanical',
    name: 'Botanical',
    shortLabel: 'Botanical',
    description: 'Sunlit meadow & warm garden',
    isDark: false,
    themeColorMeta: '#FAF6EC',
    swatchGradient: 'linear-gradient(135deg, #FFE8A3 0%, #F5B841 52%, #5AA469 100%)',
    accentHex: '#E55A3C',
    skyFrom: '#FFF5D1',
    skyVia: '#FBE1A8',
    skyTo: '#E8C587',
    orbPrimary: 'rgba(255, 217, 102, 0.85)',
    orbSecondary: 'rgba(255, 184, 128, 0.56)',
    orbTertiary: 'rgba(130, 196, 118, 0.55)',
    celestialFill: '#FFF8D6',
    celestialGlow: '#FFD966',
    cloudFill: '#FFFDF7',
    hillFar: '#CAD99B',
    hillMid: '#98BE70',
    hillNear: '#6F9F50',
    archFill: '#EBD5AC',
    flowerColors: ['#FFC714', '#FF5A3E'],
    particleColors: ['#F5B82E', '#F27D52', '#4FB373', '#F06A86', '#E59B14'],
  },
  {
    id: 'midnight',
    name: 'Midnight Ocean',
    shortLabel: 'Midnight',
    description: 'Deep sea & glowing tides',
    isDark: true,
    themeColorMeta: '#081826',
    swatchGradient: 'linear-gradient(135deg, #071928 0%, #0E3A54 55%, #2BD4C5 100%)',
    accentHex: '#2BD4C5',
    skyFrom: '#061320',
    skyVia: '#0B2438',
    skyTo: '#123952',
    orbPrimary: 'rgba(43, 212, 197, 0.32)',
    orbSecondary: 'rgba(56, 152, 216, 0.28)',
    orbTertiary: 'rgba(20, 184, 166, 0.24)',
    celestialFill: '#E2F8FF',
    celestialGlow: '#5EEAD4',
    cloudFill: '#173A54',
    hillFar: '#0E334B',
    hillMid: '#0A273B',
    hillNear: '#061B2B',
    archFill: '#1B4965',
    flowerColors: ['#5EEAD4', '#38BDF8'],
    particleColors: ['#5EEAD4', '#38BDF8', '#7DD3FC', '#A5F3FC', '#2DD4BF'],
  },
  {
    id: 'sunset',
    name: 'Sunset Desert',
    shortLabel: 'Sunset',
    description: 'Golden dunes & warm dusk',
    isDark: false,
    themeColorMeta: '#FCE4C6',
    swatchGradient: 'linear-gradient(135deg, #FFD199 0%, #E87043 55%, #8F3224 100%)',
    accentHex: '#D94929',
    skyFrom: '#FFE0B5',
    skyVia: '#F7A474',
    skyTo: '#DA7252',
    orbPrimary: 'rgba(255, 206, 128, 0.88)',
    orbSecondary: 'rgba(240, 122, 86, 0.62)',
    orbTertiary: 'rgba(186, 86, 62, 0.45)',
    celestialFill: '#FFF2C9',
    celestialGlow: '#FFB75E',
    cloudFill: '#FFF1E3',
    hillFar: '#D98664',
    hillMid: '#BA5E43',
    hillNear: '#8E3B2B',
    archFill: '#E6A783',
    flowerColors: ['#FFD24C', '#FFF0C2'],
    particleColors: ['#FFD05B', '#FF8E63', '#FFE8B8', '#F26444', '#E8A838'],
  },
];

export function normalizeThemeId(value: unknown): AppThemeId {
  if (value === 'botanical' || value === 'midnight' || value === 'sunset') {
    return value;
  }
  if (value === 'night') return 'midnight';
  return 'botanical';
}

export function isValidThemeId(value: unknown): value is AppThemeId {
  return value === 'botanical' || value === 'midnight' || value === 'sunset';
}

export function getThemeConfig(themeId: AppThemeId): AppThemeConfig {
  return APP_THEMES.find((t) => t.id === themeId) ?? APP_THEMES[0];
}

export function applyThemeToDocument(themeId: AppThemeId): void {
  if (typeof document === 'undefined') return;
  const config = getThemeConfig(themeId);
  const root = document.documentElement;
  root.dataset.theme = config.id;
  root.classList.toggle('dark', config.isDark);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', config.themeColorMeta);
  }

  // Sync Telegram Mini App chrome colors when running inside Telegram
  const tg = (window as unknown as {
    Telegram?: {
      WebApp?: {
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
      };
    };
  }).Telegram?.WebApp;
  try {
    tg?.setHeaderColor?.(config.themeColorMeta);
    tg?.setBackgroundColor?.(config.themeColorMeta);
  } catch {
    // Ignore on older Telegram WebApp versions
  }
}
