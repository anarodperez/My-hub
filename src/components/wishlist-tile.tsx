import { LoadingImage as Image } from '@/components/loading-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, View, useWindowDimensions } from 'react-native';
import { CheckIcon, ArrowSquareOutIcon, ArrowCounterClockwiseIcon } from './hub-icons';
import { CategoryIcon, Copy, TextAction, showError } from './hub-ui';
import { ExternalLink } from './external-link';
import { recommendationCategories, type Recommendation, type Wish } from '@/features/hub/model';
import { useHub, usePalette } from '@/features/hub/provider';
import { hubType } from '@/constants/hub-design';
import { RecommendationPlanAction } from './recommendation-plan-action';
import { ItemActions } from './item-actions';
import { assignCollection, wishlistOrganization } from '@/features/hub/wishlist-collections';

export function WishlistTile({ item, completed, wish = false, onComplete }: { item: Wish | Recommendation; completed: boolean; wish?: boolean; onComplete?: (message: string) => void }) {
  const p = usePalette();
  const { fontScale } = useWindowDimensions();
  const { state, update } = useHub();
  const organization = wishlistOrganization(state);
  const itemKey = `${wish ? 'wish' : 'saved'}:${item.id}`;
  const collectionId = organization.assignments[itemKey];
  const collection = organization.collections.find(c => c.id === collectionId);
  const move = async (id: string) => {
    if (busy) return;
    setBusy(true);
    try { await update(previous => assignCollection(previous, itemKey, id)); onComplete?.('Colección actualizada'); }
    catch { showError(); } finally { setBusy(false); }
  };
  const [failed, setFailed] = useState('');
  const [busy, setBusy] = useState(false);
  const edit = () => wish ? router.push({ pathname: '/wish', params: { id: item.id } }) : router.push({ pathname: '/discovery/[id]', params: { id: item.id } });
  const complete = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await update((previous) => wish ? { ...previous, wishes: (previous.wishes || []).map((entry) => entry.id === item.id ? { ...entry, completed: !completed } : entry) } : { ...previous, saved: previous.saved.map((entry) => entry.recommendationId === item.id ? { ...entry, status: completed ? 'pending' : 'finished' } : entry) });
      AccessibilityInfo.announceForAccessibility(completed ? 'Deseo movido a por cumplir' : 'Deseo cumplido');
      onComplete?.(completed ? 'Movido a por cumplir' : 'Deseo cumplido');
    } catch { showError(); } finally { setBusy(false); }
  };
  return <View style={{ flex: 1, backgroundColor: p.surface, borderRadius: 14, overflow: 'hidden' }}>
    <View>
    <Pressable accessibilityRole="button" accessibilityLabel={`${wish ? 'Editar' : 'Ver'} ${item.title}`} onPress={edit} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
      <View style={{ overflow: 'hidden', backgroundColor: p.soft }}>
        {item.coverUrl && item.coverUrl !== failed ? <Image source={item.coverUrl} onError={() => setFailed(item.coverUrl)} contentFit={item.category === 'book' || item.category === 'product' ? 'contain' : 'cover'} style={{ width: '100%', aspectRatio: 1.05 }} /> : <View style={{ aspectRatio: 1.05, alignItems: 'center', justifyContent: 'center' }}><CategoryIcon category={item.category} size={38} /></View>}
        {completed && <View style={{ position: 'absolute', left: 8, top: 8, borderRadius: 8, padding: 6, backgroundColor: p.sage }}><CheckIcon size={16} weight="bold" color={p.sageText} /></View>}
      </View>
    </Pressable>
      <View style={{ position: 'absolute', top: 6, right: 6, borderRadius: 12, backgroundColor: p.surface }}><ItemActions label={`Organizar ${item.title}`} actions={[
        ...organization.collections.map(c => ({ label: `${c.id === collectionId ? 'Actual: ' : 'Mover a '}${c.name}`, disabled: busy || c.id === collectionId, onPress: () => { void move(c.id); } })),
        { label: 'Sin colección', disabled: busy || !collectionId, onPress: () => { void move('unassigned'); } },
      ]} /></View>
      {!!item.link && <ExternalLink href={item.link as `https://${string}` | `http://${string}`} asChild><Pressable accessibilityRole="link" accessibilityLabel={`Ver enlace de ${item.title}`} style={({ pressed }) => ({ position: 'absolute', right: 6, bottom: 6, minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: p.surface, opacity: pressed ? 0.7 : 1 })}><ArrowSquareOutIcon size={21} color={p.accent} /></Pressable></ExternalLink>}
    </View>
    <View style={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 14, gap: 6 }}>
      <Copy muted style={hubType.metadata}>{recommendationCategories.find((category) => category.value === item.category)?.singular}</Copy>
      <Copy numberOfLines={1} style={{ fontSize: 12, color: p.accent }}>{collection?.name || 'Sin colección'}</Copy>
      <Pressable accessibilityRole="button" accessibilityLabel={`${wish ? 'Editar' : 'Ver'} ${item.title}`} onPress={edit} style={{ minHeight: Platform.OS === 'web' ? 54 : 48 }}><Copy numberOfLines={fontScale > 1.3 ? undefined : 2} style={[hubType.cardTitle, Platform.OS !== 'web' && { fontSize: 15, lineHeight: 21 }]}>{item.title}</Copy></Pressable>
    </View>
    <View style={{ paddingHorizontal: 10, paddingBottom: 8, marginTop: 'auto', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
      <RecommendationPlanAction title={item.title} />
      <TextAction disabled={busy} onPress={() => router.push({ pathname: '/review', params: { id: item.id, saved: wish ? '0' : '1' } })}>Valorar</TextAction>
      <Pressable disabled={busy} accessibilityRole="button" accessibilityState={{ disabled: busy }} accessibilityLabel={completed ? `Volver a guardar ${item.title}` : `Marcar ${item.title} como cumplido`} onPress={() => { void complete(); }} style={({ pressed }) => ({ minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: pressed ? p.soft : 'transparent', opacity: busy ? 0.5 : pressed ? 0.7 : 1 })}>{completed ? <ArrowCounterClockwiseIcon size={23} color={p.sageText} /> : <CheckIcon size={23} color={p.muted} />}</Pressable>
    </View>
  </View>;
}
