import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { BookmarkSimpleIcon, CheckIcon } from '@/components/hub-icons';
import { AddAction, Chips, Copy, Empty, Screen, TextAction, showError } from '@/components/hub-ui';
import { WishlistTile } from '@/components/wishlist-tile';
import { type Category } from '@/features/hub/model';
import { useHub, usePalette } from '@/features/hub/provider';
import { selectWishlist } from '@/features/hub/wishlist';
import { getHubLayout } from '@/features/hub/layout';

export default function LibraryScreen() {
  const { state, update } = useHub();
  const p = usePalette();
  const { width, fontScale } = useWindowDimensions();
  const { wishColumns: columns, contentWidth } = getHubLayout(width, fontScale);
  const tileWidth = columns === 1 ? '100%' as const : (contentWidth - (columns - 1) * 16) / columns;
  const [filter, setFilter] = useState<'pending' | 'finished'>('pending');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [notice, setNotice] = useState('');
  useEffect(() => { if (!notice) return; const timeout = setTimeout(() => setNotice(''), 2500); return () => clearTimeout(timeout); }, [notice]);
  const visibility = state.wishlistVisibility || 'private';
  const { recommendations: items, wishes, counts, totalForStatus } = selectWishlist(state, filter, category);
  const noMatches = totalForStatus > 0 && !items.length && !wishes.length;
  return <Screen wide title="Tu wishlist" action={<AddAction label="Añadir deseo" onPress={() => router.push('/wish')} />}>
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', backgroundColor: p.soft, padding: 4, borderRadius: 14, gap: 4 }}>
      {([{ value: 'pending', label: 'Por cumplir', Icon: BookmarkSimpleIcon }, { value: 'finished', label: 'Cumplidos', Icon: CheckIcon }] as const).map(({ value, label, Icon }) => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)} style={({ pressed }) => ({ flex: 1, minHeight: 48, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', columnGap: 6, paddingHorizontal: 8, paddingVertical: 8, borderRadius: 10, backgroundColor: filter === value ? p.surface : 'transparent', opacity: pressed ? 0.6 : 1 })}>
        <Icon size={16} color={filter === value ? p.accent : p.muted} />
        <Copy style={{ fontSize: 13, fontWeight: '600', color: filter === value ? p.text : p.muted }}>{label}</Copy>
        <Copy muted style={{ fontSize: 12 }}>{counts[value]}</Copy>
      </Pressable>)}
    </View>
    <Chips value={category} onChange={setCategory} all recommendations />
    {!!notice && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><CheckIcon size={16} color={p.sageText} /><Copy accessibilityLiveRegion="polite" style={{ fontSize: 14, color: p.sageText }}>{notice}</Copy></View>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
      {wishes.map((wish) => <View key={`wish-${wish.id}`} style={{ width: tileWidth }}><WishlistTile item={wish} completed={filter === 'finished'} wish onComplete={setNotice} /></View>)}
      {items.map((item) => <View key={`saved-${item.id}`} style={{ width: tileWidth }}><WishlistTile item={item} completed={filter === 'finished'} onComplete={setNotice} /></View>)}
    </View>
    {!items.length && !wishes.length && <Empty icon={<BookmarkSimpleIcon size={32} color={p.accent} weight="duotone" />} title={noMatches ? 'Sin resultados' : filter === 'pending' ? 'Tu próximo deseo' : 'Todavía sin cumplidos'} description="" action={noMatches ? <TextAction onPress={() => setCategory('all')}>Ver todas las categorías</TextAction> : filter === 'pending' ? <TextAction onPress={() => router.push('/wish')}>Añadir deseo</TextAction> : <TextAction onPress={() => setFilter('pending')}>Ver por cumplir</TextAction>} />}
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, borderTopWidth: 1, borderTopColor: p.line, paddingTop: 16 }}>
      <Copy muted style={{ fontSize: 13 }}>Visibilidad preferida</Copy>
      <View accessibilityRole="radiogroup" accessibilityLabel="Visibilidad preferida" style={{ flexDirection: 'row', gap: 4 }}>
        {([{ value: 'private', label: 'Privada' }, { value: 'public', label: 'Pública' }] as const).map((option) => <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: visibility === option.value }} onPress={() => update((previous) => ({ ...previous, wishlistVisibility: option.value })).catch(showError)} style={({ pressed }) => ({ minHeight: 48, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 12, backgroundColor: visibility === option.value ? p.soft : 'transparent', opacity: pressed ? 0.6 : 1 })}><Copy style={{ color: visibility === option.value ? p.accent : p.muted, fontSize: 13, fontWeight: visibility === option.value ? '600' : '400' }}>{option.label}</Copy></Pressable>)}
      </View>
    </View>
  </Screen>;
}
