import { router, useFocusEffect } from 'expo-router';
import { ProfileAvatar } from './profile-avatar';
import { HubMark } from './hub-mark';
import { useCallback, useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { ActivityIndicator, Alert, Animated, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, type TextInputProps, type TextProps, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeftIcon, CheckIcon, BookOpenIcon, FilmSlateIcon, LockSimpleIcon, MapPinIcon, PlusIcon, ShoppingBagIcon, TelevisionIcon, UserCircleIcon } from './hub-icons';
import { useHub, usePalette } from '@/features/hub/provider';
import { categories, recommendationCategories, type Category } from '@/features/hub/model';
import { isLoaded } from 'expo-font';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { hubType, hubSpace, hubRadius, hubWidths } from '@/constants/hub-design';

export function Copy({ style, muted, ...props }: TextProps & { muted?: boolean }) {
  const p = usePalette();
  const flattened = StyleSheet.flatten(style);
  const weight = flattened?.fontWeight === 'bold' ? 700 : Number(flattened?.fontWeight || 400);
  const heading = props.accessibilityRole === 'header' || ((flattened?.fontSize || 16) >= 18 && weight >= 600);
  const family = heading ? (weight >= 700 ? 'Manrope-Bold' : 'Manrope-SemiBold') : weight >= 700 ? 'SourceSans3-Bold' : weight >= 500 ? 'SourceSans3-SemiBold' : 'SourceSans3-Regular';
  return <Text {...props} style={[s.copy, { color: muted ? p.muted : p.text }, style, isLoaded(family) && { fontFamily: family, fontWeight: 'normal' }]} />;
}
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function useButtonFeedback(disabled = false) {
  const reduced = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  useEffect(() => { scale.stopAnimation(); scale.setValue(1); return () => scale.stopAnimation(); }, [scale, reduced, disabled]);
  const animate = (toValue: number) => {
    if (reduced || disabled) return;
    scale.stopAnimation();
    Animated.timing(scale, { toValue, duration: toValue === 1 ? 140 : 80, useNativeDriver: true }).start();
  };
  return { scale, pressed, focused, hovered, handlers: {
    onPressIn: () => { setPressed(true); animate(0.97); }, onPressOut: () => { setPressed(false); animate(1); },
    onFocus: () => setFocused(true), onBlur: () => setFocused(false),
    onHoverIn: () => setHovered(true), onHoverOut: () => setHovered(false),
  } };
}

export function Action({ children, onPress, secondary, disabled, icon, label, style }: { children?: ReactNode; onPress: () => void; secondary?: boolean; disabled?: boolean; icon?: ReactNode; label?: string; style?: StyleProp<ViewStyle> }) {
  const p = usePalette();
  const feedback = useButtonFeedback(disabled);
  return <AnimatedPressable {...feedback.handlers} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} style={[s.action, { backgroundColor: secondary ? p.soft : p.accent, borderWidth: 1, borderColor: feedback.focused ? p.text : secondary && feedback.hovered ? p.accent : 'transparent', transform: [{ scale: feedback.scale }], opacity: disabled ? 0.45 : feedback.pressed ? 0.85 : feedback.hovered ? 0.9 : 1 }, style]}>{icon}<Copy style={{ color: secondary ? p.accent : p.onAccent, fontSize: 14, lineHeight: 20, fontWeight: '600', flexShrink: 1 }}>{children}</Copy></AnimatedPressable>;
}
export function SaveAction({ onPress, busy = false, disabled = false, children = 'Guardar cambios' }: { onPress: () => void; busy?: boolean; disabled?: boolean; children?: ReactNode }) {
  const p = usePalette();
  const feedback = useButtonFeedback(busy || disabled);
  return <AnimatedPressable {...feedback.handlers} accessibilityRole="button" accessibilityState={{ disabled: busy || disabled, busy }} disabled={busy || disabled} onPress={onPress} style={{ alignSelf: 'center', minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 18, borderRadius: 24, backgroundColor: feedback.pressed ? p.surface : p.sage, borderWidth: 1, borderColor: feedback.focused ? p.sageText : p.line, opacity: busy || disabled ? 0.45 : feedback.pressed ? 0.65 : 1, transform: [{ scale: feedback.scale }] }}>
    {busy ? <ActivityIndicator size="small" color={p.sageText} /> : <CheckIcon size={15} color={p.sageText} />}
    <Copy accessibilityLiveRegion="polite" style={{ color: p.sageText, fontSize: 13, lineHeight: 18, fontWeight: '600', flexShrink: 1 }}>{busy ? 'Guardando\u2026' : children}</Copy>
  </AnimatedPressable>;
}

