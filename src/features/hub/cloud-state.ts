import type { HubRepository } from './repository.ts';
import type { createCloudCovers } from './cloud-covers.ts';
import { emptyState, type HubState, type Recommendation, type Wish } from './model.ts';
import type { RecommendationRow } from './backend-types.ts';
import { validOrganization } from './wishlist-collections.ts';
import { validMoments } from './moments.ts';

export type CloudMedia = ReturnType<typeof createCloudCovers>;
export function privateMediaPaths(state: HubState): string[] {
  return [...state.recommendations, ...(state.wishes || []), ...(state.moments || []), ...(state.song ? [state.song] : [])]
    .flatMap(item => item.coverPath ? [item.coverPath] : []).concat(state.preferences.avatarPath ? [state.preferences.avatarPath] : []);
}
export async function mapRecommendation(row: RecommendationRow, media: CloudMedia): Promise<Recommendation> {
  return { id: row.id, ownerId: row.owner_id, revision: row.revision, title: row.title, category: row.category, opinion: row.opinion, rating: Number(row.rating),
    coverPath: row.cover_path || '', coverUrl: await media.resolve(row.cover_path || '').catch(() => ''), createdAt: row.created_at,
    sample: row.sample, visibility: row.visibility, groupId: row.group_id || undefined, commentCount: row.comments?.[0]?.count || 0,
    ...(row.price_cents != null ? { priceCents: Number(row.price_cents) } : {}), ...(row.location ? { location: row.location } : {}), ...(row.link ? { link: row.link } : {}) };
}
export async function loadCloudState(repo: HubRepository, media: CloudMedia) {
  const data = await repo.loadPrivate();
  if (data.preferences?.current_media != null && !validMoments(data.preferences.current_media)) throw new Error('No se pudo leer Mi momento. Tus datos siguen guardados.');
  if (data.preferences?.wishlist_organization && !validOrganization(data.preferences.wishlist_organization)) throw new Error('No se pudieron leer tus colecciones. Tus deseos siguen guardados.');
  const feed = await repo.listDiscoveries();
  const savedPosts = await repo.getSavedRecommendations(data.wishlist.flatMap((entry) => entry.recommendation_id ? [entry.recommendation_id] : []));
  const allPosts = [...new Map([...feed, ...data.recommendations, ...savedPosts].map((row) => [row.id, row])).values()];
  const state: HubState = { ...emptyState,
    preferences: { name: data.profile?.name || '', theme: data.preferences?.theme || 'system', ...(data.profile?.avatar_path ? { avatarUri: await media.resolve(data.profile.avatar_path).catch(() => ''), avatarPath: data.profile.avatar_path } : {}) },
    wishlistVisibility: data.preferences?.wishlist_visibility || 'private',
    ...(data.preferences?.current_media ? { moments: await Promise.all(data.preferences.current_media.map(async item => ({ ...item, coverPath: item.coverUrl, coverUrl: await media.resolve(item.coverUrl).catch(() => '') }))) } : {}),
    ...(data.preferences?.wishlist_organization ? { wishlistOrganization: data.preferences.wishlist_organization } : {}),
    recommendations: await hydrateRecommendations(repo, media, allPosts),
    saved: data.wishlist.flatMap((row) => row.recommendation_id ? [{ recommendationId: row.recommendation_id, status: row.status || 'pending' }] : []),
    wishes: await Promise.all(data.wishlist.filter((row) => !row.recommendation_id).map(async (row): Promise<Wish> => ({ id: row.id, revision: row.revision, title: row.title, category: row.category, coverPath: row.cover_path || '', coverUrl: await media.resolve(row.cover_path || '').catch(() => ''), completed: row.status === 'finished', ...(row.link ? { link: row.link } : {}) }))),
    events: data.events.map((row) => ({ id: row.id, revision: row.revision, title: row.title, category: row.category, date: row.event_date })),
    ...(data.song ? { song: { title: data.song.title, artist: data.song.artist, coverPath: data.song.cover_path || '', coverUrl: await media.resolve(data.song.cover_path || '').catch(() => ''), revision: data.song.revision, ...(data.song.link ? { link: data.song.link } : {}) } } : {}),
  };
  return { state, preferences: data.preferences, profile: data.profile };
}

