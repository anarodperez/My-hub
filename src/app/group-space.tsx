import { MotionContent } from '@/components/hub-motion';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { LoadingImage as Image } from '@/components/loading-image';
import { ActivityIndicator, Alert, Platform, View, useWindowDimensions } from 'react-native';
import { GiftIcon } from 'phosphor-react-native/src/icons/Gift';
import { CalendarBlankIcon, PlusIcon } from '@/components/hub-icons';
import { Action, ChoiceTabs, Copy, Privacy, Screen, Surface, TextAction } from '@/components/hub-ui';
import { ItemActions } from '@/components/item-actions';
import { GroupAvailability } from '@/features/hub/group-availability';
import { GiftDrawPanel } from '@/features/hub/gift-draw-panel';
import { demoGiftCovers } from '@/features/hub/demo-gift-covers';
import { PricedGiftPanel } from '@/features/hub/priced-gift-panel';
import { ActionNotice } from '@/components/action-notice';
import { useGroupAutoRefresh } from '@/hooks/use-group-auto-refresh';
import { displayDate, localDate } from '@/features/hub/model';
import { useHub, usePalette } from '@/features/hub/provider';
import type { Author, AvailabilityRow, GroupPostRow } from '@/features/hub/backend-types';

type Tab = 'availability' | 'plan' | 'gift';
export default function GroupSpaceScreen() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const { repository } = useHub();
  return <GroupSpace key={`${repository?.accountId}:${id}:${tab}`} id={id} initialTab={tab === 'plan' || tab === 'gift' ? tab : 'availability'} />;
}
function GroupSpace({ id, initialTab }: { id: string; initialTab: Tab }) {
  const { repository, media } = useHub();
  const p = usePalette();
  const { width, fontScale } = useWindowDimensions();
  const contentWidth = Math.max(0, Math.min(1280, width - 48));
  const postColumns = fontScale > 1.3 ? 1 : Math.max(1, Math.min(3, Math.floor((contentWidth + 20) / 380)));
  const [tab, setTab] = useState<Tab>(initialTab);
  const postWidth = tab === 'plan' || postColumns === 1 ? '100%' as const : (contentWidth - (postColumns - 1) * 20) / postColumns;
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState(() => localDate(new Date()));
  const [name, setName] = useState('');
  const [members, setMembers] = useState<Author[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [posts, setPosts] = useState<GroupPostRow[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [more, setMore] = useState(false);
  const [now, setNow] = useState(Date.now);
  useFocusEffect(useCallback(() => {
    if (tab !== 'gift') return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, [tab]));
  const generation = useRef(0);
  const locked = useRef(false);
  const loadedCount = useRef(30);
  const signedPhotos = useRef(new Map<string, { url: string; expires: number }>());
  const loadedTab = useRef<Tab | null>(null);
  const load = useCallback(async (offset = 0, silent = false) => {
    if (!repository || !media) return;
    const turn = ++generation.current;
    setError(''); if (!silent) setLoading(true);
    let membershipRevoked = false;
    try {
      const groups = await repository.listGroups();
      const group = groups.find(entry => entry.id === id);
      if (!group) { membershipRevoked = true; throw new Error('Este grupo ya no está disponible para tu cuenta.'); }
      const membership = await repository.listMembers(id);
      const authors = await Promise.all(membership.map(entry => repository.author(entry.user_id)));
      let rows: AvailabilityRow[] | GroupPostRow[];
      let hasMore = false;
      if (tab === 'availability') rows = await repository.listAvailability(id, localDate(month), localDate(new Date(month.getFullYear(), month.getMonth() + 1, 0)));
      else {
        if (tab === 'gift') await repository.resolveGroupGiftDraws(id);
        const entries: GroupPostRow[] = [];
        const through = offset ? offset + 30 : silent ? Math.max(30, loadedCount.current) : 30;
        for (let page = offset; page < through; page += 30) {
          const batch = await repository.listGroupPosts(id, tab, page);
          entries.push(...batch); hasMore = batch.length === 30;
          if (!hasMore) break;
        }
        rows = entries;
      }
      const nextPhotos: Record<string, string> = {};
      if (tab !== 'availability') await Promise.all((rows as GroupPostRow[]).map(async row => {
        if (row.cover_path) {
          const cached = signedPhotos.current.get(row.cover_path);
          const url = cached && cached.expires > Date.now() ? cached.url : await media.resolve(row.cover_path, 'group-media').catch(() => '');
          nextPhotos[row.id] = url;
          if (url && (!cached || cached.expires <= Date.now())) signedPhotos.current.set(row.cover_path, { url, expires: Date.now() + 3000000 });
        }
      }));
      if (generation.current !== turn) return;
      setName(group.name); setMembers(authors.filter((author): author is Author => !!author));
      if (tab === 'availability') setAvailability(rows as AvailabilityRow[]);
      else {
        setPosts(previous => offset ? [...new Map([...previous, ...rows as GroupPostRow[]].map(row => [row.id, row])).values()] : rows as GroupPostRow[]);
        setPhotos(previous => offset ? { ...previous, ...nextPhotos } : nextPhotos); setMore(hasMore);
        loadedCount.current = offset + rows.length;
      }
    } catch (failure) {
      if (generation.current === turn) { if (membershipRevoked) { setName(''); setMembers([]); setPosts([]); setAvailability([]); setPhotos({}); } setError(failure instanceof Error ? failure.message : 'No se pudo cargar el grupo.'); }
    } finally { if (generation.current === turn) setLoading(false); }
  }, [repository, media, id, month, tab]);
  useFocusEffect(useCallback(() => {
    if (loadedTab.current !== tab) { setPosts([]); setPhotos({}); loadedTab.current = tab; }
    void load(0, true);
    return () => { generation.current++; };
  }, [load, tab]));
  const autoRefresh = useCallback(async () => { if (!locked.current) await load(0, true); }, [load]);
  useGroupAutoRefresh(autoRefresh, busy || loading || !name);
  const run = async (action: () => Promise<unknown>, confirmation?: string, _keepContent = false) => {
    if (locked.current || loading || !name) return;
    locked.current = true; setBusy(true); setError(''); setNotice('');
    const turn = generation.current;
    try { await action(); if (generation.current === turn) { if (confirmation) setNotice(confirmation); await load(0, true); } }
    catch (failure) { if (generation.current === turn) setError(failure instanceof Error ? failure.message : 'No se pudo guardar. Actualiza y vuelve a intentarlo.'); }
    finally { locked.current = false; setBusy(false); }
  };
  const remove = (post: GroupPostRow) => {
    const perform = () => { void run(() => repository!.deleteGroupPost(post.id, post.revision)); };
    if (Platform.OS === 'web') { if (globalThis.confirm('¿Retirar esta publicación y sus respuestas?')) perform(); }
    else Alert.alert('¿Retirar esta publicación?', 'También se retirarán sus respuestas.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Retirar', style: 'destructive', onPress: perform }]);
  };
  const author = (owner: string) => members.find(member => member.id === owner)?.name || 'Miembro del grupo';
  return <Screen wide back title="Grupo" refreshing={loading} onRefresh={busy || loading ? undefined : () => { void load(); }} action={<ItemActions label="Opciones del grupo" actions={[
    { label: 'Miembros e invitaciones', disabled: busy, onPress: () => router.push({ pathname: '/group/[id]', params: { id } }) },
    { label: 'Actualizar contenido', disabled: busy || loading, onPress: () => { void load(); } },
  ]} />}>
    <View style={{ width: '100%', maxWidth: 1280, alignSelf: 'center', gap: 24 }}>
    {!!name && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: p.soft, alignItems: 'center', justifyContent: 'center' }}><Copy style={{ fontSize: 24, fontWeight: '700', color: p.accent }}>{name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toLocaleUpperCase('es-ES')}</Copy></View>
      <View style={{ flex: 1, gap: 6 }}><Copy accessibilityRole="header" style={{ fontSize: 28, lineHeight: 36, fontWeight: '700' }}>{name}</Copy><View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}><Copy muted style={{ fontSize: 14 }}>{members.length} {members.length === 1 ? 'persona' : 'personas'}</Copy><Privacy>Grupo privado</Privacy></View></View>
    </View>}
    {!!notice && <ActionNotice key={notice} message={notice} />}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <ChoiceTabs variant="segmented" value={tab} onChange={value => { if (!busy) setTab(value); }} options={[{ value: 'availability', label: 'Disponibilidad' }, { value: 'plan', label: 'Planes' }, { value: 'gift', label: 'Regalos' }]} />
      {!!name && tab !== 'availability' && <Action icon={<PlusIcon size={18} color={p.onAccent} />} disabled={busy} onPress={() => router.push({ pathname: '/group-post', params: { groupId: id, kind: tab } })}>{tab === 'plan' ? 'Proponer un plan' : 'Compartir algo'}</Action>}
    </View>
    {loading && <ActivityIndicator color={p.accent} accessibilityLabel="Cargando el grupo" />}
    {!!error && <View style={{ gap: 8 }}><Copy accessibilityRole="alert" style={{ color: p.danger }}>{error}</Copy><TextAction disabled={busy || loading} onPress={() => { void load(); }}>Volver a intentar</TextAction></View>}
    <MotionContent changeKey={tab} style={{ gap: 24 }}>
    {!!name && tab === 'availability' && <GroupAvailability rows={availability} members={members} accountId={repository!.accountId} month={month} onMonth={value => { if (!busy) { setMonth(value); setSelected(localDate(value)); } }} selected={selected} onSelect={setSelected} busy={busy} onDay={value => { void run(() => repository!.setAvailabilityDay(id, selected, value), value === null ? 'Respuestas retiradas.' : 'Agenda al d\u00eda. \u00a1Que empiecen los planes!'); }} onToggle={(period, value) => { void run(() => repository!.setAvailability(id, selected, period, value), value === null ? 'Respuesta retirada.' : 'Disponibilidad guardada. \u00a1Un paso m\u00e1s cerca del plan!'); }} onPlan={date => router.push({ pathname: '/group-post', params: { groupId: id, kind: 'plan', date } })} />}
    {!!name && tab !== 'availability' && <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <View style={{ flex: 1, minWidth: 220, gap: 6 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Copy accessibilityRole="header" style={{ fontSize: 24, lineHeight: 32, fontWeight: '700' }}>{tab === 'plan' ? 'Planes del grupo' : 'Una segunda vida'}</Copy><View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: p.soft }}><Copy muted style={{ fontSize: 13 }}>{posts.length}{more ? '+' : ''}</Copy></View></View><Copy muted style={{ fontSize: 15, lineHeight: 22 }}>{tab === 'plan' ? 'Compartid una idea, elegid una fecha y apuntaos.' : 'Regalos, ventas y subastas entre personas de tu grupo.'}</Copy></View>
      </View>
      {!posts.length && <View style={{ padding: 32, borderRadius: 16, backgroundColor: p.surface, alignItems: 'center', gap: 12 }}><View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: tab === 'gift' ? p.peach : p.soft, alignItems: 'center', justifyContent: 'center' }}>{tab === 'gift' ? <GiftIcon size={32} color={p.peachText} /> : <CalendarBlankIcon size={32} color={p.accent} />}</View><Copy style={{ fontSize: 22, fontWeight: '600', textAlign: 'center' }}>{tab === 'plan' ? '¿Cuándo nos vemos?' : 'Dale una segunda vida'}</Copy><Copy muted style={{ maxWidth: 400, textAlign: 'center' }}>{tab === 'plan' ? 'Propón el primer plan. Las demás podrán apuntarse.' : 'Comparte algo que ya no uses y encuentra a quien lo disfrute.'}</Copy></View>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20, alignItems: 'stretch' }}>
      {posts.map(post => {
        const own = post.owner_id === repository!.accountId;
        const responses = post.group_post_responses.filter(response => members.some(member => member.id === response.owner_id));
        const interested = responses.some(response => response.owner_id === repository!.accountId);
        const cover = photos[post.id] || (post.kind === 'gift' ? demoGiftCovers[post.id] : undefined);
        const paid = post.offer_mode === 'fixed' || post.offer_mode === 'auction';
        const management = own ? [
          ...(post.kind === 'gift' && !paid && !post.gift_draw_at && post.status === 'open' ? responses.filter(response => response.owner_id !== repository!.accountId).map(response => ({ label: `Reservar para ${author(response.owner_id)}`, disabled: busy, onPress: () => { void run(() => repository!.setGroupGiftStatus(post.id, 'reserved', post.revision, response.owner_id), '\u00a1Regalo reservado!'); } })) : []),
          ...(post.kind === 'gift' && post.status !== 'delivered' && (paid ? post.status === 'reserved' && !!post.reserved_for : !post.gift_draw_at || (post.gift_drawn_at && post.reserved_for)) ? [{ label: 'Marcar como entregado', disabled: busy, onPress: () => { void run(() => repository!.setGroupGiftStatus(post.id, 'delivered', post.revision)); } }] : []),
          ...(post.kind === 'gift' && !paid && !post.gift_draw_at && post.status !== 'open' ? [{ label: 'Volver a ofrecer', disabled: busy, onPress: () => { void run(() => repository!.setGroupGiftStatus(post.id, 'open', post.revision)); } }] : []),
          { label: 'Retirar publicación', destructive: true, disabled: busy, onPress: () => remove(post) },
        ] : [];
        return <Surface key={post.id} style={{ width: postWidth, gap: 16, padding: post.kind === 'plan' && width >= 900 ? 28 : 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Copy muted style={{ flex: 1, fontSize: 13 }}>{author(post.owner_id)}{own ? ' (tú)' : ''}{post.event_date ? ` · ${displayDate(post.event_date)}` : post.kind === 'plan' ? ' · Fecha por decidir' : ''}</Copy>
            {post.kind === 'gift' && <View style={{ backgroundColor: p.soft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}><Copy style={{ fontSize: 12, color: p.accent, fontWeight: '600' }}>{post.offer_mode === 'auction' ? 'Subasta' : post.offer_mode === 'fixed' ? 'Venta' : post.gift_draw_at ? 'Sorteo' : 'Regalo'}</Copy></View>}
            {own && <ItemActions label={`Gestionar ${post.title}`} actions={management} />}
          </View>
          {post.kind === 'plan' && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ width: 64, minHeight: 76, borderRadius: 14, backgroundColor: p.soft, alignItems: 'center', justifyContent: 'center', padding: 8, gap: 2 }}>{post.event_date ? <><Copy style={{ fontSize: 28, lineHeight: 34, fontWeight: '700', color: p.accent }}>{Number(post.event_date.slice(-2))}</Copy><Copy style={{ fontSize: 12, lineHeight: 18, fontWeight: '600', color: p.accent, textTransform: 'uppercase' }}>{new Date(post.event_date + 'T12:00:00').toLocaleDateString('es-ES', { month: 'short' })}</Copy></> : <CalendarBlankIcon size={28} color={p.accent} />}</View>
            <Copy accessibilityRole="header" style={{ flex: 1, fontSize: 22, lineHeight: 28, fontWeight: '600' }}>{post.title}</Copy>
          </View>}
          {cover ? <Image source={cover} accessibilityLabel={`Foto de ${post.title}`} contentFit="cover" style={{ width: '100%', aspectRatio: 1.5, borderRadius: 12 }} /> : post.cover_path ? <Copy muted>Foto no disponible. Pulsa Actualizar para reintentar.</Copy> : post.kind === 'gift' ? <View style={{ width: '100%', aspectRatio: 1.5, borderRadius: 12, backgroundColor: p.soft, alignItems: 'center', justifyContent: 'center', gap: 8 }}><GiftIcon size={48} color={p.accent} weight="duotone" /><Copy muted style={{ fontSize: 14 }}>Sin foto</Copy></View> : null}
          {post.kind === 'gift' && <Copy accessibilityRole="header" style={{ fontSize: 25, lineHeight: 31, fontWeight: '600' }}>{post.title}</Copy>}
          {!!post.description && <Copy style={{ maxWidth: post.kind === 'plan' ? 760 : undefined }}>{post.description}</Copy>}
          <View style={{ marginTop: 'auto', gap: 16, paddingTop: 16, borderTopWidth: post.kind === 'plan' ? 1 : 0, borderColor: p.line, flexDirection: post.kind === 'plan' && width >= 900 ? 'row' : 'column', flexWrap: 'wrap', alignItems: post.kind === 'plan' && width >= 900 ? 'center' : 'stretch', justifyContent: 'space-between' }}>
          {paid ? <PricedGiftPanel post={post} members={members} accountId={repository!.accountId} now={now} busy={busy} onBid={amount => { void run(() => repository!.placeGroupBid(post.id, amount), 'Puja guardada.', true); }} onReserve={() => { void run(() => repository!.reservePricedGift(post.id), 'Reservado para ti.', true); }} /> : post.kind === 'gift' && post.gift_draw_at ? <GiftDrawPanel post={post} members={members} accountId={repository!.accountId} now={now} busy={busy} onToggle={() => { void run(() => repository!.respondToGroupPost(post.id, !interested), interested ? 'Participación retirada.' : '¡Ya estás en el sorteo!'); }} /> : <>
          {post.kind === 'gift' && post.status === 'open' && <View style={{ alignSelf: 'flex-start', backgroundColor: p.sage, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}><Copy style={{ color: p.sageText, fontSize: 13, fontWeight: '600' }}>Disponible</Copy></View>}
          {post.status === 'reserved' && <Copy style={{ color: p.peachText, backgroundColor: p.peach, padding: 10, borderRadius: 8 }}>{post.reserved_for === repository?.accountId ? 'Tiene tu nombre · Reservado para ti' : `Reservado${post.reserved_for ? ` para ${author(post.reserved_for)}` : ' · La destinataria ya no tiene cuenta'}`}</Copy>}
          {post.status === 'delivered' && <Copy style={{ color: p.sageText, backgroundColor: p.sage, padding: 10, borderRadius: 8 }}>Entregado</Copy>}
          <Copy muted>{responses.length ? `${post.kind === 'plan' ? 'Se apuntan' : 'Les interesa'}: ${responses.map(response => author(response.owner_id)).join(', ')}` : post.kind === 'plan' ? 'Todavía no se ha apuntado nadie.' : 'Todavía nadie ha indicado interés.'}</Copy>
          {post.status === 'open' && (post.kind === 'plan' || !own) && <Action secondary={interested} disabled={busy} onPress={() => { void run(() => repository!.respondToGroupPost(post.id, !interested), post.kind === 'plan' ? (interested ? 'Asistencia cancelada.' : '\u00a1Ya contamos contigo!') : (interested ? 'Inter\u00e9s retirado.' : '\u00a1Inter\u00e9s enviado!')); }}>{interested ? (post.kind === 'plan' ? 'Ya no me apunto' : 'Retirar mi interés') : post.kind === 'plan' ? 'Me apunto' : 'Me interesa'}</Action>}
          </>}
          </View>
        </Surface>;
      })}
      </View>
      {more && <TextAction disabled={busy} onPress={() => { void load(posts.length); }}>Ver más</TextAction>}
    </>}
    {busy && <ActivityIndicator color={p.accent} accessibilityLabel="Guardando cambios" />}
    </MotionContent>
    </View>
  </Screen>;
}
