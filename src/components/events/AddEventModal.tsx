import { eventsStore } from '@/src/services/events/eventsStore';
import { useAppState } from '@/src/state/appState';
import { NothingButton } from '@/src/ui/core/NothingButton';
import { NothingText } from '@/src/ui/core/NothingText';
import { NothingTextInput } from '@/src/ui/core/NothingTextInput';
import React, { useState } from 'react';
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

  const handleSave = async () => {
    if (!title.trim()) return;

    setLoading(true);
    try {
      await eventsStore.addEvent({
        id: Date.now().toString(),
        title,
        description,
        adDateISO: selectedDateISO,
        isAllDay: true,
      });
      await refreshEvents();
      setTitle('');
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Failed to save event', error);
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
                <NothingText variant="h2">NEW EVENT</NothingText>
                <View style={[styles.dateBadge, { backgroundColor: colors.text }]}>
                  <NothingText variant="caption" style={{ color: colors.background }}>
                    {selectedDateISO}
                  </NothingText>
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
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 16,
  },
});
