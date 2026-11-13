import { useEffect, useRef, useState } from 'react';
import { View, type GestureResponderEvent } from 'react-native';
import { StarHalfIcon, StarIcon } from './hub-icons';
import { Copy } from './hub-ui';
import { ratingFromPosition } from '@/features/hub/model';
import { usePalette } from '@/features/hub/provider';

export function RatingInput({ value, onChange, onInteractionChange }: { value: number; onChange: (value: number) => void; onInteractionChange: (active: boolean) => void }) {
  const p = usePalette();
  const label = value.toLocaleString('es-ES');
  const impression = value === 5 ? 'Mi nueva personalidad' : value >= 4 ? 'Ya lo estoy recomendando' : value >= 3 ? 'Bien, sin hacerle un altar' : value >= 2 ? 'Teníamos expectativas' : 'Mejor pasamos página';
  const width = useRef(0);
  const [interacting, setInteracting] = useState(false);
  const setActive = (active: boolean) => { setInteracting(active); onInteractionChange(active); };
  useEffect(() => () => onInteractionChange(false), [onInteractionChange]);
  const changeFromTouch = (event: GestureResponderEvent) => onChange(ratingFromPosition(event.nativeEvent.locationX, width.current));
  const adjust = (amount: number) => onChange(Math.max(0.5, Math.min(5, value + amount)));
  return <View style={{ gap: 12, width: '100%', maxWidth: 400 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Copy style={{ fontSize: 16, lineHeight: 24, fontWeight: '600' }}>Tu valoración</Copy>
      </View>
      <Copy accessibilityLiveRegion="polite" style={{ fontSize: 22, lineHeight: 28, fontWeight: '700', fontVariant: ['tabular-nums'], color: p.accent }}>{label}<Copy style={{ fontSize: 13, lineHeight: 20, color: p.muted }}> / 5</Copy></Copy>
    </View>
    <View accessible accessibilityRole="adjustable" accessibilityLabel="Valoración" accessibilityHint="Desliza horizontalmente para elegir la nota." accessibilityValue={{ min: 0.5, max: 5, now: value, text: `${label} de 5 estrellas` }} accessibilityActions={[{ name: 'increment', label: 'Subir media estrella' }, { name: 'decrement', label: 'Bajar media estrella' }]} onAccessibilityAction={(event) => { if (event.nativeEvent.actionName === 'increment') adjust(0.5); if (event.nativeEvent.actionName === 'decrement') adjust(-0.5); }}
      onLayout={(event) => { width.current = event.nativeEvent.layout.width; }}
      onTouchStart={() => setActive(true)}
      onTouchEnd={() => setActive(false)}
      onTouchCancel={() => setActive(false)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(event) => { setActive(true); changeFromTouch(event); }}
      onResponderMove={changeFromTouch}
      onResponderRelease={(event) => { changeFromTouch(event); setActive(false); }}
      onResponderTerminate={() => setActive(false)}
      onResponderTerminationRequest={() => false}
      style={{ minHeight: 76, flexDirection: 'row', alignItems: 'center', borderRadius: 40, backgroundColor: p.surface, borderWidth: 1, borderColor: interacting ? p.accent : p.line }}>
      <View pointerEvents="none" style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const half = value === star - 0.5;
        const Icon = half ? StarHalfIcon : StarIcon;
        const selected = half || star <= value;
        const active = Math.ceil(value) === star;
        return <View key={star} style={{ flex: 1, minHeight: 72, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? p.peach : 'transparent' }}><Icon size={active ? 34 : 28} weight={selected ? 'fill' : 'regular'} color={active ? p.peachText : selected ? p.accent : p.muted} /></View></View>;
      })}
      </View>
    </View>
    <View style={{ gap: 3, alignItems: 'center' }}>
      <Copy style={{ fontSize: 15, lineHeight: 22, fontWeight: '600', color: p.accent, textAlign: 'center' }}>{impression}</Copy>
      <Copy muted style={{ fontSize: 12, lineHeight: 18, textAlign: 'center' }}>Toca o desliza · Admite medias estrellas</Copy>
    </View>
  </View>;
}
