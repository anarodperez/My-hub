import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { router, useRootNavigationState } from 'expo-router';
import * as Notifications from 'expo-notifications';
import type { CalendarEvent } from '@/features/hub/model';
import { calendarReminders, remindersSupported } from '@/features/hub/calendar-notifications';

export function useCalendarReminders(owner: string | undefined, events: CalendarEvent[], ready: boolean) {
  const navigationReady = !!useRootNavigationState()?.key;
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!remindersSupported) return;
    let active = true;
    const sync = () => { void calendarReminders.sync(owner, ready ? events : undefined).then(() => { if (active) setError(null); }).catch(() => { if (active) setError('No se pudieron actualizar los recordatorios de este móvil. Abre el calendario para revisarlos.'); }); };
    sync();
    const foreground = AppState.addEventListener('change', state => { if (state === 'active') sync(); });
    return () => { active = false; foreground.remove(); };
  }, [owner, events, ready]);
  useEffect(() => {
    if (!remindersSupported || !owner || !ready || !navigationReady) return;
    const open = (response: Notifications.NotificationResponse | null) => {
      const data = response?.notification.request.content.data;
      if (data?.kind !== 'calendar-reminder') return;
      void Notifications.clearLastNotificationResponseAsync().catch(() => {});
      if (data.owner === owner && typeof data.eventId === 'string' && events.some(event => event.id === data.eventId)) router.push({ pathname: '/compose', params: { kind: 'event', id: data.eventId } });
    };
    open(Notifications.getLastNotificationResponse());
    const listener = Notifications.addNotificationResponseReceivedListener(open);
    return () => listener.remove();
  }, [owner, events, ready, navigationReady]);
  return error;
}
