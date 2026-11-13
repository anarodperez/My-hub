import { View } from 'react-native';
import { Copy } from './hub-ui';
import { StarHalfIcon, StarIcon } from './hub-icons';
import { usePalette } from '@/features/hub/provider';

export function RatingSummary({ value }: { value: number }) {
  const p = usePalette();
  return <View accessible accessibilityLabel={`${value.toLocaleString('es-ES')} de 5 estrellas`} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: p.peach }}>
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {[1, 2, 3, 4, 5].map(star => {
        const half = value === star - 0.5;
        const Icon = half ? StarHalfIcon : StarIcon;
        return <Icon key={star} size={17} weight={half || star <= value ? 'fill' : 'regular'} color={p.peachText} />;
      })}
    </View>
    <Copy style={{ color: p.peachText, fontSize: 14, lineHeight: 20, fontWeight: '600' }}>{value.toLocaleString('es-ES')} / 5</Copy>
  </View>;
}
