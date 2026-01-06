import { EventItem } from '@/src/domain/calendar/types';
import { cancelReminder, scheduleReminder } from '@/src/services/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EVENTS_KEY = 'user-events-v1';

export async function getAllEvents(): Promise<EventItem[]> {
  try {
    const raw = await AsyncStorage.getItem(EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveEvent(event: EventItem) {
  const events = await getAllEvents();
  const index = events.findIndex((e) => e.id === event.id);
  
  if (index >= 0) {
    // Update existing
    events[index] = event;
  } else {
    // Add new
    events.push(event);
  }
  
  await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  
  // Handle notification
  if (event.reminderAtISO) {
    // We use the event ID as the notification identifier
    await scheduleReminder(event.title, event.description || 'Event Reminder', event.reminderAtISO);
  }
}

export async function deleteEvent(id: string) {
  const events = await getAllEvents();
  const filtered = events.filter((e) => e.id !== id);
  await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(filtered));
  
  await cancelReminder(id);
}

export async function getEventsForDate(adDateISO: string): Promise<EventItem[]> {
  const events = await getAllEvents();
  return events.filter((e) => e.adDateISO === adDateISO);
}

export const eventsStore = {
  getAllEvents,
  saveEvent,
  addEvent: saveEvent,
  deleteEvent,
  getEventsForDate,
};
