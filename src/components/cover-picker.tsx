import { LoadingImage as Image } from '@/components/loading-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';
import { ImageSquareIcon } from 'phosphor-react-native/src/icons/ImageSquare';
import { ArrowRightIcon, PencilSimpleIcon, XIcon } from './hub-icons';
import { Copy, s } from './hub-ui';
import { usePalette } from '@/features/hub/provider';

export function CoverPicker({ uri, onChange, busy, onBusyChange, variant = 'default' }: { uri: string; onChange: (uri: string) => void; busy: boolean; onBusyChange: (busy: boolean) => void; variant?: 'default' | 'poster' }) {
  const p = usePalette();
  const [error, setError] = useState<string | null>(null);
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const pick = async () => {
    if (busy) return;
    setError(null);
    onBusyChange(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, base64: Platform.OS === 'web' });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.uri) throw new Error('No se ha podido abrir la foto.');
      setFailedUri(null);
      onChange(Platform.OS === 'web' && asset.base64 ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}` : asset.uri);
    } catch {
      setError('No se ha podido abrir la galería. Revisa los permisos de fotos y vuelve a intentarlo.');
    } finally { onBusyChange(false); }
  };
  if (variant === 'poster') return <View style={{ gap: 8 }}>
    <View style={{ width: '100%', backgroundColor: p.soft }}>
      <Pressable disabled={busy} accessibilityRole="button" accessibilityLabel={uri ? 'Cambiar foto adjunta' : 'Elegir foto de la galería'} accessibilityState={{ disabled: busy }} onPress={() => { void pick(); }} style={({ pressed }) => ({ width: '100%', minHeight: 220, aspectRatio: uri && uri !== failedUri ? 1.4 : undefined, alignItems: 'center', justifyContent: 'center', gap: 12, padding: uri && uri !== failedUri ? 0 : 24, backgroundColor: p.soft, opacity: busy ? 0.6 : pressed ? 0.85 : 1 })}>
        {uri && uri !== failedUri ? <Image source={uri} contentFit="contain" onError={() => setFailedUri(uri)} style={{ width: '100%', height: '100%' }} accessibilityLabel="Vista previa de la foto adjunta" /> : <>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center' }}>{busy ? <ActivityIndicator color={p.accent} /> : <ImageSquareIcon size={30} weight="duotone" color={p.accent} />}</View>
          <Copy style={{ color: p.accent, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>{uri ? 'Elegir otra foto' : 'Dale una imagen a tu descubrimiento'}</Copy>
          <Copy style={{ color: p.muted, fontSize: 13, textAlign: 'center' }}>Añadir foto · Opcional</Copy>
        </>}
        {!!uri && uri !== failedUri && <View pointerEvents="none" style={{ position: 'absolute', left: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: p.surface }}><PencilSimpleIcon size={16} color={p.accent} /><Copy style={{ fontSize: 13, color: p.accent, fontWeight: '600' }}>Cambiar foto</Copy></View>}
      </Pressable>
      {!!uri && <Pressable disabled={busy} accessibilityRole="button" accessibilityLabel="Quitar foto adjunta" accessibilityState={{ disabled: busy }} onPress={() => { onChange(''); setFailedUri(null); setError(null); }} style={({ pressed }) => ({ position: 'absolute', top: 4, right: 4, width: 48, height: 48, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : pressed ? 0.7 : 1 })}><View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center' }}><XIcon size={16} color={p.text} /></View></Pressable>}
    </View>
    {uri === failedUri && <Copy accessibilityRole="alert" style={{ paddingHorizontal: 16, color: p.danger, fontSize: 13 }}>No se puede mostrar esta foto. Puedes elegir otra.</Copy>}
    {!!error && <Copy accessibilityRole="alert" style={{ paddingHorizontal: 16, color: p.danger, fontSize: 13 }}>{error}</Copy>}
  </View>;
  return <View style={{ gap: 10 }}>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}><Copy style={s.fieldLabel}>Foto</Copy><Copy muted style={{ fontSize: 12, lineHeight: 18 }}>Opcional</Copy></View>
    {uri ? <View style={{ width: 124, height: 124, paddingTop: 12 }}>
      <Pressable disabled={busy} accessibilityRole="button" accessibilityLabel="Cambiar foto adjunta" accessibilityState={{ disabled: busy }} onPress={() => { void pick(); }} style={({ pressed }) => ({ width: 108, height: 108, borderRadius: 14, overflow: 'hidden', backgroundColor: p.soft, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}>
        {uri !== failedUri ? <Image source={uri} onError={() => setFailedUri(uri)} contentFit="cover" style={{ width: '100%', height: '100%' }} accessibilityLabel="Vista previa de la foto adjunta" /> : <ImageSquareIcon size={28} color={p.muted} />}
        <View pointerEvents="none" style={{ position: 'absolute', right: 6, bottom: 6, width: 24, height: 24, borderRadius: 8, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center' }}><PencilSimpleIcon size={13} color={p.accent} /></View>
      </Pressable>
      <Pressable disabled={busy} accessibilityRole="button" accessibilityLabel="Quitar foto adjunta" accessibilityState={{ disabled: busy }} onPress={() => { onChange(''); setFailedUri(null); setError(null); }} style={({ pressed }) => ({ position: 'absolute', top: 0, right: 0, width: 48, height: 48, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : pressed ? 0.7 : 1 })}>
        <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center' }}><XIcon size={14} color={p.text} weight="bold" /></View>
      </Pressable>
    </View> : <Pressable disabled={busy} accessibilityRole="button" accessibilityLabel="Elegir foto de la galería" accessibilityState={{ disabled: busy }} onPress={() => { void pick(); }} style={({ pressed }) => ({ minHeight: 88, padding: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: p.line, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: pressed ? p.soft : p.surface, opacity: busy ? 0.5 : 1 })}>
      <View style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: p.soft }}>{busy ? <ActivityIndicator size="small" color={p.accent} /> : <ImageSquareIcon size={24} weight="duotone" color={p.accent} />}</View>
      <Copy style={{ flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '600', color: p.accent }}>Elegir foto</Copy><ArrowRightIcon size={18} color={p.muted} />
    </Pressable>}
    {uri === failedUri && <Copy style={{ color: p.danger, fontSize: 13 }}>No se puede mostrar esta foto. Puedes elegir otra.</Copy>}
    {error && <Copy accessibilityRole="alert" style={{ color: p.danger, fontSize: 13 }}>{error}</Copy>}
  </View>;
}
