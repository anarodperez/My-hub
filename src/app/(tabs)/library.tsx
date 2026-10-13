import { router } from 'expo-router';
import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { BookmarkSimpleIcon } from '@/components/hub-icons';
import { AddAction, Chips, ChoiceTabs, Copy, Empty, Privacy, Screen, Section, TextAction, showError } from '@/components/hub-ui';
import { WishlistTile } from '@/components/wishlist-tile';
import { type Category } from '@/features/hub/model';
import { useHub, usePalette } from '@/features/hub/provider';

export default function LibraryScreen() {
  const { state, update } = useHub();
  const p = usePalette();
  const { width, fontScale } = useWindowDimensions();
  const columns = width < 360 || fontScale > 1.3 ? 1 : 2;
  const [filter, setFilter] = useState<'pending' | 'finished'>('pending');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const visibility = state.wishlistVisibility || 'private';
  const items = state.saved.filter((entry) => entry.status === filter).flatMap((entry) => state.recommendations.filter((item) => item.id === entry.recommendationId && (category === 'all' || category === item.category)));
  const wishes = (state.wishes || []).filter((wish) => wish.completed === (filter === 'finished') && (category === 'all' || category === wish.category));
  return <Screen title="Tu wishlist" subtitle="Todo lo que te hace ilusión, en un mismo sitio." action={<AddAction label="Añadir deseo" onPress={() => router.push('/wish')} />}>
    <View style={{ gap: 8 }}>
      <Copy style={{ fontSize: 13, fontWeight: '600' }}>Visibilidad de la lista</Copy>
      <ChoiceTabs value={visibility} options={[{ value: 'private', label: 'Privada' }, { value: 'public', label: 'Pública' }]} onChange={(value) => update((previous) => ({ ...previous, wishlistVisibility: value })).catch(showError)} />
      {visibility === 'private' ? <Privacy>Solo para ti</Privacy> : <Copy muted style={{ fontSize: 12, lineHeight: 19 }}>Pública para tu grupo cuando conectemos las cuentas. Por ahora sigue guardada solo en tu móvil.</Copy>}
    </View>
    <ChoiceTabs value={filter} onChange={setFilter} options={[{ value: 'pending', label: 'Por cumplir' }, { value: 'finished', label: 'Cumplidos' }]} />
    <Chips value={category} onChange={setCategory} all recommendations />
    <Section title={filter === 'pending' ? 'Tus deseos' : 'Ya cumplidos'} trailing={<Copy muted>{items.length + wishes.length}</Copy>} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 }}>
      {wishes.map((wish) => <View key={`wish-${wish.id}`} style={{ width: columns === 1 ? '100%' : '48%' }}><WishlistTile item={wish} completed={filter === 'finished'} wish /></View>)}
      {items.map((item) => <View key={`saved-${item.id}`} style={{ width: columns === 1 ? '100%' : '48%' }}><WishlistTile item={item} completed={filter === 'finished'} /></View>)}
    </View>
    {!items.length && !wishes.length && <Empty icon={<BookmarkSimpleIcon size={32} color={p.accent} weight="duotone" />} title={filter === 'pending' ? 'Aquí empiezan tus próximos planes' : 'Sin prisa, a tu ritmo'} description={filter === 'pending' ? 'Añade un deseo con el botón + o guarda una recomendación desde Inicio.' : 'Los deseos que marques como cumplidos aparecerán aquí.'} action={<TextAction onPress={() => router.push('/wish')}>Añadir mi primer deseo</TextAction>} />}
  </Screen>;
}
