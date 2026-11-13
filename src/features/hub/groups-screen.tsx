import { webMotion } from '@/components/web-motion';
import { MotionReveal } from '@/components/hub-motion';
import { LoadingImage } from '@/components/loading-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, View, useWindowDimensions } from 'react-native';
import { UsersThreeIcon } from 'phosphor-react-native/src/icons/UsersThree';
import { KeyIcon } from 'phosphor-react-native/src/icons/Key';
import { CaretRightIcon, LockSimpleIcon, PlusIcon, XIcon } from '@/components/hub-icons';
import { Action, Copy, Field, IconAction, SaveAction, Screen, TextAction } from '@/components/hub-ui';
import { useHub, usePalette } from '@/features/hub/provider';
import type { GroupRow } from '@/features/hub/backend-types';
import { getHubLayout } from './layout';
import { getGroupCover } from './group-covers';

export function GroupsScreen({ back = true, calendarHeader }: { back?: boolean; calendarHeader?: ReactNode }) {
  const { repository } = useHub();
  const p = usePalette();
  const { width, fontScale } = useWindowDimensions();
  const { contentWidth, feedColumns } = getHubLayout(width, fontScale);
  const columns = Math.min(feedColumns, 3);
  const cardWidth = columns === 1 ? '100%' as const : (contentWidth - (columns - 1) * 16) / columns;
  const current = useRef(repository);
  const loadedAccount = useRef(repository?.accountId);
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
    if (loadedAccount.current !== repository?.accountId) setGroups([]);
    loadedAccount.current = repository?.accountId;
    current.current = repository; setError(''); setLoading(true);
    if (repository) void repository.listGroups().then(rows => { if (active) setGroups(rows); }).catch(failure => { if (active) setError(failure.message); }).finally(() => { if (active) setLoading(false); });
    else setLoading(false);
    return () => { active = false; current.current = null; };
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
  const desktopHeader = width >= 1100 && fontScale <= 1.3 && !calendarHeader && !back;
  const actions = <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
    <Action expanded={mode === 'create'} disabled={busy} icon={<PlusIcon size={18} color={p.onAccent} />} onPress={() => setMode(mode === 'create' ? null : 'create')}>Crear grupo</Action>
    <Action secondary expanded={mode === 'join'} label="Unirme con un código de invitación" disabled={busy} icon={<KeyIcon size={18} color={p.accent} />} onPress={() => setMode(mode === 'join' ? null : 'join')}>Unirme</Action>
  </View>;
  return <Screen wide contentStyle={{ paddingTop: width >= 900 ? 48 : 24, gap: 32 }} back={back} title={calendarHeader ? 'Tu calendario' : back ? 'Mis grupos' : 'Amigas'} subtitle={!calendarHeader ? 'Donde «tenemos que vernos» empieza a tener fecha.' : undefined} action={desktopHeader ? actions : undefined} refreshing={loading} onRefresh={busy ? undefined : () => { setLoading(true); setRetry(value => value + 1); }}>
    {calendarHeader}
    {calendarHeader && <Copy style={{ fontWeight: '600' }}>Elige con qué amigas ver el calendario</Copy>}
    {!desktopHeader && actions}
    {mode && <MotionReveal style={{ maxWidth: 680, width: '100%', borderRadius: 16, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface, padding: 18, gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Copy accessibilityRole="header" style={{ flex: 1, fontSize: 20, fontWeight: '600' }}>{mode === 'create' ? 'Vuestro nuevo círculo' : 'Entra en tu grupo'}</Copy><IconAction label="Cerrar formulario" disabled={busy} onPress={() => setMode(null)}><XIcon size={18} color={p.muted} /></IconAction></View>
      {mode === 'create' ? <Field label="Nombre del grupo" value={name} onChangeText={setName} editable={!busy} placeholder="Por ejemplo, El comité del plan" maxLength={80} /> : <Field label="Código de invitación" value={token} onChangeText={setToken} editable={!busy} placeholder="Pega aquí el código que te han enviado" autoCapitalize="none" autoCorrect={false} maxLength={100} />}
      <SaveAction busy={busy} disabled={mode === 'create' ? !name.trim() : !token.trim()} onPress={() => { void perform(mode === 'join'); }}>{mode === 'create' ? 'Crear grupo' : 'Unirme al grupo'}</SaveAction>
    </MotionReveal>}
    {!!error && <View style={{ gap: 8 }}><Copy accessibilityRole="alert" style={{ color: p.danger }}>{error}</Copy>{!mode && <TextAction onPress={() => setRetry(value => value + 1)}>Volver a intentar</TextAction>}</View>}
    <View style={{ gap: 24, marginTop: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Copy accessibilityRole="header" style={{ fontSize: 22, lineHeight: 28, fontWeight: '600' }}>Tus círculos</Copy>
        {!loading && !error && <View style={{ minWidth: 28, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: p.soft }}><Copy style={{ color: p.accent, fontSize: 12, textAlign: 'center', fontWeight: '600' }}>{groups.length}</Copy></View>}
      </View>
      {loading && <ActivityIndicator color={p.accent} accessibilityLabel="Cargando grupos" />}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
      {groups.map(group => <Pressable key={group.id} {...webMotion('card')} accessibilityRole="button" accessibilityLabel={`Abrir ${group.name}`} onPress={() => router.push({ pathname: '/group-space', params: { id: group.id, tab: calendarHeader ? 'availability' : 'plan' } })} style={({ pressed }) => ({ width: cardWidth, borderRadius: 16, backgroundColor: p.surface, overflow: 'hidden', opacity: pressed ? 0.8 : 1 })}>
        <LoadingImage source={getGroupCover(group.id, group.cover_key)} contentFit="cover" accessible={false} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 176 }} />
        <View style={{ minHeight: 176, padding: 20, alignItems: 'flex-start' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(25, 22, 27, 0.8)' }}><LockSimpleIcon size={13} color="#FFFFFF" /><Copy style={{ fontSize: 11, lineHeight: 16, color: '#FFFFFF' }}>Privado</Copy></View>
        </View>
        <View style={{ padding: 24, gap: 12, flex: 1 }}>
          <Copy style={{ fontSize: 22, lineHeight: 30, fontWeight: '600' }}>{group.name}</Copy>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <UsersThreeIcon size={17} color={p.muted} /><Copy muted style={{ fontSize: 13 }}>{group.group_members?.[0]?.count ?? 0} {(group.group_members?.[0]?.count ?? 0) === 1 ? 'miembro' : 'miembros'}</Copy>
          </View>
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 8 }}>
            <Copy muted style={{ fontSize: 12 }}>{group.owner_id === repository?.accountId ? 'Administrador' : 'Miembro'}</Copy>
            <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: p.soft }}><CaretRightIcon size={18} color={p.accent} /></View>
          </View>
        </View>
      </Pressable>)}
      </View>
      {!loading && !error && !groups.length && <View style={{ alignItems: 'center', paddingVertical: 28, gap: 12 }}><View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: p.sage, alignItems: 'center', justifyContent: 'center' }}><UsersThreeIcon size={36} color={p.sageText} weight="duotone" /></View><Copy style={{ fontSize: 20, fontWeight: '600', textAlign: 'center' }}>Tu primer círculo empieza aquí</Copy><Copy muted style={{ textAlign: 'center', fontSize: 15, lineHeight: 23 }}>Crea un grupo con tus amigas o únete con una invitación. El nombre del grupo puede llevar más debate que el primer plan.</Copy></View>}
    </View>
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 16 }}><LockSimpleIcon size={17} color={p.muted} /><Copy muted style={{ flex: 1, fontSize: 12, lineHeight: 19 }}>Solo los miembros pueden ver lo que compartís con el grupo.</Copy></View>
  </Screen>;
}