export function TextAction({ children, onPress, disabled, icon, danger }: { children: ReactNode; onPress: () => void; disabled?: boolean; icon?: ReactNode; danger?: boolean }) {
  const p = usePalette();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => ({ minHeight: 48, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderRadius: 8, backgroundColor: pressed ? p.soft : 'transparent', opacity: disabled ? 0.4 : pressed ? 0.8 : 1 })}>{icon}<Copy style={{ fontSize: 14, lineHeight: 20, fontWeight: '600', color: danger ? p.danger : p.accent, flexShrink: 1 }}>{children}</Copy></Pressable>;
}
export function ChoiceTabs<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  const p = usePalette();
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', borderBottomWidth: 1, borderBottomColor: p.line, columnGap: 20 }}>{options.map((option) => <Pressable key={option.value} accessibilityRole="tab" accessibilityState={{ selected: value === option.value }} onPress={() => onChange(option.value)} style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 2, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: value === option.value ? p.accent : 'transparent', opacity: pressed ? 0.6 : 1 })}><Copy style={{ fontSize: 14, lineHeight: 22, fontWeight: value === option.value ? '700' : '400', color: value === option.value ? p.accent : p.muted }}>{option.label}</Copy></Pressable>)}</View>;
}
export function IconAction({ label, onPress, children, disabled = false, expanded }: { label: string; onPress: () => void; children: ReactNode; disabled?: boolean; expanded?: boolean }) {
  const p = usePalette();
  const feedback = useButtonFeedback(disabled);
  return <AnimatedPressable {...feedback.handlers} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, expanded }} disabled={disabled} hitSlop={4} onPress={onPress} style={[s.iconAction, { borderRadius: 12, borderWidth: 1, borderColor: feedback.focused ? p.accent : 'transparent', backgroundColor: feedback.pressed || feedback.hovered ? p.soft : 'transparent', transform: [{ scale: feedback.scale }], opacity: disabled ? 0.45 : feedback.pressed ? 0.8 : 1 }]}>{children}</AnimatedPressable>;
}
export function Screen({ title, subtitle, children, back, action, avatar = false, scrollEnabled = true, wide = false, renderList }: { title: string; subtitle?: string; children?: ReactNode; back?: boolean; action?: ReactNode; avatar?: boolean; scrollEnabled?: boolean; wide?: boolean; renderList?: (header: ReactNode) => ReactNode }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const revealFocusedField = useCallback(() => {
    if (Platform.OS === 'web' || !Keyboard.isVisible()) return;
    const input = TextInput.State.currentlyFocusedInput();
    const scroll = scrollRef.current;
    if (!input || !scroll) return;
    scroll.getNativeScrollRef()?.measureInWindow((_x, top, _width, height) => {
      input.measureInWindow((_inputX, inputTop, _inputWidth, inputHeight) => {
        if (TextInput.State.currentlyFocusedInput() !== input) return;
        const hidden = inputTop + inputHeight + 16 - (top + height);
        if (hidden > 0) scroll.scrollTo({ y: scrollY.current + hidden, animated: true });
      });
    });
  }, []);
  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', revealFocusedField);
    return () => subscription.remove();
  }, [revealFocusedField]);
  const { loading, error, warning, retry, needsImport, importing, importProgress, importData, skipImport, refresh } = useHub();
  useFocusEffect(useCallback(() => { if (!loading && !needsImport && !importing) void refresh().catch(() => {}); }, [refresh, loading, needsImport, importing]));
  const { width } = useWindowDimensions();
  const heading = !back ? <View style={s.heading}>{avatar && <IconAction label="Abrir mi cuenta" onPress={() => router.push('/settings')}><ProfileAvatar /></IconAction>}<View style={s.fill}><Copy accessibilityRole="header" style={[s.title, avatar && { fontSize: 27, lineHeight: 33 }]}>{title}</Copy>{subtitle && <Copy muted style={s.subtitle}>{subtitle}</Copy>}</View>{action}</View> : subtitle && <Copy muted style={{ fontSize: 15, lineHeight: 22 }}>{subtitle}</Copy>;
  return <SafeAreaView edges={['top', 'left', 'right']} style={[s.fill, { backgroundColor: p.background }]}>
    {!(wide && width >= 900) && <View style={s.topbar}>
      {back ? <IconAction label="Volver" onPress={() => router.back()}><ArrowLeftIcon color={p.text} size={24} /></IconAction> : <View style={s.brand}><HubMark size={32} /><Copy style={s.brandName}>my hub<Copy style={{ color: p.accent }}>.</Copy></Copy></View>}
      {back ? <Copy accessibilityRole="header" style={s.navTitle}>{title}</Copy> : <View style={s.fill} />}
      {back && action}
      {!back && <IconAction label="Abrir mi cuenta" onPress={() => router.push('/settings')}><UserCircleIcon size={28} weight="duotone" color={p.accent} /></IconAction>}
    </View>}
    <KeyboardAvoidingView style={s.fill} keyboardVerticalOffset={insets.top} behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}>
      {renderList && !loading && !error && !needsImport ? renderList(<View style={{ gap: hubSpace.large }}>{heading}{warning && <Copy accessibilityLiveRegion="polite" muted style={hubType.metadata}>{warning}</Copy>}</View>) : <ScrollView ref={scrollRef} onLayout={revealFocusedField} onFocus={revealFocusedField} onScroll={(event) => { scrollY.current = event.nativeEvent.contentOffset.y; }} scrollEventThrottle={16} scrollEnabled={scrollEnabled} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, wide && { maxWidth: hubWidths.content }]} showsVerticalScrollIndicator={false}>
        {heading}
        {loading ? <ActivityIndicator color={p.accent} accessibilityLabel="Cargando tus datos" /> : error ? <View style={s.stack}><Copy>{error}</Copy><Action onPress={retry}>Volver a intentar</Action></View> : needsImport ? <View style={{ gap: 18 }}>
          <Copy accessibilityRole="header" style={hubType.sectionTitle}>Tus datos, ahora en tu cuenta</Copy>
          <Copy muted>Hemos encontrado datos guardados en este dispositivo. Impórtalos a la cuenta con la que has entrado para recuperarlos también en otros dispositivos.</Copy>
          <Copy muted style={hubType.metadata}>Se conservará la copia original y tus descubrimientos seguirán privados.</Copy>
          {!!importProgress && <Copy accessibilityLiveRegion="polite">{importProgress}</Copy>}
          <SaveAction busy={importing} onPress={() => { void importData().catch((failure) => Alert.alert('Importación pendiente', failure instanceof Error ? failure.message : 'Vuelve a intentarlo.')); }}>Importar mis datos</SaveAction>
          <TextAction disabled={importing} onPress={() => { void skipImport().catch(showError); }}>Empezar sin importar</TextAction>
        </View> : <>{warning && <View style={{ gap: 4 }}><Copy accessibilityLiveRegion="polite" muted style={hubType.metadata}>{warning}</Copy><TextAction onPress={retry}>Actualizar</TextAction></View>}{children}</>}
      </ScrollView>}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
