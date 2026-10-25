import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { ArrowRightIcon, CalendarBlankIcon, PencilSimpleIcon } from '@/components/hub-icons';
import { CalendarReminder } from '@/components/calendar-reminder';
import { CalendarHeading } from '@/components/calendar-heading';
import { AddAction, CategoryIcon, Chips, Copy, Screen, Section, TextAction } from '@/components/hub-ui';
import { calendarDays, localDate, recommendationCategories, type Category } from '@/features/hub/model';
import { useHub, usePalette } from '@/features/hub/provider';
import { getHubLayout } from '@/features/hub/layout';
import { calendarCountdown, calendarSwipe, getCalendarAgenda } from '@/features/hub/calendar-agenda';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { hubType } from '@/constants/hub-design';

const dateValue = (date: string) => new Date(date + 'T12:00:00');
const monthLabel = (date: string) => dateValue(date).toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');

export default function CalendarScreen() {
  const { state } = useHub();
  const p = usePalette();
  const { width, fontScale } = useWindowDimensions();
  const sideBySide = getHubLayout(width, fontScale).sidebar && width >= 1024 && fontScale <= 1.3;
  const today = localDate(new Date());
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState(today);
  const [category, setCategory] = useState<Category | 'all'>('all');
  const reducedMotion = useReducedMotion();
  const [monthOpacity] = useState(() => new Animated.Value(1));
  const monthKey = localDate(month).slice(0, 7);
  useEffect(() => {
    if (reducedMotion) { monthOpacity.setValue(1); return; }
    monthOpacity.setValue(0.65);
    const animation = Animated.timing(monthOpacity, { toValue: 1, duration: 180, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [monthKey, reducedMotion, monthOpacity]);
  const days = calendarDays(month.getFullYear(), month.getMonth());
  const agenda = getCalendarAgenda(category === 'all' ? state.events : state.events.filter((event) => event.category === category), selected, localDate(month).slice(0, 7), today);
  const colors: Record<Category, string> = p.dark ? { book: '#C4A7DC', movie: '#E5AE94', series: '#9EC6B2', product: '#E3C37F', place: '#9BBFE5' } : { book: '#705080', movie: '#A45335', series: '#3C7357', product: '#8D691F', place: '#436D9C' };
  const changeMonth = (next: Date) => { setMonth(next); setSelected(localDate(next)); };
  const selectDate = (date: string) => { const value = dateValue(date); setMonth(new Date(value.getFullYear(), value.getMonth(), 1)); setSelected(date); };
  const swipe = useMemo(() => Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-12, 12])
    .maxPointers(1)
    .runOnJS(true)
    .onEnd((event, success) => {
      if (!success) return;
      const direction = calendarSwipe(event.translationX, event.translationY);
      if (direction) { const next = new Date(month.getFullYear(), month.getMonth() + direction, 1); setMonth(next); setSelected(localDate(next)); }
    }), [month]);
  const add = () => router.push({ pathname: '/compose', params: { kind: 'event', date: selected } });
  const selectedDate = dateValue(selected);
  const usedCategories = recommendationCategories.filter((category) => state.events.some((event) => event.category === category.value && event.date.startsWith(localDate(month).slice(0, 7))));

  const dayAgenda = <View style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ minWidth: 62, borderRadius: 12, backgroundColor: p.soft, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' }}><Copy style={{ color: p.accent, fontSize: 32, lineHeight: 38, fontWeight: '700' }}>{selectedDate.getDate()}</Copy></View>
            <View style={{ flex: 1, gap: 2 }}><Copy accessibilityRole="header" style={{ fontSize: 20, lineHeight: 26, fontWeight: '600', textTransform: 'capitalize' }}>{selected === today ? 'Hoy' : selectedDate.toLocaleDateString('es-ES', { weekday: 'long' })}</Copy><Copy muted style={{ fontSize: 13, lineHeight: 19 }}>{selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</Copy></View>
            <AddAction label="Añadir evento al día seleccionado" onPress={add} />
          </View>
          {agenda.selectedEvents.length ? agenda.selectedEvents.map((event) => <View key={event.id} style={{ borderRadius: 18, backgroundColor: p.surface, borderWidth: 1, borderColor: p.line, overflow: 'hidden' }}><Pressable accessibilityRole="button" accessibilityLabel={'Editar ' + event.title} onPress={() => router.push({ pathname: '/compose', params: { kind: 'event', id: event.id } })} style={({ pressed }) => ({ backgroundColor: pressed ? p.soft : p.surface, borderLeftWidth: 4, borderLeftColor: colors[event.category], padding: 16, minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: 12 })}>
            <View style={{ backgroundColor: p.soft, width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}><CategoryIcon category={event.category} size={22} /></View>
            <View style={{ flex: 1, gap: 4 }}><Copy style={{ fontSize: 16, lineHeight: 23, fontWeight: '600' }}>{event.title}</Copy><Copy muted style={hubType.metadata}>{recommendationCategories.find((category) => category.value === event.category)?.singular}</Copy></View><PencilSimpleIcon size={18} color={p.muted} />
          </Pressable><View style={{ paddingHorizontal: 16, paddingBottom: 8 }}><CalendarReminder event={event} /></View></View>) : <View style={{ padding: 20, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: p.line, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><CalendarBlankIcon size={22} color={p.muted} /><Copy muted>{category === 'all' ? 'Este día está libre' : 'Sin planes de esta categoría'}</Copy></View><TextAction onPress={add}>Añadir un plan</TextAction>
          </View>}
        </View>;

  return <GestureHandlerRootView style={{ flex: 1 }}><Screen wide title="Tu calendario" subtitle="Haz sitio a lo que te apetece." action={<TextAction onPress={() => selectDate(today)}>Hoy</TextAction>}>


    <Chips value={category} onChange={setCategory} all recommendations />

    <View style={{ flexDirection: sideBySide ? 'row' : 'column', gap: 28, alignItems: 'flex-start' }}>
      <View style={{ width: sideBySide ? '52%' : '100%' }}>
        <View style={{ backgroundColor: p.surface, borderRadius: 24, borderWidth: 1, borderColor: p.line, paddingHorizontal: 8, paddingVertical: 18, marginHorizontal: width < 600 ? -12 : 0, gap: 16 }}>
          <CalendarHeading month={month} onChange={changeMonth} />
          <View style={{ flexDirection: 'row' }}>{['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, index) => <Copy key={index} muted style={{ width: '14.2857%', textAlign: 'center', fontSize: 12, lineHeight: 18, fontWeight: '600' }}>{day}</Copy>)}</View>
          <GestureDetector gesture={swipe} touchAction="pan-y"><Animated.View style={{ opacity: monthOpacity }}>{Array.from({ length: Math.ceil(days.length / 7) }, (_, week) => <View key={week}><View style={{ flexDirection: 'row' }}>{days.slice(week * 7, week * 7 + 7).map((day, index) => {
            const entries = day ? agenda.byDate.get(day) || [] : [];
            const isSelected = selected === day;
            const isToday = today === day;
            const dots = [...new Set(entries.map((event) => event.category))];
            return <View key={day || 'blank-' + index} style={{ width: '14.2857%', paddingVertical: 2 }}>{day && <Pressable accessibilityRole="button" accessibilityLabel={dateValue(day).toLocaleDateString('es-ES', { dateStyle: 'full' }) + (isToday ? ', hoy' : '') + (entries.length ? ', ' + entries.length + (entries.length === 1 ? ' evento' : ' eventos') : '')} accessibilityState={{ selected: isSelected }} onPress={() => { setSelected(day); if (!entries.length) router.push({ pathname: '/compose', params: { kind: 'event', date: day } }); }} onLongPress={() => { setSelected(day); router.push({ pathname: '/compose', params: { kind: 'event', date: day } }); }} accessibilityHint={entries.length ? "Ver los planes de este día. Mantén pulsado para añadir otro." : "Añadir un plan en esta fecha"} style={({ pressed }) => ({ minHeight: 54, borderRadius: 15, borderWidth: 1, borderColor: isToday && !isSelected ? p.accent : 'transparent', backgroundColor: isSelected ? p.accent : entries.length ? p.soft : index >= 5 ? p.background : 'transparent', alignItems: 'center', justifyContent: 'center', gap: 4, opacity: pressed ? 0.7 : 1 })}>
              <Copy style={{ fontSize: 16, lineHeight: 23, color: isSelected ? p.onAccent : index >= 5 ? p.muted : p.text, fontWeight: isToday || entries.length || isSelected ? '700' : '400' }}>{Number(day.slice(-2))}</Copy>
              <View style={{ height: 5, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 2 }}>{dots.map((category) => <View key={category} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: isSelected ? p.onAccent : colors[category] }} />)}</View>
            </Pressable>}</View>;
          })}</View></View>)}</Animated.View></GestureDetector>
          <View style={{ marginHorizontal: 12, borderTopWidth: 1, borderTopColor: p.line, paddingTop: 14, gap: 10 }}>
            <Copy style={{ color: p.accent, fontSize: 13, lineHeight: 19, fontWeight: '600' }}>{agenda.monthCount} {agenda.monthCount === 1 ? 'plan este mes' : 'planes este mes'}</Copy>
            {!!usedCategories.length && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{usedCategories.map((category) => <View key={category.value} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors[category.value] }} /><Copy muted style={{ fontSize: 12, lineHeight: 18 }}>{category.label}</Copy></View>)}</View>}
          </View>
        </View>
      </View>

      <View style={{ flex: sideBySide ? 1 : undefined, width: sideBySide ? undefined : '100%', gap: 24 }}>
        {dayAgenda}
    {agenda.next && <Pressable accessibilityRole="button" accessibilityLabel={'Ver próximo plan: ' + agenda.next.events[0].title + ', ' + agenda.next.date} onPress={() => selectDate(agenda.next!.date)} style={({ pressed }) => ({ backgroundColor: p.sage, borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 16, opacity: pressed ? 0.75 : 1 })}>
      <View style={{ alignItems: 'center', minWidth: 44 }}><Copy style={{ color: p.sageText, fontSize: 30, lineHeight: 34, fontWeight: '700' }}>{Number(agenda.next.date.slice(-2))}</Copy><Copy style={{ color: p.sageText, fontSize: 12, lineHeight: 18, textTransform: 'uppercase' }}>{monthLabel(agenda.next.date)}</Copy></View>
      <View style={{ flex: 1, gap: 4 }}><Copy style={{ color: p.sageText, fontSize: 12, lineHeight: 18 }}>{calendarCountdown(agenda.next.date, today)}</Copy><Copy style={{ color: p.sageText, fontSize: 16, lineHeight: 22, fontWeight: '600' }}>{agenda.next.events[0].title}</Copy>{agenda.next.events.length > 1 && <Copy style={{ color: p.sageText, fontSize: 12, lineHeight: 18 }}>+{agenda.next.events.length - 1} ese día</Copy>}</View>
      <ArrowRightIcon size={20} color={p.sageText} />
    </Pressable>}
        {!!agenda.upcoming.length && <View style={{ gap: 16 }}>
          <Section title="Lo próximo" />
          {agenda.upcoming.map((group) => <View key={group.date} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
            <View style={{ minWidth: 42, paddingTop: 12, alignItems: 'center' }}><Copy style={{ fontSize: 22, lineHeight: 28, fontWeight: '700' }}>{Number(group.date.slice(-2))}</Copy><Copy muted style={{ fontSize: 11, lineHeight: 17, textTransform: 'uppercase' }}>{monthLabel(group.date)}</Copy></View>
            <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: p.line, paddingBottom: 12 }}>{group.events.map((event) => <Pressable key={event.id} accessibilityRole="button" accessibilityLabel={'Ver ' + event.title + ', ' + group.date} onPress={() => selectDate(group.date)} style={({ pressed }) => ({ minHeight: 52, paddingVertical: 10, gap: 6, opacity: pressed ? 0.6 : 1 })}><Copy style={{ fontSize: 15, lineHeight: 22, fontWeight: '600' }}>{event.title}</Copy><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><CategoryIcon category={event.category} size={13} /><Copy muted style={hubType.metadata}>{recommendationCategories.find((category) => category.value === event.category)?.singular}</Copy></View></Pressable>)}</View>
          </View>)}
        </View>}
      </View>
    </View>
    <View style={{ borderTopWidth: 1, borderColor: p.line, paddingTop: 16, gap: 4 }}>
      <Section title="Para quedar en grupo" />
      <Copy muted>Consulta cuándo coincidís sin compartir tus eventos personales.</Copy>
      <TextAction onPress={() => router.push('/(tabs)/friends')}>Ver disponibilidad del grupo</TextAction>
    </View>
  </Screen></GestureHandlerRootView>;
}
