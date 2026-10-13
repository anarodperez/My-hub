import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { CheckIcon, PencilSimpleIcon, BookmarkSimpleIcon, ArrowRightIcon } from './hub-icons';
import { CategoryIcon, Copy, IconAction, showError } from './hub-ui';
import { ExternalLink } from './external-link';
import { recommendationCategories, toggleSaved, type Recommendation, type Wish } from '@/features/hub/model';
import { useHub, usePalette } from '@/features/hub/provider';

export function WishlistTile({ item, completed, wish = false }: { item: Wish | Recommendation; completed: boolean; wish?: boolean }) {
  const p = usePalette();
  const { update } = useHub();
  const [failed, setFailed] = useState('');
  const [busy, setBusy] = useState(false);
  const complete = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await update((previous) => wish ? { ...previous, wishes: (previous.wishes || []).map((entry) => entry.id === item.id ? { ...entry, completed: !completed } : entry) } : { ...previous, saved: previous.saved.map((entry) => entry.recommendationId === item.id ? { ...entry, status: completed ? 'pending' : 'finished' } : entry) });
    } catch { showError(); } finally { setBusy(false); }
  };
  return <View style={{ flex: 1, backgroundColor: p.surface, borderRadius: 14, overflow: 'hidden' }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${item.title}`} onPress={() => wish ? router.push({ pathname: '/wish', params: { id: item.id } }) : router.push({ pathname: '/compose', params: { kind: 'recommendation', id: item.id } })}>
      {item.coverUrl && item.coverUrl !== failed ? <Image source={item.coverUrl} onError={() => setFailed(item.coverUrl)} contentFit={item.category === 'book' || item.category === 'product' ? 'contain' : 'cover'} style={{ width: '100%', aspectRatio: 1, backgroundColor: p.background }} /> : <View style={{ aspectRatio: 1, backgroundColor: p.soft, alignItems: 'center', justifyContent: 'center' }}><CategoryIcon category={item.category} size={38} /></View>}
      <View style={{ padding: 12, gap: 4 }}><Copy muted style={{ fontSize: 11, lineHeight: 16 }}>{recommendationCategories.find((category) => category.value === item.category)?.singular}</Copy><Copy style={{ fontSize: 15, lineHeight: 21, fontWeight: '600' }}>{item.title}</Copy></View>
    </Pressable>
    <View style={{ paddingHorizontal: 8, marginTop: 'auto', gap: 2 }}>
      {item.link && <ExternalLink href={item.link as `https://${string}` | `http://${string}`} asChild><Pressable accessibilityRole="link" accessibilityLabel={`Ver enlace de ${item.title}`} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 4 }}><Copy style={{ color: p.accent, fontSize: 12 }}>Ver enlace</Copy><ArrowRightIcon size={14} color={p.accent} /></Pressable></ExternalLink>}
      <Pressable disabled={busy} accessibilityRole="button" accessibilityLabel={completed ? `Volver a guardar ${item.title}` : `Marcar ${item.title} como cumplido`} onPress={() => { void complete(); }} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 4, opacity: busy ? 0.5 : 1 }}><CheckIcon size={16} color={completed ? p.sageText : p.accent} weight={completed ? 'bold' : 'regular'} /><Copy style={{ flexShrink: 1, fontSize: 12, lineHeight: 17, color: completed ? p.sageText : p.accent }}>{completed ? 'Volver a guardar' : 'Cumplido'}</Copy></Pressable>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: p.line }}><IconAction label={`Editar ${item.title}`} onPress={() => wish ? router.push({ pathname: '/wish', params: { id: item.id } }) : router.push({ pathname: '/compose', params: { kind: 'recommendation', id: item.id } })}><PencilSimpleIcon size={18} color={p.muted} /></IconAction>{!wish && <IconAction label={`Quitar ${item.title} de mi wishlist`} onPress={() => { void update((previous) => toggleSaved(previous, item.id)).catch(showError); }}><BookmarkSimpleIcon size={18} color={p.accent} weight="fill" /></IconAction>}</View>
    </View>
  </View>;
}
