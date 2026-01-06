import { useAppState } from '@/src/state/appState';
import { NothingTheme } from '@/src/ui/theme/nothing';
import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { NothingText } from './NothingText';

interface NothingButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  style?: ViewStyle;
}

export function NothingButton({ title, onPress, variant = 'primary', style }: NothingButtonProps) {
  const { colors } = useAppState();

  const getContainerStyle = () => {
    switch (variant) {
      case 'secondary': return { backgroundColor: colors.border };
      case 'outline': return { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.text };
      default: return { backgroundColor: colors.accent };
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'secondary': return colors.text;
      case 'outline': return colors.text;
      default: return NothingTheme.colors.white;
    }
  };

  return (
    <Pressable 
      onPress={onPress} 
      style={({ pressed }) => [
        styles.base, 
        getContainerStyle(), 
        pressed && styles.pressed,
        style
      ]}
    >
      <NothingText style={styles.text} color={getTextColor()} variant="dot">
        {title.toUpperCase()}
      </NothingText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: NothingTheme.radius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  text: {
    fontWeight: '600',
  },
});
