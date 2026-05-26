import { useAppState } from '@/src/state/appState';
import { NothingTheme } from '@/src/ui/theme/nothing';
import React from 'react';
import { StyleSheet, Text, TextProps, TextStyle } from 'react-native';

interface NothingTextProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'dot';
  color?: string;
}

// Map a fontWeight to the matching static Inter family. Inter is shipped as
// per-weight files, so a bare fontWeight wouldn't select the right file (Android
// would ignore it or fake-bold). Callers can still pass fontWeight as usual and
// we translate it here.
function interForWeight(weight: string | number | undefined): string {
  if (weight === 'bold') return 'Inter_700Bold';
  const n = typeof weight === 'string' ? parseInt(weight, 10) : weight;
  if (!n || isNaN(n)) return 'Inter_400Regular';
  if (n >= 700) return 'Inter_700Bold';
  if (n >= 600) return 'Inter_600SemiBold';
  if (n >= 500) return 'Inter_500Medium';
  return 'Inter_400Regular';
}

export function NothingText({ style, variant = 'body', color, ...props }: NothingTextProps) {
  const { colors } = useAppState();

  const getStyle = () => {
    switch (variant) {
      case 'h1': return styles.h1;
      case 'h2': return styles.h2;
      case 'h3': return styles.h3;
      case 'caption': return styles.caption;
      case 'dot': return styles.dot;
      default: return styles.body;
    }
  };

  // Resolve the final font family: a caller-supplied fontWeight wins (translated
  // to the matching Inter file); otherwise keep the variant's family. Drop
  // fontWeight from the output so Android doesn't fake-bold on top of it.
  const flat = (StyleSheet.flatten([getStyle(), style]) || {}) as TextStyle;
  const fontFamily = flat.fontWeight ? interForWeight(flat.fontWeight) : flat.fontFamily;

  return (
    <Text
      style={[
        getStyle(),
        { color: color || colors.text },
        style,
        { fontFamily, fontWeight: undefined },
      ]}
      {...props}
    />
  );
}

// App typeface is Inter. Static weights carry their own weight, so we set the
// weighted family per variant and avoid fontWeight (which would make Android
// try to synthesize a weight and can fall back to the system font).
const styles = StyleSheet.create({
  h1: {
    fontSize: 32,
    letterSpacing: -1,
    fontFamily: 'Inter_700Bold',
  },
  h2: {
    fontSize: 24,
    letterSpacing: -0.5,
    fontFamily: 'Inter_600SemiBold',
  },
  h3: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  body: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  caption: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: NothingTheme.colors.gray,
    textTransform: 'uppercase', // Nothing OS uses uppercase captions often
    letterSpacing: 1,
  },
  dot: {
    fontFamily: 'Courier New', // Hardcode fallback for now
    fontSize: 14,
    letterSpacing: 1,
  },
});