export function Section({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return <View style={s.section}><Copy accessibilityRole="header" style={s.sectionTitle}>{title}</Copy>{trailing}</View>;
}
export function Surface({ children, tone }: { children: ReactNode; tone?: 'gift' }) {
  const p = usePalette();
  return <View style={[s.surface, { backgroundColor: tone === 'gift' ? p.peach : p.surface }]}>{children}</View>;
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
  return <Icon size={size} color={category === 'product' ? p.peachText : category === 'place' ? p.sageText : p.muted} weight="duotone" />;
}
export function Chips({ value, onChange, all = false, recommendations = false }: { value: Category | 'all'; onChange: (value: Category | 'all') => void; all?: boolean; recommendations?: boolean }) {
  const p = usePalette();
  const available = recommendations ? recommendationCategories : categories;
  const options = all ? [{ value: 'all' as const, label: 'Todo' }, ...available] : available;
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>{options.map((option) => <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: value === option.value }} onPress={() => onChange(option.value)} style={({ pressed }) => ({ minHeight: 48, justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}><View style={[s.chip, { backgroundColor: value === option.value ? p.accent : p.surface, borderColor: value === option.value ? p.accent : p.line }]}><Copy style={{ color: value === option.value ? p.onAccent : p.muted, fontSize: 13, lineHeight: 18, fontWeight: '600' }}>{option.label}</Copy></View></Pressable>)}</ScrollView>;
}
export function Field({ label, error, trailing, inputRef, ...props }: TextInputProps & { label: string; error?: string; trailing?: ReactNode; inputRef?: Ref<TextInput> }) {
  const p = usePalette();
  const { fontScale } = useWindowDimensions();
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(props.defaultValue || '');
  const floating = focused || !!(props.value ?? text);
  return <View style={{ gap: 6 }}>
    <View>
      <TextInput ref={inputRef} accessibilityLabel={label} accessibilityHint={props.placeholder} placeholderTextColor={p.muted} selectionColor={p.accent} underlineColorAndroid="transparent" {...props}
        placeholder={floating ? props.placeholder : ''}
        onFocus={event => { setFocused(true); props.onFocus?.(event); }}
        onBlur={event => { setFocused(false); props.onBlur?.(event); }}
        onChangeText={value => { setText(value); props.onChangeText?.(value); }}
        style={[s.input, props.style, {
          fontFamily: isLoaded('SourceSans3-Regular') ? 'SourceSans3-Regular' : undefined,
          backgroundColor: p.soft, color: p.text, borderColor: error ? p.danger : focused ? p.accent : p.inputBorder,
          borderWidth: 0, borderBottomWidth: focused || error ? 2 : 0.5,
          borderBottomLeftRadius: 4, borderBottomRightRadius: 4,
          minHeight: (props.multiline ? 44 : 12) + 40 * fontScale,
          lineHeight: 24, paddingTop: floating ? 8 + 14 * fontScale : 14, paddingBottom: floating ? 6 : 14, paddingRight: trailing ? 56 : 14,
        }, props.multiline && { textAlignVertical: 'top' }]} />
      <View pointerEvents="none" style={{ position: 'absolute', left: 14, right: trailing ? 56 : 14, top: floating ? 5 : 14 }}>
        <Copy accessible={false} numberOfLines={1} style={{ alignSelf: 'flex-start', maxWidth: '100%', backgroundColor: 'transparent', fontSize: floating ? 11 : 16, lineHeight: floating ? 14 : 24, fontWeight: floating ? '600' : '400', color: error ? p.danger : focused ? p.accent : p.muted }}>{label}</Copy>
      </View>
      {trailing && <View style={{ position: 'absolute', right: 4, top: 0, bottom: 0, justifyContent: 'center' }}>{trailing}</View>}
    </View>
    {error && <Copy accessibilityRole="alert" style={{ color: p.danger, fontSize: 13 }}>{error}</Copy>}
  </View>;
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
  fieldLabel: { fontSize: 14, fontWeight: '600' }, input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, minHeight: 52, fontSize: 16 },
});
