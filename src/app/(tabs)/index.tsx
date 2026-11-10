import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { BookOpenIcon } from '@/components/hub-icons';
import { AddAction, CategoryIcon, Copy, Empty, Screen, TextAction } from '@/components/hub-ui';
import { RecommendationCard } from '@/components/recommendation-card';
import { MomentSong } from '@/components/moment-song';
import { FeedPlaceholder } from '@/components/feed-placeholder';
import { HomePlans } from '@/components/home-plans';
import { recommendationCategories, type Category } from '@/features/hub/model';
import { useHub, usePalette } from '@/features/hub/provider';
import { getHubLayout } from '@/features/hub/layout';
import { useDiscoveryFeed } from '@/hooks/use-discovery-feed';
import { useViewState } from '@/hooks/use-view-state';

export default function HomeScreen() {
  const { state } = useHub();
  const p = usePalette();
  const { width, fontScale } = useWindowDimensions();
  const { feedColumns, feedWidth } = getHubLayout(width, fontScale);
  const [category, setCategory] = useViewState<Category | 'all'>('home.category', 'all');
  const feed = useDiscoveryFeed(category);
  const [plansRefresh, setPlansRefresh] = useState(0);
  const options = [{ value: 'all' as const, label: 'Todo' }, ...recommendationCategories];
  const header = <View style={{ gap: 12 }}>
    <HomePlans refreshKey={plansRefresh} />
    {state.song && <MomentSong />}
    <View style={{ gap: 4 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
        {options.map(option => <Pressable key={option.value} accessibilityRole="tab" accessibilityState={{ selected: category === option.value }} onPress={() => setCategory(option.value)}
          style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 2, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: category === option.value ? p.accent : 'transparent', opacity: pressed ? 0.6 : 1 })}>
          {option.value !== 'all' && <CategoryIcon category={option.value} size={19} />}
          <Copy style={{ fontSize: 14, lineHeight: 20, fontWeight: category === option.value ? '700' : '400', color: category === option.value ? p.accent : p.muted }}>{option.label}</Copy>
        </Pressable>)}
      </ScrollView>
      <View style={{ height: 1, backgroundColor: p.line }} />
    </View>
  </View>;
  return <Screen wide avatar title={state.preferences.name ? `Hola, ${state.preferences.name}` : 'Descubrimientos'}
    action={<AddAction label="Crear una recomendación" onPress={() => router.push({ pathname: '/compose', params: { kind: 'recommendation' } })} />}
    renderList={heading => <FlatList
      key={`${category}-${feedColumns}`}
      data={feed.items}
      keyExtractor={item => item.id}
      numColumns={feedColumns}
      style={{ flex: 1, width: '100%' }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40, flexGrow: 1 }}
      columnWrapperStyle={feedColumns > 1 ? { gap: 16 } : undefined}
      renderItem={({ item }) => <View style={{ width: feedColumns === 1 ? '100%' : (feedWidth - (feedColumns - 1) * 16) / feedColumns }}><RecommendationCard item={item} feed grid={feedColumns > 1} /></View>}
      ListHeaderComponent={<View style={{ gap: 16, marginBottom: 20 }}>{heading}{header}</View>}
      ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      ListEmptyComponent={feed.loading ? <FeedPlaceholder columns={feedColumns} /> : !feed.error ? <Empty icon={<BookOpenIcon color={p.accent} size={30} weight="duotone" />} title="Tu próximo descubrimiento va aquí" description="Un libro que no sueltas, una compra que te encanta o un sitio al que volverías." action={<TextAction onPress={() => router.push({ pathname: '/compose', params: { kind: 'recommendation' } })}>Añadir una recomendación</TextAction>} /> : undefined}
      ListFooterComponent={<View style={{ paddingVertical: 24, gap: 12, alignItems: 'center' }}>
        {feed.loading && !!feed.items.length && !feed.refreshing && <ActivityIndicator color={p.accent} accessibilityLabel="Cargando descubrimientos" />}
        {!!feed.error && <><Copy accessibilityRole="alert" style={{ textAlign: 'center' }}>No se pudieron cargar los descubrimientos. Los que ya tienes siguen aquí.</Copy><TextAction onPress={feed.retry}>Volver a intentar</TextAction></>}
        {!feed.loading && !feed.error && !feed.hasMore && !!feed.items.length && <Copy muted style={{ fontSize: 13 }}>Estás al día. Desliza hacia abajo para actualizar.</Copy>}
      </View>}
      refreshing={feed.refreshing}
      onRefresh={() => { feed.refresh(); setPlansRefresh(value => value + 1); }}
      onEndReached={() => { if (feed.items.length && !feed.error) feed.loadMore(); }}
      onEndReachedThreshold={0.6}
      initialNumToRender={5}
      maxToRenderPerBatch={5}
      windowSize={7}
      removeClippedSubviews={false}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    />}
  />;
}
