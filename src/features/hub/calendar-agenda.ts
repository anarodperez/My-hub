import type { CalendarEvent } from './model.ts';

export function getCalendarAgenda(events: CalendarEvent[], selected: string, month: string, today: string) {
  const byDate = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const entries = byDate.get(event.date) || [];
    entries.push(event);
    byDate.set(event.date, entries);
  }
  const groups = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, entries]) => ({ date, events: entries }));
  return {
    byDate,
    monthCount: events.filter((event) => event.date.startsWith(month + '-')).length,
    selectedEvents: byDate.get(selected) || [],
    next: groups.find((group) => group.date >= today),
    upcoming: groups.filter((group) => group.date > selected).slice(0, 3),
  };
}

export function calendarCountdown(date: string, today: string) {
  const days = Math.round((Date.parse(date + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86400000);
  return days === 0 ? 'Hoy' : days === 1 ? 'Ma\u00f1ana' : 'Dentro de ' + days + ' d\u00edas';
}

export function calendarSwipe(dx: number, dy: number) {
  return Math.abs(dx) >= 60 && Math.abs(dx) > Math.abs(dy) * 1.5 ? (dx < 0 ? 1 : -1) : 0;
}
