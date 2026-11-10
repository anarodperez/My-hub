import { View } from 'react-native';
import { ChoiceTabs, Copy } from './hub-ui';
import { useHub } from '@/features/hub/provider';
import { wishlistOrganization } from '@/features/hub/wishlist-collections';

export function WishCollectionPicker({ value, onChange, disabled }: { value: string; onChange: (id: string) => void; disabled?: boolean }) {
  const { state } = useHub();
  return <View style={{ gap: 6 }}>
    <Copy style={{ fontSize: 14, fontWeight: '600' }}>Guardar en</Copy>
    <ChoiceTabs disabled={disabled} value={value} onChange={onChange} options={[{ value: 'unassigned', label: 'Sin colección' }, ...wishlistOrganization(state).collections.map(c => ({ value: c.id, label: c.name }))]} />
  </View>;
}
