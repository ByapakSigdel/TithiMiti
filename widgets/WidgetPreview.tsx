import { useAppState } from '@/src/state/appState';
import { NothingText } from '@/src/ui/core/NothingText';
import { NothingTheme } from '@/src/ui/theme/nothing';
import React from 'react';
import { StyleSheet, View } from 'react-native';

// Simulates how the widget would look
export default function WidgetPreview() {
  const { selectedDateISO, events } = useAppState();
  
  // Mock data for preview based on selected date
  const date = new Date(selectedDateISO);
  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'short' });
  
  // In a real widget, this would come from the BS converter
  const bsDateStr = "12 Poush 2081"; 
  const tithiStr = "Shukla Paksha, Dwadashi";

  const todayEvents = events.filter(e => e.adDateISO === selectedDateISO);

  return (
    <View style={styles.container}>
      <NothingText variant="caption" style={{ marginBottom: 16 }}>WIDGET PREVIEW (2x2)</NothingText>
      
      <View style={styles.widgetContainer}>
        <View style={styles.header}>
          <NothingText variant="dot" style={styles.bsDate}>{bsDateStr}</NothingText>
          <View style={styles.redDot} />
        </View>
        
        <NothingText variant="caption" style={styles.tithi}>{tithiStr}</NothingText>
        
        <View style={styles.divider} />
        
        <View style={styles.eventsContainer}>
          {todayEvents.length > 0 ? (
            todayEvents.slice(0, 2).map((e, i) => (
              <View key={i} style={styles.eventRow}>
                <View style={styles.eventDot} />
                <NothingText numberOfLines={1} style={styles.eventText}>{e.title}</NothingText>
              </View>
            ))
          ) : (
            <NothingText variant="caption" style={{ fontStyle: 'italic' }}>No events today</NothingText>
          )}
        </View>

        <View style={styles.footer}>
          <NothingText variant="caption">{day} {month}</NothingText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
  },
  widgetContainer: {
    width: 160,
    height: 160,
    backgroundColor: NothingTheme.colors.black,
    borderRadius: NothingTheme.radius.md,
    padding: 16,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bsDate: {
    color: NothingTheme.colors.white,
    fontSize: 18,
    maxWidth: 120,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: NothingTheme.colors.red,
  },
  tithi: {
    color: NothingTheme.colors.gray,
    fontSize: 10,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: NothingTheme.colors.darkGray,
    marginVertical: 8,
  },
  eventsContainer: {
    flex: 1,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: NothingTheme.colors.white,
    marginRight: 6,
  },
  eventText: {
    color: NothingTheme.colors.white,
    fontSize: 10,
  },
  footer: {
    alignItems: 'flex-end',
  },
});
