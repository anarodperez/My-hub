import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { BellIcon } from 'phosphor-react-native/src/icons/Bell';
import { Copy, TextAction } from './hub-ui';
import { useHub, usePalette } from '@/features/hub/provider';
import type { CalendarEvent } from '@/features/hub/model';
import { calendarReminders, remindersSupported } from '@/features/hub/calendar-notifications';

export function CalendarReminder({ event }: { event: CalendarEvent }) {
  const { repository } = useHub();
  const p = usePalette();
  const owner = repository?.accountId;
  const current = useRef(owner); current.current = owner;
  const [lead, setLead] = useState<0 | 1 | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setBusy(true); setLead(null);
    void calendarReminders.list().then(rows => { if (active) setLead(rows.find(row => row.owner === owner && row.eventId === event.id)?.lead ?? null); })
      .catch(() => { if (active) setError('No se pudo consultar el recordatorio.'); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [owner, event.id, event.date, event.title]);
  const save = async (next: 0 | 1 | null) => {
    if (!owner || busy) return;
    setBusy(true); setError('');
    try {
      await calendarReminders.set(owner, event, next);
      if (current.current === owner) { setLead(next); setOpen(false); }
    } catch (failure) { if (current.current === owner) setError(failure instanceof Error ? failure.message : 'No se pudo guardar el aviso.'); }
    finally { if (current.current === owner) setBusy(false); }
  };
  if (!remindersSupported) return null;
  return <View style={{ gap: 4 }}>
    <TextAction disabled={busy} icon={<BellIcon size={18} color={p.accent} weight={lead === null ? 'regular' : 'fill'} />} onPress={() => setOpen(value => !value)}>{busy ? 'Revisando aviso…' : lead === null ? 'Recordarme este plan' : lead === 0 ? 'Aviso el mismo día · 9:00' : 'Aviso el día anterior · 9:00'}</TextAction>
    {open && <View style={{ backgroundColor: p.soft, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, gap: 2 }}>
      <Copy muted style={{ fontSize: 13, lineHeight: 19 }}>Solo en este móvil, a las 9:00 de tu hora local.</Copy>
      <TextAction disabled={busy} onPress={() => { void save(0); }}>El mismo día</TextAction>
      <TextAction disabled={busy} onPress={() => { void save(1); }}>Un día antes</TextAction>
      {lead !== null && <TextAction disabled={busy} onPress={() => { void save(null); }}>Quitar recordatorio</TextAction>}
    </View>}
    {!!error && <Copy accessibilityRole="alert" style={{ color: p.danger, fontSize: 13 }}>{error}</Copy>}
  </View>;
}
