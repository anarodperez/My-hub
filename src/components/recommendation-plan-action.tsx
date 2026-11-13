import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { CalendarBlankIcon, XIcon } from './hub-icons';
import { FormDialog } from './form-dialog';
import { Action, Copy, IconAction, TextAction } from './hub-ui';
import { useHub, usePalette } from '@/features/hub/provider';
import type { GroupRow } from '@/features/hub/backend-types';

/** Opens a draft only; publishing still requires the plan form's explicit action. */
export function RecommendationPlanAction({ title, description = '', showLabel = false }: { title: string; description?: string; showLabel?: boolean }) {
  const { repository } = useHub();
  const p = usePalette();
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const generation = useRef(0);
  useEffect(() => {
    if (!open) return;
    const turn = ++generation.current;
    let active = true;
    async function load() {
      setLoading(true); setError(''); setGroups([]);
      try {
        if (!repository) throw new Error('Inicia sesión para proponer un plan.');
        const next = await repository.listGroups();
        if (active && turn === generation.current) setGroups(next);
      } catch (failure) {
        if (active && turn === generation.current) setError(failure instanceof Error ? failure.message : 'No se pudieron cargar tus grupos.');
      } finally { if (active && turn === generation.current) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [open, repository, retry]);
  return <>
    {showLabel ? <Action secondary icon={<CalendarBlankIcon size={20} color={p.accent} />} onPress={() => setOpen(true)}>Proponer un plan</Action> : <IconAction label={`Proponer un plan: ${title}`} onPress={() => setOpen(true)}><CalendarBlankIcon size={22} color={p.accent} /></IconAction>}
    {open && <FormDialog busy={false} onClose={() => setOpen(false)}><View style={{ padding: 24, gap: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Copy accessibilityRole="header" style={{ flex: 1, fontSize: 24, fontWeight: '700' }}>De idea a plan</Copy><IconAction label="Cerrar selección de grupo" onPress={() => setOpen(false)}><XIcon size={24} color={p.muted} /></IconAction></View>
      <Copy muted>Elige con quién compartir «{title}». Podrás revisar los detalles antes de publicar.</Copy>
      {loading && <ActivityIndicator accessibilityLabel="Cargando grupos" color={p.accent} />}
      {!!error && <><Copy accessibilityRole="alert" style={{ color: p.danger }}>{error}</Copy><TextAction onPress={() => setRetry(value => value + 1)}>Volver a intentar</TextAction></>}
      {!loading && !error && groups.map(group => <Action key={group.id} secondary onPress={() => { setOpen(false); router.push({ pathname: '/group-post', params: { groupId: group.id, kind: 'plan', title: title.slice(0, 150), description: description.slice(0, 2000) } }); }}>{group.name}</Action>)}
      {!loading && !error && !groups.length && <><Copy>Todavía no tienes un grupo para este plan.</Copy><Action onPress={() => { setOpen(false); router.push('/groups'); }}>Crear o unirme a un grupo</Action></>}
    </View></FormDialog>}
  </>;
}
