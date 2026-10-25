import type { SupabaseClient } from '@supabase/supabase-js';
import { isLocalDate, isRating, isWebLink, recommendationCategories } from './model.ts';
import type { AvailabilityPeriod, AvailabilityRow, GroupPostInput, GroupPostKind, GroupPostRow, Author, CommentRow, Edit, EventInput, EventRow, GroupRow, PreferencesInput, PreferencesRow, RecommendationInput, RecommendationRow, SongInput, SongRow, WishInput, WishlistRow } from './backend-types.ts';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isCloudId = (value: string) => uuidPattern.test(value);
function uuid(value: string) { if (!isCloudId(value)) throw new Error('Identificador no válido.'); return value; }
function text(value: string, maximum: number) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maximum) throw new Error('Texto vacío o demasiado largo.');
  return value.trim();
}
function category(value: string) {
  if (!recommendationCategories.some((entry) => entry.value === value)) throw new Error('Categoría no válida.');
  return value;
}
function date(value: string) { if (!isLocalDate(value)) throw new Error('Fecha no válida.'); return value; }
function link(value?: string | null) {
  if (value && (value.length > 2000 || !isWebLink(value))) throw new Error('Enlace no válido.');
  return value || null;
}
async function checked<T>(request: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T> {
  const response = await request;
  if (response.error) throw new Error(response.error.message);
  return response.data as T;
}

export function createHubRepository(client: SupabaseClient, accountId: string) {
  uuid(accountId);
  async function save<T>(table: string, input: { id?: string; newId?: string; revision?: number }, payload: Record<string, unknown>, singleton = false): Promise<T> {
    if (input.id) {
      uuid(input.id);
      if (!Number.isSafeInteger(input.revision) || Number(input.revision) < 1) throw new Error('Recarga los datos antes de editar.');
      let query = client.from(table).update(payload).eq('id', input.id).eq('revision', input.revision);
      query = singleton ? query.eq('id', accountId) : query.eq('owner_id', accountId);
      const row = await checked<T | null>(query.select().maybeSingle());
      if (!row) throw new Error('Este elemento se ha actualizado en otro dispositivo. Recarga y vuelve a intentarlo.');
      return row;
    }
    return checked<T>(client.from(table).insert(singleton ? { ...payload, id: accountId } : { ...payload, owner_id: accountId, ...(input.newId ? { id: uuid(input.newId) } : {}) }).select().single());
  }
  async function list<T>(table: string, ownerColumn = 'owner_id'): Promise<T[]> {
    const rows: T[] = [];
    for (let offset = 0; ; offset += 200) {
      const page = await checked<T[]>(client.from(table).select('*').eq(ownerColumn, accountId).order('id').range(offset, offset + 199));
      rows.push(...page);
      if (page.length < 200) return rows;
    }
  }
  const rpc = <T>(name: string, args: Record<string, unknown>) => checked<T>(client.rpc(name, args));
  return {
    accountId,
    async loadPrivate() {
      const [recommendations, wishlist, events, preferences, songs, profile] = await Promise.all([
        list<RecommendationRow>('recommendations'), list<WishlistRow>('wishlist_items'), list<EventRow>('calendar_events'),
        list<PreferencesRow>('user_preferences', 'id'), list<SongRow>('moment_songs', 'id'),
        checked<Author | null>(client.from('profiles').select('id,name,avatar_path').eq('id', accountId).maybeSingle()),
      ]);
      return { recommendations, wishlist, events, preferences: preferences[0], song: songs[0], profile };
    },
    async listDiscoveries(cursor?: { created_at: string; id: string }, limit = 30, filter?: string) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Límite no válido.');
      let query = client.from('recommendations').select('*,comments(count)').order('created_at', { ascending: false }).order('id', { ascending: false }).limit(limit);
      if (filter && filter !== 'all') query = query.eq('category', category(filter));
      if (cursor) {
        uuid(cursor.id);
        if (!/^\d{4}-\d{2}-\d{2}T[0-9:.+Z-]+$/.test(cursor.created_at) || !Number.isFinite(Date.parse(cursor.created_at))) throw new Error('Cursor no válido.');
        query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
      }
      return checked<RecommendationRow[]>(query);
    },
    getDiscovery: (id: string) => checked<RecommendationRow | null>(client.from('recommendations').select('*,comments(count)').eq('id', uuid(id)).maybeSingle()),
    async listCommentPreviews(ids: string[]) {
      if (!ids.length) return [];
      ids.forEach(uuid);
      return checked<{ id: string; comments: { count: number }[]; comment_preview: Pick<CommentRow, 'id' | 'body' | 'author_id' | 'created_at'>[] }[]>(
        client.from('recommendations').select('id,comments(count),comment_preview:comments(id,body,author_id,created_at)').in('id', ids)
          .order('created_at', { ascending: false, referencedTable: 'comment_preview' })
          .order('id', { ascending: false, referencedTable: 'comment_preview' })
          .limit(2, { referencedTable: 'comment_preview' }));
    },
    async getSavedRecommendations(ids: string[]) {
      if (!ids.length) return [];
      ids.forEach(uuid);
      return checked<RecommendationRow[]>(client.from('recommendations').select('*').in('id', ids));
    },
    saveRecommendation(input: Edit<RecommendationInput>) {
      if (!isRating(input.rating)) return Promise.reject(new Error('Valoración no válida.'));
      const visibility = input.visibility || 'private';
      if (!['private', 'public', 'group'].includes(visibility) || (visibility === 'group' && !input.group_id)) return Promise.reject(new Error('Elige un grupo válido.'));
      if (input.price_cents != null && (!Number.isSafeInteger(input.price_cents) || input.price_cents < 0)) return Promise.reject(new Error('Precio no válido.'));
      return save<RecommendationRow>('recommendations', input, { title: text(input.title, 150), category: category(input.category), opinion: text(input.opinion, 2000), rating: input.rating, cover_path: input.cover_path || '', price_cents: input.price_cents ?? null, location: input.location || null, link: link(input.link), sample: !!input.sample, visibility, group_id: visibility === 'group' ? uuid(input.group_id!) : null });
    },
    saveWish(input: Edit<WishInput>) {
      return save<WishlistRow>('wishlist_items', input, { title: text(input.title, 150), category: category(input.category), cover_path: input.cover_path || '', link: link(input.link), status: input.status || 'pending', recommendation_id: null });
    },
    async setSaved(id: string, status: 'pending' | 'finished' = 'pending') {
      return checked<WishlistRow>(client.from('wishlist_items').upsert({ owner_id: accountId, recommendation_id: uuid(id), status }, { onConflict: 'owner_id,recommendation_id' }).select().single());
    },
    async removeSaved(id: string) {
      await checked(client.from('wishlist_items').delete().eq('owner_id', accountId).eq('recommendation_id', uuid(id)));
    },
    async saveEvent(input: Edit<EventInput>) {
      return save<EventRow>('calendar_events', input, { title: text(input.title, 150), category: category(input.category), event_date: date(input.event_date) });
    },
    saveSong(input: Edit<SongInput>) {
      return save<SongRow>('moment_songs', input, { title: text(input.title, 150), artist: text(input.artist, 150), cover_path: input.cover_path || '', link: link(input.link) }, true);
    },
    savePreferences(input: Edit<PreferencesInput>) {
      const payload: Record<string, unknown> = {};
      if (input.theme !== undefined) payload.theme = input.theme;
      if (input.wishlist_visibility !== undefined) payload.wishlist_visibility = input.wishlist_visibility;
      return save<PreferencesRow>('user_preferences', input, payload, true);
    },
    async saveProfile(input: { name?: string; avatar_path?: string | null }) {
      const payload: Record<string, unknown> = {};
      if (input.name !== undefined) { if (input.name.trim().length > 100) throw new Error('Nombre demasiado largo.'); payload.name = input.name.trim(); }
      if (input.avatar_path !== undefined) payload.avatar_path = input.avatar_path;
      await checked(client.from('profiles').upsert({ id: accountId, name: input.name || '' }, { onConflict: 'id', ignoreDuplicates: true }));
      return checked<Author>(client.from('profiles').update(payload).eq('id', accountId).select('id,name,avatar_path').single());
    },
    async deleteEntity(kind: 'recommendation' | 'wish' | 'event' | 'song', id: string, revision?: number) {
      const table = { recommendation: 'recommendations', wish: 'wishlist_items', event: 'calendar_events', song: 'moment_songs' }[kind];
      let query = client.from(table).delete().eq('id', uuid(id)).eq(kind === 'song' ? 'id' : 'owner_id', accountId);
      if (revision !== undefined) query = query.eq('revision', revision);
      const removed = await checked<{ id: string }[]>(query.select('id'));
      if (!removed.length) throw new Error('El elemento cambió o ya no está disponible. Recarga los datos.');
    },
    listGroups: () => checked<GroupRow[]>(client.from('groups').select('*,group_members(count)').order('created_at')),
    async listAvailability(groupId: string, from: string, through: string) {
      uuid(groupId); date(from); date(through);
      const rows: AvailabilityRow[] = [];
      for (let offset = 0; ; offset += 200) {
        const page = await checked<AvailabilityRow[]>(client.from('group_availability').select('*').eq('group_id', groupId).gte('available_date', from).lte('available_date', through).order('id').range(offset, offset + 199));
        rows.push(...page);
        if (page.length < 200) return rows;
      }
    },
    async setAvailability(groupId: string, day: string, period: AvailabilityPeriod, available: boolean) {
      uuid(groupId); date(day);
      if (!['morning', 'afternoon', 'evening'].includes(period)) throw new Error('Franja no válida.');
      if (available) await checked(client.from('group_availability').upsert({ group_id: groupId, owner_id: accountId, available_date: day, period }, { onConflict: 'group_id,owner_id,available_date,period', ignoreDuplicates: true }));
      else await checked(client.from('group_availability').delete().eq('group_id', groupId).eq('owner_id', accountId).eq('available_date', day).eq('period', period));
    },
    async listGroupPosts(groupId: string, kind: GroupPostKind, offset = 0) {
      uuid(groupId);
      if (!['plan', 'gift'].includes(kind) || !Number.isSafeInteger(offset) || offset < 0) throw new Error('Consulta no válida.');
      return checked<GroupPostRow[]>(client.from('group_posts').select('*,group_post_responses(post_id,owner_id)').eq('group_id', groupId).eq('kind', kind).order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 29));
    },
    async createGroupPost(input: GroupPostInput) {
      uuid(input.newId); uuid(input.group_id);
      if (!['plan', 'gift'].includes(input.kind)) throw new Error('Tipo no válido.');
      const title = text(input.title, 150);
      if (typeof input.description !== 'string' || input.description.trim().length > 2000) throw new Error('Descripción demasiado larga.');
      const eventDate = input.event_date ? date(input.event_date) : null;
      const cover = input.cover_path || '';
      if (cover && (input.kind !== 'gift' || !cover.startsWith(`${accountId}/${input.group_id}/${input.newId}/`) || cover.split('/').length !== 4)) throw new Error('Foto no válida.');
      const payload = { id: input.newId, owner_id: accountId, group_id: input.group_id, kind: input.kind, title, description: input.description.trim(), event_date: input.kind === 'plan' ? eventDate : null, cover_path: cover };
      const result = await client.from('group_posts').insert(payload).select('*,group_post_responses(post_id,owner_id)').single();
      if (result.error?.code === '23505') {
        const existing = await checked<GroupPostRow>(client.from('group_posts').select('*,group_post_responses(post_id,owner_id)').eq('id', input.newId).eq('owner_id', accountId).single());
        if (Object.entries(payload).some(([key, value]) => existing[key as keyof GroupPostRow] !== value)) throw new Error('La publicación ya se envió con otros datos. Vuelve al grupo para verla.');
        return existing;
      }
      if (result.error) throw new Error(result.error.message);
      return result.data as GroupPostRow;
    },
    async respondToGroupPost(postId: string, interested: boolean) {
      uuid(postId);
      if (interested) await checked(client.from('group_post_responses').upsert({ post_id: postId, owner_id: accountId }, { onConflict: 'post_id,owner_id', ignoreDuplicates: true }));
      else await checked(client.from('group_post_responses').delete().eq('post_id', postId).eq('owner_id', accountId));
    },
    async setGroupGiftStatus(id: string, status: 'open' | 'reserved' | 'delivered', revision: number, recipient?: string) {
      uuid(id);
      if (!['open', 'reserved', 'delivered'].includes(status) || !Number.isSafeInteger(revision) || revision < 1) throw new Error('Estado no válido.');
      if (status === 'reserved' && !recipient) throw new Error('Elige una destinataria.');
      if (status !== 'reserved' && recipient) throw new Error('Destinataria no válida para este estado.');
      return rpc<void>('set_group_gift_state', { target: id, next_status: status, expected_revision: revision, recipient: recipient ? uuid(recipient) : null });
    },
    async deleteGroupPost(id: string, revision: number) {
      uuid(id);
      if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('Recarga antes de retirar la publicación.');
      const rows = await checked<{ id: string }[]>(client.from('group_posts').delete().eq('id', id).eq('owner_id', accountId).eq('revision', revision).select('id'));
      if (!rows.length) throw new Error('La publicación ha cambiado o ya no está disponible. Recarga.');
    },
    createGroup: (name: string) => rpc<string>('create_group', { group_name: text(name, 80) }),
    renameGroup: (id: string, name: string) => rpc<void>('rename_group', { target: uuid(id), group_name: text(name, 80) }),
    reviewWish: (id: string, savedPost: boolean, opinion: string, rating: number) => {
      if (!isRating(rating)) return Promise.reject(new Error('Valoración no válida.'));
      return rpc<string>('review_wishlist', { target: uuid(id), saved_post: savedPost, review: text(opinion, 2000), score: rating });
    },
    createInvite: (id: string) => rpc<string>('create_group_invite', { target: uuid(id) }),
    acceptInvite: (token: string) => rpc<string>('accept_group_invite', { token: text(token, 100) }),
    revokeInvites: (id: string) => rpc<void>('revoke_group_invites', { target: uuid(id) }),
    leaveGroup: (id: string) => rpc<void>('leave_group', { target: uuid(id) }),
    removeMember: (id: string, userId: string) => rpc<void>('remove_group_member', { target: uuid(id), member: uuid(userId) }),
    deleteGroup: (id: string) => rpc<void>('delete_group', { target: uuid(id) }),
    listMembers: (id: string) => checked<{ group_id: string; user_id: string }[]>(client.from('group_members').select('group_id,user_id').eq('group_id', uuid(id))),
    author: (id: string) => rpc<Author[]>('visible_author', { target: uuid(id) }).then((rows) => rows[0]),
    async listComments(id: string, cursor?: { created_at: string; id: string }) {
      let query = client.from('comments').select('*').eq('post_id', uuid(id)).order('created_at').order('id').limit(30);
      if (cursor) {
        uuid(cursor.id);
        if (!/^\d{4}-\d{2}-\d{2}T[0-9:.+Z-]+$/.test(cursor.created_at) || !Number.isFinite(Date.parse(cursor.created_at))) throw new Error('Cursor no válido.');
        query = query.or(`created_at.gt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.gt.${cursor.id})`);
      }
      return checked<CommentRow[]>(query);
    },
    async addComment(postId: string, id: string, body: string, gifPath?: string) {
      uuid(id);
      if (gifPath && (!gifPath.startsWith(`${accountId}/${id}/`) || !/^[a-zA-Z0-9-]+\.gif$/.test(gifPath.split('/')[2] || '') || gifPath.split('/').length !== 3)) throw new Error('GIF no válido.');
      const content = gifPath && !body.trim() ? '' : text(body, 2000);
      const payload = { id, post_id: uuid(postId), author_id: accountId, body: content, ...(gifPath ? { gif_path: gifPath } : {}) };
      const result = await client.from('comments').insert(payload).select().single();
      if (result.error?.code === '23505') {
        const existing = await checked<CommentRow>(client.from('comments').select('*').eq('id', id).eq('author_id', accountId).eq('post_id', postId).single());
        if (existing.body !== payload.body || (existing.gif_path || '') !== (gifPath || '')) throw new Error('El comentario ya se envió con otro texto o GIF.');
        return existing;
      }
      if (result.error) throw new Error(result.error.message);
      return result.data as CommentRow;
    },
    async deleteComment(id: string) {
      const removed = await checked<{ id: string }[]>(client.from('comments').delete().eq('id', uuid(id)).eq('author_id', accountId).select('id'));
      if (!removed.length) throw new Error('El comentario ya no está disponible para tu cuenta.');
    },
  };
}
export type HubRepository = ReturnType<typeof createHubRepository>;
