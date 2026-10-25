import { useIsFocused } from '@react-navigation/native';
import { SparkleIcon } from 'phosphor-react-native/src/icons/Sparkle';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { DiceFiveIcon } from 'phosphor-react-native/src/icons/DiceFive';
import { CategoryIcon, Copy, IconAction, TextAction } from './hub-ui';
import { XIcon } from './hub-icons';
import type { Recommendation, Wish } from '@/features/hub/model';
import { usePalette } from '@/features/hub/provider';
import { pickSurprise } from '@/features/hub/wishlist';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

export function WishlistSurprise({ wishes, recommendations }: { wishes: Wish[]; recommendations: Recommendation[] }) {
  const p = usePalette();
  const reduced = useReducedMotion();
  const visible = useIsFocused();
  const [idle] = useState(() => new Animated.Value(0));
  const [failedCover, setFailedCover] = useState('');
  const [focused, setFocused] = useState(false);
  const [chosen, setChosen] = useState('');
  const [reveal] = useState(() => new Animated.Value(1));
  const [draw, setDraw] = useState(0);
  const options = [...wishes.map((item) => ({ key: 'wish-' + item.id, item, wish: true })), ...recommendations.map((item) => ({ key: 'saved-' + item.id, item, wish: false }))];
  const result = options.find((option) => option.key === chosen);
  useEffect(() => {
    if (reduced || !draw) { reveal.setValue(1); return; }
    reveal.setValue(0);
    const animation = Animated.timing(reveal, { toValue: 1, duration: 240, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [draw, reduced, reveal]);
  const hasOptions = options.length > 0;
  useEffect(() => {
    if (reduced || !visible || !hasOptions) { idle.setValue(0); return; }
    const wobble = Animated.loop(Animated.sequence([
      Animated.delay(1600),
      Animated.timing(idle, { toValue: 1, duration: 180, useNativeDriver: true, isInteraction: false }),
      Animated.timing(idle, { toValue: -1, duration: 240, useNativeDriver: true, isInteraction: false }),
      Animated.timing(idle, { toValue: 0, duration: 180, useNativeDriver: true, isInteraction: false }),
    ]));
    wobble.start();
    return () => { wobble.stop(); idle.setValue(0); };
  }, [idle, reduced, visible, hasOptions]);
  if (!options.length) return null;
  const choose = () => { const next = pickSurprise(options, chosen); if (next) { setChosen(next.key); setDraw((value) => value + 1); } };
  const open = () => { if (result) router.push(result.wish ? { pathname: '/wish', params: { id: result.item.id } } : { pathname: '/compose', params: { kind: 'recommendation', id: result.item.id } }); };
  return <View style={{ gap: 12 }}>
    <Pressable accessibilityRole="button" onPress={choose} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={({ pressed }) => ({ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, padding: 6, paddingRight: 10, borderRadius: 12, borderWidth: 1, borderColor: focused ? p.accent : 'transparent', backgroundColor: pressed ? p.soft : 'transparent' })}>
      <Animated.View style={{ transform: [{ rotate: idle.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-9deg', '0deg', '9deg'] }) }, { translateY: idle.interpolate({ inputRange: [-1, 0, 1], outputRange: [-1, 0, -3] }) }] }}><Animated.View style={{ transform: [{ rotate: reveal.interpolate({ inputRange: [0, 1], outputRange: ['-160deg', '-8deg'] }) }, { translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [-3, 0] }) }] }}><DiceFiveIcon size={24} color={p.accent} weight="duotone" /></Animated.View><Animated.View pointerEvents="none" style={{ position: 'absolute', right: -2, top: 0, opacity: reveal.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] }), transform: [{ scale: reveal.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1.3, 1] }) }] }}><SparkleIcon size={10} color={p.accent} weight="fill" /></Animated.View></Animated.View>
      <Copy style={{ fontSize: 14, lineHeight: 20, fontWeight: '600', color: p.accent }}>{result && options.length > 1 ? 'Otra sorpresa' : 'Sorpréndeme'}</Copy>
    </Pressable>
    {result && <Animated.View style={{ gap: 8, backgroundColor: p.soft, borderRadius: 16, padding: 16, opacity: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }), transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={{ width: 56, height: 72, borderRadius: 8, overflow: 'hidden', backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center' }}>{result.item.coverUrl && result.item.coverUrl !== failedCover ? <Image source={result.item.coverUrl} contentFit="cover" style={{ width: 56, height: 72 }} onError={() => setFailedCover(result.item.coverUrl)} /> : <CategoryIcon category={result.item.category} size={24} />}</View><Copy accessibilityLiveRegion="polite" style={{ flex: 1, fontSize: 18, lineHeight: 25, fontWeight: '600' }}>{result.item.title}</Copy></View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <TextAction onPress={open}>Ver deseo</TextAction>
        <IconAction label="Cerrar sorpresa" onPress={() => setChosen('')}><XIcon size={20} color={p.muted} /></IconAction>
      </View>
    </Animated.View>}
  </View>;
}
