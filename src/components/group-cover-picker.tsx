import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Copy, IconAction, SaveAction, TextAction } from './hub-ui';
import { FormDialog } from './form-dialog';
import { LoadingImage } from './loading-image';
import { CheckIcon, XIcon } from './hub-icons';
import { defaultGroupCover, groupCoverOptions } from '@/features/hub/group-covers';
import { useHub, usePalette } from '@/features/hub/provider';
import type { GroupRow } from '@/features/hub/backend-types';

export function GroupCoverPicker({ group, onSaved, disabled = false }: { group: GroupRow; onSaved: (group: GroupRow) => void; disabled?: boolean }) {
  const { repository } = useHub();
  const p = usePalette();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState(group.cover_key || defaultGroupCover(group.id).value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const current = useRef(repository);
  const locked = useRef(false);
  useEffect(() => { current.current = repository; return () => { current.current = null; }; }, [repository]);
  const save = async () => {
    if (!repository || locked.current) return;
    locked.current = true; setBusy(true); setError('');
    try {
      const saved = await repository.setGroupCover(group.id, choice);
      if (current.current !== repository) return;
      onSaved({ ...group, cover_key: saved.cover_key }); setOpen(false);
    } catch { if (current.current === repository) setError('No se pudo guardar la portada. Vuelve a intentarlo.'); }
    finally { locked.current = false; if (current.current === repository) setBusy(false); }
  };
  return <>
    <TextAction disabled={disabled || !repository || busy} onPress={() => { setChoice(group.cover_key || defaultGroupCover(group.id).value); setError(''); setOpen(true); }}>Cambiar portada del grupo</TextAction>
    {open && <FormDialog busy={busy} onClose={() => setOpen(false)}><View style={{ padding: 24, gap: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Copy accessibilityRole="header" style={{ flex: 1, fontSize: 24, fontWeight: '700' }}>Una portada muy vuestra</Copy><IconAction label="Cerrar portadas" disabled={busy} onPress={() => setOpen(false)}><XIcon size={22} color={p.muted} /></IconAction></View>
      <Copy muted>Elegid la que más os represente. El debate sobre el nombre queda para otro día.</Copy>
      <View accessibilityRole="radiogroup" accessibilityLabel="Portada del grupo" style={{ gap: 12 }}>
        {groupCoverOptions.map(option => <Pressable key={option.value} disabled={busy} accessibilityRole="radio" accessibilityLabel={option.label} accessibilityState={{ checked: choice === option.value, disabled: busy }} onPress={() => setChoice(option.value)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 88, padding: 8, borderWidth: 1, borderColor: choice === option.value ? p.accent : p.line, borderRadius: 12, backgroundColor: choice === option.value || pressed ? p.soft : p.surface })}>
          <LoadingImage source={option.source} contentFit="cover" accessible={false} style={{ width: 100, height: 72, borderRadius: 8 }} />
          <Copy style={{ flex: 1, fontWeight: '600' }}>{option.label}</Copy>
          {choice === option.value && <CheckIcon size={20} color={p.accent} />}
        </Pressable>)}
      </View>
      {!!error && <Copy accessibilityRole="alert" style={{ color: p.danger }}>{error}</Copy>}
      <SaveAction busy={busy} onPress={() => { void save(); }}>Guardar portada</SaveAction>
    </View></FormDialog>}
  </>;
}
