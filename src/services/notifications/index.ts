import Constants, { ExecutionEnvironment } from 'expo-constants';

// Check if running in Expo Go
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export async function initNotifications() {
  // Skip setup in Expo Go to avoid unsupported features
  if (isExpoGo) {
    return;
  }

  const Notifications = require('expo-notifications');

  // Without a handler, notifications that fire while the app is foregrounded
  // are silently dropped.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  // Request permissions on app start
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    await Notifications.requestPermissionsAsync();
  }
  // Android channel
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Schedule (or replace) a reminder. `id` is used as the notification
 * identifier so the reminder can be cancelled/replaced by event id later.
 * Returns false when the date is invalid or in the past.
 */
export async function scheduleReminder(id: string, title: string, body: string, fireISO: string): Promise<boolean> {
  if (isExpoGo) return false;

  const Notifications = require('expo-notifications');
  const date = new Date(fireISO);
  if (!isFinite(date.getTime()) || date.getTime() <= Date.now()) {
    return false;
  }
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
  return true;
}

export async function cancelReminder(id: string) {
  if (isExpoGo) return;

  const Notifications = require('expo-notifications');
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {}
}
