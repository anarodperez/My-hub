import { router } from 'expo-router';
import { useState } from 'react';
import { CoverPicker } from '@/components/cover-picker';
import { Copy, Field, Screen, TextAction, showError, SaveAction } from '@/components/hub-ui';
import { discardCover, persistCover } from '@/features/hub/covers';
import { isWebLink, type HubState } from '@/features/hub/model';
import { useHub } from '@/features/hub/provider';

export default function SongScreen() {
  const { state, loading } = useHub();
  if (loading) return <Screen back title="Mi canción del momento"><Copy>Cargando…</Copy></Screen>;
  return <SongEditor existing={state.song} />;
}

function SongEditor({ existing }: { existing?: HubState['song'] }) {
  const { update } = useHub();
  const [title, setTitle] = useState(existing?.title || '');
  const [artist, setArtist] = useState(existing?.artist || '');
  const [link, setLink] = useState(existing?.link || '');
  const [coverUrl, setCoverUrl] = useState(existing?.coverUrl || '');
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = async () => {
    if (busy || picking) return;
    const invalid: Record<string, string> = {};
    if (!title.trim()) invalid.title = 'Escribe el título de la canción.';
    if (!artist.trim()) invalid.artist = 'Escribe el nombre del artista.';
    if (link.trim() && !isWebLink(link.trim())) invalid.link = 'Usa un enlace completo https://…';
    setErrors(invalid);
    if (Object.keys(invalid).length) return;
    setBusy(true);
    let savedCover = coverUrl;
    try {
      if (coverUrl && coverUrl !== existing?.coverUrl) savedCover = await persistCover(coverUrl);
      await update((previous) => ({ ...previous, song: { title: title.trim(), artist: artist.trim(), coverUrl: savedCover, ...(link.trim() ? { link: link.trim() } : {}) } }));
      if (existing?.coverUrl && existing.coverUrl !== savedCover) discardCover(existing.coverUrl);
      router.back();
    } catch { if (savedCover !== coverUrl) discardCover(savedCover); showError(); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (busy || picking) return;
    setBusy(true);
    try {
      await update((previous) => ({ ...previous, song: undefined }));
      if (existing?.coverUrl) discardCover(existing.coverUrl);
      router.back();
    } catch { showError(); } finally { setBusy(false); }
  };
  return <Screen back title="Mi canción del momento" subtitle="Esa que tienes en bucle. Cámbiala cuando quieras.">
    <Field label="Canción" value={title} onChangeText={setTitle} maxLength={150} error={errors.title} />
    <Field label="Artista" value={artist} onChangeText={setArtist} maxLength={150} error={errors.artist} />
    <Field label="Enlace para escuchar (opcional)" placeholder="Enlace de Spotify, YouTube…" value={link} onChangeText={setLink} keyboardType="url" autoCapitalize="none" autoCorrect={false} maxLength={2000} error={errors.link} />
    <CoverPicker uri={coverUrl} onChange={setCoverUrl} busy={busy || picking} onBusyChange={setPicking} />
    <SaveAction busy={busy} disabled={picking} onPress={() => { void save(); }}>Guardar canción</SaveAction>
    {existing && <TextAction danger disabled={busy || picking} onPress={() => { void remove(); }}>Quitar de Inicio</TextAction>}
  </Screen>;
}