export async function hydrateRecommendations(repo: HubRepository, media: CloudMedia, rows: RecommendationRow[]): Promise<Recommendation[]> {
  if (!rows.length) return [];
  const [comments, summaries] = await Promise.all([repo.listCommentPreviews(rows.map(row => row.id)), repo.listReactionSummaries(rows.map(row => row.id))]);
  const previews = new Map(comments.map(row => [row.id, row]));
  const reactions = new Map(summaries.map(row => [row.post_id, row]));
  const ids = [...new Set([...rows.map(row => row.owner_id), ...[...previews.values()].flatMap(row => row.comment_preview.map(comment => comment.author_id))])];
  const authors = new Map(await Promise.all(ids.map(async id => [id, await repo.author(id).catch(() => undefined)] as const)));
  return Promise.all(rows.map(async row => ({ ...await mapRecommendation(row, media), authorName: authors.get(row.owner_id)?.name || 'Usuario',
    reactions: reactions.get(row.id),
    commentCount: previews.get(row.id)?.comments?.[0]?.count || 0,
    commentPreview: (previews.get(row.id)?.comment_preview || []).map(comment => ({ id: comment.id, body: comment.body || 'Adjunto antiguo no disponible', authorName: authors.get(comment.author_id)?.name || 'Usuario' })),
  })));
}

