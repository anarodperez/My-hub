import { isLocalDate, type CalendarEvent } from './model.ts';

export type CalendarReminder = { id: string; owner: string; eventId: string; title: string; date: string; lead: 0 | 1; at: number };
type ReminderApi = {
  list: () => Promise<CalendarReminder[]>;
  cancel: (id: string) => Promise<unknown>;
  schedule: (reminder: CalendarReminder) => Promise<unknown>;
  permission: () => Promise<boolean>;
};
export function reminderDate(date: string, lead: 0 | 1): Date {
  if (!isLocalDate(date)) throw new Error('Fecha no válida.');
  const value = new Date(date + 'T09:00:00');
  value.setDate(value.getDate() - lead);
  return value;
}

export function createReminderManager(api: ReminderApi, now = () => new Date()) {
  let activeAccount: string | undefined;
  let queue: Promise<unknown> = Promise.resolve();
  function enqueue<T>(action: () => Promise<T>): Promise<T> {
    const task = queue.then(action); queue = task.catch(() => {}); return task;
  }
  const build = (owner: string, event: CalendarEvent, lead: 0 | 1): CalendarReminder => ({
    id: `myhub-plan:${owner}:${event.id}`, owner, eventId: event.id, title: event.title, date: event.date, lead, at: reminderDate(event.date, lead).getTime(),
  });
  return {
    list: () => enqueue(() => api.list()),
    sync(owner?: string, events?: CalendarEvent[]) {
      activeAccount = owner;
      return enqueue(async () => {
        for (const row of await api.list()) {
          if (row.owner !== activeAccount) { await api.cancel(row.id); continue; }
          if (!events || owner !== activeAccount) continue;
          const event = events.find(event => event.id === row.eventId);
          if (!event) { await api.cancel(row.id); continue; }
          const next = build(owner!, event, row.lead);
          if (next.at <= now().getTime()) { await api.cancel(row.id); continue; }
          if (next.at !== row.at || next.title !== row.title) {
            await api.cancel(row.id); await api.schedule(next);
          }
        }
      });
    },
    set(owner: string, event: CalendarEvent, lead: 0 | 1 | null) {
      return enqueue(async () => {
        if (owner !== activeAccount) throw new Error('La cuenta ha cambiado. Vuelve a abrir el calendario.');
        const id = `myhub-plan:${owner}:${event.id}`;
        if (lead === null) { await api.cancel(id); return; }
        const row = build(owner, event, lead);
        if (row.at <= now().getTime()) throw new Error('Ese aviso ya quedaría en el pasado. Elige otra opción.');
        if (!await api.permission()) throw new Error('Activa las notificaciones de My Hub en los ajustes del móvil.');
        if (owner !== activeAccount) throw new Error('La cuenta ha cambiado.');
        await api.cancel(id);
        await api.schedule(row);
        if (owner !== activeAccount) { await api.cancel(id); throw new Error('La cuenta ha cambiado.'); }
      });
    },
  };
}
