import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Copy, SaveAction, TextAction } from './hub-ui';
import { useHub } from '@/features/hub/provider';
import type { Recommendation } from '@/features/hub/model';
import type { GroupRow } from '@/features/hub/backend-types';

export function ShareDiscovery({ post, onShared }: { post: Recommendation; onShared: () => Promise<void> }) {
  const { repository, refresh } = useHub();
  const current = useRef(repository); current.current = repository;
  useEffect(() => { current.current = repository; return () => { current.current = null; }; }, [repository]);
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    if (open && repository) {
      setError(''); setBusy(true);
      void repository.listGroups().then(rows => { if (active) setGroups(rows); })
        .catch(() => { if (active) setError('No se pudieron cargar los grupos.'); })
        .finally(() => { if (active) setBusy(false); });
    }
    return () => { active = false; };
  }, [open, repository]);
  const share = async () => {
    if (!repository || busy || !target) return;
    setBusy(true); setError('');
    try {
      await repository.saveRecommendation({ id: post.id, revision: post.revision, title: post.title, category: post.category, opinion: post.opinion, rating: post.rating, cover_path: post.coverPath || '', price_cents: post.priceCents, location: post.location, link: post.link, sample: post.sample, visibility: 'group', group_id: target });
      if (current.current !== repository) return;
      await onShared(); await refresh();
      if (current.current === repository) { setOpen(false); setTarget(''); }
    } catch (failure) { if (current.current === repository) setError(failure instanceof Error ? failure.message : 'No se pudo compartir.'); }
    finally { if (current.current === repository) setBusy(false); }
  };
  if (post.ownerId !== repository?.accountId) return null;
  return <View style={{ gap: 8 }}>
    <TextAction disabled={busy} onPress={() => setOpen(value => !value)}>{open ? 'Cancelar' : 'Compartir con un grupo'}</TextAction>
    {open && <>
      <Copy muted>La publicación y sus comentarios se mostrarán solo al grupo que elijas.</Copy>
      {groups.map(group => <TextAction disabled={busy} key={group.id} onPress={() => setTarget(group.id)}>{target === group.id ? '✓ ' : ''}{group.name}</TextAction>)}
      {!busy && !groups.length && !error && <Copy muted>Aún no perteneces a ningún grupo.</Copy>}
      <SaveAction busy={busy} disabled={!target} onPress={() => { void share(); }}>Compartir</SaveAction>
    </>}
    {!!error && <Copy accessibilityRole="alert">{error}</Copy>}
  </View>;
}