// Existing UI callbacks become per-entity operations, never a remote snapshot replacement.
export async function applyCloudChange(before: HubState, after: HubState, repo: HubRepository, media: CloudMedia, preferences?: { id: string; revision: number }) {
  const confirmed: HubState = { ...after, recommendations: [...after.recommendations], wishes: [...(after.wishes || [])], events: [...after.events] };
  let nextPreferences = preferences;
  const different = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);
  const cover = async (item: { id?: string; coverUrl: string }, previous?: { coverUrl: string; coverPath?: string }) => item.coverUrl === previous?.coverUrl ? previous.coverPath || item.coverUrl : media.upload(repo.accountId, item.id || 'profile', item.coverUrl);
  for (const item of after.recommendations) {
    const old = before.recommendations.find((row) => row.id === item.id);
    if (!different(old, item)) continue;
    if (old?.ownerId && old.ownerId !== repo.accountId) throw new Error('Solo puedes editar tus descubrimientos.');
    // A conversion may reuse a trusted path even after refresh changes its signed URL.
    const { fromMoment, ...savedItem } = item;
    const sourceMoment = fromMoment && before.moments?.find(moment => moment.category === fromMoment && moment.coverPath && moment.coverPath === item.coverPath);
    const inheritedPath = sourceMoment?.coverPath || (fromMoment && item.coverPath && old?.coverPath === item.coverPath ? old.coverPath : undefined);
    if (fromMoment && item.coverPath && !inheritedPath) throw new Error('Mi momento ha cambiado. Actualiza antes de recomendarlo.');
    const row = await repo.saveRecommendation({ ...(old ? { id: old.id, revision: old.revision } : { newId: item.id }), title: item.title, category: item.category, opinion: item.opinion, rating: item.rating, cover_path: inheritedPath || await cover(item, old), price_cents: item.priceCents, location: item.location, link: item.link, sample: item.sample, visibility: item.visibility || old?.visibility || 'private', group_id: item.groupId || null });
    confirmed.recommendations = confirmed.recommendations.map((entry) => entry.id === item.id ? { ...savedItem, id: row.id, revision: row.revision, ownerId: row.owner_id, coverPath: row.cover_path } : entry);
  }
  for (const item of after.wishes || []) {
    const old = before.wishes?.find((row) => row.id === item.id);
    if (different(old, item)) {
      const row = await repo.saveWish({ ...(old ? { id: old.id, revision: old.revision } : { newId: item.id }), title: item.title, category: item.category, cover_path: await cover(item, old), link: item.link, status: item.completed ? 'finished' : 'pending' });
      confirmed.wishes = confirmed.wishes!.map((entry) => entry.id === item.id ? { ...item, id: row.id, revision: row.revision, coverPath: row.cover_path } : entry);
    }
  }
  for (const item of after.events) {
    const old = before.events.find((row) => row.id === item.id);
    if (different(old, item)) {
      const row = await repo.saveEvent({ ...(old ? { id: old.id, revision: old.revision } : { newId: item.id }), title: item.title, category: item.category, event_date: item.date });
      confirmed.events = confirmed.events.map((entry) => entry.id === item.id ? { ...item, id: row.id, revision: row.revision } : entry);
    }
  }
  for (const item of after.saved) {
    if (!before.saved.some((row) => row.recommendationId === item.recommendationId && row.status === item.status)) await repo.setSaved(item.recommendationId, item.status);
  }
  for (const item of before.saved) if (!after.saved.some((row) => row.recommendationId === item.recommendationId)) await repo.removeSaved(item.recommendationId);
  for (const [kind, oldRows, newRows] of [
    ['recommendation', before.recommendations, after.recommendations], ['wish', before.wishes || [], after.wishes || []],
    ['event', before.events, after.events],
  ] as const) for (const row of oldRows) if (!newRows.some((entry) => entry.id === row.id)) await repo.deleteEntity(kind, row.id, row.revision);
  if (different(before.song, after.song)) {
    if (after.song) {
      const row = await repo.saveSong({ ...(before.song ? { id: repo.accountId, revision: before.song.revision } : {}), title: after.song.title, artist: after.song.artist, link: after.song.link, cover_path: await cover(after.song, before.song) });
      confirmed.song = { ...after.song, revision: row.revision, coverPath: row.cover_path };
    }
    else if (before.song) await repo.deleteEntity('song', repo.accountId, before.song.revision);
  }
  if (different(before.moments, after.moments)) {
    confirmed.moments = await Promise.all((after.moments || []).map(async item => ({ ...item, coverPath: await cover(item, before.moments?.find(old => old.category === item.category)) })));
  }
  if (before.preferences.theme !== after.preferences.theme || before.wishlistVisibility !== after.wishlistVisibility || different(before.wishlistOrganization, after.wishlistOrganization) || different(before.moments, after.moments)) {
    nextPreferences = await repo.savePreferences({ ...(preferences ? { id: preferences.id, revision: preferences.revision } : {}), theme: after.preferences.theme, wishlist_visibility: after.wishlistVisibility || 'private',
      ...(after.wishlistOrganization ? { wishlist_organization: after.wishlistOrganization } : {}),
      ...(confirmed.moments ? { current_media: confirmed.moments.map(item => ({ ...item, coverUrl: item.coverPath || '' })) } : {}),
    });
  }
  if (before.preferences.name !== after.preferences.name || before.preferences.avatarUri !== after.preferences.avatarUri) {
    const avatarChanged = before.preferences.avatarUri !== after.preferences.avatarUri;
    const avatarPath = avatarChanged ? after.preferences.avatarUri ? await media.upload(repo.accountId, 'avatar', after.preferences.avatarUri) : '' : before.preferences.avatarPath;
    await repo.saveProfile({ ...(before.preferences.name !== after.preferences.name ? { name: after.preferences.name } : {}), ...(avatarChanged ? { avatar_path: avatarPath || null } : {}) });
    if (avatarChanged) confirmed.preferences = { ...after.preferences, avatarPath };
  }
  return { state: confirmed, preferences: nextPreferences };
}
