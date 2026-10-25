import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';
import { CheckIcon, ArrowSquareOutIcon, ArrowCounterClockwiseIcon } from './hub-icons';
import { CategoryIcon, Copy, TextAction, showError } from './hub-ui';
import { ExternalLink } from './external-link';
import { recommendationCategories, type Recommendation, type Wish } from '@/features/hub/model';
import { useHub, usePalette } from '@/features/hub/provider';
import { hubType } from '@/constants/hub-design';

export function WishlistTile({ item, completed, wish = false, onComplete }: { item: Wish | Recommendation; completed: boolean; wish?: boolean; onComplete?: (message: string) => void }) {
  const p = usePalette();
  const { update } = useHub();
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
    <Pressable accessibilityRole="button" accessibilityLabel={`${wish ? 'Editar' : 'Ver'} ${item.title}`} onPress={edit} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
      <View style={{ overflow: 'hidden', backgroundColor: p.soft }}>
        {item.coverUrl && item.coverUrl !== failed ? <Image source={item.coverUrl} onError={() => setFailed(item.coverUrl)} contentFit={item.category === 'book' || item.category === 'product' ? 'contain' : 'cover'} style={{ width: '100%', aspectRatio: 1.05 }} /> : <View style={{ aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}><CategoryIcon category={item.category} size={38} /></View>}
        {completed && <View style={{ position: 'absolute', left: 8, top: 8, borderRadius: 8, padding: 6, backgroundColor: p.sage }}><CheckIcon size={16} weight="bold" color={p.sageText} /></View>}
      </View>
    </Pressable>
    <View style={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 14, gap: 6 }}>
      <Copy muted style={hubType.metadata}>{recommendationCategories.find((category) => category.value === item.category)?.singular}</Copy>
      <Pressable accessibilityRole="button" accessibilityLabel={`${wish ? 'Editar' : 'Ver'} ${item.title}`} onPress={edit} style={{ minHeight: 48 }}><Copy style={[hubType.cardTitle, { fontSize: 15, lineHeight: 21 }]}>{item.title}</Copy></Pressable>
    </View>
    <View style={{ paddingHorizontal: 10, paddingBottom: 10, marginTop: 'auto', gap: 4 }}>
      <TextAction disabled={busy} onPress={() => router.push({ pathname: '/review', params: { id: item.id, saved: wish ? '0' : '1' } })}>Terminar y valorar</TextAction>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Pressable disabled={busy} accessibilityRole="button" accessibilityState={{ disabled: busy }} accessibilityLabel={completed ? `Volver a guardar ${item.title}` : `Marcar ${item.title} como cumplido`} onPress={() => { void complete(); }} style={({ pressed }) => ({ minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: pressed ? p.soft : 'transparent', opacity: busy ? 0.5 : pressed ? 0.7 : 1 })}>{completed ? <ArrowCounterClockwiseIcon size={23} color={p.sageText} /> : <CheckIcon size={23} color={p.muted} />}</Pressable>
      {!!item.link && <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <ExternalLink href={item.link as `https://${string}` | `http://${string}`} asChild><Pressable accessibilityRole="link" accessibilityLabel={`Ver enlace de ${item.title}`} style={({ pressed }) => ({ minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: pressed ? p.soft : 'transparent', opacity: pressed ? 0.6 : 1 })}><ArrowSquareOutIcon size={23} color={p.accent} /></Pressable></ExternalLink>
      </View>}
      </View>
    </View>
  </View>;
}
