import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { createReminderManager, type CalendarReminder } from './calendar-reminders';

export const remindersSupported = Platform.OS === 'android' || Platform.OS === 'ios';
if (remindersSupported) Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });

export const calendarReminders = createReminderManager({
  async list() {
    if (!remindersSupported) return [];
    const rows = await Notifications.getAllScheduledNotificationsAsync();
    return rows.flatMap(row => {
      const data = row.content.data;
      return row.identifier.startsWith('myhub-plan:') && data?.kind === 'calendar-reminder' && typeof data.owner === 'string' && typeof data.eventId === 'string' && typeof data.date === 'string' && typeof data.at === 'number' && (data.lead === 0 || data.lead === 1)
        ? [{ id: row.identifier, owner: data.owner, eventId: data.eventId, title: row.content.body || '', date: data.date, lead: data.lead, at: data.at } satisfies CalendarReminder] : [];
    });
  },
  cancel: id => Notifications.cancelScheduledNotificationAsync(id),
  async schedule(row) {
    await Notifications.scheduleNotificationAsync({ identifier: row.id,
      content: { title: row.lead ? 'Tu plan de mañana' : 'Hoy tienes un plan', body: row.title, sound: 'default', data: { kind: 'calendar-reminder', owner: row.owner, eventId: row.eventId, date: row.date, lead: row.lead, at: row.at } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(row.at), channelId: 'calendar-plans' },
    });
  },
  async permission() {
    if (!remindersSupported) return false;
    if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('calendar-plans', { name: 'Recordatorios de planes', importance: Notifications.AndroidImportance.DEFAULT });
    let permission = await Notifications.getPermissionsAsync();
    if (!permission.granted && permission.canAskAgain) permission = await Notifications.requestPermissionsAsync();
    return permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  },
});
