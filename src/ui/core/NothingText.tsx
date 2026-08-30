import { useAppState } from '@/src/state/appState';
import React from 'react';
import { StyleSheet, Text, TextProps, TextStyle } from 'react-native';

interface NothingTextProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'dot';
  color?: string;
}

// Map a fontWeight to the matching static font file. Both Inter and Fraunces
// ship as per-weight files, so a bare fontWeight wouldn't select the right
// file (Android would ignore it or fake-bold). Callers can still pass
// fontWeight as usual and we translate it here.
function interForWeight(weight: string | number | undefined): string {
  if (weight === 'bold') return 'Inter_700Bold';
  const n = typeof weight === 'string' ? parseInt(weight, 10) : weight;
  if (!n || isNaN(n)) return 'Inter_400Regular';
  if (n >= 700) return 'Inter_700Bold';
  if (n >= 600) return 'Inter_600SemiBold';
  if (n >= 500) return 'Inter_500Medium';
  return 'Inter_400Regular';
}

function frauncesForWeight(weight: string | number | undefined): string {
  if (weight === 'bold') return 'Fraunces_700Bold';
  const n = typeof weight === 'string' ? parseInt(weight, 10) : weight;
  if (n && n >= 700) return 'Fraunces_700Bold';
  return 'Fraunces_600SemiBold';
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

  const isDisplay = variant === 'h1' || variant === 'h2';

  // Resolve the final font family: a caller-supplied fontWeight wins
  // (translated to the matching file of the variant's typeface); otherwise
  // keep the variant's family. Drop fontWeight from the output so Android
  // doesn't fake-bold on top of it.
  const flat = (StyleSheet.flatten([getStyle(), style]) || {}) as TextStyle;
  const fontFamily = flat.fontWeight
    ? (isDisplay ? frauncesForWeight(flat.fontWeight) : interForWeight(flat.fontWeight))
    : flat.fontFamily;

  const baseColor = color || (variant === 'caption' ? colors.textSecondary : colors.text);

  return (
    <Text
      // Cap OS font scaling: several usages sit in fixed, overflow-hidden
      // containers (calendar day cells, date boxes) that clip at 2x scale.
      // Callers can still override via the prop.
      maxFontSizeMultiplier={1.4}
      style={[
        getStyle(),
        { color: baseColor },
        style,
        { fontFamily, fontWeight: undefined },
      ]}
      {...props}
    />
  );
}

// Hundred Studios type scale: Fraunces (serif) for display sizes, Inter for
// UI text. Static weight files carry their own weight, so we set the weighted
// family per variant and avoid fontWeight (which would make Android try to
// synthesize a weight and can fall back to the system font).
const styles = StyleSheet.create({
  h1: {
    fontSize: 30,
    letterSpacing: 0,
    fontFamily: 'Fraunces_700Bold',
  },
  h2: {
    fontSize: 22,
    letterSpacing: 0,
    fontFamily: 'Fraunces_600SemiBold',
  },
  h3: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
  },
  body: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  caption: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  dot: {
    // Legacy variant name; now a spaced label style used for small emphasis
    // text (toggles, buttons, weekday headers).
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    letterSpacing: 1.2,
  },
});
