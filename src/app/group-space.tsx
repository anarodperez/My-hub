import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { ActivityIndicator, Alert, Platform, View } from 'react-native';
import { Action, ChoiceTabs, Copy, Privacy, Screen, Surface, TextAction } from '@/components/hub-ui';
import { GroupAvailability } from '@/features/hub/group-availability';
import { displayDate, localDate } from '@/features/hub/model';
import { useHub, usePalette } from '@/features/hub/provider';
import type { Author, AvailabilityRow, GroupPostRow } from '@/features/hub/backend-types';

type Tab = 'availability' | 'plan' | 'gift';
export default function GroupSpaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repository } = useHub();
  return <GroupSpace key={`${repository?.accountId}:${id}`} id={id} />;
}
function GroupSpace({ id }: { id: string }) {
  const { repository, media } = useHub();
  const p = usePalette();
  const [tab, setTab] = useState<Tab>('availability');
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
  const [more, setMore] = useState(false);
  const generation = useRef(0);
  const locked = useRef(false);
  const load = useCallback(async (offset = 0) => {
    if (!repository || !media) return;
    const turn = ++generation.current;
    setError(''); setLoading(true);
    try {
      const [groups, membership] = await Promise.all([repository.listGroups(), repository.listMembers(id)]);
      const group = groups.find(entry => entry.id === id);
      if (!group) throw new Error('Este grupo ya no está disponible para tu cuenta.');
      const authors = await Promise.all(membership.map(entry => repository.author(entry.user_id)));
      const rows = tab === 'availability'
        ? await repository.listAvailability(id, localDate(month), localDate(new Date(month.getFullYear(), month.getMonth() + 1, 0)))
        : await repository.listGroupPosts(id, tab, offset);
      const nextPhotos: Record<string, string> = {};
      if (tab !== 'availability') await Promise.all((rows as GroupPostRow[]).map(async row => {
        if (row.cover_path) nextPhotos[row.id] = await media.resolve(row.cover_path, 'group-media').catch(() => '');
      }));
      if (generation.current !== turn) return;
      setName(group.name); setMembers(authors.filter((author): author is Author => !!author));
      if (tab === 'availability') setAvailability(rows as AvailabilityRow[]);
      else {
        setPosts(previous => offset ? [...new Map([...previous, ...rows as GroupPostRow[]].map(row => [row.id, row])).values()] : rows as GroupPostRow[]);
        setPhotos(previous => offset ? { ...previous, ...nextPhotos } : nextPhotos); setMore(rows.length === 30);
      }
    } catch (failure) {
      if (generation.current === turn) { setName(''); setMembers([]); setPosts([]); setAvailability([]); setPhotos({}); setError(failure instanceof Error ? failure.message : 'No se pudo cargar el grupo.'); }
    } finally { if (generation.current === turn) setLoading(false); }
  }, [repository, media, id, month, tab]);
  useFocusEffect(useCallback(() => {
    setPosts([]); setAvailability([]); setName(''); setPhotos({});
    void load();
    return () => { generation.current++; };
  }, [load]));
  const run = async (action: () => Promise<unknown>) => {
    if (locked.current || loading || !name) return;
    locked.current = true; setBusy(true); setError('');
    const turn = generation.current;
    try { await action(); if (generation.current === turn) await load(); }
    catch (failure) { if (generation.current === turn) { setName(''); setPosts([]); setAvailability([]); setPhotos({}); setError(failure instanceof Error ? failure.message : 'No se pudo guardar. Actualiza y vuelve a intentarlo.'); } }
    finally { locked.current = false; setBusy(false); }
  };
  const remove = (post: GroupPostRow) => {
    const perform = () => { void run(() => repository!.deleteGroupPost(post.id, post.revision)); };
    if (Platform.OS === 'web') { if (globalThis.confirm('¿Retirar esta publicación y sus respuestas?')) perform(); }
    else Alert.alert('¿Retirar esta publicación?', 'También se retirarán sus respuestas.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Retirar', style: 'destructive', onPress: perform }]);
  };
  const author = (owner: string) => members.find(member => member.id === owner)?.name || 'Miembro del grupo';
  return <Screen back title={name || 'Entre amigas'} subtitle="Un espacio solo para vuestro grupo">
    <Privacy>Disponibilidad, planes y regalos privados del grupo</Privacy>
    <TextAction disabled={busy} onPress={() => router.push({ pathname: '/group/[id]', params: { id } })}>Miembros e invitaciones</TextAction>
    <ChoiceTabs value={tab} onChange={value => { if (!busy) setTab(value); }} options={[{ value: 'availability', label: 'Disponibilidad' }, { value: 'plan', label: 'Planes' }, { value: 'gift', label: 'Regalos' }]} />
    <TextAction disabled={busy || loading} onPress={() => { void load(); }}>Actualizar</TextAction>
    {loading && <ActivityIndicator color={p.accent} accessibilityLabel="Cargando el grupo" />}
    {!!error && <Copy accessibilityRole="alert" style={{ color: p.danger }}>{error} Pulsa Actualizar para reintentar.</Copy>}
    {!loading && !!name && tab === 'availability' && <GroupAvailability rows={availability} members={members} accountId={repository!.accountId} month={month} onMonth={value => { if (!busy) { setMonth(value); setSelected(localDate(value)); } }} selected={selected} onSelect={setSelected} busy={busy} onToggle={(period, value) => { void run(() => repository!.setAvailability(id, selected, period, value)); }} />}
    {!loading && !!name && tab !== 'availability' && <>
      <Action disabled={busy} onPress={() => router.push({ pathname: '/group-post', params: { groupId: id, kind: tab } })}>{tab === 'plan' ? 'Proponer un plan' : 'Publicar algo para regalar'}</Action>
      {!posts.length && <View style={{ paddingVertical: 24, gap: 8 }}><Copy style={{ fontSize: 22, fontWeight: '600' }}>{tab === 'plan' ? '¿Cuándo nos vemos?' : 'Dale una segunda vida'}</Copy><Copy muted>{tab === 'plan' ? 'Propón el primer plan. Las demás podrán apuntarse.' : 'Publica algo que quieras regalar a alguien del grupo.'}</Copy></View>}
      {posts.map(post => {
        const own = post.owner_id === repository!.accountId;
        const responses = post.group_post_responses.filter(response => members.some(member => member.id === response.owner_id));
        const interested = responses.some(response => response.owner_id === repository!.accountId);
        return <Surface key={post.id}>
          <Copy muted style={{ fontSize: 13 }}>{author(post.owner_id)}{own ? ' (tú)' : ''}{post.event_date ? ` · ${displayDate(post.event_date)}` : post.kind === 'plan' ? ' · Fecha por decidir' : ''}</Copy>
          <Copy accessibilityRole="header" style={{ fontSize: 22, lineHeight: 28, fontWeight: '600' }}>{post.title}</Copy>
          {post.cover_path && (photos[post.id] ? <Image source={photos[post.id]} accessibilityLabel={`Foto de ${post.title}`} contentFit="cover" style={{ width: '100%', height: 220, borderRadius: 12 }} /> : <Copy muted>Foto no disponible. Pulsa Actualizar para reintentar.</Copy>)}
          {!!post.description && <Copy>{post.description}</Copy>}
          {post.status === 'delivered' && <Copy style={{ color: p.sageText, backgroundColor: p.sage, padding: 10, borderRadius: 8 }}>Entregado</Copy>}
          <Copy muted>{responses.length ? `${post.kind === 'plan' ? 'Se apuntan' : 'Les interesa'}: ${responses.map(response => author(response.owner_id)).join(', ')}` : post.kind === 'plan' ? 'Todavía no se ha apuntado nadie.' : 'Todavía nadie ha indicado interés.'}</Copy>
          {post.status === 'open' && (post.kind === 'plan' || !own) && <Action secondary={interested} disabled={busy} onPress={() => { void run(() => repository!.respondToGroupPost(post.id, !interested)); }}>{interested ? (post.kind === 'plan' ? 'Ya no me apunto' : 'Retirar mi interés') : post.kind === 'plan' ? 'Me apunto' : 'Me interesa'}</Action>}
          {own && post.kind === 'gift' && <TextAction disabled={busy} onPress={() => { void run(() => repository!.setGroupGiftStatus(post.id, post.status === 'open' ? 'delivered' : 'open', post.revision)); }}>{post.status === 'open' ? 'Marcar como entregado' : 'Volver a ofrecer'}</TextAction>}
          {own && <TextAction danger disabled={busy} onPress={() => remove(post)}>Retirar publicación</TextAction>}
        </Surface>;
      })}
      {more && <TextAction disabled={busy} onPress={() => { void load(posts.length); }}>Ver más</TextAction>}
    </>}
    {busy && <ActivityIndicator color={p.accent} accessibilityLabel="Guardando cambios" />}
  </Screen>;
}
