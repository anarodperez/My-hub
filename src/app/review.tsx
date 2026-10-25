import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Copy, Field, SaveAction, Screen, TextAction } from '@/components/hub-ui';
import { RatingInput } from '@/components/rating-input';
import { useHub } from '@/features/hub/provider';

export default function ReviewScreen() {
  const { id, saved } = useLocalSearchParams<{ id: string; saved?: string }>();
  const { state, repository, refresh, loading } = useHub();
  const current = useRef(repository); current.current = repository;
  useEffect(() => { current.current = repository; return () => { current.current = null; }; }, [repository]);
  const item = saved === '1' ? state.recommendations.find(row => row.id === id) : state.wishes?.find(row => row.id === id);
  const [opinion, setOpinion] = useState('');
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    if (!repository || busy || !item) return;
    setBusy(true); setError('');
    try {
      const post = await repository.reviewWish(id, saved === '1', opinion, rating);
      if (current.current !== repository) return;
      await refresh();
      if (current.current === repository) router.replace({ pathname: '/discovery/[id]', params: { id: post } });
    } catch (failure) {
      if (current.current === repository) setError(failure instanceof Error ? failure.message : 'No se pudo guardar.');
    } finally { if (current.current === repository) setBusy(false); }
  };
  return <Screen back title="Terminar y valorar" scrollEnabled={!dragging}>
    {loading ? <Copy>Cargando…</Copy> : !item ? <Copy>Este deseo ya no está disponible.</Copy> : <>
      <Copy accessibilityRole="header" style={{ fontSize: 26, lineHeight: 34, fontWeight: '700' }}>{item.title}</Copy>
      <Copy muted>Tu opinión se guardará como un descubrimiento privado y el deseo quedará cumplido.</Copy>
      <RatingInput value={rating} onChange={setRating} onInteractionChange={setDragging} />
      <Field label="¿Qué te ha parecido?" value={opinion} onChangeText={setOpinion} multiline maxLength={2000} editable={!busy} placeholder="Lo que te ha gustado, sin spoilers…" />
      {!!error && <Copy accessibilityRole="alert">{error}</Copy>}
      <SaveAction busy={busy} disabled={!opinion.trim()} onPress={() => { void save(); }}>Guardar y marcar cumplido</SaveAction>
      <TextAction disabled={busy} onPress={() => router.back()}>Cancelar</TextAction>
    </>}
  </Screen>;
}
