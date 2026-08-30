import { getBsMonthName } from '@/src/domain/calendar/labels';
import { convertAdToBs } from '@/src/domain/calendar/converter';
import { eventsStore } from '@/src/services/events/eventsStore';
import { useAppState } from '@/src/state/appState';
import { NothingButton } from '@/src/ui/core/NothingButton';
import { NothingText } from '@/src/ui/core/NothingText';
import { NothingTextInput } from '@/src/ui/core/NothingTextInput';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';

interface AddEventModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AddEventModal({ visible, onClose }: AddEventModalProps) {
  const { selectedDateISO, refreshEvents, colors } = useAppState();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [bsLabel, setBsLabel] = useState<string | null>(null);

  // Best-effort BS label for the date badge — this is a BS-first app, so a raw
  // Gregorian ISO string alone forces users to convert mentally.
  useEffect(() => {
    if (!visible) return;
    let live = true;
    convertAdToBs(selectedDateISO)
      .then((r) => {
        if (live && r.bs) setBsLabel(`${getBsMonthName(r.bs.bsMonth)} ${r.bs.bsDay}, ${r.bs.bsYear}`);
      })
      .catch(() => {});
    return () => { live = false; };
  }, [visible, selectedDateISO]);

  const handleSave = async () => {
    if (!title.trim() || loading) return;

    setLoading(true);
    setSaveError(null);
    try {
      // Calculate reminder time: 1 day before at 9 AM local. Parse the ISO
      // parts as a LOCAL date — new Date('YYYY-MM-DD') is UTC midnight, which
      // shifts the reminder an extra day back in negative-UTC timezones.
      const [y, m, d] = selectedDateISO.split('-').map(Number);
      const reminderDate = new Date(y, m - 1, d - 1, 9, 0, 0, 0);

      // Only set reminder if it's in the future
      const reminderISO = reminderDate > new Date() ? reminderDate.toISOString() : undefined;

      await eventsStore.addEvent({
        id: Date.now().toString(),
        title,
        description,
        adDateISO: selectedDateISO,
        isAllDay: true,
        reminderAtISO: reminderISO,
      });
      await refreshEvents();
      setTitle('');
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Failed to save event', error);
      setSaveError('Could not save the event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.header}>
                <NothingText variant="h2">New Event</NothingText>
                <View style={[styles.dateBadge, { backgroundColor: colors.accentSoft }]}>
                  <NothingText variant="caption" style={{ color: colors.accent }}>
                    {bsLabel ?? selectedDateISO}
                  </NothingText>
                  {bsLabel && (
                    <NothingText variant="caption" style={{ color: colors.accent, opacity: 0.7, fontSize: 10 }}>
                      {selectedDateISO}
                    </NothingText>
                  )}
                </View>
              </View>

              <NothingTextInput
                label="Title"
                placeholder="Event Name"
                value={title}
                onChangeText={setTitle}
                autoFocus
              />

              <NothingTextInput
                label="Description"
                placeholder="Details (Optional)"
                value={description}
                onChangeText={setDescription}
                multiline
                style={{ height: 100, paddingTop: 12 }}
              />

              {saveError && (
                <NothingText style={{ color: colors.accent, fontSize: 12, marginTop: 4 }}>
                  {saveError}
                </NothingText>
              )}

              <View style={styles.actions}>
                <NothingButton
                  title="CANCEL"
                  onPress={onClose}
                  variant="outline"
                  style={{ flex: 1, marginRight: 8 }}
                />
                <NothingButton
                  title={loading ? "SAVING..." : "SAVE"}
                  onPress={handleSave}
                  variant="primary"
                  disabled={loading}
                  style={{ flex: 1, marginLeft: 8 }}
                />
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 14, 8, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  dateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 16,
  },
});
