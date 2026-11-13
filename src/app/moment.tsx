import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { CoverPicker } from '@/components/cover-picker';
import { Copy, Field, SaveAction, Screen, TextAction, showError } from '@/components/hub-ui';
import { discardCover, persistCover } from '@/features/hub/covers';
import { goBackOr } from '@/features/hub/navigation';
import { momentCategories, type Moment } from '@/features/hub/moments';
import { useHub } from '@/features/hub/provider';

export default function MomentScreen() {
  const { category } = useLocalSearchParams<{ category?: string }>();
  const { state, loading } = useHub();
  const kind = momentCategories.find(option => option.value === category);
  if (!kind) return <Screen back title="Mi momento"><Copy>Elige una serie, película o libro desde Inicio.</Copy></Screen>;
  if (loading) return <Screen back title="Mi momento"><Copy>Cargando…</Copy></Screen>;
  return <MomentEditor key={kind.value} category={kind.value} existing={state.moments?.find(item => item.category === kind.value)} />;
}

function MomentEditor({ category, existing }: { category: Moment['category']; existing?: Moment }) {
  const { update } = useHub();
  const [title, setTitle] = useState(existing?.title || '');
  const [coverUrl, setCoverUrl] = useState(existing?.coverUrl || '');
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');
  const kind = momentCategories.find(option => option.value === category)!;
  const save = async (recommend = false) => {
    if (busy || picking) return;
    if (!title.trim()) { setError('Escribe el título.'); return; }
    setBusy(true);
    let savedCover = coverUrl;
    try {
      if (coverUrl && coverUrl !== existing?.coverUrl) savedCover = await persistCover(coverUrl);
      await update(previous => ({ ...previous, moments: [{ category, title: title.trim(), status: recommend ? existing?.status || 'current' : 'current', coverUrl: savedCover }, ...(previous.moments || []).filter(item => item.category !== category)] }));
      if (existing?.coverUrl && existing.coverUrl !== savedCover) discardCover(existing.coverUrl);
      if (recommend) router.push({ pathname: '/compose', params: { moment: category } });
      else goBackOr('/');
    } catch { if (savedCover !== coverUrl) discardCover(savedCover); showError(); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (busy || picking) return;
    setBusy(true);
    try {
      await update(previous => ({ ...previous, moments: (previous.moments || []).filter(item => item.category !== category) }));
      if (existing?.coverUrl) discardCover(existing.coverUrl);
      goBackOr('/');
    } catch { showError(); } finally { setBusy(false); }
  };
  return <Screen back backTo="/" title={`${kind.label} de mi momento`} subtitle="Solo para ti. Puedes cambiar este contenido o quitarlo cuando quieras.">
    <Field label={`Título de ${category === 'book' ? 'tu libro' : category === 'series' ? 'la serie' : 'la película'}`} value={title} onChangeText={setTitle} editable={!busy} maxLength={150} error={error} />
    <Copy muted>{existing?.status === 'finished' ? 'Este contenido terminado sigue guardado. Puedes convertirlo en recomendación o retomarlo en Mi momento.' : `${kind.current}. Cuando termines, podrás convertirlo en recomendación.`}</Copy>
    <CoverPicker uri={coverUrl} onChange={setCoverUrl} busy={busy || picking} onBusyChange={setPicking} />
    <SaveAction busy={busy} disabled={picking} onPress={() => { void save(); }}>Guardar en Mi momento</SaveAction>
    {existing && <TextAction disabled={busy || picking} onPress={() => { void save(true); }}>Terminar y recomendar</TextAction>}
    {existing && <TextAction danger disabled={busy || picking} onPress={() => { void remove(); }}>Quitar de Inicio</TextAction>}
  </Screen>;
}
