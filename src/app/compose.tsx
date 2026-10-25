import { randomUUID } from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, View, type TextInput } from 'react-native';
import { RatingInput } from '@/components/rating-input';
import { CoverPicker } from '@/components/cover-picker';
import { ProductLinkField } from '@/components/product-link-field';
import { CalendarReminder } from '@/components/calendar-reminder';
import { Action, CategoryIcon, Chips, ChoiceTabs, Copy, Field, Privacy, Screen, Surface, TextAction, s, showError, SaveAction } from '@/components/hub-ui';
import { isLocalDate, isWebLink, localDate, parseAmountCents, type Category } from '@/features/hub/model';
import { useHub } from '@/features/hub/provider';
import type { GroupRow, Visibility } from '@/features/hub/backend-types';
import { discardCover, persistCover } from '@/features/hub/covers';

export default function ComposeScreen() {
  const params = useLocalSearchParams<{ kind?: string; id?: string; date?: string }>();
  const { state, loading, repository } = useHub();
  if (params.kind === 'subscription') return <Screen back title="Apartado retirado"><Copy>Este apartado ya no está disponible.</Copy></Screen>;
  if (loading) return <Screen back title="Cargando" ><Copy>Cargando tus datos…</Copy></Screen>;
  const kind = params.kind === 'event' ? 'event' : 'recommendation';
  const existing = kind === 'event' ? state.events.find((item) => item.id === params.id) : state.recommendations.find((item) => item.id === params.id);
  if (kind === 'recommendation' && existing && 'ownerId' in existing && existing.ownerId && existing.ownerId !== repository?.accountId) return <Screen back title="Descubrimiento"><Copy>Solo el autor puede editar esta publicación.</Copy></Screen>;
  if (params.id && !existing) return <Screen back title="No encontrado"><Copy>Este elemento ya no está disponible.</Copy><Action onPress={() => router.back()}>Volver</Action></Screen>;
  return <Editor key={`${kind}-${params.id || 'new'}`} kind={kind} id={params.id} date={params.date} />;
}
function Editor({ kind, id, date }: { kind: 'recommendation' | 'event'; id?: string; date?: string }) {
  const { state, update, repository } = useHub();
  const titleInput = useRef<TextInput>(null);
  const recommendation = state.recommendations.find((item) => item.id === id);
  const event = state.events.find((item) => item.id === id);
  const [visibility, setVisibility] = useState<Visibility>(recommendation?.visibility || 'private');
  const [groupId, setGroupId] = useState(recommendation?.groupId || '');
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [groupError, setGroupError] = useState('');
  useEffect(() => { let active = true; if (repository) void repository.listGroups().then((rows) => { if (active) setGroups(rows); }).catch(() => { if (active) setGroupError('No se pudieron cargar los grupos.'); }); return () => { active = false; }; }, [repository]);
  const [title, setTitle] = useState(recommendation?.title || event?.title || '');
  const [category, setCategory] = useState<Category>(recommendation?.category || event?.category || 'book');
  const [opinion, setOpinion] = useState(recommendation?.opinion || '');
  const [rating, setRating] = useState(recommendation?.rating || 5);
  const [coverUrl, setCoverUrl] = useState(recommendation?.coverUrl || '');
  const [entryDate, setEntryDate] = useState(event?.date || date || localDate(new Date()));
  const [amount, setAmount] = useState(recommendation?.priceCents !== undefined ? (recommendation.priceCents / 100).toFixed(2).replace('.', ',') : '');
  const [location, setLocation] = useState(recommendation?.location || '');
  const [link, setLink] = useState(recommendation?.link || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [ratingDragging, setRatingDragging] = useState(false);
  const heading = kind === 'recommendation' ? 'Una buena recomendación' : 'Un plan que esperar';
  const save = async () => {
    if (busy || picking) return;
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) nextErrors.title = 'Escribe un título.';
    if (kind === 'recommendation' && !opinion.trim()) nextErrors.opinion = 'Cuéntanos qué te ha gustado.';
    if (kind !== 'recommendation' && !isLocalDate(entryDate)) nextErrors.date = 'Usa una fecha válida: AAAA-MM-DD.';
    const cents = parseAmountCents(amount);
    if (kind === 'recommendation' && category === 'product' && amount.trim() && cents === null) nextErrors.amount = 'Escribe un importe válido, por ejemplo 19,99.';
    if (kind === 'recommendation' && (category === 'product' || category === 'place') && link.trim() && !isWebLink(link.trim())) nextErrors.link = 'Usa un enlace completo http o https.';
    if (kind === 'recommendation' && visibility === 'group' && !groups.some((group) => group.id === groupId)) nextErrors.visibility = 'Elige un grupo al que pertenezcas.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setBusy(true);
    const itemId = id || randomUUID();
    let savedCover = coverUrl;
    try {
      if (kind === 'recommendation' && coverUrl && coverUrl !== recommendation?.coverUrl && !isWebLink(coverUrl)) savedCover = await persistCover(coverUrl);
      await update((previous) => {
        if (kind === 'recommendation') return { ...previous, recommendations: [{ id: itemId, title: title.trim(), category, opinion: opinion.trim(), rating, visibility, groupId: visibility === 'group' ? groupId : undefined, coverUrl: savedCover, createdAt: recommendation?.createdAt || new Date().toISOString(), ...(recommendation?.sample ? { sample: true } : {}), ...(category === 'product' && amount.trim() ? { priceCents: cents! } : {}), ...(category === 'place' && location.trim() ? { location: location.trim() } : {}), ...((category === 'product' || category === 'place') && link.trim() ? { link: link.trim() } : {}) }, ...previous.recommendations.filter((item) => item.id !== itemId)] };
        return { ...previous, events: [...previous.events.filter((item) => item.id !== itemId), { id: itemId, title: title.trim(), category, date: entryDate }] };
      });
      if (kind === 'recommendation' && recommendation?.coverUrl && recommendation.coverUrl !== savedCover) discardCover(recommendation.coverUrl);
      router.back();
    } catch {
      if (savedCover !== coverUrl) discardCover(savedCover);
      showError();
    } finally { setBusy(false); }
  };
  const removeFromWishlist = async () => {
    if (busy || picking || !id) return;
    setBusy(true);
    try {
      await update((previous) => ({ ...previous, saved: previous.saved.filter((entry) => entry.recommendationId !== id) }));
      router.back();
    } catch { showError(); } finally { setBusy(false); }
  };
  const remove = () => {
    const perform = async () => {
      setBusy(true);
      try {
        await update((previous) => ({ ...previous, recommendations: kind === 'recommendation' ? previous.recommendations.filter((item) => item.id !== id) : previous.recommendations, saved: kind === 'recommendation' ? previous.saved.filter((item) => item.recommendationId !== id) : previous.saved, events: kind === 'event' ? previous.events.filter((item) => item.id !== id) : previous.events }));
        if (kind === 'recommendation' && recommendation?.coverUrl) discardCover(recommendation.coverUrl);
        router.back();
      } catch { showError(); } finally { setBusy(false); }
    };
    if (Platform.OS === 'web') { if (globalThis.confirm('¿Eliminar este elemento? No se puede deshacer.')) void perform(); }
    else Alert.alert('¿Eliminar este elemento?', 'No se puede deshacer.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: () => { void perform(); } }]);
  };
  return <Screen back scrollEnabled={!ratingDragging} title={id ? 'Editar' : kind === 'recommendation' ? 'Recomendar' : 'Añadir evento'}>
    <View style={{ gap: 8 }}>
      <Copy accessibilityRole="header" style={s.title}>{heading}</Copy>
      <Copy muted style={{ fontSize: 14 }}>{kind === 'recommendation' ? 'Comparte lo que has descubierto y por qué merece la pena.' : 'Hazle un hueco en tu calendario personal.'}</Copy>
    </View>
    <Chips value={category} recommendations={kind === 'recommendation'} onChange={(value) => { if (value !== 'all') setCategory(value); }} />
    {kind === 'recommendation' && category === 'product' && <ProductLinkField value={link} onChangeText={setLink} onManual={() => titleInput.current?.focus()} disabled={busy || picking} error={errors.link} onMetadata={(data) => {
      setTitle(current => current.trim() ? current : data.title);
      setCoverUrl(current => current || data.coverUrl);
      setAmount(current => current.trim() ? current : data.amount);
    }} />}
    <View style={{ gap: 16 }}>
      {kind === 'recommendation' && category === 'product' && <CoverPicker uri={coverUrl} onChange={setCoverUrl} busy={busy || picking} onBusyChange={setPicking} />}
      <Field inputRef={titleInput} label={kind === 'recommendation' && category === 'product' ? 'Nombre del producto' : kind === 'recommendation' && category === 'place' ? 'Nombre del sitio' : 'Título'} value={title} onChangeText={setTitle} placeholder={kind === 'recommendation' && category === 'product' ? '¿Qué has comprado?' : kind === 'recommendation' && category === 'place' ? '¿Dónde has estado?' : '¿Qué historia tienes en mente?'} error={errors.title} maxLength={150} />
      {kind === 'recommendation' && category === 'product' && <Field label="Precio en euros (opcional)" value={amount} onChangeText={setAmount} placeholder="19,99" keyboardType="decimal-pad" error={errors.amount} />}
    </View>
    {kind === 'recommendation' ? <>
      <Field label="¿Por qué lo recomiendas?" value={opinion} onChangeText={setOpinion} placeholder={category === 'product' ? 'Lo que te gusta, cómo lo usas…' : category === 'place' ? 'Qué pedir, el ambiente, qué te encantó…' : 'Lo que te hizo sentir, sin spoilers…'} multiline error={errors.opinion} maxLength={2000} />
      {category === 'place' && <Field label="Ubicación (opcional)" value={location} onChangeText={setLocation} placeholder="Ciudad, barrio o dirección" maxLength={250} />}
      {category === 'place' && <Field label="Web o enlace del sitio (opcional)" value={link} onChangeText={setLink} placeholder="https://…" keyboardType="url" autoCapitalize="none" autoCorrect={false} error={errors.link} maxLength={2000} />}
      <RatingInput value={rating} onChange={setRating} onInteractionChange={setRatingDragging} />
      {category !== 'product' && <>
        <CoverPicker uri={coverUrl} onChange={setCoverUrl} busy={busy || picking} onBusyChange={setPicking} />
        <Surface><View style={s.inline}><CategoryIcon category={category} /><Copy muted style={s.small}>Vista previa</Copy></View><Copy style={{ fontSize: 22, fontWeight: '600' }}>{title.trim() || 'El título de tu recomendación'}</Copy><Copy muted>{opinion.trim() || 'Aquí aparecerá tu opinión.'}</Copy></Surface>
      </>}
    </> : <>
      <Field label="Fecha (AAAA-MM-DD)" value={entryDate} onChangeText={setEntryDate} placeholder="2026-10-24" keyboardType="numbers-and-punctuation" maxLength={10} error={errors.date} />
      <Privacy>Este evento es privado</Privacy>
    </>}
    {kind === 'recommendation' && <View style={{ gap: 10 }}><Copy style={s.fieldLabel}>Quién puede verlo</Copy><ChoiceTabs value={visibility} onChange={setVisibility} options={[{ value: 'private', label: 'Solo yo' }, { value: 'public', label: 'Usuarios' }, { value: 'group', label: 'Grupo' }]} />{visibility === 'group' && <View style={{ gap: 6 }}>{groups.map((group) => <TextAction key={group.id} onPress={() => setGroupId(group.id)}>{group.name}</TextAction>)}{!groups.length && <TextAction onPress={() => router.push('/groups')}>Crear o unirme a un grupo</TextAction>}{!!groupError && <Copy accessibilityRole="alert">{groupError}</Copy>}</View>}{errors.visibility && <Copy accessibilityRole="alert">{errors.visibility}</Copy>}</View>}
    <SaveAction onPress={() => { void save(); }} busy={busy} disabled={picking}>{id ? 'Guardar cambios' : kind === 'recommendation' ? 'Guardar recomendación' : 'Añadir a mi calendario'}</SaveAction>
    {kind === 'event' && event && (title.trim() === event.title && entryDate === event.date ? <CalendarReminder event={event} /> : <Copy muted>Guarda los cambios del plan antes de ajustar su recordatorio.</Copy>)}
    {kind === 'recommendation' && id && state.saved.some((entry) => entry.recommendationId === id) && <TextAction disabled={busy || picking} onPress={() => { void removeFromWishlist(); }}>Quitar de wishlist</TextAction>}
    {id && <View style={{ alignSelf: 'center' }}><TextAction danger disabled={busy || picking} onPress={remove}>Eliminar</TextAction></View>}
    <Copy muted style={{ fontSize: 12, lineHeight: 19, textAlign: 'center' }}>Guardado en tu cuenta.</Copy>
  </Screen>;
}
