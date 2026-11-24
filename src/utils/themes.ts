import { AppThemeId } from '../types/game';

export interface AppThemeConfig {
  id: AppThemeId;
  name: string;
  shortLabel: string;
  isDark: boolean;
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
    id: 'sunlit',
    name: 'Sunlit Garden',
    shortLabel: 'Sunlit',
    isDark: false,
    swatchGradient: 'linear-gradient(135deg, #FFE8A3 0%, #F5B841 52%, #7EB85B 100%)',
    accentHex: '#E55A3C',
    skyFrom: '#FFEBB6',
    skyVia: '#FBD795',
    skyTo: '#E9C27D',
    orbPrimary: 'rgba(255, 217, 102, 0.82)',
    orbSecondary: 'rgba(255, 184, 128, 0.56)',
    orbTertiary: 'rgba(154, 206, 120, 0.52)',
    celestialFill: '#FFF6CE',
    celestialGlow: '#FFD966',
    cloudFill: '#FFFDF7',
    hillFar: '#CAD696',
    hillMid: '#9EC173',
    hillNear: '#77A352',
    archFill: '#E9D3AA',
    flowerColors: ['#FFC714', '#FF5A3E'],
    particleColors: ['#F5B82E', '#F27D52', '#4FB373', '#F06A86', '#E59B14'],
  },
  {
    id: 'sunset',
    name: 'Warm Sunset',
    shortLabel: 'Sunset',
    isDark: false,
    swatchGradient: 'linear-gradient(135deg, #FFC994 0%, #F07A52 55%, #A64238 100%)',
    accentHex: '#D94929',
    skyFrom: '#FFD8AA',
    skyVia: '#F7A278',
    skyTo: '#DC775B',
    orbPrimary: 'rgba(255, 204, 128, 0.85)',
    orbSecondary: 'rgba(244, 126, 94, 0.58)',
    orbTertiary: 'rgba(196, 94, 72, 0.45)',
    celestialFill: '#FFF1C9',
    celestialGlow: '#FFB85C',
    cloudFill: '#FFF2E6',
    hillFar: '#D78A6D',
    hillMid: '#BC664D',
    hillNear: '#944335',
    archFill: '#E6A888',
    flowerColors: ['#FFD24C', '#FFF0C2'],
    particleColors: ['#FFD05B', '#FF8E63', '#FFE8B8', '#F26444', '#E8A838'],
  },
  {
    id: 'sakura',
    name: 'Sakura Blossom',
    shortLabel: 'Sakura',
    isDark: false,
    swatchGradient: 'linear-gradient(135deg, #FFE4EC 0%, #F2A2BC 55%, #B86B86 100%)',
    accentHex: '#C93E6A',
    skyFrom: '#FFE4EE',
    skyVia: '#F8C4D6',
    skyTo: '#E8A4BD',
    orbPrimary: 'rgba(255, 232, 240, 0.85)',
    orbSecondary: 'rgba(245, 166, 194, 0.58)',
    orbTertiary: 'rgba(204, 138, 162, 0.48)',
    celestialFill: '#FFF8FA',
    celestialGlow: '#FFC4D8',
    cloudFill: '#FFF9FB',
    hillFar: '#D8A3B5',
    hillMid: '#BF8197',
    hillNear: '#9A5D74',
    archFill: '#ECC6D2',
    flowerColors: ['#FFF4F8', '#FFE07A'],
    particleColors: ['#FF8EB4', '#FFD4E2', '#FFF4F7', '#F26B96', '#FFCC66'],
  },
  {
    id: 'emerald',
    name: 'Emerald Forest',
    shortLabel: 'Emerald',
    isDark: false,
    swatchGradient: 'linear-gradient(135deg, #D9F2DC 0%, #6CC28A 52%, #246E47 100%)',
    accentHex: '#1F7A49',
    skyFrom: '#DFF4DF',
    skyVia: '#B6DFBD',
    skyTo: '#84BE92',
    orbPrimary: 'rgba(232, 249, 200, 0.82)',
    orbSecondary: 'rgba(130, 208, 152, 0.56)',
    orbTertiary: 'rgba(64, 148, 96, 0.48)',
    celestialFill: '#FAFFE0',
    celestialGlow: '#D4EE92',
    cloudFill: '#F7FDF7',
    hillFar: '#86BE93',
    hillMid: '#589B6D',
    hillNear: '#34744C',
    archFill: '#B6D9BA',
    flowerColors: ['#FFE066', '#FFF8D6'],
    particleColors: ['#8EDB42', '#FFE066', '#56C47E', '#E3F7A8', '#F2B830'],
  },
  {
    id: 'night',
    name: 'Dark Night',
    shortLabel: 'Night',
    isDark: true,
    swatchGradient: 'linear-gradient(135deg, #3A2C24 0%, #1F1815 60%, #F5B841 100%)',
    accentHex: '#F2A93B',
    skyFrom: '#120F0D',
    skyVia: '#1E1814',
    skyTo: '#2E231C',
    orbPrimary: 'rgba(245, 190, 88, 0.28)',
    orbSecondary: 'rgba(218, 122, 68, 0.2)',
    orbTertiary: 'rgba(116, 158, 96, 0.16)',
    celestialFill: '#FFF2C2',
    celestialGlow: '#F5C451',
    cloudFill: '#332821',
    hillFar: '#2B221B',
    hillMid: '#211A14',
    hillNear: '#17120E',
    archFill: '#3A2E25',
    flowerColors: ['#FFD45C', '#FF8E52'],
    particleColors: ['#FFE07D', '#FFB84D', '#F59E3D', '#A6E26E', '#FFEAB0'],
  },
];

export function isValidThemeId(value: unknown): value is AppThemeId {
  return APP_THEMES.some((t) => t.id === value);
}

export function getThemeConfig(themeId: AppThemeId): AppThemeConfig {
  return APP_THEMES.find((t) => t.id === themeId) ?? APP_THEMES[0];
}
