import { webMotion } from '@/components/web-motion';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { BookOpenIcon } from '@/components/hub-icons';
import { AddAction, CategoryIcon, Copy, Empty, Screen, TextAction } from '@/components/hub-ui';
import { RecommendationCard } from '@/components/recommendation-card';
import { MomentMedia } from '@/components/moment-media';
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
  const wideIntro = width >= 1100 && fontScale <= 1.3;
  const [category, setCategory] = useViewState<Category | 'all'>('home.category', 'all');
  const feed = useDiscoveryFeed(category);
  const [plansRefresh, setPlansRefresh] = useState(0);
  const options = [{ value: 'all' as const, label: 'Todo' }, ...recommendationCategories];
  const header = <View style={{ gap: 32 }}>
    <View style={{ flexDirection: wideIntro ? 'row' : 'column', alignItems: 'stretch', gap: 24 }}>
    <View style={{ flex: wideIntro ? 1 : undefined, minWidth: 0 }}>
    <HomePlans refreshKey={plansRefresh} />
    </View>
    <View style={{ width: wideIntro ? 300 : '100%', justifyContent: 'flex-start', gap: 10 }}>
      <MomentMedia />
    </View>
    </View>
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View accessible={false} style={{ width: 28, height: 36, borderBottomLeftRadius: 3, borderBottomRightRadius: 12, backgroundColor: p.soft, alignItems: 'center', justifyContent: 'center' }}><BookOpenIcon color={p.accent} size={18} /></View>
        <Copy accessibilityRole="header" style={{ flex: 1, fontSize: 22, lineHeight: 28, fontWeight: '600', letterSpacing: -0.4 }}>Para tu próxima obsesión</Copy>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
        {options.map(option => <Pressable key={option.value} {...webMotion('tab')} accessibilityRole="tab" accessibilityState={{ selected: category === option.value }} onPress={() => setCategory(option.value)}
          style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: category === option.value ? p.soft : pressed ? p.surface : 'transparent', opacity: pressed ? 0.6 : 1 })}>
          {option.value !== 'all' && <CategoryIcon category={option.value} size={19} />}
          <Copy style={{ fontSize: 14, lineHeight: 20, fontWeight: category === option.value ? '700' : '400', color: category === option.value ? p.accent : p.muted }}>{option.label}</Copy>
        </Pressable>)}
      </ScrollView>
    </View>
  </View>;
  return <Screen wide avatar subtitle="Ideas que merecen quedarse." title={state.preferences.name ? `Hola, ${state.preferences.name}` : 'Descubrimientos'}
    action={<AddAction label="Crear una recomendación" onPress={() => router.push({ pathname: '/compose', params: { kind: 'recommendation' } })} />}
    renderList={heading => <FlatList
      key={`${category}-${feedColumns}`}
      data={feed.items}
      keyExtractor={item => item.id}
      numColumns={feedColumns}
      style={{ flex: 1, width: '100%' }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40, flexGrow: 1 }}
      columnWrapperStyle={feedColumns > 1 ? { gap: 16 } : undefined}
      renderItem={({ item }) => <View style={{ width: feedColumns === 1 ? '100%' : (feedWidth - (feedColumns - 1) * 16) / feedColumns }}><RecommendationCard item={item} feed grid={feedColumns > 1} /></View>}
      ListHeaderComponent={<View style={{ gap: 28, marginBottom: 24 }}>{heading}{header}</View>}
      ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      ListEmptyComponent={feed.loading ? <FeedPlaceholder columns={feedColumns} /> : !feed.error ? <Empty journal icon={<BookOpenIcon color={p.accent} size={30} weight="duotone" />} title="Tu próximo descubrimiento va aquí" description="Un libro que no sueltas, una compra que te encanta o un sitio al que volverías." action={<TextAction onPress={() => router.push({ pathname: '/compose', params: { kind: 'recommendation' } })}>Añadir una recomendación</TextAction>} /> : undefined}
      ListFooterComponent={<View style={{ paddingVertical: 24, gap: 12, alignItems: 'center' }}>
        {feed.loading && !!feed.items.length && !feed.refreshing && <ActivityIndicator color={p.accent} accessibilityLabel="Cargando descubrimientos" />}
        {!!feed.error && <><Copy accessibilityRole="alert" style={{ textAlign: 'center' }}>No se pudieron cargar los descubrimientos. Los que ya tienes siguen aquí.</Copy><TextAction onPress={feed.retry}>Volver a intentar</TextAction></>}
        {!feed.loading && !feed.error && !feed.hasMore && !!feed.items.length && <Copy muted style={{ fontSize: 13 }}>El chisme cultural, actualizado. Desliza hacia abajo para ver si hay novedades.</Copy>}
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
