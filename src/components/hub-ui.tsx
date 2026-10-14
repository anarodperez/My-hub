import { router } from 'expo-router';
import { ProfileAvatar } from './profile-avatar';
import { type ReactNode } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, type TextInputProps, type TextProps, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeftIcon, BookOpenIcon, FilmSlateIcon, LockSimpleIcon, MapPinIcon, PlusIcon, ShoppingBagIcon, TelevisionIcon, UserCircleIcon } from './hub-icons';
import { useHub, usePalette } from '@/features/hub/provider';
import { categories, recommendationCategories, type Category } from '@/features/hub/model';
import { isLoaded } from 'expo-font';
import { hubType, hubSpace, hubRadius, hubWidths } from '@/constants/hub-design';

export function Copy({ style, muted, ...props }: TextProps & { muted?: boolean }) {
  const p = usePalette();
  const flattened = StyleSheet.flatten(style);
  const weight = flattened?.fontWeight === 'bold' ? 700 : Number(flattened?.fontWeight || 400);
  const heading = props.accessibilityRole === 'header' || ((flattened?.fontSize || 16) >= 18 && weight >= 600);
  const family = heading ? (weight >= 700 ? 'Manrope-Bold' : 'Manrope-SemiBold') : weight >= 700 ? 'SourceSans3-Bold' : weight >= 500 ? 'SourceSans3-SemiBold' : 'SourceSans3-Regular';
  return <Text {...props} style={[s.copy, { color: muted ? p.muted : p.text }, style, isLoaded(family) && { fontFamily: family, fontWeight: 'normal' }]} />;
}
export function Action({ children, onPress, secondary, disabled, icon, label, style }: { children?: ReactNode; onPress: () => void; secondary?: boolean; disabled?: boolean; icon?: ReactNode; label?: string; style?: StyleProp<ViewStyle> }) {
  const p = usePalette();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.action, { backgroundColor: secondary ? p.soft : p.accent, opacity: disabled ? 0.45 : pressed ? 0.7 : 1 }, style]}>{icon}<Copy style={{ color: secondary ? p.accent : p.onAccent, fontSize: 14, lineHeight: 20, fontWeight: '600', flexShrink: 1 }}>{children}</Copy></Pressable>;
}
export function TextAction({ children, onPress, disabled, icon, danger }: { children: ReactNode; onPress: () => void; disabled?: boolean; icon?: ReactNode; danger?: boolean }) {
  const p = usePalette();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => ({ minHeight: 48, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, opacity: disabled ? 0.4 : pressed ? 0.6 : 1 })}>{icon}<Copy style={{ fontSize: 14, lineHeight: 20, fontWeight: '600', color: danger ? p.danger : p.accent, flexShrink: 1 }}>{children}</Copy></Pressable>;
}
export function ChoiceTabs<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  const p = usePalette();
  return <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: p.line, gap: 24 }}>{options.map((option) => <Pressable key={option.value} accessibilityRole="tab" accessibilityState={{ selected: value === option.value }} onPress={() => onChange(option.value)} style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 2, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: value === option.value ? p.accent : 'transparent', opacity: pressed ? 0.6 : 1 })}><Copy style={{ fontSize: 14, lineHeight: 22, fontWeight: value === option.value ? '700' : '400', color: value === option.value ? p.accent : p.muted }}>{option.label}</Copy></Pressable>)}</View>;
}
export function IconAction({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={4} onPress={onPress} style={({ pressed }) => [s.iconAction, { opacity: pressed ? 0.5 : 1 }]}>{children}</Pressable>;
}
export function Screen({ title, subtitle, children, back, action, avatar = false, scrollEnabled = true, wide = false }: { title: string; subtitle?: string; children: ReactNode; back?: boolean; action?: ReactNode; avatar?: boolean; scrollEnabled?: boolean; wide?: boolean }) {
  const p = usePalette();
  const { loading, error, retry } = useHub();
  const { width } = useWindowDimensions();
  return <SafeAreaView edges={['top', 'left', 'right']} style={[s.fill, { backgroundColor: p.background }]}>
    {!(wide && width >= 900) && <View style={s.topbar}>
      {back ? <IconAction label="Volver" onPress={() => router.back()}><ArrowLeftIcon color={p.text} size={24} /></IconAction> : <View style={s.brand}><BookOpenIcon color={p.accent} size={23} weight="duotone" /><Copy style={s.brandName}>my hub<Copy style={{ color: p.accent }}>.</Copy></Copy></View>}
      {back ? <Copy style={s.navTitle}>{title}</Copy> : <Copy muted style={s.localLabel}>Tu espacio cultural</Copy>}
      {!back && <IconAction label="Abrir mi perfil" onPress={() => router.push('/settings')}><UserCircleIcon size={28} weight="duotone" color={p.accent} /></IconAction>}
    </View>}
    <KeyboardAvoidingView style={s.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView scrollEnabled={scrollEnabled} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, wide && { maxWidth: hubWidths.content }]} showsVerticalScrollIndicator={false}>
        {!back && <View style={s.heading}>{avatar && <IconAction label="Abrir mi perfil" onPress={() => router.push('/settings')}><ProfileAvatar /></IconAction>}<View style={s.fill}><Copy accessibilityRole="header" style={[s.title, avatar && { fontSize: 27, lineHeight: 33 }]}>{title}</Copy>{subtitle && <Copy muted style={s.subtitle}>{subtitle}</Copy>}</View>{action}</View>}
        {loading ? <ActivityIndicator color={p.accent} accessibilityLabel="Cargando tus datos" /> : error ? <View style={s.stack}><Copy>{error}</Copy><Action onPress={retry}>Volver a intentar</Action></View> : children}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
export function Section({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return <View style={s.section}><Copy accessibilityRole="header" style={s.sectionTitle}>{title}</Copy>{trailing}</View>;
}
export function Surface({ children }: { children: ReactNode }) {
  const p = usePalette();
  return <View style={[s.surface, { backgroundColor: p.surface }]}>{children}</View>;
}
export function Privacy({ children = 'Solo tú puedes verlo' }: { children?: ReactNode }) {
  const p = usePalette();
  return <View style={s.inline}><LockSimpleIcon size={14} color={p.muted} /><Copy muted style={s.small}>{children}</Copy></View>;
}
export function Empty({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  const p = usePalette();
  return <View style={s.empty}><View style={[s.emptyIcon, { backgroundColor: p.soft }]}>{icon}</View><Copy style={s.emptyTitle}>{title}</Copy>{!!description && <Copy muted style={s.emptyText}>{description}</Copy>}{action && <View style={{ alignSelf: 'center' }}>{action}</View>}</View>;
}
export function CategoryIcon({ category, size = 24 }: { category: Category; size?: number }) {
  const p = usePalette();
  const Icon = { book: BookOpenIcon, movie: FilmSlateIcon, series: TelevisionIcon, product: ShoppingBagIcon, place: MapPinIcon }[category];
  return <Icon size={size} color={p.accent} weight="duotone" />;
}
export function Chips({ value, onChange, all = false, recommendations = false }: { value: Category | 'all'; onChange: (value: Category | 'all') => void; all?: boolean; recommendations?: boolean }) {
  const p = usePalette();
  const available = recommendations ? recommendationCategories : categories;
  const options = all ? [{ value: 'all' as const, label: 'Todo' }, ...available] : available;
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>{options.map((option) => <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: value === option.value }} onPress={() => onChange(option.value)} style={({ pressed }) => ({ minHeight: 48, justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}><View style={[s.chip, { backgroundColor: value === option.value ? p.soft : p.surface, borderColor: value === option.value ? p.accent : p.line }]}><Copy style={{ color: value === option.value ? p.accent : p.muted, fontSize: 13, lineHeight: 18, fontWeight: '600' }}>{option.label}</Copy></View></Pressable>)}</ScrollView>;
}
export function Field({ label, error, trailing, ...props }: TextInputProps & { label: string; error?: string; trailing?: ReactNode }) {
  const p = usePalette();
  return <View style={{ gap: 8 }}><Copy style={s.fieldLabel}>{label}</Copy><View><TextInput accessibilityLabel={label} placeholderTextColor={p.muted} selectionColor={p.accent} {...props} style={[s.input, { fontFamily: isLoaded('SourceSans3-Regular') ? 'SourceSans3-Regular' : undefined, backgroundColor: p.surface, color: p.text, borderColor: error ? p.danger : p.line }, props.multiline && { minHeight: 108, textAlignVertical: 'top' }, trailing ? { paddingRight: 56 } : undefined, props.style]} />{trailing && <View style={{ position: 'absolute', right: 4, top: 0, bottom: 0, justifyContent: 'center' }}>{trailing}</View>}</View>{error && <Copy accessibilityRole="alert" style={{ color: p.danger, fontSize: 13 }}>{error}</Copy>}</View>;
}
export function AddAction({ onPress, label = 'Añadir' }: { onPress: () => void; label?: string }) {
  const p = usePalette();
  return <IconAction label={label === 'Evento' ? 'Añadir evento' : label} onPress={onPress}><View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: p.accent, alignItems: 'center', justifyContent: 'center' }}><PlusIcon size={20} color={p.onAccent} /></View></IconAction>;
}
export function showError() { Alert.alert('No se ha guardado', 'Tus cambios siguen aquí. Comprueba el almacenamiento y vuelve a intentarlo.'); }
export const s = StyleSheet.create({
  fill: { flex: 1 }, copy: hubType.body,
  topbar: { minHeight: 68, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 8 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 }, brandName: { fontSize: 23, lineHeight: 32, paddingBottom: 2, fontWeight: '800', letterSpacing: -0.8 },
  localLabel: { flex: 1, textAlign: 'right', fontSize: 11, lineHeight: 15 }, navTitle: { fontSize: 18, fontWeight: '600', flex: 1 },
  content: { paddingHorizontal: hubSpace.large, paddingTop: 20, paddingBottom: 40, gap: hubSpace.large, maxWidth: hubWidths.form, width: '100%', alignSelf: 'center' },
  heading: { flexDirection: 'row', gap: 12, alignItems: 'center' }, title: hubType.screenTitle,
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 7 },
  action: { alignSelf: 'flex-start', minHeight: 48, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  iconAction: { minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, sectionTitle: { flexShrink: 1, ...hubType.sectionTitle },
  surface: { padding: 20, borderRadius: hubRadius.surface, gap: hubSpace.medium }, inline: { flexDirection: 'row', alignItems: 'center', gap: 7 }, small: hubType.metadata, stack: { gap: hubSpace.medium },
  empty: { alignItems: 'center', gap: 14, paddingVertical: 22, paddingHorizontal: 12 }, emptyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 20, lineHeight: 27, fontWeight: '600', textAlign: 'center' }, emptyText: { fontSize: 14, lineHeight: 22, textAlign: 'center', maxWidth: 300 },
  chips: { gap: 8 }, chip: { borderWidth: 1, minHeight: 34, paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 17 },
  fieldLabel: { fontSize: 14, fontWeight: '600' }, input: { borderWidth: 1, borderRadius: 12, padding: 14, minHeight: 52, fontSize: 16 },
});
