import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';
import { CheckIcon, ArrowRightIcon } from './hub-icons';
import { CategoryIcon, Copy, showError } from './hub-ui';
import { ItemActions } from './item-actions';
import { ExternalLink } from './external-link';
import { recommendationCategories, toggleSaved, type Recommendation, type Wish } from '@/features/hub/model';
import { useHub, usePalette } from '@/features/hub/provider';
import { hubType } from '@/constants/hub-design';

export function WishlistTile({ item, completed, wish = false, onComplete }: { item: Wish | Recommendation; completed: boolean; wish?: boolean; onComplete?: (message: string) => void }) {
  const p = usePalette();
  const { update } = useHub();
  const [failed, setFailed] = useState('');
  const [busy, setBusy] = useState(false);
  const edit = () => wish ? router.push({ pathname: '/wish', params: { id: item.id } }) : router.push({ pathname: '/compose', params: { kind: 'recommendation', id: item.id } });
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
    <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${item.title}`} onPress={edit} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
      <View style={{ margin: 8, borderRadius: 10, overflow: 'hidden', backgroundColor: p.soft }}>
        {item.coverUrl && item.coverUrl !== failed ? <Image source={item.coverUrl} onError={() => setFailed(item.coverUrl)} contentFit={item.category === 'book' || item.category === 'product' ? 'contain' : 'cover'} style={{ width: '100%', aspectRatio: 1 }} /> : <View style={{ aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}><CategoryIcon category={item.category} size={38} /></View>}
        {completed && <View style={{ position: 'absolute', right: 8, top: 8, borderRadius: 8, padding: 6, backgroundColor: p.sage }}><CheckIcon size={16} weight="bold" color={p.sageText} /></View>}
      </View>
    </Pressable>
    <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}><Copy muted style={hubType.metadata}>{recommendationCategories.find((category) => category.value === item.category)?.singular}</Copy><ItemActions label={`Opciones de ${item.title}`} actions={[{ label: 'Editar', onPress: edit, disabled: busy }, ...(!wish ? [{ label: 'Quitar de wishlist', disabled: busy, onPress: () => { void update((previous) => toggleSaved(previous, item.id)).catch(showError); } }] : [])]} /></View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${item.title}`} onPress={edit}><Copy style={hubType.cardTitle}>{item.title}</Copy></Pressable>
    </View>
    <View style={{ paddingHorizontal: 10, paddingBottom: 10, marginTop: 'auto', gap: 4 }}>
      <Pressable disabled={busy} accessibilityRole="button" accessibilityState={{ disabled: busy }} accessibilityLabel={completed ? `Volver a guardar ${item.title}` : `Marcar ${item.title} como cumplido`} onPress={() => { void complete(); }} style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingHorizontal: 8, borderRadius: 10, backgroundColor: completed ? p.sage : p.soft, opacity: busy ? 0.5 : pressed ? 0.7 : 1 })}><CheckIcon size={16} color={completed ? p.sageText : p.accent} weight={completed ? 'bold' : 'regular'} /><Copy style={{ flexShrink: 1, fontSize: 12, lineHeight: 17, fontWeight: '600', color: completed ? p.sageText : p.accent }}>{completed ? 'Por cumplir' : 'Cumplido'}</Copy></Pressable>
      {!!item.link && <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        {item.link ? <ExternalLink href={item.link as `https://${string}` | `http://${string}`} asChild><Pressable accessibilityRole="link" accessibilityLabel={`Ver enlace de ${item.title}`} style={({ pressed }) => ({ minHeight: 48, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 4, opacity: pressed ? 0.6 : 1 })}><Copy style={{ color: p.accent, fontSize: 12, flexShrink: 1 }}>Ver enlace</Copy><ArrowRightIcon size={14} color={p.accent} /></Pressable></ExternalLink> : <View style={{ flex: 1 }} />}
      </View>}
    </View>
  </View>;
}
