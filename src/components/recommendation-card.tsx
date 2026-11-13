import { RecommendationReactions } from './recommendation-reactions';
import { RatingSummary } from './rating-summary';
import { webMotion } from './web-motion';
import { LoadingImage as Image } from '@/components/loading-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChatCircleIcon, MapPinIcon, PencilSimpleIcon, StarHalfIcon, StarIcon } from './hub-icons';
import { RecommendationPlanAction } from './recommendation-plan-action';
import { SaveRecommendation } from './save-recommendation';
import { ExternalLink } from './external-link';
import { CategoryIcon, Copy, IconAction, s } from './hub-ui';
import { recommendationCategories, money, type Recommendation } from '@/features/hub/model';
import { useHub, usePalette } from '@/features/hub/provider';
import { hubType } from '@/constants/hub-design';

export function RecommendationCard({ item, feed = false, grid = false }: { item: Recommendation; feed?: boolean; grid?: boolean }) {
  const p = usePalette();
  const { state, repository } = useHub();
  const own = !item.ownerId || item.ownerId === repository?.accountId;
  const authorName = own ? state.preferences.name || 'Tú' : item.authorName || 'Miembro de la comunidad';
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const RatingIcon = Number.isInteger(item.rating) ? StarIcon : StarHalfIcon;
  const hasHero = feed && (grid || item.category === 'place' || item.category === 'product') && !!item.coverUrl && item.coverUrl !== failedUri;
  const open = () => router.push({ pathname: '/discovery/[id]', params: { id: item.id } });
  return <View {...webMotion('card')} style={{ flexGrow: grid ? 1 : 0, backgroundColor: p.surface, borderRadius: 16, padding: 20, gap: 16 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Ver descubrimiento: ${item.title}`} onPress={open} style={({ pressed }) => ({ gap: 12, opacity: pressed ? 0.75 : 1 })}>
    {item.sample && <View style={{ alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: p.soft }}><Copy style={{ color: p.accent, fontSize: 12, lineHeight: 18, fontWeight: '600' }}>Contenido de ejemplo</Copy></View>}
    {!item.sample && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: p.soft, alignItems: 'center', justifyContent: 'center' }}><Copy style={{ color: p.accent, fontSize: 14, fontWeight: '700' }}>{authorName.trim().charAt(0).toLocaleUpperCase('es-ES')}</Copy></View><Copy numberOfLines={1} muted style={{ flex: 1, fontSize: 14 }}>{authorName}</Copy></View>}
    {hasHero && <Image source={item.coverUrl} onError={() => setFailedUri(item.coverUrl)} contentFit={item.category === 'book' || item.category === 'product' ? 'contain' : 'cover'} style={{ width: '100%', aspectRatio: item.category === 'book' ? 1.35 : 1.6, borderRadius: 12, backgroundColor: p.background }} accessibilityLabel={`Foto de ${item.title}`} />}
    <View style={{ flexDirection: 'row', gap: 16 }}>
      {!hasHero && (item.coverUrl && item.coverUrl !== failedUri ? <Image source={item.coverUrl} onError={() => setFailedUri(item.coverUrl)} contentFit="contain" style={{ width: 88, height: 124, borderRadius: 8 }} accessibilityLabel={`Portada de ${item.title}`} /> : <View style={{ width: 88, height: 124, borderRadius: 8, backgroundColor: p.soft, alignItems: 'center', justifyContent: 'center' }}><CategoryIcon category={item.category} size={34} /></View>)}
      <View style={[s.fill, { gap: 7 }]}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}><View style={s.inline}><CategoryIcon category={item.category} size={14} /><Copy muted style={s.small}>{recommendationCategories.find((category) => category.value === item.category)?.singular}</Copy></View>{hasHero ? <RatingSummary value={item.rating} /> : <View accessibilityLabel={`${item.rating.toLocaleString('es-ES')} de 5 estrellas`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: p.peach, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}><RatingIcon size={12} weight="fill" color={p.peachText} /><Copy style={{ fontSize: 12, lineHeight: 18, color: p.peachText, fontWeight: '600' }}>{item.rating.toLocaleString('es-ES')}</Copy></View>}</View><Copy style={[hubType.cardTitle, { fontSize: 20, lineHeight: 28 }]}>{item.title}</Copy>{item.sample && <Copy muted style={s.small}>Opinión y nota de muestra</Copy>}</View>
    </View>
    <Copy numberOfLines={feed ? 3 : undefined} style={hubType.body}>{item.opinion}</Copy>
    {item.category === 'product' && item.priceCents !== undefined && <Copy style={{ color: p.text, fontWeight: '600' }}>{money(item.priceCents)}</Copy>}
    {item.category === 'place' && item.location && <View style={s.inline}><MapPinIcon size={18} color={p.muted} /><Copy muted style={[s.fill, { fontSize: 13 }]}>{item.location}</Copy></View>}
    </Pressable>
    {item.link && <ExternalLink href={item.link as `https://${string}` | `http://${string}`} asChild><Pressable accessibilityRole="link" style={{ minHeight: 48, justifyContent: 'center' }}><Copy style={{ color: p.accent, fontSize: 14, fontWeight: '600' }}>{item.category === 'product' ? 'Ver la compra' : 'Ver el sitio'}</Copy></Pressable></ExternalLink>}
    {feed && !!item.commentPreview?.length && <View style={{ borderTopWidth: 1, borderColor: p.line, paddingTop: 12, gap: 10 }}>
      {item.commentPreview.slice(0, 1).map((comment) => <Pressable key={comment.id} accessibilityRole="button" accessibilityLabel={`Ver comentario de ${comment.authorName}`} onPress={open} style={({ pressed }) => ({ flexDirection: 'row', gap: 10, minHeight: 48, alignItems: 'flex-start', opacity: pressed ? 0.7 : 1 })}>
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: p.soft, alignItems: 'center', justifyContent: 'center' }}><Copy style={{ color: p.accent, fontSize: 12, fontWeight: '600' }}>{comment.authorName.charAt(0).toUpperCase()}</Copy></View>
        <View style={{ flex: 1, gap: 2 }}><Copy style={{ fontSize: 13, lineHeight: 18, fontWeight: '600' }}>{comment.authorName}</Copy><Copy numberOfLines={2} style={{ fontSize: 14, lineHeight: 20 }}>{comment.body}</Copy></View>
      </Pressable>)}
    </View>}
    {!item.sample && <RecommendationReactions key={`${repository?.accountId}:${item.id}`} id={item.id} summary={item.reactions} />}
    <View style={{ marginTop: grid ? 'auto' : 0, flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: p.line, paddingTop: 6 }}>
      <SaveRecommendation id={item.id} />
      <RecommendationPlanAction title={item.title} description={item.opinion} />
      <IconAction label={item.commentCount ? `Ver comentarios (${item.commentCount})` : 'Comentar'} onPress={open}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><ChatCircleIcon size={23} color={p.accent} />{!!item.commentCount && <Copy style={{ fontSize: 12 }}>{item.commentCount}</Copy>}</View></IconAction>
      {own && <IconAction label={`Editar ${item.title}`} onPress={() => router.push({ pathname: '/compose', params: { kind: 'recommendation', id: item.id } })}><PencilSimpleIcon color={p.muted} size={21} /></IconAction>}
    </View>
  </View>;
}
