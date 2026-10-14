import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { RatingInput } from '@/components/rating-input';
import { CoverPicker } from '@/components/cover-picker';
import { ItemActions } from '@/components/item-actions';
import { Action, CategoryIcon, Chips, ChoiceTabs, Copy, Field, Privacy, Screen, Surface, s, showError } from '@/components/hub-ui';
import { isLocalDate, isWebLink, localDate, parseAmountCents, type Category } from '@/features/hub/model';
import { useHub } from '@/features/hub/provider';
import { discardCover, persistCover } from '@/features/hub/covers';

export default function ComposeScreen() {
  const params = useLocalSearchParams<{ kind?: string; id?: string; date?: string }>();
  const { state, loading } = useHub();
  if (loading) return <Screen back title="Cargando" ><Copy>Cargando tus datos…</Copy></Screen>;
  const kind = params.kind === 'event' || params.kind === 'subscription' ? params.kind : 'recommendation';
  const existing = kind === 'event' ? state.events.find((item) => item.id === params.id) : kind === 'subscription' ? state.subscriptions.find((item) => item.id === params.id) : state.recommendations.find((item) => item.id === params.id);
  if (params.id && !existing) return <Screen back title="No encontrado"><Copy>Este elemento ya no está disponible.</Copy><Action onPress={() => router.back()}>Volver</Action></Screen>;
  return <Editor key={`${kind}-${params.id || 'new'}`} kind={kind} id={params.id} date={params.date} />;
}
function Editor({ kind, id, date }: { kind: 'recommendation' | 'event' | 'subscription'; id?: string; date?: string }) {
  const { state, update } = useHub();
  const recommendation = state.recommendations.find((item) => item.id === id);
  const event = state.events.find((item) => item.id === id);
  const subscription = state.subscriptions.find((item) => item.id === id);
  const [title, setTitle] = useState(recommendation?.title || event?.title || subscription?.name || '');
  const [category, setCategory] = useState<Category>(recommendation?.category || event?.category || 'book');
  const [opinion, setOpinion] = useState(recommendation?.opinion || '');
  const [rating, setRating] = useState(recommendation?.rating || 5);
  const [coverUrl, setCoverUrl] = useState(recommendation?.coverUrl || '');
  const [entryDate, setEntryDate] = useState(event?.date || subscription?.nextDate || date || localDate(new Date()));
  const [amount, setAmount] = useState(subscription ? (subscription.amountCents / 100).toFixed(2).replace('.', ',') : recommendation?.priceCents !== undefined ? (recommendation.priceCents / 100).toFixed(2).replace('.', ',') : '');
  const [location, setLocation] = useState(recommendation?.location || '');
  const [link, setLink] = useState(recommendation?.link || '');
  const [frequency, setFrequency] = useState<'monthly' | 'yearly'>(subscription?.frequency || 'monthly');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [ratingDragging, setRatingDragging] = useState(false);
  const heading = kind === 'recommendation' ? 'Una buena recomendación' : kind === 'event' ? 'Un plan que esperar' : 'Todo bajo control';
  const save = async () => {
    if (busy || picking) return;
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) nextErrors.title = kind === 'subscription' ? 'Escribe el nombre del servicio.' : 'Escribe un título.';
    if (kind === 'recommendation' && !opinion.trim()) nextErrors.opinion = 'Cuéntanos qué te ha gustado.';
    if (kind !== 'recommendation' && !isLocalDate(entryDate)) nextErrors.date = 'Usa una fecha válida: AAAA-MM-DD.';
    const cents = parseAmountCents(amount);
    if (kind === 'subscription' && cents === null) nextErrors.amount = 'Escribe un importe válido, por ejemplo 9,99.';
    if (kind === 'recommendation' && category === 'product' && amount.trim() && cents === null) nextErrors.amount = 'Escribe un importe válido, por ejemplo 19,99.';
    if (kind === 'recommendation' && (category === 'product' || category === 'place') && link.trim() && !isWebLink(link.trim())) nextErrors.link = 'Usa un enlace completo http o https.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setBusy(true);
    const itemId = id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    let savedCover = coverUrl;
    try {
      if (kind === 'recommendation' && coverUrl && coverUrl !== recommendation?.coverUrl) savedCover = await persistCover(coverUrl);
      await update((previous) => {
        if (kind === 'recommendation') return { ...previous, recommendations: [{ id: itemId, title: title.trim(), category, opinion: opinion.trim(), rating, coverUrl: savedCover, createdAt: recommendation?.createdAt || new Date().toISOString(), ...(recommendation?.sample ? { sample: true } : {}), ...(category === 'product' && amount.trim() ? { priceCents: cents! } : {}), ...(category === 'place' && location.trim() ? { location: location.trim() } : {}), ...((category === 'product' || category === 'place') && link.trim() ? { link: link.trim() } : {}) }, ...previous.recommendations.filter((item) => item.id !== itemId)] };
        if (kind === 'event') return { ...previous, events: [...previous.events.filter((item) => item.id !== itemId), { id: itemId, title: title.trim(), category, date: entryDate }] };
        return { ...previous, subscriptions: [...previous.subscriptions.filter((item) => item.id !== itemId), { id: itemId, name: title.trim(), amountCents: cents!, frequency, nextDate: entryDate }] };
      });
      if (kind === 'recommendation' && recommendation?.coverUrl && recommendation.coverUrl !== savedCover) discardCover(recommendation.coverUrl);
      router.back();
    } catch {
      if (savedCover !== coverUrl) discardCover(savedCover);
      showError();
    } finally { setBusy(false); }
  };
  const remove = () => {
    const perform = async () => {
      setBusy(true);
      try {
        await update((previous) => ({ ...previous, recommendations: kind === 'recommendation' ? previous.recommendations.filter((item) => item.id !== id) : previous.recommendations, saved: kind === 'recommendation' ? previous.saved.filter((item) => item.recommendationId !== id) : previous.saved, events: kind === 'event' ? previous.events.filter((item) => item.id !== id) : previous.events, subscriptions: kind === 'subscription' ? previous.subscriptions.filter((item) => item.id !== id) : previous.subscriptions }));
        if (kind === 'recommendation' && recommendation?.coverUrl) discardCover(recommendation.coverUrl);
        router.back();
      } catch { showError(); } finally { setBusy(false); }
    };
    if (Platform.OS === 'web') { if (globalThis.confirm('¿Eliminar este elemento? No se puede deshacer.')) void perform(); }
    else Alert.alert('¿Eliminar este elemento?', 'No se puede deshacer.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: () => { void perform(); } }]);
  };
  return <Screen back scrollEnabled={!ratingDragging} title={id ? 'Editar' : kind === 'recommendation' ? 'Recomendar' : kind === 'event' ? 'Añadir evento' : 'Añadir suscripción'}>
    <Copy accessibilityRole="header" style={s.title}>{heading}</Copy>
    <Copy muted style={{ fontSize: 14 }}>{kind === 'recommendation' ? 'Comparte lo que has descubierto y por qué merece la pena.' : kind === 'event' ? 'Hazle un hueco en tu calendario personal.' : 'Anota tu servicio y su próxima renovación.'}</Copy>
    {kind !== 'subscription' && <Chips value={category} recommendations={kind === 'recommendation'} onChange={(value) => { if (value !== 'all') setCategory(value); }} />}
    <Field label={kind === 'subscription' ? 'Nombre del servicio' : kind === 'recommendation' && category === 'product' ? 'Nombre del producto' : kind === 'recommendation' && category === 'place' ? 'Nombre del sitio' : 'Título'} value={title} onChangeText={setTitle} placeholder={kind === 'subscription' ? 'Por ejemplo, tu plataforma de cine' : kind === 'recommendation' && category === 'product' ? '¿Qué has comprado?' : kind === 'recommendation' && category === 'place' ? '¿Dónde has estado?' : '¿Qué historia tienes en mente?'} error={errors.title} maxLength={150} />
    {kind === 'recommendation' ? <>
      <Field label="¿Por qué lo recomiendas?" value={opinion} onChangeText={setOpinion} placeholder={category === 'product' ? 'Lo que te gusta, cómo lo usas…' : category === 'place' ? 'Qué pedir, el ambiente, qué te encantó…' : 'Lo que te hizo sentir, sin spoilers…'} multiline error={errors.opinion} maxLength={2000} />
      {category === 'product' && <Field label="Precio en euros (opcional)" value={amount} onChangeText={setAmount} placeholder="19,99" keyboardType="decimal-pad" error={errors.amount} />}
      {category === 'place' && <Field label="Ubicación (opcional)" value={location} onChangeText={setLocation} placeholder="Ciudad, barrio o dirección" maxLength={250} />}
      {(category === 'product' || category === 'place') && <Field label={category === 'product' ? 'Enlace de la compra (opcional)' : 'Web o enlace del sitio (opcional)'} value={link} onChangeText={setLink} placeholder="https://…" keyboardType="url" autoCapitalize="none" autoCorrect={false} error={errors.link} maxLength={2000} />}
      <RatingInput value={rating} onChange={setRating} onInteractionChange={setRatingDragging} />
      <CoverPicker uri={coverUrl} onChange={setCoverUrl} busy={busy || picking} onBusyChange={setPicking} />
      <Surface><View style={s.inline}><CategoryIcon category={category} /><Copy muted style={s.small}>Vista previa</Copy></View><Copy style={{ fontSize: 22, fontWeight: '600' }}>{title.trim() || 'El título de tu recomendación'}</Copy><Copy muted>{opinion.trim() || 'Aquí aparecerá tu opinión.'}</Copy></Surface>
    </> : <>
      {kind === 'subscription' && <><Field label="Precio en euros" value={amount} onChangeText={setAmount} placeholder="9,99" keyboardType="decimal-pad" error={errors.amount} /><View style={{ gap: 8 }}><Copy style={s.fieldLabel}>Frecuencia</Copy><ChoiceTabs value={frequency} onChange={setFrequency} options={[{ value: 'monthly', label: 'Mensual' }, { value: 'yearly', label: 'Anual' }]} /></View></>}
      <Field label={kind === 'event' ? 'Fecha (AAAA-MM-DD)' : 'Próximo cobro (AAAA-MM-DD)'} value={entryDate} onChangeText={setEntryDate} placeholder="2026-10-24" keyboardType="numbers-and-punctuation" maxLength={10} error={errors.date} />
      <Privacy>{kind === 'event' ? 'Este evento es privado' : 'Esta suscripción es privada'}</Privacy>
    </>}
    <Action onPress={() => { void save(); }} disabled={busy || picking}>{busy ? 'Guardando…' : id ? 'Guardar cambios' : kind === 'recommendation' ? 'Guardar recomendación' : kind === 'event' ? 'Añadir a mi calendario' : 'Guardar suscripción'}</Action>
    {id && <ItemActions label="Opciones del elemento" actions={[{ label: 'Eliminar', onPress: remove, destructive: true, disabled: busy || picking }]} />}
    <Copy muted style={{ fontSize: 12, lineHeight: 19, textAlign: 'center' }}>Guardado en este dispositivo. No se comparte con otras personas todavía.</Copy>
  </Screen>;
}
