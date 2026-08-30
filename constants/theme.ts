/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

import { HundredPalette } from '@/src/ui/theme/hundred';

const tintColorLight = HundredPalette.light.accent;
const tintColorDark = HundredPalette.dark.accent;

export const Colors = {
  light: {
    text: HundredPalette.light.text,
    background: HundredPalette.light.background,
    tint: tintColorLight,
    icon: HundredPalette.light.textSecondary,
    tabIconDefault: HundredPalette.light.textSecondary,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: HundredPalette.dark.text,
    background: HundredPalette.dark.background,
    tint: tintColorDark,
    icon: HundredPalette.dark.textSecondary,
    tabIconDefault: HundredPalette.dark.textSecondary,
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
