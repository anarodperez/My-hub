import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { ImageSquareIcon } from 'phosphor-react-native/src/icons/ImageSquare';
import { Copy, TextAction, s } from './hub-ui';
import { usePalette } from '@/features/hub/provider';

export function CoverPicker({ uri, onChange, busy, onBusyChange }: { uri: string; onChange: (uri: string) => void; busy: boolean; onBusyChange: (busy: boolean) => void }) {
  const p = usePalette();
  const [error, setError] = useState<string | null>(null);
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const pick = async () => {
    setError(null);
    onBusyChange(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, base64: Platform.OS === 'web' });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.uri) throw new Error('No se ha podido abrir la foto.');
      setFailedUri(null);
      onChange(Platform.OS === 'web' && asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri);
    } catch {
      setError('No se ha podido abrir la galería. Revisa los permisos de fotos y vuelve a intentarlo.');
    } finally { onBusyChange(false); }
  };
  return <View style={{ gap: 12 }}>
    <Copy style={s.fieldLabel}>Foto (opcional)</Copy>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      {uri && uri !== failedUri ? <Image source={uri} onError={() => setFailedUri(uri)} contentFit="cover" style={{ width: 92, height: 128, borderRadius: 10 }} accessibilityLabel="Vista previa de la portada adjunta" /> : <View style={{ width: 92, height: 128, borderRadius: 10, backgroundColor: p.soft, alignItems: 'center', justifyContent: 'center' }}><ImageSquareIcon size={32} weight="duotone" color={p.accent} /></View>}
      <View style={[s.fill, { gap: 8 }]}>
        <TextAction disabled={busy} onPress={() => { void pick(); }} icon={<ImageSquareIcon size={20} color={p.accent} />}>{uri ? 'Cambiar foto' : 'Adjuntar foto'}</TextAction>
        {uri && <TextAction disabled={busy} danger onPress={() => { onChange(''); setError(null); }}>Quitar foto</TextAction>}
      </View>
    </View>
    <Copy muted style={s.small}>Elige una imagen de tu galería. Se guardará con la recomendación en este dispositivo.</Copy>
    {uri === failedUri && <Copy style={{ color: p.danger, fontSize: 13 }}>No se puede mostrar esta foto. Puedes elegir otra.</Copy>}
    {error && <Copy accessibilityRole="alert" style={{ color: p.danger, fontSize: 13 }}>{error}</Copy>}
  </View>;
}
