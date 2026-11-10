import { goBackOr } from '@/features/hub/navigation';
import { MotionReveal } from '@/components/hub-motion';
import { randomUUID } from 'expo-crypto';
import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Platform, View, type TextInputInstance } from 'react-native';
import { CoverPicker } from '@/components/cover-picker';
import { ProductLinkField } from '@/components/product-link-field';
import { Chips, Copy, Field, Screen, showError, SaveAction, TextAction } from '@/components/hub-ui';
import { discardCover, persistCover } from '@/features/hub/covers';
import { isWebLink, type Category, type Wish } from '@/features/hub/model';
import { useHub } from '@/features/hub/provider';
import { WishCollectionPicker } from '@/components/wish-collection-picker';
import { assignCollection, wishlistOrganization } from '@/features/hub/wishlist-collections';

export default function WishScreen() {
  const { id, collection } = useLocalSearchParams<{ id?: string; collection?: string }>();
  const { state, loading } = useHub();
  const existing = state.wishes?.find((wish) => wish.id === id);
  if (loading) return <Screen back title="Wishlist"><Copy>Cargando…</Copy></Screen>;
  if (id && !existing) return <Screen back title="Wishlist"><Copy>Este deseo ya no está disponible.</Copy></Screen>;
  return <WishEditor key={id || 'new'} existing={existing} initialCollection={collection} />;
}

function WishEditor({ existing, initialCollection }: { existing?: Wish; initialCollection?: string }) {
  const { state, update } = useHub();
  const organization = wishlistOrganization(state);
  const [wishId] = useState(() => existing?.id || randomUUID());
  const savedWish = state.wishes?.find(wish => wish.id === wishId);
  const [collection, setCollection] = useState(existing ? organization.assignments[`wish:${existing.id}`] || 'unassigned' : organization.collections.some(c => c.id === initialCollection) ? initialCollection! : 'unassigned');
  const titleInput = useRef<TextInputInstance>(null);
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
      if (coverUrl && coverUrl !== existing?.coverUrl && !isWebLink(coverUrl)) savedCover = await persistCover(coverUrl);
      const wish: Wish = { id: wishId, title: title.trim(), category, coverUrl: savedCover, completed: existing?.completed || false, ...(link.trim() ? { link: link.trim() } : {}) };
      await update((previous) => assignCollection({ ...previous, wishes: [wish, ...(previous.wishes || []).filter((item) => item.id !== wish.id)] }, `wish:${wish.id}`, collection));
      if (existing?.coverUrl && existing.coverUrl !== savedCover) discardCover(existing.coverUrl);
      goBackOr('/library');
    } catch { if (savedCover !== coverUrl) discardCover(savedCover); showError(); } finally { setBusy(false); }
  };
  const remove = () => {
    const perform = async () => {
      setBusy(true);
      try {
        await update((previous) => assignCollection({ ...previous, wishes: (previous.wishes || []).filter((item) => item.id !== existing?.id) }, `wish:${existing!.id}`, 'unassigned'));
        if (existing?.coverUrl) discardCover(existing.coverUrl);
        goBackOr('/library');
      } catch { showError(); } finally { setBusy(false); }
    };
    if (Platform.OS === 'web') { if (globalThis.confirm('¿Eliminar este deseo?')) void perform(); }
    else Alert.alert('¿Eliminar este deseo?', 'No se puede deshacer.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: () => { void perform(); } }]);
  };
  return <Screen back title={existing ? 'Editar deseo' : 'Añadir a wishlist'}>
    {!existing && savedWish && <Copy accessibilityLiveRegion="polite">Tu deseo está guardado. Vuelve a guardar para completar su organización.</Copy>}
    <WishCollectionPicker value={collection} onChange={setCollection} disabled={busy || picking} />
    <Chips value={category} recommendations onChange={(value) => { if (value !== 'all') setCategory(value); }} />
    {category === 'product' && <MotionReveal><ProductLinkField value={link} onChangeText={setLink} onManual={() => titleInput.current?.focus()} disabled={busy || picking} error={errors.link} onMetadata={(data) => {
      setTitle(current => current.trim() ? current : data.title);
      setCoverUrl(current => current || data.coverUrl);
    }} /></MotionReveal>}
    <View style={{ gap: 16 }}>
      <Field inputRef={titleInput} label={category === 'product' ? 'Nombre del producto' : '¿Qué te gustaría?'} value={title} onChangeText={setTitle} placeholder={category === 'product' ? 'Por ejemplo, una silla de escritorio' : 'Un libro, una vela, un restaurante…'} maxLength={150} error={errors.title} />
      {category === 'product' && <MotionReveal><CoverPicker uri={coverUrl} onChange={setCoverUrl} busy={busy || picking} onBusyChange={setPicking} /></MotionReveal>}
    </View>
    {category !== 'product' && <>
      <Field label="Enlace (opcional)" value={link} onChangeText={setLink} placeholder="https://…" keyboardType="url" autoCapitalize="none" autoCorrect={false} maxLength={2000} error={errors.link} />
      <CoverPicker uri={coverUrl} onChange={setCoverUrl} busy={busy || picking} onBusyChange={setPicking} />
    </>}
    <SaveAction busy={busy} disabled={picking} onPress={() => { void save(); }}>{existing ? 'Guardar cambios' : 'Añadir a mi wishlist'}</SaveAction>
    {existing && <View style={{ alignSelf: 'center' }}><TextAction danger disabled={busy || picking} onPress={remove}>Eliminar deseo</TextAction></View>}
  </Screen>;
}
