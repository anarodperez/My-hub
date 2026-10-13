import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { CoverPicker } from '@/components/cover-picker';
import { Action, Chips, Copy, Field, Screen, TextAction, s, showError } from '@/components/hub-ui';
import { discardCover, persistCover } from '@/features/hub/covers';
import { isWebLink, type Category, type Wish } from '@/features/hub/model';
import { useHub } from '@/features/hub/provider';

export default function WishScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, loading } = useHub();
  const existing = state.wishes?.find((wish) => wish.id === id);
  if (loading) return <Screen back title="Wishlist"><Copy>Cargando…</Copy></Screen>;
  if (id && !existing) return <Screen back title="Wishlist"><Copy>Este deseo ya no está disponible.</Copy></Screen>;
  return <WishEditor key={id || 'new'} existing={existing} />;
}

function WishEditor({ existing }: { existing?: Wish }) {
  const { update } = useHub();
  const [title, setTitle] = useState(existing?.title || '');
  const [category, setCategory] = useState<Category>(existing?.category || 'product');
  const [coverUrl, setCoverUrl] = useState(existing?.coverUrl || '');
  const [link, setLink] = useState(existing?.link || '');
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = async () => {
    if (busy || picking) return;
    const invalid: Record<string, string> = {};
    if (!title.trim()) invalid.title = 'Escribe lo que te gustaría leer, ver, comprar o visitar.';
    if (link.trim() && !isWebLink(link.trim())) invalid.link = 'Usa un enlace completo http o https.';
    setErrors(invalid);
    if (Object.keys(invalid).length) return;
    setBusy(true);
    let savedCover = coverUrl;
    try {
      if (coverUrl && coverUrl !== existing?.coverUrl) savedCover = await persistCover(coverUrl);
      const wish: Wish = { id: existing?.id || `wish-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title: title.trim(), category, coverUrl: savedCover, completed: existing?.completed || false, ...(link.trim() ? { link: link.trim() } : {}) };
      await update((previous) => ({ ...previous, wishes: [wish, ...(previous.wishes || []).filter((item) => item.id !== wish.id)] }));
      if (existing?.coverUrl && existing.coverUrl !== savedCover) discardCover(existing.coverUrl);
      router.back();
    } catch { if (savedCover !== coverUrl) discardCover(savedCover); showError(); } finally { setBusy(false); }
  };
  const remove = () => {
    const perform = async () => {
      setBusy(true);
      try {
        await update((previous) => ({ ...previous, wishes: (previous.wishes || []).filter((item) => item.id !== existing?.id) }));
        if (existing?.coverUrl) discardCover(existing.coverUrl);
        router.back();
      } catch { showError(); } finally { setBusy(false); }
    };
    if (Platform.OS === 'web') { if (globalThis.confirm('¿Eliminar este deseo?')) void perform(); }
    else Alert.alert('¿Eliminar este deseo?', 'No se puede deshacer.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: () => { void perform(); } }]);
  };
  return <Screen back title={existing ? 'Editar deseo' : 'Añadir a wishlist'}>
    <Copy style={s.title}>Algo que te hace ilusión</Copy>
    <Copy muted>Para leer, ver, comprar o visitar cuando llegue el momento.</Copy>
    <Chips value={category} recommendations onChange={(value) => { if (value !== 'all') setCategory(value); }} />
    <Field label="¿Qué te gustaría?" value={title} onChangeText={setTitle} placeholder="Un libro, una vela, un restaurante…" maxLength={150} error={errors.title} />
    <Field label="Enlace (opcional)" value={link} onChangeText={setLink} placeholder="https://…" keyboardType="url" autoCapitalize="none" autoCorrect={false} maxLength={2000} error={errors.link} />
    <CoverPicker uri={coverUrl} onChange={setCoverUrl} busy={busy || picking} onBusyChange={setPicking} />
    <Action disabled={busy || picking} onPress={() => { void save(); }}>{busy ? 'Guardando…' : existing ? 'Guardar cambios' : 'Añadir a mi wishlist'}</Action>
    {existing && <TextAction danger disabled={busy || picking} onPress={remove}>Eliminar deseo</TextAction>}
  </Screen>;
}
