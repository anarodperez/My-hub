import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { MapPinIcon, PencilSimpleIcon, StarHalfIcon, StarIcon } from './hub-icons';
import { SaveRecommendation } from './save-recommendation';
import { ExternalLink } from './external-link';
import { CategoryIcon, Copy, IconAction, s } from './hub-ui';
import { recommendationCategories, money, type Recommendation } from '@/features/hub/model';
import { useHub, usePalette } from '@/features/hub/provider';

export function RecommendationCard({ item, feed = false }: { item: Recommendation; feed?: boolean }) {
  const p = usePalette();
  const { state } = useHub();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const RatingIcon = Number.isInteger(item.rating) ? StarIcon : StarHalfIcon;
  const hasHero = feed && !!item.coverUrl && item.coverUrl !== failedUri;
  return <View style={{ backgroundColor: p.surface, borderRadius: 16, padding: 16, gap: 12 }}>
    {item.sample && <View style={{ alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: p.soft }}><Copy style={{ color: p.accent, fontSize: 12, lineHeight: 18, fontWeight: '600' }}>Contenido de ejemplo</Copy></View>}
    {hasHero && <Image source={item.coverUrl} onError={() => setFailedUri(item.coverUrl)} contentFit={item.category === 'book' || item.category === 'product' ? 'contain' : 'cover'} style={{ width: '100%', height: 168, borderRadius: 12, backgroundColor: p.background }} accessibilityLabel={`Foto de ${item.title}`} />}
    <View style={{ flexDirection: 'row', gap: 16 }}>
      {!hasHero && (item.coverUrl && item.coverUrl !== failedUri ? <Image source={item.coverUrl} onError={() => setFailedUri(item.coverUrl)} contentFit="cover" style={{ width: 76, height: 106, borderRadius: 8 }} accessibilityLabel={`Portada de ${item.title}`} /> : <View style={{ width: 76, height: 106, borderRadius: 8, backgroundColor: p.soft, alignItems: 'center', justifyContent: 'center' }}><CategoryIcon category={item.category} size={34} /></View>)}
      <View style={[s.fill, { gap: 7 }]}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}><View style={s.inline}><CategoryIcon category={item.category} size={14} /><Copy muted style={s.small}>{recommendationCategories.find((category) => category.value === item.category)?.singular}</Copy></View><View accessibilityLabel={`${item.rating.toLocaleString('es-ES')} de 5 estrellas`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: p.soft, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}><RatingIcon size={12} weight="fill" color={p.accent} /><Copy style={{ fontSize: 12, lineHeight: 18, color: p.accent, fontWeight: '600' }}>{item.rating.toLocaleString('es-ES')}</Copy></View></View><Copy style={{ fontSize: 20, lineHeight: 25, fontWeight: '700' }}>{item.title}</Copy><Copy muted style={s.small}>{item.sample ? 'Opinión y nota de muestra' : `Por ${state.preferences.name || 'ti'}`}</Copy></View>
    </View>
    <Copy style={{ fontSize: 14, lineHeight: 22 }}>{item.opinion}</Copy>
    {item.category === 'product' && item.priceCents !== undefined && <Copy style={{ color: p.accent, fontWeight: '600' }}>{money(item.priceCents)}</Copy>}
    {item.category === 'place' && item.location && <View style={s.inline}><MapPinIcon size={18} color={p.muted} /><Copy muted style={[s.fill, { fontSize: 13 }]}>{item.location}</Copy></View>}
    {item.link && <ExternalLink href={item.link as `https://${string}` | `http://${string}`} asChild><Pressable accessibilityRole="link" style={{ minHeight: 48, justifyContent: 'center' }}><Copy style={{ color: p.accent, fontSize: 14, fontWeight: '600' }}>{item.category === 'product' ? 'Ver la compra' : 'Ver el sitio'}</Copy></Pressable></ExternalLink>}
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: p.line, paddingTop: 6 }}>
      <SaveRecommendation id={item.id} />
      <IconAction label={`Editar ${item.title}`} onPress={() => router.push({ pathname: '/compose', params: { kind: 'recommendation', id: item.id } })}><PencilSimpleIcon color={p.muted} size={21} /></IconAction>
    </View>
  </View>;
}
