import { View } from 'react-native';
import { Copy } from './hub-ui';
import { usePalette } from '@/features/hub/provider';
import type { Author } from '@/features/hub/backend-types';

export function MemberStack({ members }: { members: Pick<Author, 'id' | 'name'>[] }) {
  const p = usePalette();
  if (!members.length) return null;
  const tones = [{ backgroundColor: p.soft, color: p.accent }, { backgroundColor: p.sage, color: p.sageText }, { backgroundColor: p.peach, color: p.peachText }];
  return <View accessible accessibilityLabel={`${members.length} integrantes: ${members.map(member => member.name.trim() || 'Sin nombre').join(', ')}`} style={{ flexDirection: 'row', alignItems: 'center' }}>
    {members.slice(0, 4).map((member, index) => {
      const tone = tones[index % tones.length];
      const initials = member.name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toLocaleUpperCase('es-ES') || '?';
      return <View key={member.id} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: p.surface, marginLeft: index ? -10 : 0, backgroundColor: tone.backgroundColor, alignItems: 'center', justifyContent: 'center' }}><Copy style={{ color: tone.color, fontSize: 11, lineHeight: 16, fontWeight: '600' }}>{initials}</Copy></View>;
    })}
    {members.length > 4 && <View style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: p.surface, marginLeft: -10, backgroundColor: p.background, alignItems: 'center', justifyContent: 'center' }}><Copy style={{ color: p.muted, fontSize: 11, lineHeight: 16, fontWeight: '600' }}>{`+${members.length - 4}`}</Copy></View>}
  </View>;
}
