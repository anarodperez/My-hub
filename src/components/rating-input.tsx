import { useEffect, useRef, useState } from 'react';
import { View, type GestureResponderEvent } from 'react-native';
import { StarHalfIcon, StarIcon } from './hub-icons';
import { Copy, s } from './hub-ui';
import { ratingFromPosition } from '@/features/hub/model';
import { usePalette } from '@/features/hub/provider';

export function RatingInput({ value, onChange, onInteractionChange }: { value: number; onChange: (value: number) => void; onInteractionChange: (active: boolean) => void }) {
  const p = usePalette();
  const label = value.toLocaleString('es-ES');
  const width = useRef(0);
  const [interacting, setInteracting] = useState(false);
  const setActive = (active: boolean) => { setInteracting(active); onInteractionChange(active); };
  useEffect(() => () => onInteractionChange(false), [onInteractionChange]);
  const changeFromTouch = (event: GestureResponderEvent) => onChange(ratingFromPosition(event.nativeEvent.locationX, width.current));
  const adjust = (amount: number) => onChange(Math.max(0.5, Math.min(5, value + amount)));
  return <View style={{ gap: 8 }}>
    <Copy style={s.fieldLabel}>Tu valoración</Copy>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
      style={{ flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center' }}>
      <View pointerEvents="none" style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const half = value === star - 0.5;
        const Icon = half ? StarHalfIcon : StarIcon;
        return <View key={star} style={{ flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center' }}><Icon size={30} weight={half || star <= value ? 'fill' : 'regular'} color={p.accent} /></View>;
      })}
      </View>
    </View>
    <View style={{ width: 60, alignItems: 'flex-end' }}>{interacting && <View style={{ minWidth: 54, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 14, backgroundColor: p.soft }}><Copy accessibilityLiveRegion="polite" style={{ textAlign: 'center', fontSize: 13, lineHeight: 18, fontWeight: '600', fontVariant: ['tabular-nums'], color: p.accent }}>{label}<Copy muted style={{ fontSize: 10, lineHeight: 18, fontWeight: '400' }}> / 5</Copy></Copy></View>}</View>
    </View>
    <Copy muted style={s.small}>Desliza el dedo por las estrellas. La nota cambia de media en media.</Copy>
  </View>;
}
