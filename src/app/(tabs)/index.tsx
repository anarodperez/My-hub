import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { ArrowRightIcon, BookOpenIcon } from '@/components/hub-icons';
import { AddAction, CategoryIcon, Copy, Empty, Privacy, Screen, Section, TextAction } from '@/components/hub-ui';
import { RecommendationCard } from '@/components/recommendation-card';
import { MomentSong } from '@/components/moment-song';
import { recommendationCategories, type Category } from '@/features/hub/model';
import { useHub, usePalette } from '@/features/hub/provider';

export default function HomeScreen() {
  const { state } = useHub();
  const p = usePalette();
  const [category, setCategory] = useState<Category | 'all'>('all');
  const items = state.recommendations.filter((item) => category === 'all' || item.category === category);
  const options = [{ value: 'all' as const, label: 'Todo' }, ...recommendationCategories];
  return <Screen
    avatar
    title={state.preferences.name ? `Hola, ${state.preferences.name}` : 'Tus descubrimientos'}
    subtitle="Lo que merece la pena, en un mismo lugar."
    action={<AddAction label="Crear una recomendación" onPress={() => router.push({ pathname: '/compose', params: { kind: 'recommendation' } })} />}>
    <MomentSong />
    <View style={{ gap: 4 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
        {options.map((option) => <Pressable
          key={option.value}
          accessibilityRole="tab"
          accessibilityState={{ selected: category === option.value }}
          onPress={() => setCategory(option.value)}
          style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 2, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: category === option.value ? p.accent : 'transparent', opacity: pressed ? 0.6 : 1 })}>
          {option.value !== 'all' && <CategoryIcon category={option.value} size={19} />}
          <Copy style={{ fontSize: 14, lineHeight: 20, fontWeight: category === option.value ? '700' : '400', color: category === option.value ? p.accent : p.muted }}>{option.label}</Copy>
        </Pressable>)}
      </ScrollView>
      <View style={{ height: 1, backgroundColor: p.line }} />
    </View>
    <View style={{ gap: 8 }}>
      <Section title={category === 'all' ? 'Tus descubrimientos' : recommendationCategories.find((option) => option.value === category)?.label || 'Tus descubrimientos'} trailing={<View style={{ minWidth: 28, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: p.soft }}><Copy accessibilityLabel={`${items.length} recomendaciones`} style={{ color: p.accent, fontSize: 12, lineHeight: 18, fontWeight: '600', textAlign: 'center' }}>{items.length}</Copy></View>} />
      <Privacy>Solo en tu móvil</Privacy>
    </View>
    {items.length ? <View style={{ gap: 20 }}>{items.map((item) => <RecommendationCard key={item.id} item={item} feed />)}</View> : <Empty
      icon={category === 'all' ? <BookOpenIcon color={p.accent} size={30} weight="duotone" /> : <CategoryIcon category={category} size={30} />}
      title={state.recommendations.length ? 'Tu próximo descubrimiento va aquí' : 'La primera la eliges tú'}
      description="Un libro que no sueltas, una compra que te encanta o un sitio al que volverías."
      action={<TextAction onPress={() => router.push({ pathname: '/compose', params: { kind: 'recommendation' } })}>Añadir una recomendación</TextAction>} />}
    <View style={{ borderTopWidth: 1, borderTopColor: p.line, paddingTop: 12, gap: 4 }}>
      <Copy muted style={{ fontSize: 12, lineHeight: 19 }}>Los grupos privados con amigos llegarán más adelante.</Copy>
      <TextAction onPress={() => router.push('/calendar')} icon={<ArrowRightIcon size={16} color={p.accent} />}>Ver mis próximos planes</TextAction>
    </View>
  </Screen>;
}
