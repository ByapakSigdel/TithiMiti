import { useAppState } from '@/src/state/appState';
import { HundredTheme } from '@/src/ui/theme/hundred';
import React, { useState } from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { NothingText } from './NothingText';

interface NothingTextInputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function NothingTextInput({ label, error, style, ...props }: NothingTextInputProps) {
  const { colors } = useAppState();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && (
        <NothingText variant="caption" style={styles.label}>
          {label.toUpperCase()}
        </NothingText>
      )}
      <TextInput
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          isFocused && { borderColor: colors.accent, backgroundColor: colors.card },
          !!error && { borderColor: colors.accent },
          style,
        ]}
        placeholderTextColor={colors.textSecondary}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        selectionColor={colors.accent}
        {...props}
      />
      {error && (
        <NothingText variant="caption" style={[styles.errorText, { color: colors.accent }]}>
          {error}
        </NothingText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderRadius: HundredTheme.radius.md,
    paddingHorizontal: 16,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
  },
  errorText: {
    marginTop: 4,
  },
});
