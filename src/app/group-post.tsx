import { MotionReveal } from '@/components/hub-motion';
import { randomUUID } from 'expo-crypto';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, View, useWindowDimensions } from 'react-native';
import { CoverPicker } from '@/components/cover-picker';
import { Action, ChoiceTabs, Copy, Field, IconAction, Privacy, SaveAction, Screen, TextAction } from '@/components/hub-ui';
import { PlusIcon, XIcon } from '@/components/hub-icons';
import { GroupPostFrame } from '@/components/group-post-frame';
import { PlanDateField } from '@/components/plan-date-field';
import { isLocalDate } from '@/features/hub/model';
import { useHub, usePalette } from '@/features/hub/provider';
import type { GroupPostKind, OfferMode } from '@/features/hub/backend-types';
import { parseOfferPrice } from '@/features/hub/offer-pricing';

export default function GroupPostScreen() {
  const { groupId, kind, date, title, description } = useLocalSearchParams<{ groupId: string; kind: string; date?: string; title?: string; description?: string }>();
  const { repository } = useHub();
  if (kind !== 'plan' && kind !== 'gift') return <Screen back title="Publicación"><Copy>Tipo de publicación no válido.</Copy></Screen>;
  return <GroupPostForm key={`${repository?.accountId}:${groupId}:${kind}:${date || ''}`} groupId={groupId} kind={kind} initialDate={date} initialTitle={title} initialDescription={description} />;
}
function GroupPostForm({ groupId, kind, initialDate, initialTitle, initialDescription }: { groupId: string; kind: GroupPostKind; initialDate?: string; initialTitle?: string; initialDescription?: string }) {
  const { repository, media } = useHub();
  const p = usePalette();
  const { width } = useWindowDimensions();
  const [id] = useState(randomUUID);
  const [title, setTitle] = useState(typeof initialTitle === 'string' ? initialTitle.slice(0, 150) : '');
  const [description, setDescription] = useState(typeof initialDescription === 'string' ? initialDescription.slice(0, 2000) : '');
  const [date, setDate] = useState(kind === 'plan' && initialDate && isLocalDate(initialDate) ? initialDate : '');
  const [cover, setCover] = useState('');
  const [drawDays, setDrawDays] = useState('3');
  const [offerMode, setOfferMode] = useState<OfferMode>('gift');
  const [price, setPrice] = useState('');
  const drawDeadline = useRef<{ days: string; value: string } | null>(null);
  const [groupName, setGroupName] = useState('');
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');
  const current = useRef(0);
  const locked = useRef(false);
  const uploaded = useRef<{ uri: string; path: string } | null>(null);
  const [retry, setRetry] = useState(0);
  const leave = () => { if (router.canGoBack()) router.back(); else router.replace({ pathname: '/group-space', params: { id: groupId } }); };
  useFocusEffect(useCallback(() => {
    const turn = ++current.current;
    setChecking(true); setGroupName(''); setError(''); setBusy(false);
    if (repository) void repository.listGroups().then(groups => {
      if (current.current !== turn) return;
      const group = groups.find(entry => entry.id === groupId);
      if (!group) throw new Error('Este grupo ya no está disponible para tu cuenta.');
      setGroupName(group.name);
    }).catch(failure => { if (current.current === turn) setError(failure.message); }).finally(() => { if (current.current === turn) setChecking(false); });
    else { setChecking(false); setError('Inicia sesión para publicar.'); }
    return () => { current.current++; };
  // Retrying deliberately reloads the membership check.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repository, groupId, retry]));
  const publish = async () => {
    if (!repository || !media || locked.current || picking || !groupName) return;
    if (!title.trim()) { setError('Escribe un título.'); return; }
    if (date.trim() && !isLocalDate(date.trim())) { setError('Escribe una fecha válida con formato AAAA-MM-DD o déjala vacía.'); return; }
    locked.current = true; setBusy(true); setError('');
    const turn = current.current;
    try {
      const priceCents = kind === 'gift' && offerMode !== 'gift' ? parseOfferPrice(price) : null;
      let path = '';
      if (cover) {
        if (uploaded.current?.uri === cover) path = uploaded.current.path;
        else { path = await media.upload(repository.accountId, id, cover, 'group-media', groupId); uploaded.current = { uri: cover, path }; }
      }
      if (current.current !== turn) return;
      if (kind === 'gift' && drawDeadline.current?.days !== drawDays) drawDeadline.current = { days: drawDays, value: new Date(Date.now() + Number(drawDays) * 86400000).toISOString() };
      await repository.createGroupPost({ newId: id, group_id: groupId, kind, title, description, event_date: date.trim() || null, cover_path: path, ...(kind === 'gift' ? { offer_mode: offerMode, price_cents: priceCents, ...(offerMode !== 'fixed' ? { gift_draw_at: drawDeadline.current!.value } : {}) } : {}) });
      if (current.current === turn) leave();
    } catch (failure) { if (current.current === turn) setError(failure instanceof Error ? failure.message : 'No se pudo publicar. Vuelve a intentarlo.'); }
    finally { locked.current = false; if (current.current === turn) setBusy(false); }
  };
  return <GroupPostFrame plan={kind === 'plan'} groupName={groupName} busy={busy} onClose={leave}>
    <View style={{ width: '100%', maxWidth: kind === 'plan' ? 800 : undefined, alignSelf: 'center', gap: 20 }}>
    {kind === 'plan' ? <View style={{ backgroundColor: p.surface, borderRadius: 20, padding: width >= 700 ? 32 : 20, gap: 24 }}>
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}><View style={{ flex: 1, gap: 8 }}><Copy accessibilityRole="header" style={{ fontSize: 28, lineHeight: 36, fontWeight: '700' }}>Proponer un plan</Copy><Copy muted style={{ fontSize: 16, lineHeight: 24 }}>Un plan concreto para salir del bucle de «lo que queráis».</Copy></View><IconAction label="Cerrar formulario de plan" disabled={busy} onPress={leave}><XIcon size={24} color={p.muted} /></IconAction></View>
        {!!groupName && <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}><View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: p.soft }}><Copy style={{ fontSize: 14, color: p.accent, fontWeight: '600' }}>{groupName}</Copy></View><Privacy>Solo para este grupo</Privacy></View>}
      </View>
      {checking && <ActivityIndicator color={p.accent} accessibilityLabel="Comprobando grupo" />}
      {!!groupName && <>
        <Field variant="outlined" label="¿Qué os apetece hacer?" placeholder="Por ejemplo, una tarde de cine" value={title} onChangeText={setTitle} maxLength={150} editable={!busy} />
        <PlanDateField value={date} onChange={setDate} disabled={busy} />
        <Field variant="outlined" label="Detalles (opcional)" placeholder="Lugar, hora… y si hay que llevar palomitas." value={description} onChangeText={setDescription} maxLength={2000} multiline editable={!busy} />
        <View style={{ borderTopWidth: 1, borderColor: p.line, paddingTop: 20, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <TextAction disabled={busy} onPress={leave}>Cancelar</TextAction>
          <Action disabled={busy || !title.trim()} icon={busy ? <ActivityIndicator size="small" color={p.onAccent} /> : <PlusIcon size={18} color={p.onAccent} />} onPress={() => { void publish(); }}>{busy ? 'Publicando…' : 'Publicar plan'}</Action>
        </View>
      </>}
    </View> : <>
    <Privacy>Solo lo verá este grupo</Privacy>
    {checking && <ActivityIndicator color={p.accent} accessibilityLabel="Comprobando grupo" />}
    {!!groupName && <View style={{ gap: 20 }}>
      {kind === 'gift' && <View style={{ gap: 10 }}><Copy style={{ fontWeight: '600' }}>¿Cómo lo quieres compartir?</Copy><ChoiceTabs value={offerMode} onChange={setOfferMode} disabled={busy} options={[{ value: 'gift', label: 'Regalar' }, { value: 'fixed', label: 'Precio fijo' }, { value: 'auction', label: 'Subasta' }]} /></View>}
      <Field label="¿Qué quieres compartir?" placeholder="Un libro que ya he leído" value={title} onChangeText={setTitle} maxLength={150} editable={!busy} />
      {kind === 'gift' && offerMode !== 'gift' && <Field label={offerMode === 'auction' ? 'Precio de salida (€)' : 'Precio (€)'} placeholder="12,50" value={price} onChangeText={setPrice} keyboardType="decimal-pad" maxLength={9} editable={!busy} />}
      <Field label="Descripción (opcional)" placeholder="Cuenta cómo está y cómo podéis recogerlo" value={description} onChangeText={setDescription} maxLength={2000} multiline editable={!busy} />
      {kind === 'gift' && <CoverPicker uri={cover} onChange={setCover} busy={busy || picking} onBusyChange={setPicking} />}
      {kind === 'gift' && offerMode !== 'fixed' && <View style={{ gap: 8 }}>
        <Copy style={{ fontWeight: '600' }}>{offerMode === 'auction' ? '¿Cuánto dura la subasta?' : '¿Cuánto tiempo para apuntarse?'}</Copy>
        <ChoiceTabs value={drawDays} onChange={setDrawDays} disabled={busy} options={[{ value: '1', label: '1 día' }, { value: '3', label: '3 días' }, { value: '7', label: '7 días' }]} />
        <Copy muted>{offerMode === 'auction' ? 'Al cerrar el plazo gana la puja más alta. Cada nueva puja debe subir al menos 1 €.' : 'El plazo empieza al publicar. Si varias lo quieren, se sorteará automáticamente. Podéis participar sin estar conectadas a la vez.'}</Copy>
      </View>}
      {kind === 'gift' && offerMode !== 'gift' && <Copy muted>El pago y la entrega los acordáis entre vosotras. La app no realiza cobros.</Copy>}
      <SaveAction busy={busy} disabled={picking || !title.trim()} onPress={() => { void publish(); }}>Publicar en el grupo</SaveAction>
    </View>}
    </>}
    {!!error && <MotionReveal><Copy accessibilityRole="alert" style={{ color: p.danger }}>{error}</Copy></MotionReveal>}
    {!groupName && !checking && <TextAction onPress={() => setRetry(value => value + 1)}>Volver a intentar</TextAction>}
    </View>
  </GroupPostFrame>;
}
