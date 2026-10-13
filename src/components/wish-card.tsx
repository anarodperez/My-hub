import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { ExternalLink } from './external-link';
import { CheckIcon, PencilSimpleIcon } from './hub-icons';
import { CategoryIcon, Copy, IconAction, Surface, TextAction, s, showError } from './hub-ui';
import { recommendationCategories, type Wish } from '@/features/hub/model';
import { useHub, usePalette } from '@/features/hub/provider';

export function WishCard({ item }: { item: Wish }) {
  const p = usePalette();
  const { update } = useHub();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  return <Surface>
    <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
      {item.coverUrl && item.coverUrl !== failedUri ? <Image source={item.coverUrl} onError={() => setFailedUri(item.coverUrl)} style={{ width: 64, height: 84, borderRadius: 8 }} contentFit="cover" accessibilityLabel={`Foto de ${item.title}`} /> : <CategoryIcon category={item.category} size={32} />}
      <View style={s.fill}><Copy muted style={s.small}>{recommendationCategories.find((category) => category.value === item.category)?.singular}</Copy><Copy style={{ fontSize: 18, lineHeight: 24, fontWeight: '600' }}>{item.title}</Copy></View>
      <IconAction label={`Editar ${item.title}`} onPress={() => router.push({ pathname: '/wish', params: { id: item.id } })}><PencilSimpleIcon size={20} color={p.muted} /></IconAction>
    </View>
    {item.link && <ExternalLink href={item.link as `https://${string}` | `http://${string}`}><Copy style={{ color: p.accent, fontSize: 14 }}>Ver enlace</Copy></ExternalLink>}
    <TextAction icon={<CheckIcon size={18} color={p.accent} />} onPress={() => update((previous) => ({ ...previous, wishes: (previous.wishes || []).map((wish) => wish.id === item.id ? { ...wish, completed: !wish.completed } : wish) })).catch(showError)}>{item.completed ? 'Volver a mi wishlist' : 'Marcar como cumplido'}</TextAction>
  </Surface>;
}
