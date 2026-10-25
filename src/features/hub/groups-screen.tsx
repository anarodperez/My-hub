import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { UsersThreeIcon } from 'phosphor-react-native/src/icons/UsersThree';
import { KeyIcon } from 'phosphor-react-native/src/icons/Key';
import { CaretRightIcon, LockSimpleIcon, PlusIcon, XIcon } from '@/components/hub-icons';
import { Copy, Field, IconAction, SaveAction, Screen, Section, TextAction } from '@/components/hub-ui';
import { useHub, usePalette } from '@/features/hub/provider';
import type { GroupRow } from '@/features/hub/backend-types';

export function GroupsScreen({ back = true }: { back?: boolean }) {
  const { repository } = useHub();
  const p = usePalette();
  const current = useRef(repository); current.current = repository;
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [mode, setMode] = useState<'create' | 'join' | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setGroups([]); setError(''); setLoading(true);
    if (repository) void repository.listGroups().then(rows => { if (active) setGroups(rows); }).catch(failure => { if (active) setError(failure.message); }).finally(() => { if (active) setLoading(false); });
    else setLoading(false);
    return () => { active = false; };
    // Changing retry deliberately reruns this focused query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repository, retry]));
  const perform = async (join: boolean) => {
    if (!repository || busy) return;
    setBusy(true); setError('');
    try {
      const id = join ? await repository.acceptInvite(token.trim()) : await repository.createGroup(name);
      if (current.current !== repository) return;
      setName(''); setToken(''); setMode(null);
      router.push({ pathname: '/group-space', params: { id } });
    } catch (failure) { if (current.current === repository) setError(failure instanceof Error ? failure.message : 'No se pudo completar.'); }
    finally { if (current.current === repository) setBusy(false); }
  };
  return <Screen back={back} title={back ? "Mis grupos" : "Amigas"}>
    <View style={{ gap: 8 }}><Copy accessibilityRole="header" style={{ fontSize: 26, lineHeight: 33, fontWeight: '700' }}>Las buenas cosas, compartidas.</Copy><Copy muted style={{ fontSize: 15, lineHeight: 22 }}>Disponibilidad, planes y cosas para regalar. Solo con las personas de cada grupo.</Copy></View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {[{ value: 'create' as const, label: 'Crear grupo', Icon: PlusIcon }, { value: 'join' as const, label: 'Unirme', Icon: KeyIcon }].map(({ value, label, Icon }) => <Pressable key={value} disabled={busy} accessibilityRole="button" accessibilityLabel={value === 'join' ? 'Unirme con un código de invitación' : label} accessibilityState={{ expanded: mode === value, disabled: busy }} onPress={() => setMode(mode === value ? null : value)} style={({ pressed }) => ({ flex: 1, minWidth: 130, minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: value === 'create' || mode === value ? p.accent : p.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, backgroundColor: value === 'create' ? p.accent : mode === value ? p.soft : p.surface, opacity: busy ? 0.5 : pressed ? 0.7 : 1 })}><Icon size={19} color={value === 'create' ? p.onAccent : p.accent} /><Copy style={{ color: value === 'create' ? p.onAccent : p.accent, fontSize: 14, fontWeight: '600' }}>{label}</Copy></Pressable>)}
    </View>
    {mode && <View style={{ borderRadius: 16, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface, padding: 18, gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Copy accessibilityRole="header" style={{ flex: 1, fontSize: 20, fontWeight: '600' }}>{mode === 'create' ? 'Vuestro nuevo círculo' : 'Entra en tu grupo'}</Copy><IconAction label="Cerrar formulario" disabled={busy} onPress={() => setMode(null)}><XIcon size={18} color={p.muted} /></IconAction></View>
      {mode === 'create' ? <Field label="Nombre del grupo" value={name} onChangeText={setName} editable={!busy} placeholder="Por ejemplo, Entre páginas" maxLength={80} /> : <Field label="Código de invitación" value={token} onChangeText={setToken} editable={!busy} placeholder="Pega aquí el código que te han enviado" autoCapitalize="none" autoCorrect={false} maxLength={100} />}
      <SaveAction busy={busy} disabled={mode === 'create' ? !name.trim() : !token.trim()} onPress={() => { void perform(mode === 'join'); }}>{mode === 'create' ? 'Crear grupo' : 'Unirme al grupo'}</SaveAction>
    </View>}
    {!!error && <View style={{ gap: 8 }}><Copy accessibilityRole="alert" style={{ color: p.danger }}>{error}</Copy>{!mode && <TextAction onPress={() => setRetry(value => value + 1)}>Volver a intentar</TextAction>}</View>}
    <View style={{ gap: 14, marginTop: 10 }}>
      <Section title="Tus círculos" trailing={!loading && !error ? <View style={{ minWidth: 26, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: p.soft }}><Copy style={{ color: p.accent, fontSize: 12, textAlign: 'center', fontWeight: '600' }}>{groups.length}</Copy></View> : undefined} />
      {loading && <ActivityIndicator color={p.accent} accessibilityLabel="Cargando grupos" />}
      {groups.map(group => <Pressable key={group.id} accessibilityRole="button" accessibilityLabel={`Abrir ${group.name}`} onPress={() => router.push({ pathname: '/group-space', params: { id: group.id } })} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20, borderRadius: 18, borderWidth: 1, borderColor: pressed ? p.accent : p.line, backgroundColor: p.surface, minHeight: 108, opacity: pressed ? 0.8 : 1 })}>
        <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: p.soft, alignItems: 'center', justifyContent: 'center' }}><Copy style={{ fontSize: 20, fontWeight: '600', color: p.accent }}>{group.name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toLocaleUpperCase('es-ES')}</Copy></View>
        <View style={{ flex: 1, gap: 7 }}><Copy style={{ fontSize: 20, lineHeight: 26, fontWeight: '600' }}>{group.name}</Copy><View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}><UsersThreeIcon size={15} color={p.muted} /><Copy muted style={{ fontSize: 13 }}>{group.group_members?.[0]?.count ?? 0} {(group.group_members?.[0]?.count ?? 0) === 1 ? 'miembro' : 'miembros'}</Copy><LockSimpleIcon size={13} color={p.muted} /></View>{group.owner_id === repository?.accountId && <View style={{ alignSelf: 'flex-start', backgroundColor: p.sage, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}><Copy style={{ fontSize: 11, lineHeight: 16, fontWeight: '600', color: p.sageText }}>Administrador</Copy></View>}</View>
        <CaretRightIcon size={19} color={p.muted} />
      </Pressable>)}
      {!loading && !error && !groups.length && <View style={{ alignItems: 'center', paddingVertical: 28, gap: 12 }}><View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: p.soft, alignItems: 'center', justifyContent: 'center' }}><UsersThreeIcon size={36} color={p.accent} weight="duotone" /></View><Copy style={{ fontSize: 20, fontWeight: '600', textAlign: 'center' }}>Tu primer círculo empieza aquí</Copy><Copy muted style={{ textAlign: 'center', fontSize: 15, lineHeight: 23 }}>Crea un grupo con tus amigos o únete con una invitación.</Copy></View>}
    </View>
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', borderTopWidth: 1, borderColor: p.line, paddingTop: 18 }}><LockSimpleIcon size={17} color={p.sageText} /><Copy muted style={{ flex: 1, fontSize: 12, lineHeight: 19 }}>Solo los miembros pueden ver lo que compartís con el grupo.</Copy></View>
  </Screen>;
}
