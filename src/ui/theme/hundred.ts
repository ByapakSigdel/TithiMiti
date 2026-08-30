/**
 * Hundred Studios design language for TithiMiti.
 *
 * Principles: unique design, use of colors, consistency.
 * - Warm "paper & ink" neutrals instead of plain white/black.
 * - A vivid sindoor-vermilion brand accent, supported by a fixed set of
 *   secondary hues (marigold, teal, iris) used consistently to color-code
 *   features: calendar=vermilion, gold=marigold, forex=teal, horoscope=iris.
 * - Fraunces (serif) for display type, Inter for UI text.
 * - Soft, generous corner radii; tonal "soft" fills instead of hard borders.
 */

export const HundredPalette = {
  light: {
    background: '#FAF5EC',
    card: '#FFFFFF',
    surface: '#F1E8DA',
    text: '#241C14',
    // ≥4.5:1 against the paper background — the previous #8A7D6D was ~3.7:1,
    // failing WCAG AA at the 9-11px sizes this token is used at.
    textSecondary: '#6E624F',
    border: '#E7DCC9',
    accent: '#D93822',
    accentSoft: '#FAE5DE',
    onAccent: '#FFF8EF',
    marigold: '#B97C0A',
    marigoldSoft: '#F7ECD2',
    teal: '#0F766E',
    tealSoft: '#DCEEE8',
    iris: '#5356C5',
    irisSoft: '#E8E8F8',
  },
  dark: {
    background: '#171210',
    card: '#211B16',
    surface: '#2C241D',
    text: '#F5EDE1',
    textSecondary: '#A2937F',
    border: '#3B3128',
    accent: '#FF6B4F',
    accentSoft: '#3D2019',
    onAccent: '#26110B',
    marigold: '#F0B64A',
    marigoldSoft: '#3A2D15',
    teal: '#4FC7B4',
    tealSoft: '#14302A',
    iris: '#9B9DF0',
    irisSoft: '#282A4A',
  },
};

export type ThemeColors = typeof HundredPalette.light;

export const HundredColors = {
  // Base colors (legacy keys kept so old references stay valid and on-brand)
  black: '#1A140E',
  white: '#FFFFFF',
  gray: '#8A7D6D',
  lightGray: '#E7DCC9',
  darkGray: '#3B3128',
  red: '#D93822',
  transparent: 'transparent',

  // Theme specific
  light: HundredPalette.light,
  dark: HundredPalette.dark,
};

export const HundredFont = {
  // Display serif for headlines and big numerals.
  display: 'Fraunces_700Bold',
  displaySemi: 'Fraunces_600SemiBold',
  // UI sans.
  primary: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  // Legacy key (used by the old "dot" styling); now a spaced sans label.
  dotMatrix: 'Inter_600SemiBold',
  weight: {
    regular: '400',
    medium: '500',
    bold: '700',
  },
};

export const HundredSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const HundredTheme = {
  colors: HundredColors,
  font: HundredFont,
  spacing: HundredSpacing,
  radius: {
    xs: 8,
    sm: 10,
    md: 14,
    lg: 20,
    xl: 26,
    round: 9999,
  },
};
