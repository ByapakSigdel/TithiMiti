/**
 * Compatibility shim: the app moved to the Hundred Studios design language
 * (see ./hundred.ts). Legacy imports keep working and automatically pick up
 * the new tokens.
 */
export {
  HundredColors as NothingColors,
  HundredFont as NothingFont,
  HundredSpacing as NothingSpacing,
  HundredTheme as NothingTheme,
} from './hundred';
export type { ThemeColors } from './hundred';
