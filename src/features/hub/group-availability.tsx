import { Pressable, View } from 'react-native';
import { CalendarHeading } from '@/components/calendar-heading';
import { Action, Copy, IconAction, Section, TextAction } from '@/components/hub-ui';
import { CalendarBlankIcon } from '@/components/hub-icons';
import { calendarDays, displayDate, localDate } from './model';
import { availabilityMatches } from './availability-matches';
import { usePalette } from './provider';
import type { Author, AvailabilityPeriod, AvailabilityRow } from './backend-types';

const periods: { value: AvailabilityPeriod; label: string }[] = [
  { value: 'morning', label: 'Mañana' }, { value: 'afternoon', label: 'Tarde' }, { value: 'evening', label: 'Noche' },
];

export function GroupAvailability({ rows, members, accountId, month, onMonth, selected, onSelect, busy, onToggle, onPlan }: {
  rows: AvailabilityRow[]; members: Author[]; accountId: string; month: Date; onMonth: (month: Date) => void;
  selected: string; onSelect: (date: string) => void; busy: boolean; onToggle: (period: AvailabilityPeriod, value: boolean) => void;
  onPlan: (date: string) => void;
}) {
  const p = usePalette();
  const days = calendarDays(month.getFullYear(), month.getMonth());
  const visible = rows.filter(row => members.some(member => member.id === row.owner_id));
  const matches = availabilityMatches(visible, members.map(member => member.id), localDate(new Date())).slice(0, 3);
  return <View style={{ gap: 20 }}>
    <Copy muted>Marca las franjas en las que puedes quedar. Tus citas personales no se comparten.</Copy>
    <CalendarHeading month={month} onChange={onMonth} />
    <View>
      <View style={{ flexDirection: 'row' }}>{['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, index) => <View key={index} style={{ width: '14.2857%', alignItems: 'center', paddingVertical: 8 }}><Copy muted>{day}</Copy></View>)}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{days.map((day, index) => {
        const count = day ? Math.max(0, ...periods.map(period => visible.filter(row => row.available_date === day && row.period === period.value).length)) : 0;
        return <View key={day || index} style={{ width: '14.2857%', padding: 1 }}>{day && <Pressable disabled={busy} accessibilityRole="button" accessibilityLabel={`${displayDate(day)}, ${count} ${count === 1 ? 'persona disponible' : 'personas disponibles'} en una misma franja`} accessibilityState={{ selected: selected === day, disabled: busy }} onPress={() => onSelect(day)} style={({ pressed }) => ({ minHeight: 56, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: selected === day ? p.sageText : count > 1 ? p.sage : p.surface, opacity: pressed ? 0.7 : 1, gap: 1 })}>
          <Copy style={{ color: selected === day ? p.sage : count > 1 ? p.sageText : p.text, fontWeight: selected === day ? '700' : '400' }}>{Number(day.slice(-2))}</Copy>
          {count > 0 && <Copy style={{ fontSize: 11, color: selected === day ? p.sage : count > 1 ? p.sageText : p.muted }}>{count} disp.</Copy>}
        </Pressable>}</View>;
      })}</View>
    </View>
    <Section title={displayDate(selected)} />
    <TextAction disabled={busy || selected < localDate(new Date())} onPress={() => onPlan(selected)}>Proponer un plan para este día</TextAction>
    <Copy style={{ fontWeight: '600' }}>Mi disponibilidad</Copy>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{periods.map(period => {
      const available = visible.some(row => row.owner_id === accountId && row.available_date === selected && row.period === period.value);
      return <Action key={period.value} secondary={!available} style={available ? { backgroundColor: p.sageText } : undefined} disabled={busy} label={`${period.label}: ${available ? 'disponible, pulsar para quitar' : 'sin indicar, pulsar para marcar disponible'}`} onPress={() => onToggle(period.value, !available)}>{period.label}{available ? ' · Sí' : ''}</Action>;
    })}</View>
    <Copy muted style={{ fontSize: 13 }}>Sin marca significa «sin indicar», no que estés ocupada.</Copy>
    {members.map(member => {
      const free = periods.filter(period => visible.some(row => row.owner_id === member.id && row.available_date === selected && row.period === period.value));
      return <View key={member.id} style={{ borderTopWidth: 1, borderColor: p.line, paddingTop: 14, gap: 4 }}>
        <Copy style={{ fontWeight: '600' }}>{member.name || 'Sin nombre'}{member.id === accountId ? ' (tú)' : ''}</Copy>
        <Copy muted>{free.length ? free.map(period => period.label).join(' · ') : 'Sin indicar'}</Copy>
      </View>;
    })}
    <View style={{ gap: 12 }}>
      <Section title="Cuándo coincidís" />
      {matches.length ? matches.map(match => <View key={`${match.date}:${match.period}`} style={{ borderBottomWidth: 1, borderColor: p.line, paddingBottom: 12, gap: 5 }}>
        <Copy style={{ fontWeight: '600' }}>{displayDate(match.date)} · {periods.find(period => period.value === match.period)?.label}</Copy>
        <Copy muted>{match.people.length} personas disponibles: {match.people.map(id => members.find(member => member.id === id)?.name || 'Sin nombre').join(', ')}</Copy>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
          <IconAction label={`Ver disponibilidad del ${displayDate(match.date)}`} disabled={busy} onPress={() => onSelect(match.date)}><CalendarBlankIcon size={23} color={p.muted} /></IconAction>
          <TextAction disabled={busy} onPress={() => onPlan(match.date)}>Proponer un plan</TextAction>
        </View>
      </View>) : <Copy muted>Todavía no coincidís en una misma franja de este mes. Marca tu disponibilidad para encontrar un hueco.</Copy>}
    </View>
  </View>;
}
