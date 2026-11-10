import { MotionContent, MotionReveal } from '@/components/hub-motion';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { ArrowRightIcon, CalendarBlankIcon, PencilSimpleIcon, PlusIcon, SlidersHorizontalIcon } from '@/components/hub-icons';
import { CalendarReminder } from '@/components/calendar-reminder';
import { CalendarHeading } from '@/components/calendar-heading';
import { Action, AddAction, CategoryIcon, Chips, ChoiceTabs, Copy, IconAction, Screen, Section, TextAction } from '@/components/hub-ui';
import { GroupsScreen } from '@/features/hub/groups-screen';
import { calendarDays, localDate, recommendationCategories, type Category } from '@/features/hub/model';
import { useHub, usePalette } from '@/features/hub/provider';
import { getHubLayout } from '@/features/hub/layout';
import { calendarCountdown, calendarSwipe, getCalendarAgenda } from '@/features/hub/calendar-agenda';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { hubType } from '@/constants/hub-design';
import { useViewState } from '@/hooks/use-view-state';

const dateValue = (date: string) => new Date(date + 'T12:00:00');
const monthLabel = (date: string) => dateValue(date).toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');

export default function CalendarScreen() {
  const [filtersOpen, setFiltersOpen] = useViewState('calendar.filters', false);
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [scope, setScope] = useViewState<'personal' | 'friends'>('calendar.scope', 'personal');
  const { state } = useHub();
  const p = usePalette();
  const { width, fontScale } = useWindowDimensions();
  const sideBySide = getHubLayout(width, fontScale).sidebar && width >= 1200 && fontScale <= 1.3;
  const today = localDate(new Date());
  const [monthDate, setMonthDate] = useViewState('calendar.month', () => localDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const month = useMemo(() => dateValue(monthDate), [monthDate]);
  const setMonth = useCallback((next: Date) => setMonthDate(localDate(next)), [setMonthDate]);
  const [selected, setSelected] = useViewState('calendar.selected', today);
  const [category, setCategory] = useViewState<Category | 'all'>('calendar.category', 'all');
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
    }), [month, setMonth, setSelected]);
  const add = () => router.push({ pathname: '/compose', params: { kind: 'event', date: selected } });
  const selectedDate = dateValue(selected);
  const usedCategories = recommendationCategories.filter((category) => state.events.some((event) => event.category === category.value && event.date.startsWith(localDate(month).slice(0, 7))));

  const dayAgenda = <MotionContent changeKey={`${selected}:${category}`} style={{ gap: 20, backgroundColor: p.surface, borderRadius: 16, padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ minWidth: 62, borderRadius: 12, backgroundColor: p.soft, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' }}><Copy style={{ color: p.accent, fontSize: 32, lineHeight: 38, fontWeight: '700' }}>{selectedDate.getDate()}</Copy></View>
            <View style={{ flex: 1, gap: 2 }}><Copy accessibilityRole="header" style={{ fontSize: 20, lineHeight: 26, fontWeight: '600', textTransform: 'capitalize' }}>{selected === today ? 'Hoy' : selectedDate.toLocaleDateString('es-ES', { weekday: 'long' })}</Copy><Copy muted style={{ fontSize: 13, lineHeight: 19 }}>{selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</Copy></View>
            <AddAction label="Añadir evento al día seleccionado" onPress={add} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTopWidth: 1, borderColor: p.line }}><Copy style={{ fontSize: 14, fontWeight: '600' }}>Agenda del día</Copy><Copy muted style={hubType.metadata}>{agenda.selectedEvents.length} {agenda.selectedEvents.length === 1 ? 'plan' : 'planes'}</Copy></View>
          {agenda.selectedEvents.length ? agenda.selectedEvents.map((event) => <View key={event.id} style={{ borderRadius: 16, backgroundColor: p.surface, overflow: 'hidden' }}><Pressable accessibilityRole="button" accessibilityLabel={'Editar ' + event.title} onPress={() => router.push({ pathname: '/compose', params: { kind: 'event', id: event.id } })} style={({ pressed }) => ({ backgroundColor: pressed ? p.soft : p.surface, padding: 16, minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: 12 })}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: p.soft, justifyContent: 'center', alignItems: 'center', gap: 3 }}><CategoryIcon category={event.category} size={20} /><View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors[event.category] }} /></View>
            <View style={{ flex: 1, gap: 4 }}><Copy style={{ fontSize: 16, lineHeight: 23, fontWeight: '600' }}>{event.title}</Copy><Copy muted style={hubType.metadata}>{recommendationCategories.find((category) => category.value === event.category)?.singular}</Copy></View><PencilSimpleIcon size={18} color={p.muted} />
          </Pressable><View style={{ paddingHorizontal: 16, paddingBottom: 8 }}><CalendarReminder event={event} /></View></View>) : <View style={{ paddingVertical: 24, alignItems: 'center', gap: 12 }}>
            <View style={{ width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: p.soft }}><CalendarBlankIcon size={28} color={p.accent} /></View>
            <Copy style={{ fontSize: 18, fontWeight: '600', textAlign: 'center' }}>{category === 'all' ? 'Un día por llenar' : 'Sin planes de esta categoría'}</Copy>
            <Copy muted style={{ fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 260 }}>{category === 'all' ? 'Una lectura, una película o ese plan que tienes pendiente.' : 'Elige otra categoría o añade un plan para este día.'}</Copy>
            <TextAction icon={<PlusIcon size={18} color={p.accent} />} onPress={add}>Añadir un plan</TextAction>
          </View>}
        </MotionContent>;

  const calendarScope = <ChoiceTabs variant="segmented" value={scope} onChange={setScope} options={[{ value: 'personal', label: 'Personal' }, { value: 'friends', label: 'Con amigas' }]} />;
  if (scope === 'friends') return <GroupsScreen back={false} calendarHeader={calendarScope} />;
  return <GestureHandlerRootView style={{ flex: 1 }}><Screen wide title="Tu calendario" action={sideBySide ? <Action icon={<PlusIcon size={18} color={p.onAccent} />} onPress={add}>Añadir plan</Action> : <AddAction label="Añadir plan" onPress={add} />}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
      {calendarScope}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <TextAction onPress={() => selectDate(today)}>Volver a hoy</TextAction>
        <IconAction label={filtersOpen ? 'Ocultar filtros del calendario' : 'Mostrar filtros del calendario'} expanded={filtersOpen} onPress={() => setFiltersOpen(previous => !previous)}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 }}><SlidersHorizontalIcon size={19} color={p.accent} /><Copy style={{ fontSize: 14, fontWeight: '600', color: p.accent }}>Filtros{category !== 'all' ? ' · 1' : ''}</Copy></View></IconAction>
      </View>
    </View>
    {filtersOpen && <MotionReveal style={{ backgroundColor: p.surface, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8 }}><Chips value={category} onChange={setCategory} all recommendations /></MotionReveal>}

    <View style={{ flexDirection: sideBySide ? 'row' : 'column', gap: 24, alignItems: 'flex-start' }}>
      <View style={{ flex: sideBySide ? 1 : undefined, minWidth: 0, width: sideBySide ? undefined : '100%' }}>
        <View style={{ backgroundColor: p.surface, borderRadius: 16, padding: sideBySide ? 24 : 12, gap: 16 }}>
          <CalendarHeading month={month} onChange={changeMonth} large={sideBySide} />
          <View style={{ flexDirection: 'row' }}>{(sideBySide ? ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] : ['L', 'M', 'X', 'J', 'V', 'S', 'D']).map((day, index) => <Copy key={index} muted style={{ width: '14.2857%', textAlign: 'center', fontSize: 14, lineHeight: 20, fontWeight: '600' }}>{day}</Copy>)}</View>
          <GestureDetector gesture={swipe} touchAction="pan-y"><Animated.View style={{ opacity: monthOpacity }}>{Array.from({ length: Math.ceil(days.length / 7) }, (_, week) => <View key={week}><View style={{ flexDirection: 'row' }}>{days.slice(week * 7, week * 7 + 7).map((day, index) => {
            const entries = day ? agenda.byDate.get(day) || [] : [];
            const isSelected = selected === day;
            const isToday = today === day;
            const dots = [...new Set(entries.map((event) => event.category))];
            return <View key={day || 'blank-' + index} style={{ width: '14.2857%', padding: 2 }}>{day && <Pressable accessibilityRole="button" accessibilityLabel={dateValue(day).toLocaleDateString('es-ES', { dateStyle: 'full' }) + (isToday ? ', hoy' : '') + (entries.length ? ', ' + entries.length + (entries.length === 1 ? ' evento' : ' eventos') : '')} accessibilityState={{ selected: isSelected }} onPress={() => setSelected(day)} onLongPress={() => { setSelected(day); router.push({ pathname: '/compose', params: { kind: 'event', date: day } }); }} accessibilityHint="Ver el día. Mantén pulsado para añadir un plan." style={({ pressed }) => ({ minHeight: sideBySide ? 80 : 60, borderRadius: 12, borderWidth: 1, borderColor: isSelected ? p.accent : sideBySide ? p.line : 'transparent', backgroundColor: isSelected || pressed ? p.soft : index >= 5 ? p.background : 'transparent', alignItems: sideBySide ? 'flex-start' : 'center', justifyContent: sideBySide ? 'flex-start' : 'center', padding: sideBySide ? 8 : 0, gap: 4, opacity: pressed ? 0.7 : 1 })}>
              <View style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: isToday && !isSelected ? p.accent : 'transparent', backgroundColor: isSelected ? p.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}><Copy style={{ fontSize: 16, lineHeight: 23, color: isSelected ? p.onAccent : index >= 5 ? p.muted : p.text, fontWeight: isToday || entries.length || isSelected ? '700' : '400' }}>{Number(day.slice(-2))}</Copy></View>
              {sideBySide ? <View style={{ alignSelf: 'stretch', gap: 3 }}>{entries.slice(0, 1).map(event => <View key={event.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors[event.category] }} /><Copy numberOfLines={1} style={{ flex: 1, fontSize: 12, lineHeight: 18 }}>{event.title}</Copy></View>)}{entries.length > 1 && <Copy muted style={{ fontSize: 12, lineHeight: 18 }}>+{entries.length - 1} más</Copy>}</View> : <View style={{ height: 5, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 2 }}>{dots.map((category) => <View key={category} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors[category] }} />)}</View>}
            </Pressable>}</View>;
          })}</View></View>)}</Animated.View></GestureDetector>
          <View style={{ marginHorizontal: 12, borderTopWidth: 1, borderTopColor: p.line, paddingTop: 14, gap: 10 }}>
            <Copy style={{ color: p.accent, fontSize: 13, lineHeight: 19, fontWeight: '600' }}>{agenda.monthCount} {agenda.monthCount === 1 ? 'plan este mes' : 'planes este mes'}</Copy>
            {!!usedCategories.length && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{usedCategories.map((category) => <View key={category.value} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors[category.value] }} /><Copy muted style={{ fontSize: 12, lineHeight: 18 }}>{category.label}</Copy></View>)}</View>}
          </View>
        </View>
      </View>

      <View style={{ width: sideBySide ? (width >= 1440 ? 380 : 300) : '100%', gap: 20 }}>
        {dayAgenda}
    {agenda.next && <Pressable accessibilityRole="button" accessibilityLabel={'Ver próximo plan: ' + agenda.next.events[0].title + ', ' + agenda.next.date} onPress={() => selectDate(agenda.next!.date)} style={({ pressed }) => ({ backgroundColor: p.sage, borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 16, opacity: pressed ? 0.75 : 1 })}>
      <View style={{ alignItems: 'center', minWidth: 44 }}><Copy style={{ color: p.sageText, fontSize: 30, lineHeight: 34, fontWeight: '700' }}>{Number(agenda.next.date.slice(-2))}</Copy><Copy style={{ color: p.sageText, fontSize: 12, lineHeight: 18, textTransform: 'uppercase' }}>{monthLabel(agenda.next.date)}</Copy></View>
      <View style={{ flex: 1, gap: 4 }}><Copy style={{ color: p.sageText, fontSize: 12, lineHeight: 18 }}>{calendarCountdown(agenda.next.date, today)}</Copy><Copy style={{ color: p.sageText, fontSize: 16, lineHeight: 22, fontWeight: '600' }}>{agenda.next.events[0].title}</Copy>{agenda.next.events.length > 1 && <Copy style={{ color: p.sageText, fontSize: 12, lineHeight: 18 }}>+{agenda.next.events.length - 1} ese día</Copy>}</View>
      <ArrowRightIcon size={20} color={p.sageText} />
    </Pressable>}
        {!!agenda.upcoming.length && <TextAction onPress={() => setAgendaOpen(!agendaOpen)}>{agendaOpen ? 'Ocultar agenda' : 'Ver próximos planes'}</TextAction>}
        {agendaOpen && !!agenda.upcoming.length && <MotionReveal style={{ gap: 16 }}>
          <Section title="Lo próximo" />
          {agenda.upcoming.map((group) => <View key={group.date} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
            <View style={{ minWidth: 42, paddingTop: 12, alignItems: 'center' }}><Copy style={{ fontSize: 22, lineHeight: 28, fontWeight: '700' }}>{Number(group.date.slice(-2))}</Copy><Copy muted style={{ fontSize: 11, lineHeight: 17, textTransform: 'uppercase' }}>{monthLabel(group.date)}</Copy></View>
            <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: p.line, paddingBottom: 12 }}>{group.events.map((event) => <Pressable key={event.id} accessibilityRole="button" accessibilityLabel={'Ver ' + event.title + ', ' + group.date} onPress={() => selectDate(group.date)} style={({ pressed }) => ({ minHeight: 52, paddingVertical: 10, gap: 6, opacity: pressed ? 0.6 : 1 })}><Copy style={{ fontSize: 15, lineHeight: 22, fontWeight: '600' }}>{event.title}</Copy><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><CategoryIcon category={event.category} size={13} /><Copy muted style={hubType.metadata}>{recommendationCategories.find((category) => category.value === event.category)?.singular}</Copy></View></Pressable>)}</View>
          </View>)}
        </MotionReveal>}
      </View>
    </View>
  </Screen></GestureHandlerRootView>;
}
