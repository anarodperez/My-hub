import { MotionContent, MotionReveal } from '@/components/hub-motion';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View, useWindowDimensions, type TextInputInstance } from 'react-native';
import { MagnifyingGlassIcon } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { BookmarkSimpleIcon, CheckIcon, SlidersHorizontalIcon, FunnelXIcon, XIcon } from '@/components/hub-icons';
import { AddAction, Chips, ChoiceTabs, Copy, Empty, IconAction, Screen, TextAction } from '@/components/hub-ui';
import { RecommendationCard } from '@/components/recommendation-card';
import { WishlistSurprise } from '@/components/wishlist-surprise';
import { WishlistTile } from '@/components/wishlist-tile';
import { WishlistCollections } from '@/components/wishlist-collections';
import { ItemActions } from '@/components/item-actions';
import { wishlistOrganization } from '@/features/hub/wishlist-collections';
import { WishCompletionNotice } from '@/components/wish-completion-notice';
import { type Category } from '@/features/hub/model';
import { useHub, usePalette } from '@/features/hub/provider';
import { filterCollection, selectWishlist } from '@/features/hub/wishlist';
import { getHubLayout } from '@/features/hub/layout';
import { useViewState } from '@/hooks/use-view-state';

export default function LibraryScreen() {
  const { state, repository } = useHub();
  const { view } = useLocalSearchParams<{ view?: string }>();
  const p = usePalette();
  const { width, fontScale } = useWindowDimensions();
  const { wishColumns, contentWidth, feedColumns } = getHubLayout(width, fontScale);
  const discoveryWidth = feedColumns === 1 ? '100%' as const : (contentWidth - (feedColumns - 1) * 16) / feedColumns;
  const [filter, setFilter] = useViewState<'pending' | 'finished'>('wishlist.status', 'pending');
  const [category, setCategory] = useViewState<Category | 'all'>('wishlist.category', 'all');
  const [collection, setCollection] = useViewState<'wishlist' | 'mine'>('wishlist.view', 'wishlist');
  useEffect(() => {
    if (view === 'mine' || view === 'wishlist') setCollection(view);
  }, [view, setCollection]);
  const changeCollection = (value: 'wishlist' | 'mine') => {
    setCollection(value);
    router.setParams({ view: value });
  };
  const [query, setQuery] = useViewState('wishlist.search', '');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInput = useRef<TextInputInstance>(null);
  const [minimumRating, setMinimumRating] = useViewState('wishlist.rating', '0');
  const [filtersOpen, setFiltersOpen] = useViewState('wishlist.filters', false);
  const [filtersFocused, setFiltersFocused] = useState(false);
  const [selectedCollection, setSelectedCollection] = useViewState('wishlist.collection', 'all');
  const [order, setOrder] = useViewState<'original' | 'title'>('wishlist.order', 'original');
  const organization = wishlistOrganization(state);
  const activeCollection = selectedCollection === 'unassigned' || organization.collections.some(c => c.id === selectedCollection) ? selectedCollection : 'all';
  const collectionName = activeCollection === 'all' ? 'Todos tus deseos' : activeCollection === 'unassigned' ? 'Sin colección' : organization.collections.find(c => c.id === activeCollection)!.name;
  const vertical = width >= 1200 && fontScale <= 1.3;
  const availableWidth = contentWidth - (vertical && collection === 'wishlist' ? 248 : 0);
  const tileGap = width >= 900 ? 24 : 16;
  const columns = fontScale > 1.3 ? 1 : width >= 900 ? Math.max(1, Math.min(4, Math.floor((availableWidth + tileGap) / (280 + tileGap)))) : wishColumns;
  const tileWidth = columns === 1 ? '100%' as const : (availableWidth - (columns - 1) * tileGap) / columns;
  const addWish = () => router.push({ pathname: '/wish', params: { collection: activeCollection } });
  const activeFilters = Number(category !== 'all') + Number(minimumRating !== '0');
  const [notice, setNotice] = useState({ message: '', sequence: 0 });
  const showNotice = (message: string) => setNotice((previous) => ({ message, sequence: previous.sequence + 1 }));
  useEffect(() => { if (!notice.message) return; const timeout = setTimeout(() => setNotice((previous) => ({ ...previous, message: '' })), 2500); return () => clearTimeout(timeout); }, [notice]);
  const selected = selectWishlist(state, filter, category, activeCollection);
  const { counts, totalForStatus } = selected;
  const items = filterCollection(selected.recommendations, query, category, Number(minimumRating));
  const wishes = filterCollection(selected.wishes, query, category, Number(minimumRating));
  const mine = filterCollection(state.recommendations.filter(item => item.ownerId === repository?.accountId), query, category, Number(minimumRating));
  const entries = [...wishes.map(item => ({ item, wish: true })), ...items.map(item => ({ item, wish: false }))];
  if (order === 'title') entries.sort((a, b) => a.item.title.localeCompare(b.item.title, 'es', { sensitivity: 'base', numeric: true }));
  const noMatches = totalForStatus > 0 && !items.length && !wishes.length;
  return <Screen wide title={collection === 'mine' ? 'Mis descubrimientos' : 'Tu wishlist'} subtitle={collection === 'wishlist' ? 'Lo que te ilusiona, organizado a tu manera.' : undefined} action={<AddAction label={collection === 'mine' ? 'Crear descubrimiento' : 'Añadir deseo'} onPress={collection === 'mine' ? () => router.push('/compose') : addWish} />}>
    <ChoiceTabs variant="segmented" value={collection} onChange={changeCollection} options={[{ value: 'wishlist', label: 'Wishlist' }, { value: 'mine', label: 'Mis descubrimientos' }]} />
    <View style={{ flexDirection: vertical ? 'row' : 'column', gap: 28, alignItems: 'stretch' }}>
    {collection === 'wishlist' && <WishlistCollections value={activeCollection} onChange={setSelectedCollection} vertical={vertical} />}
    <View style={{ flex: vertical ? 1 : undefined, minWidth: 0, gap: 24 }}>
    <View style={{ gap: 16 }}>
    {collection === 'wishlist' && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Copy accessibilityRole="header" style={{ flex: 1, fontSize: 22, lineHeight: 28, fontWeight: '600' }}>{collectionName}</Copy><Copy muted style={{ fontSize: 13 }}>{counts.pending + counts.finished} deseos</Copy></View>}
    <View style={{ flexDirection: availableWidth >= 880 ? 'row' : 'column', justifyContent: 'space-between', gap: 16, alignItems: availableWidth >= 880 ? 'center' : 'stretch' }}>
    {collection === 'wishlist' && <>
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', alignSelf: 'flex-start', flexWrap: 'wrap', backgroundColor: p.soft, padding: 4, borderRadius: 14, gap: 4 }}>
      {([{ value: 'pending', label: 'Por cumplir', Icon: BookmarkSimpleIcon }, { value: 'finished', label: 'Cumplidos', Icon: CheckIcon }] as const).map(({ value, label, Icon }) => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)} style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: filter === value ? p.surface : 'transparent', opacity: pressed ? 0.8 : 1 })}>
        <Icon size={16} color={filter === value ? p.accent : p.muted} />
        <Copy style={{ fontSize: 13, lineHeight: 20, flexShrink: 1, textAlign: 'center', fontWeight: '600', color: filter === value ? p.accent : p.muted }}>{label}</Copy>
        <View style={{ minWidth: 22, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6, backgroundColor: filter === value ? p.soft : p.surface, alignItems: 'center' }}><Copy style={{ fontSize: 12, lineHeight: 18, color: filter === value ? p.accent : p.muted, fontWeight: '600' }}>{counts[value]}</Copy></View>
      </Pressable>)}
    </View>
    </>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, flex: availableWidth >= 880 ? 1 : undefined, justifyContent: 'flex-end' }}>
        <View style={{ flex: 1, minWidth: Math.min(260, availableWidth), maxWidth: availableWidth >= 880 ? 480 : undefined, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 18, paddingRight: 4, borderRadius: 28, borderWidth: 2, borderColor: searchFocused ? p.accent : 'transparent', backgroundColor: searchFocused ? p.surface : p.soft }}>
          <MagnifyingGlassIcon size={22} color={searchFocused ? p.accent : p.muted} />
          <TextInput ref={searchInput} accessibilityLabel="Buscar por título" value={query} onChangeText={setQuery} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} placeholder="Buscar un deseo…" placeholderTextColor={p.muted} selectionColor={p.accent} returnKeyType="search" autoCorrect={false} autoCapitalize="none" clearButtonMode="never" underlineColorAndroid="transparent" style={{ flex: 1, minWidth: 0, minHeight: 52, fontSize: 17, lineHeight: 24, fontFamily: 'SourceSans3-Regular', color: p.text, backgroundColor: 'transparent', borderWidth: 0, outlineWidth: 0, paddingHorizontal: 0, paddingVertical: 12 }} />
          {!!query && <Pressable accessibilityRole="button" accessibilityLabel="Borrar búsqueda" onPress={() => { setQuery(''); searchInput.current?.focus(); }} style={({ pressed }) => ({ width: 48, minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? p.line : 'transparent' })}><XIcon size={19} color={p.muted} /></Pressable>}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`${filtersOpen ? 'Ocultar' : 'Mostrar'} filtros${activeFilters ? `, ${activeFilters} activos` : ''}`} accessibilityState={{ expanded: filtersOpen }} onFocus={() => setFiltersFocused(true)} onBlur={() => setFiltersFocused(false)} onPress={() => setFiltersOpen(previous => !previous)} style={({ pressed }) => ({ minHeight: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: filtersOpen || filtersFocused ? p.accent : p.line, backgroundColor: filtersOpen || pressed ? p.soft : p.surface, outlineWidth: 0 })}>
          <SlidersHorizontalIcon size={20} color={p.accent} /><Copy style={{ fontSize: 14, fontWeight: '600', color: p.accent }}>Filtros</Copy>{activeFilters > 0 && <View style={{ minWidth: 22, minHeight: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, backgroundColor: p.accent }}><Copy style={{ fontSize: 12, lineHeight: 18, color: p.onAccent, fontWeight: '600' }}>{activeFilters}</Copy></View>}
        </Pressable>
        {activeFilters > 0 && <IconAction label="Limpiar filtros y búsqueda" onPress={() => { setCategory('all'); setMinimumRating('0'); setQuery(''); }}><FunnelXIcon size={21} color={p.muted} /></IconAction>}
      </View>
    </View>
      {filtersOpen && <MotionReveal style={{ flexDirection: availableWidth >= 880 ? 'row' : 'column', gap: 24, padding: 16, borderRadius: 16, backgroundColor: p.surface }}>
        <View style={{ flex: 1, minWidth: 0, gap: 8 }}><Copy style={{ fontSize: 14, fontWeight: '600' }}>Tipo de deseo</Copy><Chips value={category} onChange={setCategory} all recommendations /></View>
        <View style={{ gap: 8, minWidth: 0 }}><Copy style={{ fontSize: 14, fontWeight: '600' }}>Valoración</Copy><ChoiceTabs variant="segmented" value={minimumRating} onChange={setMinimumRating} options={[{ value: '0', label: 'Cualquiera' }, { value: '4', label: '4 ★ o más' }, { value: '5', label: '5 ★' }]} />{Number(minimumRating) > 0 && <Copy muted style={{ fontSize: 13 }}>Solo se muestran deseos con valoración.</Copy>}</View>
      </MotionReveal>}
    </View>
    {collection === 'wishlist' && <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}><Copy muted accessibilityLiveRegion="polite" style={{ fontSize: 13 }}>{entries.length} resultados</Copy><View style={{ flexDirection: 'row', alignItems: 'center' }}><Copy muted style={{ fontSize: 13 }}>{order === 'title' ? 'Título: A–Z' : 'Orden original'}</Copy><ItemActions label="Ordenar wishlist" actions={[{ label: 'Orden original', onPress: () => setOrder('original') }, { label: 'Título: A–Z', onPress: () => setOrder('title') }]} /></View></View>}
    <MotionContent changeKey={`${collection}:${activeCollection}:${filter}:${category}:${minimumRating}:${order}`} style={{ gap: 24 }}>
    {collection === 'mine' ? <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        {mine.map(item => <View key={item.id} style={{ width: discoveryWidth }}><RecommendationCard item={item} grid={feedColumns > 1} /></View>)}
      </View>
      {!mine.length && <Empty journal icon={<BookmarkSimpleIcon size={32} color={p.accent} />} title="Sin descubrimientos" description="Prueba otra búsqueda o añade tu primera recomendación." action={<TextAction onPress={() => { setQuery(''); setCategory('all'); setMinimumRating('0'); }}>Limpiar filtros</TextAction>} />}
    </> : <>

    {!!notice.message && <WishCompletionNotice key={notice.sequence} message={notice.message} />}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tileGap }}>
      {entries.map(({ item, wish }) => <View key={`${wish ? 'wish' : 'saved'}-${item.id}`} style={{ width: tileWidth }}><WishlistTile item={item} completed={filter === 'finished'} wish={wish} onComplete={showNotice} /></View>)}
    </View>
    {!entries.length && <Empty journal icon={<BookmarkSimpleIcon size={32} color={p.accent} weight="duotone" />} title={noMatches ? 'No encontramos ese deseo' : filter === 'pending' ? 'Tu lista aún se hace la interesante' : 'Aquí van los «por fin»'} description={noMatches ? 'Prueba con otro título o cambia los filtros.' : filter === 'pending' ? 'Añade un deseo o mueve aquí uno de los que ya tienes. Decidir cuál cumplir primero es problema de tu yo del futuro.' : 'Marca un deseo como cumplido. Tachar cosas de una lista también merece su momento.'} action={noMatches ? <TextAction onPress={() => { setCategory('all'); setQuery(''); setMinimumRating('0'); }}>Limpiar filtros</TextAction> : filter === 'pending' ? <TextAction onPress={addWish}>Añadir deseo</TextAction> : <TextAction onPress={() => setFilter('pending')}>Ver por cumplir</TextAction>} />}
    {filter === 'pending' && <WishlistSurprise key={`${category}:${activeCollection}`} wishes={wishes} recommendations={items} />}
    <View style={{ borderTopWidth: 1, borderTopColor: p.line, paddingTop: 16 }}>
      <Copy muted style={{ fontSize: 13 }}>Tu wishlist es privada: solo tú puedes ver tus deseos y colecciones.</Copy>
    </View>
    </>}
    </MotionContent>
    </View>
    </View>
  </Screen>;
}
