import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { CaretDownIcon } from 'phosphor-react-native/src/icons/CaretDown';
import { CaretLeftIcon, CaretRightIcon } from './hub-icons';
import { Copy, IconAction } from './hub-ui';
import { usePalette } from '@/features/hub/provider';

const months = Array.from({ length: 12 }, (_, index) => new Date(2026, index, 1).toLocaleDateString('es-ES', { month: 'long' }));

export function CalendarHeading({ month, onChange }: { month: Date; onChange: (next: Date) => void }) {
  const p = usePalette();
  const [open, setOpen] = useState(false);
  const [choosingYear, setChoosingYear] = useState(false);
  const [year, setYear] = useState(month.getFullYear());
  const [yearStart, setYearStart] = useState(month.getFullYear() - 5);
  const toggle = () => {
    if (!open) { setYear(month.getFullYear()); setYearStart(month.getFullYear() - 5); setChoosingYear(false); }
    setOpen(!open);
  };
  return <View style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <IconAction label="Mes anterior" onPress={() => { setOpen(false); onChange(new Date(month.getFullYear(), month.getMonth() - 1, 1)); }}><CaretLeftIcon size={20} color={p.text} /></IconAction>
      <Pressable accessibilityRole="button" accessibilityLabel="Elegir mes y año" accessibilityState={{ expanded: open }} onPress={toggle} style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 1, paddingHorizontal: 2 }}>
        <Copy style={{ fontWeight: '700', fontSize: 17, lineHeight: 23, textAlign: 'center', textTransform: 'capitalize' }}>{months[month.getMonth()]}</Copy>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Copy muted style={{ fontSize: 12, lineHeight: 18 }}>{month.getFullYear()}</Copy><CaretDownIcon size={12} color={p.muted} weight="bold" style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} /></View>
      </Pressable>
      <IconAction label="Mes siguiente" onPress={() => { setOpen(false); onChange(new Date(month.getFullYear(), month.getMonth() + 1, 1)); }}><CaretRightIcon size={20} color={p.text} /></IconAction>
    </View>
    {open && <View style={{ gap: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: p.line }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <IconAction label={choosingYear ? 'Años anteriores' : 'Año anterior'} onPress={() => choosingYear ? setYearStart(yearStart - 12) : setYear(year - 1)}><CaretLeftIcon size={17} color={p.accent} /></IconAction>
        <Pressable accessibilityRole="button" accessibilityLabel={choosingYear ? 'Volver a elegir mes' : 'Elegir año'} onPress={() => { setYearStart(year - 5); setChoosingYear(!choosingYear); }} style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><Copy style={{ fontSize: 15, fontWeight: '600', color: p.accent }}>{choosingYear ? `${yearStart} – ${yearStart + 11}` : year}</Copy></Pressable>
        <IconAction label={choosingYear ? 'Años siguientes' : 'Año siguiente'} onPress={() => choosingYear ? setYearStart(yearStart + 12) : setYear(year + 1)}><CaretRightIcon size={17} color={p.accent} /></IconAction>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{Array.from({ length: 12 }, (_, index) => {
        const value = choosingYear ? yearStart + index : index;
        const selected = choosingYear ? year === value : month.getMonth() === index && month.getFullYear() === year;
        return <View key={value} style={{ width: '33.3333%', padding: 2 }}><Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={choosingYear ? String(value) : `${months[index]} de ${year}`} onPress={() => {
          if (choosingYear) { setYear(value); setChoosingYear(false); }
          else { onChange(new Date(year, index, 1)); setOpen(false); }
        }} style={({ pressed }) => ({ minHeight: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? p.soft : 'transparent', opacity: pressed ? 0.6 : 1 })}><Copy style={{ fontSize: 12, lineHeight: 18, textTransform: 'capitalize', color: selected ? p.accent : p.text, textAlign: 'center', fontWeight: selected ? '600' : '400' }}>{choosingYear ? value : months[index]}</Copy></Pressable></View>;
      })}</View>
    </View>}
  </View>;
}
