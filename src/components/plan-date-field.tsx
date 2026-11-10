import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarHeading } from './calendar-heading';
import { CalendarBlankIcon, XIcon } from './hub-icons';
import { CaretDownIcon } from 'phosphor-react-native/src/icons/CaretDown';
import { Copy, IconAction, TextAction } from './hub-ui';
import { calendarDays, isLocalDate, localDate } from '@/features/hub/model';
import { usePalette } from '@/features/hub/provider';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

export function PlanDateField({ value, onChange, disabled, required = false, fieldLabel = 'Fecha del plan' }: { value: string; onChange: (date: string) => void; disabled?: boolean; required?: boolean; fieldLabel?: string }) {
  const p = usePalette();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [month, setMonth] = useState(() => new Date());
  const chosen = isLocalDate(value) ? new Date(value + 'T12:00:00') : null;
  const label = chosen ? chosen.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Elegir fecha';
  const close = () => setOpen(false);
  const choose = (date: string) => { onChange(date); close(); };
  return <View style={{ gap: 8 }}>
    <Copy style={{ fontSize: 14, fontWeight: '600' }}>{fieldLabel}{!required && <Copy muted style={{ fontSize: 13 }}> (opcional)</Copy>}</Copy>
    <Pressable accessibilityRole="button" accessibilityLabel={`${fieldLabel}: ${label}`} accessibilityState={{ expanded: open, disabled: !!disabled }} disabled={disabled} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onPress={() => { setMonth(chosen || new Date()); setOpen(true); }} style={({ pressed }) => ({ minHeight: 56, borderRadius: 12, borderWidth: 1, borderColor: focused || open ? p.accent : p.inputBorder, backgroundColor: pressed ? p.soft : p.surface, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, outlineWidth: 0, opacity: disabled ? 0.5 : 1 })}>
      <CalendarBlankIcon size={22} color={p.accent} /><Copy style={{ flex: 1, fontSize: 16, textTransform: 'capitalize', color: chosen ? p.text : p.muted }}>{label}</Copy><CaretDownIcon size={17} color={p.muted} />
    </Pressable>
    <Modal visible={open} transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={close}>
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar calendario" onPress={close} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)' }} />
        <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 440, maxHeight: '90%', backgroundColor: p.surface, borderRadius: 20, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Copy accessibilityRole="header" style={{ flex: 1, fontSize: 20, fontWeight: '600' }}>{required ? 'Elegir fecha' : '¿Cuándo quedáis?'}</Copy><IconAction label="Cerrar selector de fecha" onPress={close}><XIcon size={22} color={p.muted} /></IconAction></View>
          <ScrollView><CalendarHeading month={month} onChange={setMonth} />
            <View style={{ flexDirection: 'row' }}>{['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, index) => <Copy key={index} muted style={{ width: '14.2857%', textAlign: 'center', fontSize: 13, paddingVertical: 8 }}>{day}</Copy>)}</View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{calendarDays(month.getFullYear(), month.getMonth()).map((date, index) => <View key={date || index} style={{ width: '14.2857%', padding: 1 }}>{date && <Pressable accessibilityRole="button" accessibilityLabel={`Elegir ${new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { dateStyle: 'full' })}`} accessibilityState={{ selected: date === value }} onPress={() => choose(date)} style={({ pressed }) => ({ minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: date === value ? p.accent : pressed ? p.soft : 'transparent', borderWidth: 1, borderColor: date === localDate(new Date()) && date !== value ? p.accent : 'transparent' })}><Copy style={{ color: date === value ? p.onAccent : p.text, fontWeight: date === value ? '700' : '400' }}>{Number(date.slice(-2))}</Copy></Pressable>}</View>)}</View>
            {!required && <TextAction onPress={() => choose('')}>Todavía sin fecha</TextAction>}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  </View>;
}
