import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Action, Copy, Empty, TextAction } from './hub-ui';
import { CalendarBlankIcon } from './hub-icons';
import { GettingStarted } from './getting-started';
import { ActionNotice } from './action-notice';
import { useHub, usePalette } from '@/features/hub/provider';
import { displayDate, localDate } from '@/features/hub/model';
import type { GroupPostRow, GroupRow } from '@/features/hub/backend-types';

export function HomePlans({ refreshKey = 0 }: { refreshKey?: number }) {
  const { repository } = useHub();
  return repository ? <Plans key={repository.accountId} refreshKey={refreshKey} /> : null;
}

function Plans({ refreshKey }: { refreshKey: number }) {
  const { repository } = useHub();
  const p = usePalette();
  const [plans, setPlans] = useState<GroupPostRow[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const generation = useRef(0);
  const locked = useRef(false);
  const load = useCallback(async () => {
    if (!repository) return;
    const turn = ++generation.current;
    setLoading(true); setError('');
    try {
      const [nextGroups, nextPlans] = await Promise.all([repository.listGroups(), repository.listUpcomingGroupPlans(localDate(new Date()))]);
      if (turn === generation.current) { setGroups(nextGroups); setPlans(nextPlans); setLoaded(true); }
    } catch { if (turn === generation.current) { setError('No se pudieron cargar tus planes.'); } }
    finally { if (turn === generation.current) setLoading(false); }
  }, [repository]);
  // The parent's pull-to-refresh deliberately reloads this focused section too.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useFocusEffect(useCallback(() => { void load(); return () => { generation.current++; }; }, [load, refreshKey]));
  const respond = async (plan: GroupPostRow, joined: boolean) => {
    if (!repository || locked.current) return;
    locked.current = true; setBusy(plan.id); setError(''); setNotice('');
    const turn = generation.current;
    try {
      await repository.respondToGroupPost(plan.id, !joined);
      if (turn === generation.current) setNotice(joined ? 'Asistencia cancelada.' : '¡Ya contamos contigo!');
      if (turn === generation.current) await load();
    } catch (failure) { if (turn === generation.current) setError(failure instanceof Error ? failure.message : 'No se pudo guardar tu respuesta.'); }
    finally { locked.current = false; setBusy(''); }
  };
  return <View style={{ gap: 14 }}>
    {loaded && <GettingStarted hasGroup={groups.length > 0} hasPlan={plans.some(plan => plan.owner_id === repository?.accountId)} />}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><Copy accessibilityRole="header" style={{ fontSize: 22, lineHeight: 28, fontWeight: '600' }}>Entre amigas</Copy><TextAction onPress={() => router.navigate('/friends')}>Mis grupos</TextAction></View>
    {!!notice && <ActionNotice key={notice} message={notice} />}
    {loading && <ActivityIndicator color={p.accent} accessibilityLabel="Cargando próximos planes" />}
    {!!error && <View style={{ gap: 4 }}><Copy accessibilityRole="alert" style={{ color: p.danger }}>{error}</Copy><TextAction disabled={!!busy || loading} onPress={() => { void load(); }}>Volver a intentar</TextAction></View>}
    {plans.slice(0, 1).map(plan => {
      const joined = plan.group_post_responses.some(response => response.owner_id === repository?.accountId);
      return <View key={plan.id} style={{ flexDirection: 'row', gap: 16, padding: 20, borderRadius: 16, backgroundColor: p.surface }}>
        <View accessible accessibilityLabel={displayDate(plan.event_date!)} style={{ width: 60, minHeight: 76, alignSelf: 'flex-start', justifyContent: 'center', alignItems: 'center', borderRadius: 8, backgroundColor: p.peach, paddingTop: 16, paddingBottom: 10, gap: 2 }}>
          <View accessible={false} style={{ position: 'absolute', top: 7, left: 12, right: 12, height: 1, backgroundColor: p.peachText, opacity: 0.3 }} />
          <Copy style={{ color: p.peachText, fontSize: 26, lineHeight: 32, fontWeight: '700' }}>{Number(plan.event_date!.slice(-2))}</Copy>
          <Copy style={{ color: p.peachText, fontSize: 12, lineHeight: 18 }}>{new Date(plan.event_date! + 'T12:00:00').toLocaleDateString('es-ES', { month: 'short' })}</Copy>
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
        <Copy muted style={{ fontSize: 13 }}>{groups.find(group => group.id === plan.group_id)?.name || 'Tu grupo'} · {displayDate(plan.event_date!)}</Copy>
        <Copy style={{ fontSize: 18, fontWeight: '600' }}>{plan.title}</Copy>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
          <Action disabled={!!busy} secondary={joined} onPress={() => { void respond(plan, joined); }}>{busy === plan.id ? 'Guardando…' : joined ? 'Apuntada · Cancelar' : 'Me apunto'}</Action>
          <TextAction onPress={() => router.push({ pathname: '/group-space', params: { id: plan.group_id, tab: 'plan' } })}>Ver plan</TextAction>
        </View>
        </View>
      </View>;
    })}
    {plans.length > 1 && <TextAction onPress={() => router.navigate('/friends')}>Más planes en mis grupos</TextAction>}
    {!loading && !error && !plans.length && <Empty journal icon={<CalendarBlankIcon size={30} color={p.accent} weight="duotone" />} title="Los mejores planes empiezan con una idea" description={groups.length ? 'Una tarde de cine, un café pendiente o ese plan que lleva tres «a ver cuándo».' : 'Crea un grupo o únete al de tus amigas para empezar a hacer planes juntas.'} action={<TextAction onPress={() => router.push('/groups')}>{groups.length ? 'Proponer un plan con mis amigas' : 'Crear o unirme a un grupo'}</TextAction>} />}
  </View>;
}
