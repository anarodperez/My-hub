import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated } from 'react-native';
import { BookmarkSimpleIcon } from './hub-icons';
import { Copy, IconAction, showError } from './hub-ui';
import { toggleSaved } from '@/features/hub/model';
import { useHub, usePalette } from '@/features/hub/provider';

export function SaveRecommendation({ id }: { id: string }) {
  const { state, update } = useHub();
  const p = usePalette();
  const saved = state.saved.some((item) => item.recommendationId === id);
  const scale = useRef(new Animated.Value(1)).current;
  const [busy, setBusy] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let mounted = true;
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (mounted) setReduceMotion(value); }).catch(() => {});
    return () => { mounted = false; listener.remove(); scale.stopAnimation(); };
  }, [scale]);
  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await update((previous) => toggleSaved(previous, id));
      if (!reduceMotion) Animated.sequence([
        Animated.timing(scale, { toValue: 1.2, duration: 110, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }),
      ]).start();
    } catch { showError(); } finally { setBusy(false); }
  };
  return <Animated.View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
    <IconAction label={saved ? 'Quitar de mi wishlist' : 'Guardar en mi wishlist'} onPress={() => { void save(); }}><Animated.View style={{ transform: [{ scale }] }}><BookmarkSimpleIcon size={22} color={p.accent} weight={saved ? 'fill' : 'regular'} /></Animated.View></IconAction>
    <Copy accessibilityLiveRegion="polite" muted style={{ fontSize: 12 }}>{saved ? 'Guardado' : 'Guardar'}</Copy>
  </Animated.View>;
}
