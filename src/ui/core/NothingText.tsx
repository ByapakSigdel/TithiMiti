import { useAppState } from '@/src/state/appState';
import { NothingTheme } from '@/src/ui/theme/nothing';
import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';

interface NothingTextProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'dot';
  color?: string;
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

  return (
    <Text 
      style={[
        getStyle(), 
        { color: color || colors.text }, 
        style
      ]} 
      {...props} 
    />
  );
}

const styles = StyleSheet.create({
  h1: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1,
    fontFamily: 'System', // Ensure clean sans-serif
  },
  h2: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600',
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
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
