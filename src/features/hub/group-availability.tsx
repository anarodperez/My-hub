import { MotionReveal } from '@/components/hub-motion';
import { Animated, Pressable, View } from 'react-native';
import { useEffect, useState } from 'react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { CalendarHeading } from '@/components/calendar-heading';
import { ChoiceTabs, Copy, IconAction, Section, TextAction } from '@/components/hub-ui';
import { CalendarBlankIcon, CheckIcon, MinusIcon, XIcon } from '@/components/hub-icons';
import { calendarDays, displayDate, localDate } from './model';
import { availabilityMatches } from './availability-matches';
import { availabilitySummary } from './availability-summary';
import { usePalette } from './provider';
import type { Author, AvailabilityPeriod, AvailabilityRow } from './backend-types';

const periods: { value: AvailabilityPeriod; label: string }[] = [
  { value: 'morning', label: 'Mañana' }, { value: 'afternoon', label: 'Tarde' }, { value: 'evening', label: 'Noche' },
];

export function GroupAvailability({ rows, members, accountId, month, onMonth, selected, onSelect, busy, onToggle, onDay, onPlan }: {
  rows: AvailabilityRow[]; members: Author[]; accountId: string; month: Date; onMonth: (month: Date) => void;
  selected: string; onSelect: (date: string) => void; busy: boolean; onToggle: (period: AvailabilityPeriod, value: boolean | null) => void;
  onPlan: (date: string) => void;
  onDay: (value: boolean | null) => void;
}) {
  const p = usePalette();
  const reducedMotion = useReducedMotion();
  const [dayReveal] = useState(() => new Animated.Value(1));
  useEffect(() => {
    dayReveal.stopAnimation();
    if (reducedMotion) { dayReveal.setValue(1); return; }
    dayReveal.setValue(0);
    const animation = Animated.timing(dayReveal, { toValue: 1, duration: 220, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [selected, reducedMotion, dayReveal]);
  const [detailsDay, setDetailsDay] = useState('');
  const [editingDay, setEditingDay] = useState('');
  const detailsOpen = detailsDay === selected;
  const editingOpen = editingDay === selected;
  const days = calendarDays(month.getFullYear(), month.getMonth());
  const visible = rows.filter(row => members.some(member => member.id === row.owner_id));
  const matches = availabilityMatches(visible, members.map(member => member.id), localDate(new Date())).slice(0, 3);
  const mine = periods.map(period => ({ ...period, answer: visible.find(row => row.owner_id === accountId && row.available_date === selected && row.period === period.value) }));
  return <View style={{ gap: 20 }}>
    <Copy muted style={{ fontSize: 13 }}>Tus citas personales no se comparten.</Copy>
    <View style={{ backgroundColor: p.surface, borderRadius: 16, padding: 10, gap: 8 }}>
    <CalendarHeading month={month} onChange={onMonth} />
    <View>
      <View style={{ flexDirection: 'row' }}>{['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, index) => <View key={index} style={{ width: '14.2857%', alignItems: 'center', paddingVertical: 8 }}><Copy muted>{day}</Copy></View>)}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{days.map((day, index) => {
        const count = day ? Math.max(0, ...periods.map(period => visible.filter(row => row.available !== false && row.available_date === day && row.period === period.value).length)) : 0;
        const hasBusy = visible.some(row => row.available_date === day && row.available === false);
        return <View key={day || index} style={{ width: '14.2857%', padding: 2 }}>{day && <Pressable disabled={busy} accessibilityRole="button" accessibilityLabel={`${displayDate(day)}, ${count} ${count === 1 ? 'persona disponible' : 'personas disponibles'} en una misma franja`} accessibilityState={{ selected: selected === day, disabled: busy }} onPress={() => onSelect(day)} style={({ pressed }) => ({ minHeight: 56, borderRadius: 12, borderWidth: 1, borderColor: day === localDate(new Date()) && selected !== day ? p.accent : 'transparent', alignItems: 'center', justifyContent: 'center', backgroundColor: selected === day ? p.accent : count > 1 ? p.sage : 'transparent', opacity: pressed ? 0.7 : 1, gap: 2 })}>
          <Copy style={{ color: selected === day ? p.onAccent : count > 1 ? p.sageText : p.text, fontWeight: selected === day ? '700' : '400' }}>{Number(day.slice(-2))}</Copy>
          {count > 0 && <Copy style={{ fontSize: 10, color: selected === day ? p.onAccent : count > 1 ? p.sageText : p.muted }}>{count} disp.</Copy>}
          {!count && hasBusy && <Copy style={{ fontSize: 10, color: selected === day ? p.onAccent : p.peachText }}>No pueden</Copy>}
        </Pressable>}</View>;
      })}</View>
    </View>
    </View>
    <Animated.View style={{ gap: 5, opacity: dayReveal.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }), transform: [{ translateY: dayReveal.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] }}>
      <Section title={displayDate(selected)} />
      {periods.some(period => availabilitySummary(visible, members.map(member => member.id), selected, period.value).free.length >= 3) && <Copy style={{ color: p.sageText, fontSize: 13 }}>¡Milagro! Vuestras agendas se han puesto de acuerdo.</Copy>}
    </Animated.View>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: detailsOpen }} onPress={() => setDetailsDay(detailsOpen ? '' : selected)} style={{ minHeight: 48, justifyContent: 'center' }}><Copy style={{ color: p.accent, fontSize: 14 }}>{detailsOpen ? 'Ocultar nombres' : 'Ver quién puede'}</Copy></Pressable>
    <View style={{ gap: 14 }}>{periods.map(period => {
      const summary = availabilitySummary(visible, members.map(member => member.id), selected, period.value);
      const names = (ids: string[]) => ids.map(id => `${members.find(member => member.id === id)?.name || 'Sin nombre'}${id === accountId ? ' (tú)' : ''}`).join(', ');
      return <View key={period.value} style={{ gap: 5, borderBottomWidth: 1, borderColor: p.line, paddingBottom: 12 }}>
        <Copy style={{ fontWeight: '600' }}>{period.label}</Copy>
        <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {[{ count: summary.free.length, label: 'pueden', Icon: CheckIcon, color: p.sageText, background: p.sage }, { count: summary.busy.length, label: 'no pueden', Icon: XIcon, color: p.peachText, background: p.peach }, { count: summary.unknown.length, label: 'sin indicar', Icon: MinusIcon, color: p.muted, background: p.soft }].map(status => <View key={status.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: status.background }}><status.Icon size={13} color={status.color} /><Copy style={{ fontSize: 12, lineHeight: 18, color: status.color }}>{status.count} {status.label}</Copy></View>)}
        </View>
        {detailsOpen && !!summary.free.length && <MotionReveal style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><CheckIcon size={17} color={p.sageText} /><Copy style={{ color: p.sageText, fontSize: 14, flex: 1 }}>Pueden: {names(summary.free)}</Copy></MotionReveal>}
        {detailsOpen && !!summary.busy.length && <MotionReveal style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><XIcon size={17} color={p.peachText} /><Copy style={{ color: p.peachText, fontSize: 14, flex: 1 }}>No pueden: {names(summary.busy)}</Copy></MotionReveal>}
        {detailsOpen && !!summary.unknown.length && <MotionReveal style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><MinusIcon size={17} color={p.muted} /><Copy muted style={{ fontSize: 14, flex: 1 }}>Sin indicar: {names(summary.unknown)}</Copy></MotionReveal>}
      </View>;
    })}</View>
    <TextAction disabled={busy || selected < localDate(new Date())} onPress={() => onPlan(selected)}>Proponer un plan para este día</TextAction>
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><Copy style={{ fontWeight: '600' }}>Tú</Copy><Pressable disabled={busy} accessibilityRole="button" accessibilityLabel={editingOpen ? 'Cerrar edición de disponibilidad' : 'Editar mi disponibilidad'} accessibilityState={{ expanded: editingOpen, disabled: busy }} onPress={() => setEditingDay(editingOpen ? '' : selected)} style={{ minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center' }}><Copy style={{ color: p.accent, fontSize: 14, fontWeight: '600' }}>{editingOpen ? 'Cerrar' : 'Editar'}</Copy></Pressable></View>
      {mine.map(period => <View key={period.value} style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}><Copy muted style={{ fontSize: 14 }}>{period.label}</Copy><Copy style={{ fontSize: 14, color: !period.answer ? p.muted : period.answer.available === false ? p.peachText : p.sageText }}>{!period.answer ? 'Sin indicar' : period.answer.available === false ? 'No puedo' : 'Puedo'}</Copy></View>)}
    </View>
    {editingOpen && <MotionReveal style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      <TextAction disabled={busy} onPress={() => onDay(true)}>Puedo todo el día</TextAction>
      <TextAction disabled={busy} onPress={() => onDay(false)}>No puedo en todo el día</TextAction>
      <TextAction disabled={busy} onPress={() => onDay(null)}>Quitar mis respuestas</TextAction>
    </View>
    {busy && <Copy accessibilityLiveRegion="polite" muted>Haciendo hueco en la agenda…</Copy>}
    <View style={{ gap: 12 }}>{periods.map(period => {
      const row = visible.find(row => row.owner_id === accountId && row.available_date === selected && row.period === period.value);
      return <View key={period.value} style={{ gap: 6 }}><Copy style={{ fontSize: 14, fontWeight: '600' }}>{period.label}</Copy><ChoiceTabs disabled={busy} value={!row ? 'unknown' : row.available === false ? 'no' : 'yes'} onChange={value => { if (!busy) onToggle(period.value, value === 'unknown' ? null : value === 'yes'); }} options={[{ value: 'yes', label: 'Puedo' }, { value: 'no', label: 'No puedo' }, { value: 'unknown', label: 'Sin indicar' }]} /></View>;
    })}</View>
    </MotionReveal>}
    <View style={{ gap: 12 }}>
      <Section title="Cuándo coincidís" />
      {matches.length ? matches.map(match => <View key={`${match.date}:${match.period}`} style={{ borderBottomWidth: 1, borderColor: p.line, paddingBottom: 12, gap: 5 }}>
        <Copy style={{ fontWeight: '600' }}>{displayDate(match.date)} · {periods.find(period => period.value === match.period)?.label}</Copy>
        <Copy muted>{match.people.length} personas disponibles: {match.people.map(id => members.find(member => member.id === id)?.name || 'Sin nombre').join(', ')}</Copy>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
          <IconAction label={`Ver disponibilidad del ${displayDate(match.date)}`} disabled={busy} onPress={() => onSelect(match.date)}><CalendarBlankIcon size={23} color={p.muted} /></IconAction>
          <TextAction disabled={busy} onPress={() => onPlan(match.date)}>Proponer un plan</TextAction>
        </View>
      </View>) : <Copy muted>Vuestras agendas aún no se hablan. Marcad cuándo podéis y buscamos un hueco.</Copy>}
    </View>
  </View>;
}
