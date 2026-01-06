export const NothingColors = {
  // Base colors
  black: '#000000',
  white: '#FFFFFF',
  gray: '#808080',
  lightGray: '#E0E0E0',
  darkGray: '#333333',
  red: '#D71921',
  transparent: 'transparent',

  // Theme specific
  light: {
    background: '#F5F5F5',
    text: '#000000',
    textSecondary: '#808080',
    border: '#E0E0E0',
    card: '#FFFFFF',
    accent: '#D71921',
  },
  dark: {
    background: '#000000',
    text: '#FFFFFF',
    textSecondary: '#A0A0A0',
    border: '#333333',
    card: '#1A1A1A',
    accent: '#D71921',
  }
};

export type ThemeColors = typeof NothingColors.light;

export const NothingFont = {
  dotMatrix: 'Courier New', // Fallback for dot matrix feel if custom font not loaded
  primary: 'System',
  weight: {
    regular: '400',
    medium: '500',
    bold: '700',
  }
};

export const NothingSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const NothingTheme = {
  colors: NothingColors,
  font: NothingFont,
  spacing: NothingSpacing,
  radius: {
    sm: 4,
    md: 8,
    lg: 16,
    round: 9999,
  }
};
