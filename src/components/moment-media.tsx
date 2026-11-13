import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Copy, CategoryIcon, showError } from './hub-ui';
import { ItemActions } from './item-actions';
import { LoadingImage } from './loading-image';
import { MomentSong } from './moment-song';
import { useHub, usePalette } from '@/features/hub/provider';
import { momentCategories } from '@/features/hub/moments';

export function MomentMedia() {
  const { state, update } = useHub();
  const p = usePalette();
  const moments = (state.moments || []).filter(item => item.status === 'current');
  const featured = moments[0];
  const kind = momentCategories.find(category => category.value === featured?.category);
  const [busy, setBusy] = useState(false);
  const highlight = async (category: typeof momentCategories[number]['value']) => {
    setBusy(true);
    try {
      await update(previous => {
        const selected = previous.moments?.find(item => item.category === category);
        return selected ? { ...previous, moments: [selected, ...previous.moments!.filter(item => item.category !== category)] } : previous;
      });
    } catch { showError(); } finally { setBusy(false); }
  };
  return <View style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <Copy accessibilityRole="header" style={{ fontSize: 22, lineHeight: 28, fontWeight: '600' }}>Mi momento</Copy>
      <ItemActions label="Añadir o editar Mi momento" actions={[
        ...momentCategories.map(category => ({ label: `${featured?.category === category.value ? 'Editar' : moments.some(item => item.category === category.value) ? 'Destacar' : 'Añadir'} ${category.label.toLocaleLowerCase('es')}`, disabled: busy, onPress: () => {
          if (moments.some(item => item.category === category.value) && featured?.category !== category.value) void highlight(category.value);
          else router.push({ pathname: '/moment', params: { category: category.value } });
        } })),
        ...(featured ? [{ label: 'Terminar y recomendar', disabled: busy, onPress: () => router.push({ pathname: '/compose', params: { moment: featured.category } }) }] : []),
        ...(state.moments || []).filter(item => item.status === 'finished').map(item => ({ label: `Revisar ${momentCategories.find(category => category.value === item.category)!.label.toLocaleLowerCase('es')} guardado`, onPress: () => router.push({ pathname: '/moment', params: { category: item.category } }) })),
        { label: state.song ? 'Cambiar canción' : 'Añadir canción', onPress: () => router.push('/song') },
      ]} />
    </View>
    {!featured && !state.song && <Copy muted style={{ fontSize: 14, lineHeight: 21 }}>Añade tu serie o lectura actual desde el menú. Lo de «solo un capítulo» lo hablamos otro día.</Copy>}
    {featured && kind && <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${kind.label.toLocaleLowerCase('es')}: ${featured.title}`} onPress={() => router.push({ pathname: '/moment', params: { category: featured.category } })} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 12, backgroundColor: p.surface, opacity: pressed ? 0.7 : 1 })}>
        {featured.coverUrl ? <LoadingImage source={featured.coverUrl} contentFit="contain" style={{ width: 64, height: 88, borderRadius: 6 }} /> : <View style={{ width: 64, height: 88, borderRadius: 6, backgroundColor: p.soft, alignItems: 'center', justifyContent: 'center' }}><CategoryIcon category={featured.category} size={28} /></View>}
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Copy muted style={{ fontSize: 12 }}>{kind.current}</Copy>
          <Copy style={{ fontSize: 18, lineHeight: 24, fontWeight: '600' }}>{featured.title}</Copy>
        </View>
      </Pressable>}
    {state.song && <MomentSong compact />}
  </View>;
}
