import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, View } from 'react-native';
import { UsersThreeIcon } from 'phosphor-react-native/src/icons/UsersThree';
import { KeyIcon } from 'phosphor-react-native/src/icons/Key';
import { LockSimpleIcon, PencilSimpleIcon, TrashIcon } from '@/components/hub-icons';
import { Copy, Field, IconAction, SaveAction, Screen, Section, TextAction } from '@/components/hub-ui';
import { useHub, usePalette } from '@/features/hub/provider';
import type { Author, GroupRow } from '@/features/hub/backend-types';

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repository, refresh } = useHub();
  const p = usePalette();
  const current = useRef(repository); current.current = repository;
  const [group, setGroup] = useState<GroupRow>();
  const [members, setMembers] = useState<Author[]>([]);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const load = async () => {
    if (!repository) return;
    const [groups, entries] = await Promise.all([repository.listGroups(), repository.listMembers(id)]);
    const authors = await Promise.all(entries.map((entry) => repository.author(entry.user_id)));
    if (current.current !== repository) return;
    const selected = groups.find((entry) => entry.id === id);
    if (!selected) throw new Error('Este grupo ya no está disponible para tu cuenta.');
    setGroup(selected); setMembers(authors.filter((entry): entry is Author => !!entry));
  };
  useEffect(() => {
    current.current = repository; setGroup(undefined); setMembers([]); setToken(''); setError('');
    setEditing(false); setName('');
    void load().catch((failure) => { if (current.current === repository) setError(failure.message); });
    return () => { current.current = null; };
    // Route changes reload the full group; actions below refresh after mutations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repository, id]);
  const run = async (action: () => Promise<unknown>, leave = false) => {
    if (busy || !repository) return;
    setBusy(true); setError('');
    try { await action(); if (current.current !== repository) return; if (leave) { await refresh(); router.replace('/groups'); } else await load(); }
    catch (failure) { if (current.current === repository) setError(failure instanceof Error ? failure.message : 'No se pudo completar.'); }
    finally { if (current.current === repository) setBusy(false); }
  };
  const confirm = (message: string, action: () => Promise<unknown>, leave = false) => {
    if (Platform.OS === 'web') { if (globalThis.confirm(message)) void run(action, leave); }
    else Alert.alert(message, undefined, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Confirmar', style: 'destructive', onPress: () => { void run(action, leave); } }]);
  };
  const own = group?.owner_id === repository?.accountId;
  return <Screen back title="Grupo">
    {group && <>
      <View style={{ alignItems: 'center', gap: 14, paddingVertical: 10 }}>
        <View style={{ width: 80, height: 80, borderRadius: 26, backgroundColor: p.soft, alignItems: 'center', justifyContent: 'center' }}><UsersThreeIcon size={40} color={p.accent} weight="duotone" /></View>
        <Copy accessibilityRole="header" style={{ fontSize: 30, lineHeight: 38, fontWeight: '700', textAlign: 'center' }}>{group.name}</Copy>
        {own && !editing && <IconAction label="Editar nombre del grupo" disabled={busy} onPress={() => { setName(group.name); setEditing(true); }}><PencilSimpleIcon size={21} color={p.accent} /></IconAction>}
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}><LockSimpleIcon size={15} color={p.muted} /><Copy muted style={{ fontSize: 13 }}>Grupo privado · {members.length} {members.length === 1 ? 'miembro' : 'miembros'}</Copy></View>
        {own && <View style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, backgroundColor: p.sage }}><Copy style={{ color: p.sageText, fontSize: 12, fontWeight: '600' }}>Eres administrador</Copy></View>}
      </View>
      {own && editing && <View style={{ gap: 12 }}>
        <Field label="Nombre del grupo" value={name} onChangeText={setName} maxLength={80} editable={!busy} />
        <SaveAction busy={busy} disabled={!name.trim() || name.trim() === group.name} onPress={() => { void run(async () => { await repository!.renameGroup(id, name); if (current.current === repository) setEditing(false); }); }}>Guardar nombre</SaveAction>
        <TextAction disabled={busy} onPress={() => setEditing(false)}>Cancelar</TextAction>
      </View>}
      <View style={{ gap: 8 }}>
        <Section title="Entre amigas" />
        <Copy muted>Vuestra disponibilidad, propuestas de planes y cosas para regalar, solo dentro de este grupo.</Copy>
        <SaveAction disabled={busy} onPress={() => router.push({ pathname: '/group-space', params: { id } })}>Ver disponibilidad, planes y regalos</SaveAction>
      </View>
      <View style={{ gap: 14, marginTop: 8 }}>
        <Section title="Quiénes estamos" trailing={<Copy muted style={{ fontSize: 13 }}>{members.length}</Copy>} />
        <View style={{ backgroundColor: p.surface, borderRadius: 16, overflow: 'hidden' }}>
          {members.map((member, index) => <View key={member.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, minHeight: 76, borderTopWidth: index ? 1 : 0, borderColor: p.line }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: p.soft, alignItems: 'center', justifyContent: 'center' }}><Copy style={{ color: p.accent, fontWeight: '600' }}>{(member.name || 'Usuario').charAt(0).toLocaleUpperCase('es-ES')}</Copy></View>
            <View style={{ flex: 1, gap: 3 }}><Copy style={{ fontSize: 16, fontWeight: '600' }}>{member.name || 'Usuario'}{member.id === repository?.accountId ? ' (tú)' : ''}</Copy><Copy muted style={{ fontSize: 12 }}>{member.id === group.owner_id ? 'Administrador' : 'Miembro'}</Copy></View>
            {own && member.id !== repository?.accountId && <IconAction disabled={busy} label={`Quitar a ${member.name || 'este miembro'} del grupo`} onPress={() => confirm('¿Quitar a esta persona del grupo?', () => repository!.removeMember(id, member.id))}><TrashIcon size={19} color={p.danger} /></IconAction>}
          </View>)}
        </View>
      </View>
      {own && <View style={{ marginTop: 8, gap: 14 }}>
        <Section title="Invita a alguien" />
        <View style={{ padding: 18, borderRadius: 16, borderWidth: 1, borderColor: p.line, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}><KeyIcon size={24} color={p.accent} /><Copy muted style={{ flex: 1, fontSize: 15, lineHeight: 23 }}>Cada código sirve para una persona y caduca en 7 días.</Copy></View>
          <TextAction disabled={busy} onPress={() => { void run(async () => { const next = await repository!.createInvite(id); if (current.current === repository) setToken(next); }); }}>{token ? 'Generar otro código' : 'Crear código de invitación'}</TextAction>
          {!!token && <View style={{ backgroundColor: p.soft, padding: 14, borderRadius: 10, gap: 6 }}><Copy style={{ fontSize: 12, color: p.accent }}>Mantén pulsado para copiar</Copy><Copy selectable style={{ fontSize: 16, lineHeight: 24, color: p.accent, fontWeight: '600' }}>{token}</Copy></View>}
          <TextAction disabled={busy} onPress={() => { void run(async () => { await repository!.revokeInvites(id); if (current.current === repository) setToken(''); }); }}>Revocar códigos pendientes</TextAction>
        </View>
      </View>}
      <View style={{ borderTopWidth: 1, borderColor: p.line, paddingTop: 18, marginTop: 8, gap: 6 }}>
        {own ? <><Copy muted style={{ fontSize: 13, lineHeight: 20 }}>Al eliminar el grupo, los descubrimientos pasarán a ser privados. La disponibilidad, los planes, los regalos y sus respuestas se eliminarán.</Copy><TextAction disabled={busy} danger icon={<TrashIcon size={18} color={p.danger} />} onPress={() => confirm('¿Eliminar el grupo? Se eliminarán su disponibilidad, planes, regalos y respuestas. Los descubrimientos pasarán a ser privados.', () => repository!.deleteGroup(id), true)}>Eliminar grupo</TextAction></> : <TextAction disabled={busy} danger onPress={() => confirm('¿Salir del grupo?', () => repository!.leaveGroup(id), true)}>Salir del grupo</TextAction>}
      </View>
    </>}
    {busy && <ActivityIndicator color={p.accent} accessibilityLabel="Actualizando grupo" />}
    {!!error && <View style={{ gap: 8 }}><Copy accessibilityRole="alert" style={{ color: p.danger }}>{error}</Copy><TextAction disabled={busy} onPress={() => { setError(''); void load().catch(failure => setError(failure.message)); }}>Volver a intentar</TextAction></View>}
    {!group && !error && <View style={{ alignItems: 'center', paddingVertical: 40, gap: 14 }}><ActivityIndicator color={p.accent} /><Copy muted>Cargando tu grupo…</Copy></View>}
  </Screen>;
}
