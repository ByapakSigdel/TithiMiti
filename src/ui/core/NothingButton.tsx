import { useAppState } from '@/src/state/appState';
import { HundredTheme } from '@/src/ui/theme/hundred';
import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { NothingText } from './NothingText';

interface NothingButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  style?: ViewStyle;
  disabled?: boolean;
}

export function NothingButton({ title, onPress, variant = 'primary', style, disabled = false }: NothingButtonProps) {
  const { colors } = useAppState();

  const getContainerStyle = (): ViewStyle => {
    switch (variant) {
      case 'secondary':
        return { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border };
      case 'outline':
        return { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.border };
      default:
        return { backgroundColor: colors.accent };
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'secondary': return colors.text;
      case 'outline': return colors.text;
      default: return colors.onAccent;
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        getContainerStyle(),
        pressed && styles.pressed,
        disabled && styles.disabled,
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
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: HundredTheme.radius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.45,
  },
  text: {
    fontSize: 12.5,
  },
});
