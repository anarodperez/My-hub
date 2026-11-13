import { Pressable, View, useWindowDimensions } from 'react-native';
import { ChoiceTabs, Copy, Privacy } from './hub-ui';
import { LoadingImage } from './loading-image';
import { getGroupCover } from '@/features/hub/group-covers';
import { usePalette } from '@/features/hub/provider';
import type { Author } from '@/features/hub/backend-types';
import { MemberStack } from './member-stack';
import { CalendarBlankIcon, CaretRightIcon } from './hub-icons';
import { GiftIcon } from 'phosphor-react-native/src/icons/Gift';
import { UsersThreeIcon } from 'phosphor-react-native/src/icons/UsersThree';
import { ClockIcon } from 'phosphor-react-native/src/icons/Clock';

export type GroupSection = 'plan' | 'availability' | 'gift' | 'people';

export function GroupHeader({ id, name, count, members = [], tab, onTabChange, busy = false, coverKey }: {
  id: string; name: string; count: number; members?: Author[]; tab: GroupSection; onTabChange: (tab: GroupSection) => void; busy?: boolean; coverKey?: string | null;
}) {
  const { width, fontScale } = useWindowDimensions();
  const horizontal = width >= 1000 && fontScale <= 1.3;
  const p = usePalette();
  return <View style={{ gap: 24 }}>
    <View style={{ flexDirection: 'row', alignItems: horizontal ? 'stretch' : 'center', gap: horizontal ? 0 : 16, padding: horizontal ? 0 : 16, backgroundColor: p.surface, borderRadius: 16, overflow: 'hidden' }}>
      <LoadingImage source={getGroupCover(id, coverKey)} contentFit="cover" accessible={false} style={{ width: horizontal ? 240 : 64, height: horizontal ? undefined : 64, minHeight: horizontal ? 184 : 64, borderRadius: horizontal ? 0 : 12 }} />
      <View style={{ flex: 1, minWidth: 0, padding: horizontal ? 28 : 0, gap: horizontal ? 12 : 6 }}>
        <Privacy>Grupo privado</Privacy>
        <Copy accessibilityRole="header" style={{ fontSize: horizontal ? 28 : 22, lineHeight: horizontal ? 36 : 30, letterSpacing: -0.6, fontWeight: '700' }}>{name}</Copy>
        <Copy muted style={{ fontSize: 14, lineHeight: 21 }}>El «hay que quedar», pero con calendario.</Copy>
        <Pressable accessibilityRole="button" accessibilityLabel="Ver integrantes del grupo" disabled={busy} accessibilityState={{ disabled: busy }} onPress={() => onTabChange('people')} style={({ pressed }) => ({ alignSelf: 'flex-start', minHeight: 48, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, borderRadius: 12, opacity: busy ? 0.5 : pressed ? 0.7 : 1 })}>
          {horizontal && <MemberStack members={members} />}<Copy muted style={{ fontSize: 14 }}>{count} {count === 1 ? 'persona' : 'personas'}</Copy><CaretRightIcon size={14} color={p.accent} />
        </Pressable>
      </View>
    </View>
    <ChoiceTabs variant="segmented" value={tab} disabled={busy} onChange={onTabChange} options={[
      { value: 'plan', label: 'Planes', icon: <CalendarBlankIcon size={19} color={tab === 'plan' ? p.accent : p.muted} /> },
      { value: 'availability', label: 'Disponibilidad', icon: <ClockIcon size={19} color={tab === 'availability' ? p.accent : p.muted} /> },
      { value: 'gift', label: 'Regalos', icon: <GiftIcon size={19} color={tab === 'gift' ? p.accent : p.muted} /> },
      { value: 'people', label: 'Personas', icon: <UsersThreeIcon size={19} color={tab === 'people' ? p.accent : p.muted} /> },
    ]} />
  </View>;
}
