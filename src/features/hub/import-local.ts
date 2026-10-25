import type { SupabaseClient } from '@supabase/supabase-js';
import { decodeState, type HubState } from './model.ts';
import type { CloudMedia } from './cloud-state.ts';

export type ImportEntry = { kind: string; table: string; legacy: string; payload: Record<string, unknown>; cover?: string; sourcePost?: string };
export function buildImportEntries(snapshot: HubState): ImportEntry[] {
  decodeState(JSON.stringify(snapshot));
  return [
    ...snapshot.recommendations.map((row) => ({ kind: 'recommendation', table: 'recommendations', legacy: row.id, cover: row.coverUrl,
      payload: { title: row.title, category: row.category, opinion: row.opinion, rating: row.rating, visibility: 'private', sample: !!row.sample, price_cents: row.priceCents ?? null, location: row.location || null, link: row.link || null, created_at: row.createdAt } })),
    ...(snapshot.wishes || []).map((row) => ({ kind: 'wish', table: 'wishlist_items', legacy: row.id, cover: row.coverUrl,
      payload: { title: row.title, category: row.category, status: row.completed ? 'finished' : 'pending', link: row.link || null } })),
    ...snapshot.saved.filter((row) => snapshot.recommendations.some((post) => post.id === row.recommendationId)).map((row) => ({ kind: 'saved', table: 'wishlist_items', legacy: row.recommendationId, sourcePost: row.recommendationId, payload: { status: row.status } })),
    ...snapshot.events.map((row) => ({ kind: 'event', table: 'calendar_events', legacy: row.id, payload: { title: row.title, category: row.category, event_date: row.date } })),
    ...(snapshot.song ? [{ kind: 'song', table: 'moment_songs', legacy: 'song', cover: snapshot.song.coverUrl, payload: { title: snapshot.song.title, artist: snapshot.song.artist, link: snapshot.song.link || null } }] : []),
    { kind: 'preferences', table: 'user_preferences', legacy: 'preferences', payload: { theme: snapshot.preferences.theme, wishlist_visibility: snapshot.wishlistVisibility || 'private' } },
  ];
}

export async function importLocalHub(client: SupabaseClient, accountId: string, deviceId: string, snapshot: HubState, media: CloudMedia, newId: () => string, isCurrent: () => boolean, progress: (done: number, total: number) => void) {
  const entries = buildImportEntries(snapshot);
  const postIds = new Map<string, string>();
  const checkSession = () => { if (!isCurrent()) throw new Error('La cuenta ha cambiado. La importación se ha detenido.'); };
  let done = 0;
  for (const entry of entries) {
    checkSession();
    const singleton = entry.kind === 'song' || entry.kind === 'preferences';
    const identity = { owner_id: accountId, device_id: deviceId, entity_kind: entry.kind, legacy_id: entry.legacy };
    const { error: reserveError } = await client.from('migration_runs').upsert({ ...identity, target_id: singleton ? accountId : newId() }, { onConflict: 'owner_id,device_id,entity_kind,legacy_id', ignoreDuplicates: true });
    if (reserveError) throw new Error(reserveError.message);
    const { data: mapping, error: mapError } = await client.from('migration_runs').select('id,target_id,completed').match(identity).single();
    if (mapError || !mapping) throw new Error(mapError?.message || 'No se pudo reservar la importación.');
    if (entry.kind === 'recommendation') postIds.set(entry.legacy, mapping.target_id);
    if (!mapping.completed) {
      checkSession();
      const { data: existing, error: lookupError } = await client.from(entry.table).select('*').eq('id', mapping.target_id).maybeSingle();
      if (lookupError) throw new Error(lookupError.message);
      if (!existing) {
        const payload = { ...entry.payload, id: mapping.target_id, ...(!singleton ? { owner_id: accountId } : {}) };
        if (entry.cover !== undefined) Object.assign(payload, { cover_path: await media.upload(accountId, mapping.target_id, entry.cover) });
        if (entry.sourcePost) {
          const postId = postIds.get(entry.sourcePost);
          if (!postId) throw new Error('Falta la recomendación de un guardado.');
          Object.assign(payload, { recommendation_id: postId });
        }
        checkSession();
        const { error } = await client.from(entry.table).upsert(payload, { onConflict: 'id', ignoreDuplicates: true });
        if (error) throw new Error(error.message);
      }
      const { data: confirmed, error: confirmError } = await client.from(entry.table).select('id').eq('id', mapping.target_id).single();
      if (confirmError || !confirmed) throw new Error('No se ha podido verificar un elemento importado.');
      checkSession();
      const { error } = await client.from('migration_runs').update({ completed: true }).eq('id', mapping.id).eq('owner_id', accountId);
      if (error) throw new Error(error.message);
    }
    progress(++done, entries.length);
  }
  checkSession();
  const { data: profile, error: profileError } = await client.from('profiles').select('name,avatar_path').eq('id', accountId).maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (!profile) {
    const { error } = await client.from('profiles').insert({ id: accountId, name: snapshot.preferences.name.slice(0, 100) });
    if (error) throw new Error(error.message);
  }
  if (profile && !profile.name && snapshot.preferences.name.trim()) {
    const { error } = await client.from('profiles').update({ name: snapshot.preferences.name.trim().slice(0, 100) }).eq('id', accountId).eq('name', '');
    if (error) throw new Error(error.message);
  }
  if (snapshot.preferences.avatarUri && !profile?.avatar_path) {
    const avatar_path = await media.upload(accountId, 'avatar', snapshot.preferences.avatarUri);
    checkSession();
    const { error } = await client.from('profiles').update({ avatar_path }).eq('id', accountId);
    if (error) throw new Error(error.message);
  }
  return { count: done };
}
