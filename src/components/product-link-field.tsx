import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Copy, Field, TextAction } from '@/components/hub-ui';
import { fetchProductMetadata, productLink, type ProductMetadata } from '@/features/hub/product-metadata';

export function ProductLinkField({ value, onChangeText, onMetadata, onManual, disabled = false, error }: {
  value: string; onChangeText: (value: string) => void; onMetadata: (data: ProductMetadata) => void; onManual?: () => void; disabled?: boolean; error?: string;
}) {
  const initial = useRef(value);
  const apply = useRef(onMetadata);
  const [retry, setRetry] = useState(0);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => { apply.current = onMetadata; }, [onMetadata]);
  useEffect(() => {
    setStatus('');
    setLoading(false);
    setFailed(false);
    if (disabled || !productLink(value) || (value === initial.current && !retry)) return;
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setStatus('Buscando datos del producto…');
      void fetchProductMetadata(value, controller.signal).then(data => {
        if (!active) return;
        apply.current(data);
        setStatus('Datos listos. Revísalos antes de guardar.');
      }).catch(failure => {
        if (active) {
          setFailed(true);
          setStatus(failure instanceof Error && failure.name !== 'AbortError' ? failure.message : 'La consulta ha tardado demasiado. Puedes rellenar los datos manualmente.');
        }
      }).finally(() => { if (active) setLoading(false); });
    }, 800);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [value, disabled, retry]);
  return <View style={{ gap: 8 }}>
    <Field label="Enlace del producto (opcional)" value={value} onChangeText={onChangeText} placeholder="Pega aquí el enlace del producto" keyboardType="url" autoCapitalize="none" autoCorrect={false} maxLength={2000} error={error} editable={!disabled} />
    <Copy muted style={{ fontSize: 12, lineHeight: 18 }}>Microlink recibe el enlace y completa los campos vacíos.</Copy>
    {!value.trim() && onManual && <TextAction disabled={disabled} onPress={onManual}>Rellenar manualmente</TextAction>}
    {!!status && <Copy muted accessibilityLiveRegion="polite">{status}</Copy>}
    {failed && <TextAction disabled={disabled || loading || !productLink(value)} onPress={() => setRetry(count => count + 1)}>Consultar de nuevo</TextAction>}
  </View>;
}
