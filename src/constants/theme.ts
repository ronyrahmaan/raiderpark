// ============================================================
// RAIDER PARK THEME CONSTANTS
// iOS-First Design System
// ============================================================

export const Colors = {
  // TTU Brand Colors
  scarlet: {
    DEFAULT: '#CC0000',
    50: '#FFE5E5',
    100: '#FFCCCC',
    200: '#FF9999',
    300: '#FF6666',
    400: '#FF3333',
    500: '#CC0000',
    600: '#A30000',
    700: '#7A0000',
    800: '#520000',
    900: '#290000',
  },

  // iOS System Colors
  ios: {
    blue: '#007AFF',
    green: '#34C759',
    yellow: '#FFCC00',
    orange: '#FF9500',
    red: '#FF3B30',
    purple: '#AF52DE',
    pink: '#FF2D55',
    teal: '#5AC8FA',
    indigo: '#5856D6',
  },

  // Grayscale (iOS)
  gray: {
    1: '#8E8E93',
    2: '#AEAEB2',
    3: '#C7C7CC',
    4: '#D1D1D6',
    5: '#E5E5EA',
    6: '#F2F2F7',
  },

  // Parking Status Colors
  status: {
    open: '#34C759',
    busy: '#FFCC00',
    filling: '#FF9500',
    full: '#FF3B30',
    closed: '#8E8E93',
  },

  // Semantic Colors
  light: {
    background: '#FFFFFF',
    surface: '#F2F2F7',
    text: '#000000',
    textSecondary: '#8E8E93',
    border: '#E5E5EA',
  },

  dark: {
    background: '#000000',
    surface: '#1C1C1E',
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    border: '#38383A',
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 28,
  xxxl: 34,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// iOS Typography Styles
export const Typography = {
  largeTitle: {
    fontSize: 34,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.37,
  },
  title1: {
    fontSize: 28,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.36,
  },
  title2: {
    fontSize: 22,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.35,
  },
  title3: {
    fontSize: 20,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.38,
  },
  headline: {
    fontSize: 17,
    fontWeight: FontWeight.semibold,
    letterSpacing: -0.41,
  },
  body: {
    fontSize: 17,
    fontWeight: FontWeight.regular,
    letterSpacing: -0.41,
  },
  callout: {
    fontSize: 16,
    fontWeight: FontWeight.regular,
    letterSpacing: -0.32,
  },
  subheadline: {
    fontSize: 15,
    fontWeight: FontWeight.regular,
    letterSpacing: -0.24,
  },
  footnote: {
    fontSize: 13,
    fontWeight: FontWeight.regular,
    letterSpacing: -0.08,
  },
  caption1: {
    fontSize: 12,
    fontWeight: FontWeight.regular,
    letterSpacing: 0,
  },
  caption2: {
    fontSize: 11,
    fontWeight: FontWeight.regular,
    letterSpacing: 0.07,
  },
} as const;

// Shadow Styles (iOS)
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 5,
  },
} as const;

// Animation Durations
export const Animation = {
  fast: 150,
  normal: 250,
  slow: 400,
} as const;

// Colored Shadows
export const ColoredShadows = {
  scarlet: {
    shadowColor: '#CC0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  green: {
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

// Hit Slop for better touch targets
export const HitSlop = {
  small: { top: 8, bottom: 8, left: 8, right: 8 },
  medium: { top: 12, bottom: 12, left: 12, right: 12 },
  large: { top: 16, bottom: 16, left: 16, right: 16 },
} as const;

// Layout Constants
export const Layout = {
  screenPaddingHorizontal: 20,
  screenPaddingVertical: 16,
  cardPadding: 16,
  listItemHeight: 52,
} as const;
