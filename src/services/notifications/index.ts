import Constants, { ExecutionEnvironment } from 'expo-constants';

// Check if running in Expo Go
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export async function initNotifications() {
  // Skip setup in Expo Go to avoid unsupported features
  if (Constants.appOwnership === 'expo') {
    return;
  }

  const Notifications = require('expo-notifications');
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

export async function scheduleReminder(title: string, body: string, fireISO: string) {
  if (isExpoGo) return;

  const Notifications = require('expo-notifications');
  const date = new Date(fireISO);
  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
}

export async function cancelReminder(id: string) {
  if (isExpoGo) return;

  const Notifications = require('expo-notifications');
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {}
}
