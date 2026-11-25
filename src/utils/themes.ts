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
  {
    id: 'neon',
    name: 'Neon Cyberpunk',
    shortLabel: 'Neon',
    description: 'Electric cyan & magenta grid',
    isDark: true,
    themeColorMeta: '#0A0518',
    swatchGradient: 'linear-gradient(135deg, #18082C 0%, #7928CA 52%, #FF007F 100%)',
    accentHex: '#FF007F',
    skyFrom: '#0A0518',
    skyVia: '#1E0D3A',
    skyTo: '#32145C',
    orbPrimary: 'rgba(255, 0, 127, 0.38)',
    orbSecondary: 'rgba(0, 242, 254, 0.32)',
    orbTertiary: 'rgba(121, 40, 202, 0.4)',
    celestialFill: '#FFE5F1',
    celestialGlow: '#FF007F',
    cloudFill: '#241042',
    hillFar: '#2E1255',
    hillMid: '#1D0A38',
    hillNear: '#100520',
    archFill: '#4A1D85',
    flowerColors: ['#00F2FE', '#FF007F'],
    particleColors: ['#FF007F', '#00F2FE', '#7928CA', '#38BDF8', '#F472B6'],
  },
  {
    id: 'sakura',
    name: 'Sakura Blossom',
    shortLabel: 'Sakura',
    description: 'Soft cherry blossoms & pink skies',
    isDark: false,
    themeColorMeta: '#FFF0F5',
    swatchGradient: 'linear-gradient(135deg, #FFD1DC 0%, #FF8DA1 52%, #D85A7F 100%)',
    accentHex: '#D85A7F',
    skyFrom: '#FFF5F8',
    skyVia: '#FFE0E9',
    skyTo: '#FAD2DB',
    orbPrimary: 'rgba(255, 182, 193, 0.85)',
    orbSecondary: 'rgba(255, 140, 157, 0.55)',
    orbTertiary: 'rgba(216, 90, 127, 0.45)',
    celestialFill: '#FFF9FB',
    celestialGlow: '#FFB6C1',
    cloudFill: '#FFFFFF',
    hillFar: '#FAD2DB',
    hillMid: '#F2A6B9',
    hillNear: '#D85A7F',
    archFill: '#F7C5D2',
    flowerColors: ['#FF69B4', '#FF1493'],
    particleColors: ['#FFB6C1', '#FF69B4', '#FF8DA1', '#FFA6C1', '#D85A7F'],
  },
  {
    id: 'royal',
    name: 'Royal Velvet',
    shortLabel: 'Royal',
    description: 'Deep amethyst & gleaming gold',
    isDark: true,
    themeColorMeta: '#1A0B2E',
    swatchGradient: 'linear-gradient(135deg, #2A1245 0%, #6B21A8 52%, #EAB308 100%)',
    accentHex: '#EAB308',
    skyFrom: '#1A0B2E',
    skyVia: '#2D144F',
    skyTo: '#431C75',
    orbPrimary: 'rgba(234, 179, 8, 0.35)',
    orbSecondary: 'rgba(168, 85, 247, 0.35)',
    orbTertiary: 'rgba(107, 33, 168, 0.4)',
    celestialFill: '#FEF08A',
    celestialGlow: '#EAB308',
    cloudFill: '#381665',
    hillFar: '#3B1869',
    hillMid: '#28104A',
    hillNear: '#190A33',
    archFill: '#581C87',
    flowerColors: ['#EAB308', '#C084FC'],
    particleColors: ['#EAB308', '#FACC15', '#C084FC', '#A855F7', '#FEF08A'],
  },
];

export function normalizeThemeId(value: unknown): AppThemeId {
  if (
    value === 'botanical' ||
    value === 'midnight' ||
    value === 'sunset' ||
    value === 'neon' ||
    value === 'sakura' ||
    value === 'royal'
  ) {
    return value;
  }
  if (value === 'night') return 'midnight';
  return 'botanical';
}

export function isValidThemeId(value: unknown): value is AppThemeId {
  return (
    value === 'botanical' ||
    value === 'midnight' ||
    value === 'sunset' ||
    value === 'neon' ||
    value === 'sakura' ||
    value === 'royal'
  );
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

  const tg = (
    window as unknown as {
      Telegram?: {
        WebApp?: {
          setHeaderColor?: (color: string) => void;
          setBackgroundColor?: (color: string) => void;
        };
      };
    }
  ).Telegram?.WebApp;
  try {
    tg?.setHeaderColor?.(config.themeColorMeta);
    tg?.setBackgroundColor?.(config.themeColorMeta);
  } catch {
    // Ignore
  }
}
