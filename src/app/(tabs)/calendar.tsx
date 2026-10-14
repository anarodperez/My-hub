import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { CalendarBlankIcon, PencilSimpleIcon } from '@/components/hub-icons';
import { CalendarHeading } from '@/components/calendar-heading';
import { AddAction, CategoryIcon, Copy, Empty, IconAction, Privacy, Screen, Section, Surface, s } from '@/components/hub-ui';
import { calendarDays, categories, displayDate, localDate, type Category } from '@/features/hub/model';
import { useHub, usePalette } from '@/features/hub/provider';
import { getHubLayout } from '@/features/hub/layout';

export default function CalendarScreen() {
  const { state } = useHub();
  const p = usePalette();
  const { width, fontScale } = useWindowDimensions();
  const sideBySide = getHubLayout(width, fontScale).sidebar && width >= 1024 && fontScale <= 1.3;
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState(() => localDate(new Date()));
  const days = calendarDays(month.getFullYear(), month.getMonth());
  const events = state.events.filter((event) => event.date === selected);
  const colors: Record<Category, string> = p.dark ? { book: '#C4A7DC', movie: '#E5AE94', series: '#9EC6B2', product: '#E3C37F', place: '#9BBFE5' } : { book: '#705080', movie: '#A45335', series: '#3C7357', product: '#8D691F', place: '#436D9C' };
  const changeMonth = (next: Date) => { setMonth(next); setSelected(localDate(next)); };
  return <Screen wide title="Que no se te pase" subtitle="Tus estrenos, lanzamientos y pequeños planes.">
    <Privacy>Tu calendario es privado</Privacy>
    <View style={{ flexDirection: sideBySide ? 'row' : 'column', gap: 24, alignItems: 'flex-start' }}>
    <View style={{ width: sideBySide ? '52%' : '100%' }}><Surface><CalendarHeading month={month} onChange={changeMonth} />
      <View style={{ flexDirection: 'row' }}>{['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, index) => <Copy key={index} muted style={{ width: '14.2857%', textAlign: 'center', fontSize: 12 }}>{day}</Copy>)}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{days.map((day, index) => <View key={day || `blank-${index}`} style={{ width: '14.2857%', padding: 1 }}>{day && <Pressable accessibilityRole="button" accessibilityLabel={new Date(`${day}T12:00:00`).toLocaleDateString('es-ES', { dateStyle: 'full' })} accessibilityState={{ selected: selected === day }} onPress={() => setSelected(day)} style={{ minHeight: 48, borderRadius: 12, backgroundColor: selected === day ? p.accent : day === localDate(new Date()) ? p.soft : 'transparent', alignItems: 'center', justifyContent: 'center', gap: 2 }}><Copy style={{ fontSize: 14, color: selected === day ? p.onAccent : p.text, fontWeight: selected === day ? '700' : '400' }}>{Number(day.slice(-2))}</Copy><View style={{ height: 6, flexDirection: 'row', gap: 3 }}>{[...new Set(state.events.filter((event) => event.date === day).map((event) => event.category))].map((category) => <View key={category} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors[category], borderWidth: selected === day ? 1 : 0, borderColor: p.onAccent }} />)}</View></Pressable>}</View>)}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingTop: 8, borderTopWidth: 1, borderTopColor: p.line }}>{categories.map((category) => <View key={category.value} style={s.inline}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors[category.value] }} /><Copy muted style={{ fontSize: 11, lineHeight: 17 }}>{category.label}</Copy></View>)}</View>
    </Surface></View>
    <View style={{ flex: sideBySide ? 1 : undefined, width: sideBySide ? undefined : '100%', gap: 20 }}>
    <Section title={`El ${displayDate(selected)}`} trailing={<AddAction label="Evento" onPress={() => router.push({ pathname: '/compose', params: { kind: 'event', date: selected } })} />} />
    {events.length ? events.map((event) => <Surface key={event.id}><View style={s.inline}><CategoryIcon category={event.category} /><View style={s.fill}><Copy style={{ fontWeight: '600' }}>{event.title}</Copy><Copy muted style={s.small}>Evento privado</Copy></View><IconAction label={`Editar ${event.title}`} onPress={() => router.push({ pathname: '/compose', params: { kind: 'event', id: event.id } })}><PencilSimpleIcon size={21} color={p.muted} /></IconAction></View></Surface>) : <Empty icon={<CalendarBlankIcon size={32} color={p.accent} weight="duotone" />} title="Un día por escribir" description="Apunta ese estreno que esperas o la fecha de tu próximo libro. Aquí no se pierde nada." />}
    </View></View>
  </Screen>;
}
