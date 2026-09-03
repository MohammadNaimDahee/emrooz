import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Daily "What should I cook today?" reminder using expo-notifications.
 *
 * Design notes:
 * - Permission is only requested when the user turns the reminder on in settings.
 * - Runs entirely on-device (no push infrastructure) per spec §24.
 * - Uses a stable identifier so re-scheduling replaces the previous alarm.
 * - Trigger uses the daily calendar type which respects the device's local timezone.
 */
const REMINDER_ID = 'emrooz.daily-reminder';

/** Configure notification presentation once at app boot. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Ensure the daily channel exists on Android. Safe no-op on iOS. */
async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('daily-reminder', {
    name: 'Daily reminder',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: undefined,
    vibrationPattern: [0, 250],
  });
}

// expo-notifications types re-export PermissionResponse from `'expo'`, which the
// TypeScript resolver doesn't always follow through the isolated pnpm layout.
// We check the fields structurally so the module compiles independently.
type PermissionResult = { granted?: boolean; status?: string };

async function ensurePermission(): Promise<boolean> {
  const current = (await Notifications.getPermissionsAsync()) as unknown as PermissionResult;
  if (current.granted || current.status === 'granted') return true;
  const asked = (await Notifications.requestPermissionsAsync()) as unknown as PermissionResult;
  return Boolean(asked.granted || asked.status === 'granted');
}

/**
 * Schedule (or re-schedule) the daily reminder at "HH:mm" local time.
 * Idempotent — cancels any previous schedule with the same identifier.
 */
export async function scheduleDailyReminder(time: string): Promise<void> {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) throw new Error(`Invalid reminder time "${time}", expected HH:mm.`);
  const hour = Number(match[1]);
  const minute = Number(match[2]);

  const granted = await ensurePermission();
  if (!granted) throw new Error('Notification permission was not granted.');
  await ensureAndroidChannel();

  await cancelDailyReminder();

  // Expo SDK 51 (expo-notifications ~0.28) uses the classic trigger shape:
  // { hour, minute, repeats: true } for a daily local notification.
  // The newer `SchedulableTriggerInputTypes.DAILY` was introduced in SDK 52+.
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: {
      title: "What should I cook today?",
      body: 'Emrooz has today\'s ideas ready.',
      data: { route: '/(tabs)/today' },
    },
    trigger: {
      hour,
      minute,
      repeats: true,
      ...(Platform.OS === 'android' ? { channelId: 'daily-reminder' } : {}),
    } as Notifications.NotificationTriggerInput,
  });
}

export async function cancelDailyReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
  } catch {
    // No existing reminder — safe to ignore.
  }
}

/**
 * Debug helper — dump upcoming scheduled notifications. Useful when verifying
 * the reminder is armed for the correct wall-clock time.
 */
export async function listScheduled(): Promise<Notifications.NotificationRequest[]> {
  return Notifications.getAllScheduledNotificationsAsync();
}
