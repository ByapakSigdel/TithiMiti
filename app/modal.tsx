import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { eventsStore } from '../src/services/events/eventsStore';
import { useAppState } from '../src/state/appState';
import { NothingText } from '../src/ui/core/NothingText';

export default function ModalScreen() {
  const { colors } = useAppState();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [dateISO, setDateISO] = useState(new Date().toISOString().slice(0, 10));
  const [reminderISO, setReminderISO] = useState('');
  const [saved, setSaved] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NothingText variant="h2">Add Event</NothingText>
      <TextInput
        placeholder="Title"
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { color: colors.text, borderBottomColor: colors.border }]}
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        placeholder="Description"
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { color: colors.text, borderBottomColor: colors.border }]}
        value={desc}
        onChangeText={setDesc}
      />
      <TextInput
        placeholder="AD Date (YYYY-MM-DD)"
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { color: colors.text, borderBottomColor: colors.border }]}
        value={dateISO}
        onChangeText={setDateISO}
      />
      <TextInput
        placeholder="Reminder at (YYYY-MM-DDTHH:mm)"
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { color: colors.text, borderBottomColor: colors.border }]}
        value={reminderISO}
        onChangeText={setReminderISO}
      />
      <Pressable
        style={[styles.button, { backgroundColor: colors.card }]}
        onPress={async () => {
          const id = Math.random().toString(36).slice(2);
          await eventsStore.addEvent({ id, title, description: desc, adDateISO: dateISO, reminderAtISO: reminderISO || undefined });
          setSaved(true);
        }}
      >
        <NothingText>Add</NothingText>
      </Pressable>
      {saved && <NothingText>Saved</NothingText>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 12,
    padding: 20,
  },
  input: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  button: {
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
