import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { BookmarkSimpleIcon, CheckIcon, SlidersHorizontalIcon, FunnelXIcon } from '@/components/hub-icons';
import { AddAction, Chips, ChoiceTabs, Copy, Empty, Field, IconAction, Screen, TextAction, showError } from '@/components/hub-ui';
import { RecommendationCard } from '@/components/recommendation-card';
import { WishlistSurprise } from '@/components/wishlist-surprise';
import { WishlistTile } from '@/components/wishlist-tile';
import { WishCompletionNotice } from '@/components/wish-completion-notice';
import { type Category } from '@/features/hub/model';
import { useHub, usePalette } from '@/features/hub/provider';
import { filterCollection, selectWishlist } from '@/features/hub/wishlist';
import { getHubLayout } from '@/features/hub/layout';

export default function LibraryScreen() {
  const { state, update, repository } = useHub();
  const p = usePalette();
  const { width, fontScale } = useWindowDimensions();
  const { wishColumns: columns, contentWidth } = getHubLayout(width, fontScale);
  const tileWidth = columns === 1 ? '100%' as const : (contentWidth - (columns - 1) * 16) / columns;
  const [filter, setFilter] = useState<'pending' | 'finished'>('pending');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [collection, setCollection] = useState<'wishlist' | 'mine'>('wishlist');
  const [query, setQuery] = useState('');
  const [minimumRating, setMinimumRating] = useState('0');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilters = Number(category !== 'all') + Number(minimumRating !== '0');
  const [notice, setNotice] = useState({ message: '', sequence: 0 });
  const showNotice = (message: string) => setNotice((previous) => ({ message, sequence: previous.sequence + 1 }));
  useEffect(() => { if (!notice.message) return; const timeout = setTimeout(() => setNotice((previous) => ({ ...previous, message: '' })), 2500); return () => clearTimeout(timeout); }, [notice]);
  const visibility = state.wishlistVisibility || 'private';
  const selected = selectWishlist(state, filter, category);
  const { counts, totalForStatus } = selected;
  const items = filterCollection(selected.recommendations, query, category, Number(minimumRating));
  const wishes = filterCollection(selected.wishes, query, category, Number(minimumRating));
  const mine = filterCollection(state.recommendations.filter(item => item.ownerId === repository?.accountId), query, category, Number(minimumRating));
  const noMatches = totalForStatus > 0 && !items.length && !wishes.length;
  return <Screen wide title={collection === 'mine' ? 'Mis descubrimientos' : 'Tu wishlist'} action={<AddAction label={collection === 'mine' ? 'Crear descubrimiento' : 'Añadir deseo'} onPress={() => router.push(collection === 'mine' ? '/compose' : '/wish')} />}>
    <View style={{ gap: 12 }}>
    <ChoiceTabs value={collection} onChange={setCollection} options={[{ value: 'wishlist', label: 'Wishlist' }, { value: 'mine', label: 'Mis descubrimientos' }]} />
    {collection === 'wishlist' && <>
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: p.line, gap: 12 }}>
      {([{ value: 'pending', label: 'Por cumplir', Icon: BookmarkSimpleIcon }, { value: 'finished', label: 'Cumplidos', Icon: CheckIcon }] as const).map(({ value, label, Icon }) => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)} style={({ pressed }) => ({ flex: 1, minWidth: 0, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 2, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: filter === value ? p.accent : 'transparent', backgroundColor: pressed ? p.soft : 'transparent', opacity: pressed ? 0.8 : 1 })}>
        <Icon size={16} color={filter === value ? p.accent : p.muted} />
        <Copy style={{ fontSize: 13, lineHeight: 20, flexShrink: 1, textAlign: 'center', fontWeight: '600', color: filter === value ? p.accent : p.muted }}>{label}</Copy>
        <View style={{ minWidth: 22, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6, backgroundColor: filter === value ? p.soft : p.surface, alignItems: 'center' }}><Copy style={{ fontSize: 12, lineHeight: 18, color: filter === value ? p.accent : p.muted, fontWeight: '600' }}>{counts[value]}</Copy></View>
      </Pressable>)}
    </View>
    </>}
    <Field label="Buscar por título" value={query} onChangeText={setQuery} placeholder="Busca en tu colección…" returnKeyType="search" autoCorrect={false} />
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
        <IconAction label={`${filtersOpen ? 'Ocultar' : 'Mostrar'} filtros${activeFilters ? `, ${activeFilters} activos` : ''}`} expanded={filtersOpen} onPress={() => setFiltersOpen(!filtersOpen)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><SlidersHorizontalIcon size={23} color={filtersOpen || activeFilters ? p.accent : p.muted} weight={activeFilters ? 'duotone' : 'regular'} />{activeFilters > 0 && <Copy style={{ color: p.accent, fontSize: 12 }}>{activeFilters}</Copy>}</View>
        </IconAction>
        {(activeFilters > 0 || !!query.trim()) && <IconAction label="Limpiar filtros y búsqueda" onPress={() => { setCategory('all'); setMinimumRating('0'); setQuery(''); }}><FunnelXIcon size={23} color={p.muted} /></IconAction>}
      </View>
      {filtersOpen && <View style={{ gap: 12, paddingBottom: 12, borderBottomWidth: 1, borderColor: p.line }}>
    <Chips value={category} onChange={setCategory} all recommendations />
    <ChoiceTabs value={minimumRating} onChange={setMinimumRating} options={[{ value: '0', label: 'Todas las notas' }, { value: '4', label: '4 ★ o más' }, { value: '5', label: '5 ★' }]} />
      </View>}
    </View>
    </View>
    {collection === 'mine' ? <>
      {mine.map(item => <RecommendationCard key={item.id} item={item} />)}
      {!mine.length && <Empty icon={<BookmarkSimpleIcon size={32} color={p.accent} />} title="Sin descubrimientos" description="Prueba otra búsqueda o añade tu primera recomendación." action={<TextAction onPress={() => { setQuery(''); setCategory('all'); setMinimumRating('0'); }}>Limpiar filtros</TextAction>} />}
    </> : <>

    {Number(minimumRating) > 0 && <Copy muted style={{ fontSize: 13 }}>Los deseos sin valoración no aparecen al filtrar por nota.</Copy>}
    {filter === 'pending' && <WishlistSurprise key={category} wishes={wishes} recommendations={items} />}
    {!!notice.message && <WishCompletionNotice key={notice.sequence} message={notice.message} />}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
      {wishes.map((wish) => <View key={`wish-${wish.id}`} style={{ width: tileWidth }}><WishlistTile item={wish} completed={filter === 'finished'} wish onComplete={showNotice} /></View>)}
      {items.map((item) => <View key={`saved-${item.id}`} style={{ width: tileWidth }}><WishlistTile item={item} completed={filter === 'finished'} onComplete={showNotice} /></View>)}
    </View>
    {!items.length && !wishes.length && <Empty icon={<BookmarkSimpleIcon size={32} color={p.accent} weight="duotone" />} title={noMatches ? 'Sin resultados' : filter === 'pending' ? 'Tu próximo deseo' : 'Todavía sin cumplidos'} description="" action={noMatches ? <TextAction onPress={() => { setCategory('all'); setQuery(''); setMinimumRating('0'); }}>Limpiar filtros</TextAction> : filter === 'pending' ? <TextAction onPress={() => router.push('/wish')}>Añadir deseo</TextAction> : <TextAction onPress={() => setFilter('pending')}>Ver por cumplir</TextAction>} />}
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, borderTopWidth: 1, borderTopColor: p.line, paddingTop: 16 }}>
      <Copy muted style={{ fontSize: 13 }}>Visibilidad preferida</Copy>
      <View accessibilityRole="radiogroup" accessibilityLabel="Visibilidad preferida" style={{ flexDirection: 'row', gap: 4 }}>
        {([{ value: 'private', label: 'Privada' }, { value: 'public', label: 'Pública' }] as const).map((option) => <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: visibility === option.value }} onPress={() => update((previous) => ({ ...previous, wishlistVisibility: option.value })).catch(showError)} style={({ pressed }) => ({ minHeight: 48, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 12, backgroundColor: visibility === option.value ? p.soft : 'transparent', opacity: pressed ? 0.6 : 1 })}><Copy style={{ color: visibility === option.value ? p.accent : p.muted, fontSize: 13, fontWeight: visibility === option.value ? '600' : '400' }}>{option.label}</Copy></Pressable>)}
      </View>
    </View>
    </>}
  </Screen>;
}
