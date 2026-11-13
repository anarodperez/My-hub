import { goBackOr } from '@/features/hub/navigation';
import { MotionReveal } from '@/components/hub-motion';
import { randomUUID } from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, View, useWindowDimensions, type TextInputInstance } from 'react-native';
import { FormDialog } from '@/components/form-dialog';
import { PlanDateField } from '@/components/plan-date-field';
import { XIcon } from '@/components/hub-icons';
import { RatingInput } from '@/components/rating-input';
import { CoverPicker } from '@/components/cover-picker';
import { RatingSummary } from '@/components/rating-summary';
import { ProductLinkField } from '@/components/product-link-field';
import { CalendarReminder } from '@/components/calendar-reminder';
import { Action, CategoryIcon, Chips, ChoiceTabs, Copy, Field, IconAction, Privacy, Screen, Surface, TextAction, s, showError, SaveAction } from '@/components/hub-ui';
import { isLocalDate, isWebLink, localDate, parseAmountCents, recommendationCategories, type Category } from '@/features/hub/model';
import { useHub, usePalette } from '@/features/hub/provider';
import type { GroupRow, Visibility } from '@/features/hub/backend-types';
import { discardCover, persistCover } from '@/features/hub/covers';

export default function ComposeScreen() {
  const params = useLocalSearchParams<{ kind?: string; id?: string; date?: string; moment?: string }>();
  const { state, loading, repository } = useHub();
  if (params.kind === 'subscription') return <Screen back title="Apartado retirado"><Copy>Este apartado ya no está disponible.</Copy></Screen>;
  if (loading) return <Screen back title="Cargando" ><Copy>Cargando tus datos…</Copy></Screen>;
  const kind = params.kind === 'event' ? 'event' : 'recommendation';
  if (params.moment && (kind !== 'recommendation' || params.id || !['book', 'series', 'movie'].includes(params.moment))) return <Screen back title="Mi momento"><Copy>Ese contenido ya no está disponible en Mi momento.</Copy></Screen>;
  const existing = kind === 'event' ? state.events.find((item) => item.id === params.id) : state.recommendations.find((item) => item.id === params.id);
  if (kind === 'recommendation' && existing && 'ownerId' in existing && existing.ownerId && existing.ownerId !== repository?.accountId) return <Screen back title="Descubrimiento"><Copy>Solo el autor puede editar esta publicación.</Copy></Screen>;
  if (params.id && !existing) return <Screen back title="No encontrado"><Copy>Este elemento ya no está disponible.</Copy><Action onPress={() => goBackOr(kind === 'event' ? '/calendar' : '/')}>Volver</Action></Screen>;
  return <Editor key={`${kind}-${params.id || params.moment || 'new'}`} kind={kind} id={params.id} date={params.date} moment={params.moment} />;
}
function Editor({ kind, id, date, moment }: { kind: 'recommendation' | 'event'; id?: string; date?: string; moment?: string }) {
  const { state, update, repository } = useHub();
  const p = usePalette();
  const { width, fontScale } = useWindowDimensions();
  const wideForm = kind === 'recommendation' && width >= 1200 && fontScale <= 1.3;
  const titleInput = useRef<TextInputInstance>(null);
  const recommendation = state.recommendations.find((item) => item.id === id);
  const event = state.events.find((item) => item.id === id);
  const [sourceMoment] = useState(() => !id && kind === 'recommendation' ? state.moments?.find(item => item.category === moment) : undefined);
  const [conversionId] = useState(() => sourceMoment ? randomUUID() : undefined);
  const [visibility, setVisibility] = useState<Visibility>(recommendation?.visibility || 'private');
  const [groupId, setGroupId] = useState(recommendation?.groupId || '');
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [groupError, setGroupError] = useState('');
  useEffect(() => { let active = true; if (repository) void repository.listGroups().then((rows) => { if (active) setGroups(rows); }).catch(() => { if (active) setGroupError('No se pudieron cargar los grupos.'); }); return () => { active = false; }; }, [repository]);
  const [title, setTitle] = useState(recommendation?.title || event?.title || sourceMoment?.title || '');
  const [category, setCategory] = useState<Category>(recommendation?.category || event?.category || sourceMoment?.category || 'book');
  const [opinion, setOpinion] = useState(recommendation?.opinion || '');
  const [rating, setRating] = useState(recommendation?.rating || 5);
  const [coverUrl, setCoverUrl] = useState(recommendation?.coverUrl || sourceMoment?.coverUrl || '');
  const [entryDate, setEntryDate] = useState(event?.date || date || localDate(new Date()));
  const [amount, setAmount] = useState(recommendation?.priceCents !== undefined ? (recommendation.priceCents / 100).toFixed(2).replace('.', ',') : '');
  const [location, setLocation] = useState(recommendation?.location || '');
  const [link, setLink] = useState(recommendation?.link || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [ratingDragging, setRatingDragging] = useState(false);
  const save = async () => {
    if (busy || picking) return;
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) nextErrors.title = 'Escribe un título.';
    if (kind === 'recommendation' && !opinion.trim()) nextErrors.opinion = 'Cuéntanos qué te ha gustado.';
    if (kind !== 'recommendation' && !isLocalDate(entryDate)) nextErrors.date = 'Elige una fecha válida.';
    const cents = parseAmountCents(amount);
    if (kind === 'recommendation' && category === 'product' && amount.trim() && cents === null) nextErrors.amount = 'Escribe un importe válido, por ejemplo 19,99.';
    if (kind === 'recommendation' && (category === 'product' || category === 'place') && link.trim() && !isWebLink(link.trim())) nextErrors.link = 'Usa un enlace completo http o https.';
    if (kind === 'recommendation' && visibility === 'group' && !groups.some((group) => group.id === groupId)) nextErrors.visibility = 'Elige un grupo al que pertenezcas.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setBusy(true);
    const itemId = id || conversionId || randomUUID();
    let savedCover = coverUrl;
    try {
      if (kind === 'recommendation' && coverUrl && coverUrl !== recommendation?.coverUrl && coverUrl !== sourceMoment?.coverUrl && !isWebLink(coverUrl)) savedCover = await persistCover(coverUrl);
      await update((previous) => {
        if (kind === 'recommendation') return { ...previous,
          ...(sourceMoment ? { moments: (previous.moments || []).filter(item => item.category !== sourceMoment.category || item.title !== sourceMoment.title || (item.coverPath || item.coverUrl) !== (sourceMoment.coverPath || sourceMoment.coverUrl)) } : {}),
          recommendations: [{ id: itemId, title: title.trim(), category, opinion: opinion.trim(), rating, visibility, groupId: visibility === 'group' ? groupId : undefined, coverUrl: savedCover,
            ...(sourceMoment?.coverPath && savedCover === sourceMoment.coverUrl ? { coverPath: sourceMoment.coverPath, fromMoment: sourceMoment.category } : {}),
            createdAt: recommendation?.createdAt || new Date().toISOString(), ...(recommendation?.sample ? { sample: true } : {}), ...(category === 'product' && amount.trim() ? { priceCents: cents! } : {}), ...(category === 'place' && location.trim() ? { location: location.trim() } : {}), ...((category === 'product' || category === 'place') && link.trim() ? { link: link.trim() } : {}) }, ...previous.recommendations.filter((item) => item.id !== itemId)] };
        return { ...previous, events: [...previous.events.filter((item) => item.id !== itemId), { id: itemId, title: title.trim(), category, date: entryDate }] };
      });
      if (kind === 'recommendation' && recommendation?.coverUrl && recommendation.coverUrl !== savedCover) discardCover(recommendation.coverUrl);
      goBackOr(kind === 'event' ? '/calendar' : '/');
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
      goBackOr(kind === 'event' ? '/calendar' : '/');
    } catch { showError(); } finally { setBusy(false); }
  };
  const remove = () => {
    const perform = async () => {
      setBusy(true);
      try {
        await update((previous) => ({ ...previous, recommendations: kind === 'recommendation' ? previous.recommendations.filter((item) => item.id !== id) : previous.recommendations, saved: kind === 'recommendation' ? previous.saved.filter((item) => item.recommendationId !== id) : previous.saved, events: kind === 'event' ? previous.events.filter((item) => item.id !== id) : previous.events }));
        if (kind === 'recommendation' && recommendation?.coverUrl) discardCover(recommendation.coverUrl);
        goBackOr(kind === 'event' ? '/calendar' : '/');
      } catch { showError(); } finally { setBusy(false); }
    };
    if (Platform.OS === 'web') { if (globalThis.confirm('¿Eliminar este elemento? No se puede deshacer.')) void perform(); }
    else Alert.alert('¿Eliminar este elemento?', 'No se puede deshacer.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: () => { void perform(); } }]);
  };
  if (moment && !sourceMoment) return <Screen back title="Mi momento"><Copy>Ese contenido ya no está disponible en Mi momento.</Copy></Screen>;
  const content = <View style={{ gap: 24, padding: kind === 'event' ? 24 : 0 }}>
    {sourceMoment && <Copy muted>El título y la portada ya están preparados. Añade tu opinión y valoración; solo se quitará de Mi momento al guardar la recomendación.</Copy>}
    {kind === 'recommendation' && <View style={{ gap: 12, paddingBottom: 8 }}><Copy accessibilityRole="header" style={{ fontSize: wideForm ? 40 : 30, lineHeight: wideForm ? 48 : 38, fontWeight: '700', letterSpacing: -0.8, maxWidth: 760 }}>{id ? 'Dale tu toque final.' : 'Lo bueno merece compartirse.'}</Copy><Copy muted style={{ fontSize: 16, lineHeight: 24, maxWidth: 600 }}>Un flechazo, una historia, un lugar. Cuéntalo a tu manera.</Copy></View>}
    <View style={{ flexDirection: wideForm ? 'row' : 'column', alignItems: 'flex-start', gap: wideForm ? 48 : 28 }}>
    <View style={{ flex: wideForm ? 1 : undefined, width: wideForm ? undefined : '100%', minWidth: 0, gap: 24 }}>
    {kind === 'event' && <View style={{ gap: 12 }}><View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}><View style={{ flex: 1, gap: 6 }}><Copy accessibilityRole="header" style={{ fontSize: 28, lineHeight: 36, fontWeight: '700' }}>{id ? 'Editar evento' : 'Añadir evento'}</Copy><Copy muted style={{ fontSize: 16 }}>Haz sitio a algo que te apetezca.</Copy></View><IconAction label="Cerrar evento" disabled={busy} onPress={() => goBackOr('/calendar')}><XIcon size={24} color={p.muted} /></IconAction></View><Privacy>Solo tú verás este evento</Privacy></View>}
    <View style={{ gap: 8 }}>
    {kind === 'event' && <Copy style={{ fontSize: 14, fontWeight: '600' }}>Tipo de evento</Copy>}
    {kind === 'recommendation' && <Copy style={{ fontSize: 16, lineHeight: 24, fontWeight: '600' }}>¿Qué has descubierto?</Copy>}
    <Chips value={category} recommendations={kind === 'recommendation'} onChange={(value) => { if (value !== 'all') setCategory(value); }} />
    </View>
    {kind === 'recommendation' && category === 'product' && <MotionReveal><ProductLinkField value={link} onChangeText={setLink} onManual={() => titleInput.current?.focus()} disabled={busy || picking} error={errors.link} onMetadata={(data) => {
      setTitle(current => current.trim() ? current : data.title);
      setCoverUrl(current => current || data.coverUrl);
      setAmount(current => current.trim() ? current : data.amount);
    }} /></MotionReveal>}
    <View style={{ gap: 16 }}>
      <Field variant="outlined" editable={!busy} inputRef={titleInput} label={kind === 'event' ? '¿Qué quieres hacer?' : category === 'product' ? 'Nombre del producto' : category === 'place' ? 'Nombre del sitio' : 'Título'} value={title} onChangeText={setTitle} placeholder={kind === 'event' ? 'Por ejemplo, una tarde de cine' : category === 'product' ? '¿Qué has comprado?' : category === 'place' ? '¿Dónde has estado?' : '¿Qué historia tienes en mente?'} error={errors.title} maxLength={150} />
      {kind === 'recommendation' && category === 'product' && <MotionReveal><Field label="Precio en euros (opcional)" value={amount} onChangeText={setAmount} placeholder="19,99" keyboardType="decimal-pad" error={errors.amount} /></MotionReveal>}
    </View>
    {kind === 'recommendation' ? <>
      <Field variant="outlined" label="¿Por qué lo recomiendas?" value={opinion} onChangeText={setOpinion} placeholder={category === 'product' ? 'Lo que te gusta, cómo lo usas…' : category === 'place' ? 'Qué pedir, el ambiente, qué te encantó…' : 'Lo que te hizo sentir, sin spoilers…'} multiline style={{ minHeight: 150, textAlignVertical: 'top' }} editable={!busy} error={errors.opinion} maxLength={2000} />
      {category === 'place' && <MotionReveal><Field label="Ubicación (opcional)" value={location} onChangeText={setLocation} placeholder="Ciudad, barrio o dirección" maxLength={250} /></MotionReveal>}
      {category === 'place' && <MotionReveal><Field label="Web o enlace del sitio (opcional)" value={link} onChangeText={setLink} placeholder="https://…" keyboardType="url" autoCapitalize="none" autoCorrect={false} error={errors.link} maxLength={2000} /></MotionReveal>}
      <RatingInput value={rating} onChange={setRating} onInteractionChange={setRatingDragging} />
    </> : <>
      <PlanDateField value={entryDate} onChange={setEntryDate} disabled={busy} required fieldLabel="Fecha del evento" />
      {!!errors.date && <Copy accessibilityRole="alert" style={{ color: p.danger }}>{errors.date}</Copy>}
    </>}
    </View>
    {kind === 'recommendation' && <View style={{ width: wideForm ? 360 : '100%', minWidth: 0, gap: 24 }}>
      <View style={{ gap: 12 }}>
      <Copy accessibilityRole="header" style={{ fontSize: 16, lineHeight: 24, fontWeight: '600' }}>Así se verá tu recomendación</Copy>
      <Surface style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
        <CoverPicker variant="poster" uri={coverUrl} onChange={setCoverUrl} busy={busy || picking} onBusyChange={setPicking} />
        <View style={{ padding: 22, gap: 16 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 6, backgroundColor: p.soft }}><CategoryIcon category={category} size={15} /><Copy style={{ fontSize: 12, color: p.accent }}>{recommendationCategories.find(option => option.value === category)?.singular}</Copy></View>
            <RatingSummary value={rating} />
          </View>
          <Copy style={{ fontSize: 24, lineHeight: 31, fontWeight: '700', letterSpacing: -0.4, color: title.trim() ? p.text : p.muted }}>{title.trim() || 'Tu próximo descubrimiento'}</Copy>
          <Copy muted numberOfLines={fontScale > 1.3 ? undefined : 4} style={{ fontSize: 15, lineHeight: 23 }}>{opinion.trim() || 'Tu opinión le dará el toque personal.'}</Copy>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, borderTopWidth: 1, borderTopColor: p.line, paddingTop: 14 }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: p.soft, alignItems: 'center', justifyContent: 'center' }}><Copy style={{ fontSize: 13, color: p.accent, fontWeight: '700' }}>{state.preferences.name.trim().charAt(0).toLocaleUpperCase('es') || 'T'}</Copy></View>
            <Copy muted style={{ fontSize: 13, flex: 1 }}>{state.preferences.name || 'Tu recomendación'}</Copy>
          </View>
        </View>
      </Surface>
      </View>
    <View style={{ gap: 10 }}><Copy style={s.fieldLabel}>Quién puede verlo</Copy><ChoiceTabs value={visibility} onChange={setVisibility} options={[{ value: 'private', label: 'Solo yo' }, { value: 'public', label: 'Usuarios' }, { value: 'group', label: 'Grupo' }]} />
      <Copy muted style={{ fontSize: 13, lineHeight: 20 }}>{visibility === 'private' ? 'Solo tú puedes ver esta recomendación.' : visibility === 'public' ? 'Visible para los usuarios registrados de My Hub.' : 'Solo los miembros del grupo que elijas.'}</Copy>
      {visibility === 'group' && <MotionReveal style={{ gap: 6 }}>{groups.map((group) => <TextAction key={group.id} onPress={() => setGroupId(group.id)}>{group.name}</TextAction>)}{!groups.length && <TextAction onPress={() => router.push('/groups')}>Crear o unirme a un grupo</TextAction>}{!!groupError && <Copy accessibilityRole="alert">{groupError}</Copy>}</MotionReveal>}{errors.visibility && <Copy accessibilityRole="alert">{errors.visibility}</Copy>}
    </View>
    </View>}
    </View>
    {kind === 'event' ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTopWidth: 1, borderColor: p.line, paddingTop: 20 }}><TextAction disabled={busy} onPress={() => goBackOr('/calendar')}>Cancelar</TextAction><Action disabled={busy || !title.trim()} icon={busy ? <ActivityIndicator size="small" color={p.onAccent} /> : undefined} onPress={() => { void save(); }}>{busy ? 'Guardando…' : id ? 'Guardar cambios' : 'Añadir a mi calendario'}</Action></View> : <View style={{ flexDirection: wideForm ? 'row' : 'column', alignItems: wideForm ? 'center' : 'stretch', justifyContent: 'space-between', gap: 12, paddingTop: 20, borderTopWidth: 1, borderColor: p.line }}>
      <TextAction disabled={busy || picking} onPress={() => goBackOr('/')}>Cancelar</TextAction>
      <View style={{ width: wideForm ? 260 : '100%' }}><SaveAction onPress={() => { void save(); }} busy={busy} disabled={picking}>{id ? 'Guardar cambios' : 'Guardar recomendación'}</SaveAction></View>
    </View>}
    {kind === 'event' && event && (title.trim() === event.title && entryDate === event.date ? <CalendarReminder event={event} /> : <Copy muted>Guarda los cambios del plan antes de ajustar su recordatorio.</Copy>)}
    {kind === 'recommendation' && id && state.saved.some((entry) => entry.recommendationId === id) && <TextAction disabled={busy || picking} onPress={() => { void removeFromWishlist(); }}>Quitar de wishlist</TextAction>}
    {id && <View style={{ alignSelf: 'center' }}><TextAction danger disabled={busy || picking} onPress={remove}>Eliminar</TextAction></View>}
  </View>;
  return kind === 'event' ? <FormDialog busy={busy} onClose={() => goBackOr('/calendar')}>{content}</FormDialog> : <Screen back contentStyle={{ maxWidth: 1100 }} scrollEnabled={!ratingDragging} title={id ? 'Editar' : 'Recomendar'}>{content}</Screen>;
}
