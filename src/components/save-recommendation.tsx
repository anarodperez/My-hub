import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { BookmarkSimpleIcon } from './hub-icons';
import { Copy, IconAction, showError } from './hub-ui';
import { toggleSaved } from '@/features/hub/model';
import { useHub, usePalette } from '@/features/hub/provider';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

export function SaveRecommendation({ id }: { id: string }) {
  const { state, update } = useHub();
  const p = usePalette();
  const saved = state.saved.some((item) => item.recommendationId === id);
  const scale = useRef(new Animated.Value(1)).current;
  const [busy, setBusy] = useState(false);
  const reduceMotion = useReducedMotion();
  const motionPreference = useRef(reduceMotion);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    motionPreference.current = reduceMotion;
    if (reduceMotion) { scale.stopAnimation(); scale.setValue(1); }
    return () => scale.stopAnimation();
  }, [scale, reduceMotion]);
  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await update((previous) => toggleSaved(previous, id));
      if (!mounted.current) return;
      if (!motionPreference.current) Animated.sequence([
        Animated.timing(scale, { toValue: 1.15, duration: 80, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();
    } catch { if (mounted.current) showError(); } finally { if (mounted.current) setBusy(false); }
  };
  return <Animated.View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
    <IconAction label={saved ? 'Quitar de mi wishlist' : 'Guardar en mi wishlist'} onPress={() => { void save(); }}><Animated.View style={{ transform: [{ scale }] }}><BookmarkSimpleIcon size={22} color={saved ? p.sageText : p.muted} weight={saved ? 'fill' : 'regular'} /></Animated.View></IconAction>
    {saved && <Copy accessibilityLiveRegion="polite" muted style={{ fontSize: 12 }}>Guardado</Copy>}
  </Animated.View>;
}
