import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { convertAdToBs, convertBsToAd } from '../src/domain/calendar/converter';
import { useAppState } from '../src/state/appState';
import { NothingText } from '../src/ui/core/NothingText';
import { NothingTheme } from '../src/ui/theme/nothing';

export default function ConverterScreen() {
  const { colors } = useAppState();
  const [adISO, setAdISO] = useState('');
  const [bsYear, setBsYear] = useState('');
  const [bsMonth, setBsMonth] = useState('');
  const [bsDay, setBsDay] = useState('');
  const [result, setResult] = useState<string>('');

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <NothingText variant="h2" style={styles.title}>Date Converter</NothingText>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <NothingText style={[styles.label, { color: colors.textSecondary }]}>AD → BS</NothingText>
        <TextInput
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { color: colors.text, borderBottomColor: colors.border }]}
          value={adISO}
          onChangeText={setAdISO}
        />
        <Pressable
          style={styles.button}
          onPress={async () => {
            const r = await convertAdToBs(adISO);
            setResult(r.bs ? `BS ${r.bs.bsYear}-${r.bs.bsMonth}-${r.bs.bsDay}` : 'Not found');
          }}
        >
          <NothingText style={styles.buttonText}>Convert</NothingText>
        </Pressable>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <NothingText style={[styles.label, { color: colors.textSecondary }]}>BS → AD</NothingText>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            placeholder="BS Year"
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { flex: 1, color: colors.text, borderBottomColor: colors.border }]}
            keyboardType="numeric"
            value={bsYear}
            onChangeText={setBsYear}
          />
          <TextInput
            placeholder="Month"
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { flex: 1, color: colors.text, borderBottomColor: colors.border }]}
            keyboardType="numeric"
            value={bsMonth}
            onChangeText={setBsMonth}
          />
          <TextInput
            placeholder="Day"
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { flex: 1, color: colors.text, borderBottomColor: colors.border }]}
            keyboardType="numeric"
            value={bsDay}
            onChangeText={setBsDay}
          />
        </View>
        <Pressable
          style={styles.button}
          onPress={async () => {
            const y = parseInt(bsYear, 10);
            const m = parseInt(bsMonth, 10);
            const d = parseInt(bsDay, 10);
            const r = await convertBsToAd(y, m, d);
            setResult(r.ad ? `AD ${r.ad.dateISO}` : 'Not found');
          }}
        >
          <NothingText style={styles.buttonText}>Convert</NothingText>
        </Pressable>
      </View>

      {result ? (
        <Animated.View 
          entering={ZoomIn.duration(300)}
          style={[styles.result, { backgroundColor: colors.card }]}
        >
          <NothingText style={styles.resultText}>{result}</NothingText>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: NothingTheme.spacing.lg, gap: NothingTheme.spacing.lg },
  title: { letterSpacing: 1.4 },
  card: { borderRadius: NothingTheme.radius.md, padding: NothingTheme.spacing.md, gap: NothingTheme.spacing.sm },
  label: { letterSpacing: 1 },
  input: { borderBottomWidth: 1, paddingVertical: 8 },
  button: { backgroundColor: NothingTheme.colors.red, padding: 10, borderRadius: NothingTheme.radius.sm, alignItems: 'center' },
  buttonText: { color: NothingTheme.colors.white, letterSpacing: 1 },
  result: { borderRadius: NothingTheme.radius.md, padding: NothingTheme.spacing.md },
  resultText: { fontSize: 18, fontWeight: 'bold' },
});
