import { MotionReveal } from '@/components/hub-motion';
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { CalendarHeading } from '@/components/calendar-heading';
import { Action, ChoiceTabs, Copy, IconAction, Section, TextAction } from '@/components/hub-ui';
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
  const { width, fontScale } = useWindowDimensions();
  const sideBySide = width >= 1100 && fontScale <= 1.3;
  const reducedMotion = useReducedMotion();
  const [detailsDay, setDetailsDay] = useState('');
  const [open, setOpen] = useState(false);
  const compact = width < 700;
  const close = () => setOpen(false);
  const openDay = (date: string) => { if (!busy) { onSelect(date); setDetailsDay(''); setOpen(true); } };
  const propose = (date: string) => { close(); onPlan(date); };
  const detailsOpen = detailsDay === selected;
  const days = calendarDays(month.getFullYear(), month.getMonth());
  const visible = rows.filter(row => members.some(member => member.id === row.owner_id));
  const matches = availabilityMatches(visible, members.map(member => member.id), localDate(new Date())).slice(0, 3);
  return <View style={{ gap: 20 }}>
    <View style={{ backgroundColor: p.surface, borderRadius: 16, padding: sideBySide ? 24 : 12, gap: 16 }}>
    <CalendarHeading month={month} onChange={onMonth} large={sideBySide} />
    <View>
      <View style={{ flexDirection: 'row' }}>{(sideBySide ? ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] : ['L', 'M', 'X', 'J', 'V', 'S', 'D']).map((day, index) => <View key={index} style={{ width: '14.2857%', alignItems: 'center', paddingVertical: 8 }}><Copy muted style={{ fontSize: 14, fontWeight: '600' }}>{day}</Copy></View>)}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{days.map((day, index) => {
        const count = day ? Math.max(0, ...periods.map(period => visible.filter(row => row.available !== false && row.available_date === day && row.period === period.value).length)) : 0;
        const hasBusy = visible.some(row => row.available_date === day && row.available === false);
        return <View key={day || index} style={{ width: '14.2857%', padding: 2 }}>{day && <Pressable disabled={busy} accessibilityRole="button" accessibilityLabel={`${displayDate(day)}, ${count} ${count === 1 ? 'persona disponible' : 'personas disponibles'} en una misma franja`} accessibilityState={{ selected: selected === day, disabled: busy }} onPress={() => openDay(day)} style={({ pressed }) => ({ minHeight: sideBySide ? 80 : 64, borderRadius: 12, borderWidth: 1, borderColor: selected === day || day === localDate(new Date()) ? p.accent : sideBySide ? p.line : 'transparent', alignItems: 'center', justifyContent: 'center', backgroundColor: selected === day || pressed ? p.soft : count > 1 ? p.sage : 'transparent', opacity: busy ? 0.5 : pressed ? 0.7 : 1, gap: 2 })}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: selected === day ? p.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}><Copy style={{ color: selected === day ? p.onAccent : count > 1 ? p.sageText : p.text, fontWeight: selected === day ? '700' : '400' }}>{Number(day.slice(-2))}</Copy></View>
          {count > 0 && <Copy style={{ fontSize: 12, lineHeight: 18, color: count > 1 ? p.sageText : p.muted }}>{count} disp.</Copy>}
          {!count && hasBusy && <Copy style={{ fontSize: 12, lineHeight: 18, color: p.peachText }}>No pueden</Copy>}
        </Pressable>}</View>;
      })}</View>
    </View>
    <Copy muted style={{ fontSize: 13 }}>El verde indica coincidencias en una misma franja. Tus citas personales no se comparten.</Copy>
    </View>
    <Modal visible={open} transparent animationType={reducedMotion ? 'none' : compact ? 'slide' : 'fade'} onRequestClose={close}>
      <SafeAreaView style={{ flex: 1, justifyContent: compact ? 'flex-end' : 'center', alignItems: 'center', padding: compact ? 0 : 24 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar disponibilidad" onPress={close} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)' }} />
        <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 680, maxHeight: '90%', backgroundColor: p.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: compact ? 0 : 24, borderBottomRightRadius: compact ? 0 : 24, overflow: 'hidden' }}>
          <View style={{ padding: 20, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderColor: p.line }}>
            <View style={{ flex: 1, gap: 4 }}><Copy muted style={{ fontSize: 14 }}>Disponibilidad del día</Copy><Copy accessibilityRole="header" style={{ fontSize: 24, lineHeight: 32, fontWeight: '700', textTransform: 'capitalize' }}>{new Date(selected + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</Copy></View>
            <IconAction label="Cerrar detalle del día" onPress={close}><XIcon size={24} color={p.muted} /></IconAction>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 16 }}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: detailsOpen }} onPress={() => setDetailsDay(detailsOpen ? '' : selected)} style={{ minHeight: 48, justifyContent: 'center' }}><Copy style={{ color: p.accent, fontSize: 14 }}>{detailsOpen ? 'Ocultar nombres' : 'Ver quién puede'}</Copy></Pressable>
    <View style={{ gap: 14 }}>{periods.map(period => {
      const summary = availabilitySummary(visible, members.map(member => member.id), selected, period.value);
      const names = (ids: string[]) => ids.map(id => `${members.find(member => member.id === id)?.name || 'Sin nombre'}${id === accountId ? ' (tú)' : ''}`).join(', ');
      return <View key={period.value} style={{ gap: 8, borderRadius: 12, backgroundColor: p.background, padding: 12 }}>
        <Copy style={{ fontWeight: '600' }}>{period.label}</Copy>
        <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {[{ count: summary.free.length, label: 'pueden', Icon: CheckIcon, color: p.sageText, background: p.sage }, { count: summary.busy.length, label: 'no pueden', Icon: XIcon, color: p.peachText, background: p.peach }, { count: summary.unknown.length, label: 'sin indicar', Icon: MinusIcon, color: p.muted, background: p.soft }].map(status => <View key={status.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: status.background }}><status.Icon size={13} color={status.color} /><Copy style={{ fontSize: 12, lineHeight: 18, color: status.color }}>{status.count} {status.label}</Copy></View>)}
        </View>
        {detailsOpen && !!summary.free.length && <MotionReveal style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><CheckIcon size={17} color={p.sageText} /><Copy style={{ color: p.sageText, fontSize: 14, flex: 1 }}>Pueden: {names(summary.free)}</Copy></MotionReveal>}
        {detailsOpen && !!summary.busy.length && <MotionReveal style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><XIcon size={17} color={p.peachText} /><Copy style={{ color: p.peachText, fontSize: 14, flex: 1 }}>No pueden: {names(summary.busy)}</Copy></MotionReveal>}
        {detailsOpen && !!summary.unknown.length && <MotionReveal style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><MinusIcon size={17} color={p.muted} /><Copy muted style={{ fontSize: 14, flex: 1 }}>Sin indicar: {names(summary.unknown)}</Copy></MotionReveal>}
      </View>;
    })}</View>
    <View style={{ gap: 16, paddingTop: 20, borderTopWidth: 1, borderColor: p.line }}>
    <Copy accessibilityRole="header" style={{ fontSize: 18, fontWeight: '600' }}>Tu disponibilidad</Copy>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      <TextAction disabled={busy} onPress={() => onDay(true)}>Puedo todo el día</TextAction>
      <TextAction disabled={busy} onPress={() => onDay(false)}>No puedo en todo el día</TextAction>
      <TextAction disabled={busy} onPress={() => onDay(null)}>Quitar mis respuestas</TextAction>
    </View>
    {busy && <Copy accessibilityLiveRegion="polite" muted>Haciendo hueco en la agenda…</Copy>}
    <View style={{ gap: 12 }}>{periods.map(period => {
      const row = visible.find(row => row.owner_id === accountId && row.available_date === selected && row.period === period.value);
      return <View key={period.value} style={{ gap: 6 }}><Copy style={{ fontSize: 14, fontWeight: '600' }}>{period.label}</Copy><ChoiceTabs variant="segmented" disabled={busy} value={!row ? 'unknown' : row.available === false ? 'no' : 'yes'} onChange={value => { if (!busy) onToggle(period.value, value === 'unknown' ? null : value === 'yes'); }} options={[{ value: 'yes', label: 'Puedo' }, { value: 'no', label: 'No puedo' }, { value: 'unknown', label: 'Sin indicar' }]} /></View>;
    })}</View>
    </View>
          </ScrollView>
          <View style={{ padding: 16, borderTopWidth: 1, borderColor: p.line }}><Action disabled={busy || selected < localDate(new Date())} onPress={() => propose(selected)}>Proponer un plan</Action></View>
        </View>
      </SafeAreaView>
    </Modal>
    <View style={{ gap: 12 }}>
      <Section title="Cuándo coincidís" />
      <View style={{ flexDirection: sideBySide ? 'row' : 'column', flexWrap: 'wrap', gap: 16 }}>
      {matches.length ? matches.map(match => <View key={`${match.date}:${match.period}`} style={{ flex: sideBySide ? 1 : undefined, minWidth: sideBySide ? 260 : undefined, backgroundColor: p.sage, borderRadius: 16, padding: 16, gap: 8 }}>
        <Copy style={{ fontWeight: '600', color: p.sageText }}>{displayDate(match.date)} · {periods.find(period => period.value === match.period)?.label}</Copy>
        <Copy style={{ color: p.sageText }}>{match.people.length} personas disponibles: {match.people.map(id => members.find(member => member.id === id)?.name || 'Sin nombre').join(', ')}</Copy>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
          <IconAction label={`Ver disponibilidad del ${displayDate(match.date)}`} disabled={busy} onPress={() => openDay(match.date)}><CalendarBlankIcon size={23} color={p.muted} /></IconAction>
          <TextAction disabled={busy} onPress={() => propose(match.date)}>Proponer un plan</TextAction>
        </View>
      </View>) : <Copy muted>Vuestras agendas aún no se hablan. Marcad cuándo podéis y buscamos un hueco.</Copy>}
      </View>
    </View>
  </View>;
}
