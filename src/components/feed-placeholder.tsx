import { View } from 'react-native';
import { Copy } from './hub-ui';
import { usePalette } from '@/features/hub/provider';

export function FeedPlaceholder({ columns }: { columns: number }) {
  const p = usePalette();
  return <View accessibilityLabel="Cargando descubrimientos" accessibilityState={{ busy: true }} style={{ gap: 12 }}>
    <Copy muted>Cargando descubrimientos…</Copy>
    <View style={{ flexDirection: 'row', gap: 16 }}>{Array.from({ length: columns }, (_, index) => <View key={index} accessible={false} style={{ flex: 1, minHeight: 340, backgroundColor: p.surface, borderRadius: 16, padding: 16, gap: 16 }}>
      <View style={{ flexDirection: 'row', gap: 16 }}><View style={{ width: 88, height: 124, borderRadius: 8, backgroundColor: p.soft }} /><View style={{ flex: 1, gap: 12, paddingTop: 8 }}><View style={{ height: 12, width: '45%', backgroundColor: p.soft, borderRadius: 4 }} /><View style={{ height: 20, backgroundColor: p.soft, borderRadius: 4 }} /><View style={{ height: 20, width: '75%', backgroundColor: p.soft, borderRadius: 4 }} /></View></View>
      {[100, 95, 60].map(width => <View key={width} style={{ height: 14, width: `${width}%`, borderRadius: 4, backgroundColor: p.soft }} />)}
      <View style={{ marginTop: 'auto', height: 48, borderTopWidth: 1, borderColor: p.line }} />
    </View>)}</View>
  </View>;
}
