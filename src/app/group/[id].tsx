import { GroupCoverPicker } from '@/components/group-cover-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, View, useWindowDimensions } from 'react-native';
import { KeyIcon } from 'phosphor-react-native/src/icons/Key';
import { CheckIcon, PencilSimpleIcon, TrashIcon } from '@/components/hub-icons';
import { Action, Copy, Field, IconAction, SaveAction, Screen, Section, TextAction } from '@/components/hub-ui';
import { GroupHeader } from '@/components/group-header';
import { useHub, usePalette } from '@/features/hub/provider';
import type { Author, GroupRow } from '@/features/hub/backend-types';

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repository, refresh } = useHub();
  const p = usePalette();
  const { width, fontScale } = useWindowDimensions();
  const sideBySide = width >= 1200 && fontScale <= 1.3;
  const current = useRef(repository);
  const [group, setGroup] = useState<GroupRow>();
  const [members, setMembers] = useState<Author[]>([]);
  const [token, setToken] = useState('');
  const [copiedToken, setCopiedToken] = useState('');
  const [copyError, setCopyError] = useState('');
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
    current.current = repository; setGroup(undefined); setMembers([]); setToken(''); setCopiedToken(''); setCopyError(''); setError('');
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
  const copied = !!token && copiedToken === token;
  const copyInvite = async () => {
    if (!token || !repository || busy) return;
    setCopiedToken(''); setCopyError('');
    try {
      await navigator.clipboard.writeText(token);
      if (current.current === repository) setCopiedToken(token);
    } catch {
      if (current.current === repository) setCopyError('No se pudo copiar. Selecciona el código y cópialo manualmente.');
    }
  };
  return <Screen wide back backTo={{ pathname: '/group-space', params: { id } }} title="Personas" contentStyle={{ gap: 24 }}>
    {group && <>
      <GroupHeader id={id} name={group.name} coverKey={group.cover_key} count={members.length} members={members} tab="people" busy={busy} onTabChange={tab => { if (tab !== 'people') router.navigate({ pathname: '/group-space', params: { id, tab } }); }} />
      {own && <GroupCoverPicker group={group} onSaved={setGroup} disabled={busy} />}
      {own && editing && <View style={{ gap: 12, maxWidth: 680 }}>
        <Field label="Nombre del grupo" value={name} onChangeText={setName} maxLength={80} editable={!busy} />
        <SaveAction busy={busy} disabled={!name.trim() || name.trim() === group.name} onPress={() => { void run(async () => { await repository!.renameGroup(id, name); if (current.current === repository) setEditing(false); }); }}>Guardar nombre</SaveAction>
        <TextAction disabled={busy} onPress={() => setEditing(false)}>Cancelar</TextAction>
      </View>}
      {own && !editing && <TextAction disabled={busy} icon={<PencilSimpleIcon size={18} color={p.accent} />} onPress={() => { setName(group.name); setEditing(true); }}>Editar nombre del grupo</TextAction>}
      <View style={{ flexDirection: sideBySide ? 'row-reverse' : 'column', alignItems: 'flex-start', gap: 32 }}>
      {own && <View style={{ width: sideBySide ? 340 : '100%', backgroundColor: p.soft, padding: 24, borderRadius: 16, gap: 16 }}>
        <KeyIcon size={28} color={p.accent} />
        <Copy accessibilityRole="header" style={{ fontSize: 22, lineHeight: 28, fontWeight: '600' }}>Invita a tus amigas</Copy>
        <Copy muted style={{ fontSize: 14, lineHeight: 22 }}>Crea un código y envíaselo a una amiga. Podrá usarlo en Amigas → Unirme.</Copy>
        <Action disabled={busy} icon={<KeyIcon size={18} color={p.onAccent} />} onPress={() => { void run(async () => { const next = await repository!.createInvite(id); if (current.current === repository) { setToken(next); setCopiedToken(''); setCopyError(''); } }); }}>{token ? 'Generar otro código' : 'Crear código de invitación'}</Action>
        {!!token && <View style={{ backgroundColor: p.surface, padding: 16, borderRadius: 12, gap: 12 }}><Copy selectable style={{ fontSize: 16, lineHeight: 24, color: p.accent, fontWeight: '600' }}>{token}</Copy>{Platform.OS === 'web' ? <><Action secondary disabled={busy} icon={copied ? <CheckIcon size={18} color={p.sageText} /> : undefined} onPress={() => { void copyInvite(); }}>{copied ? 'Copiado' : 'Copiar código'}</Action>{copied && <Copy accessibilityLiveRegion="polite" style={{ color: p.sageText, fontSize: 12 }}>Código copiado. Ya puedes enviarlo.</Copy>}{!!copyError && <Copy accessibilityRole="alert" style={{ color: p.danger, fontSize: 13 }}>{copyError}</Copy>}</> : <Copy muted style={{ fontSize: 12 }}>Mantén pulsado para copiar</Copy>}</View>}
        <Copy muted style={{ fontSize: 12, lineHeight: 18 }}>Cada código sirve para una persona y caduca en 7 días.</Copy>
        <TextAction disabled={busy} onPress={() => { void run(async () => { await repository!.revokeInvites(id); if (current.current === repository) { setToken(''); setCopiedToken(''); setCopyError(''); } }); }}>Revocar códigos pendientes</TextAction>
      </View>}
      <View style={{ flex: sideBySide ? 1 : undefined, width: sideBySide ? undefined : '100%', minWidth: 0, gap: 16 }}>
        <Section title="Quiénes estamos" trailing={<Copy muted style={{ fontSize: 13 }}>{members.length}</Copy>} />
        <Copy muted style={{ fontSize: 14, lineHeight: 21 }}>El reparto de esta serie. Sin personajes secundarios.</Copy>
        <View style={{ backgroundColor: p.surface, borderRadius: 16, overflow: 'hidden' }}>
          {members.map((member, index) => <View key={member.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, minHeight: 76, borderTopWidth: index ? 1 : 0, borderColor: p.line }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: p.soft, alignItems: 'center', justifyContent: 'center' }}><Copy style={{ color: p.accent, fontWeight: '600' }}>{(member.name || 'Usuario').charAt(0).toLocaleUpperCase('es-ES')}</Copy></View>
            <View style={{ flex: 1, gap: 3 }}><Copy style={{ fontSize: 16, fontWeight: '600' }}>{member.name || 'Usuario'}{member.id === repository?.accountId ? ' (tú)' : ''}</Copy><Copy muted style={{ fontSize: 12 }}>{member.id === group.owner_id ? 'Administrador' : 'Miembro'}</Copy></View>
            {own && member.id !== repository?.accountId && <IconAction disabled={busy} label={`Quitar a ${member.name || 'este miembro'} del grupo`} onPress={() => confirm('¿Quitar a esta persona del grupo?', () => repository!.removeMember(id, member.id))}><TrashIcon size={19} color={p.danger} /></IconAction>}
          </View>)}
        </View>
      </View>
      </View>
      <View style={{ borderTopWidth: 1, borderColor: p.line, paddingTop: 18, marginTop: 8, gap: 6 }}>
        {own ? <><Copy muted style={{ fontSize: 13, lineHeight: 20 }}>Al eliminar el grupo, los descubrimientos pasarán a ser privados. La disponibilidad, los planes, los regalos y sus respuestas se eliminarán.</Copy><TextAction disabled={busy} danger icon={<TrashIcon size={18} color={p.danger} />} onPress={() => confirm('¿Eliminar el grupo? Se eliminarán su disponibilidad, planes, regalos y respuestas. Los descubrimientos pasarán a ser privados.', () => repository!.deleteGroup(id), true)}>Eliminar grupo</TextAction></> : <TextAction disabled={busy} danger onPress={() => confirm('¿Salir del grupo?', () => repository!.leaveGroup(id), true)}>Salir del grupo</TextAction>}
      </View>
    </>}
    {busy && <ActivityIndicator color={p.accent} accessibilityLabel="Actualizando grupo" />}
    {!!error && <View style={{ gap: 8 }}><Copy accessibilityRole="alert" style={{ color: p.danger }}>{error}</Copy><TextAction disabled={busy} onPress={() => { setError(''); void load().catch(failure => setError(failure.message)); }}>Volver a intentar</TextAction></View>}
    {!group && !error && <View style={{ alignItems: 'center', paddingVertical: 40, gap: 14 }}><ActivityIndicator color={p.accent} /><Copy muted>Cargando tu grupo…</Copy></View>}
  </Screen>;
}
