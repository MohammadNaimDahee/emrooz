export const COLORS = {
  // Backgrounds
  cream: '#FBF6EC',
  creamAlt: '#F5EBD8',
  white: '#FFFFFF',

  // Ink (text/neutrals)
  ink900: '#1D1D1B',
  ink700: '#3A3731',
  ink500: '#5F5A50',
  ink400: '#847E71',
  ink300: '#B0A99B',
  ink200: '#D2CCC0',
  ink100: '#EAE6DE',
  ink50: '#F7F5F1',

  // Emerald (primary brand)
  emerald50: '#F1F7F2',
  emerald100: '#DEEBE0',
  emerald200: '#B7D3BB',
  emerald500: '#3E7A4C',
  emerald700: '#254D32',
  emerald900: '#123020',

  // Saffron (accent)
  saffron400: '#F4A96A',
  saffron500: '#EA9042',
  saffron700: '#B26421',

  // Feedback
  success: '#3F8B4B',
  warning: '#B26421',
  danger: '#B23A48',
} as const;

export const SPACING = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const RADIUS = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  card: 20,
  pill: 999,
} as const;

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  hero: 34,
  display: 44,
} as const;

export const FONTS = {
  display: 'PlayfairDisplay_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export const SHADOW = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  soft: {
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
} as const;

// A palette of two-stop warm gradients that feel food-adjacent without
// leaning on stereotypes. Deterministic per cuisine so the same recipe
// looks the same across renders.
export const CUISINE_PALETTES: Array<[string, string, string]> = [
  ['#EDC08B', '#D97F2F', '#7A3D14'],
  ['#B9D9BE', '#3E7A4C', '#123020'],
  ['#F4C8B4', '#C97466', '#5F1F1B'],
  ['#F1E1B0', '#B99138', '#5A4114'],
  ['#B7D3CB', '#3F7A72', '#154645'],
  ['#DDB4D5', '#7C4082', '#3B143F'],
  ['#F1B0A5', '#B6483A', '#5F1B14'],
  ['#C3D6A8', '#5F7A3E', '#243318'],
  ['#F1DAA0', '#C88A2E', '#5B3812'],
  ['#B3C8E0', '#3F5F87', '#152A44'],
];
