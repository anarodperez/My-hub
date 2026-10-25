import type { Recommendation } from './model.ts';

export type FeedCursor = { id: string; created_at: string };
export type FeedState = { items: Recommendation[]; loading: boolean; refreshing: boolean; hasMore: boolean; error: string };
export function createDiscoveryFeed(fetchPage: (cursor?: FeedCursor) => Promise<Recommendation[]>, changed: () => void = () => {}) {
  let state: FeedState = { items: [], loading: false, refreshing: false, hasMore: true, error: '' };
  let cursor: FeedCursor | undefined;
  let generation = 0;
  let active = true;
  let retryReset = false;
  const publish = (next: Partial<FeedState>) => { state = { ...state, ...next }; changed(); };
  const load = async (reset = false) => {
    if (!active || (!reset && (state.loading || !state.hasMore))) return;
    const turn = reset ? ++generation : generation;
    retryReset = reset;
    publish({ loading: true, refreshing: reset, error: '' });
    try {
      const page = await fetchPage(reset ? undefined : cursor);
      if (!active || turn !== generation) return;
      const last = page.at(-1);
      cursor = last ? { id: last.id, created_at: last.createdAt } : reset ? undefined : cursor;
      const items = [...new Map([...(reset ? [] : state.items), ...page].map(item => [item.id, item])).values()];
      publish({ items, hasMore: page.length === 20 });
    } catch (error) {
      if (active && turn === generation) publish({ error: error instanceof Error ? error.message : 'No se pudieron cargar los descubrimientos.' });
    } finally {
      if (active && turn === generation) publish({ loading: false, refreshing: false });
    }
  };
  return {
    getState: () => state,
    load: () => load(),
    refresh: () => load(true),
    retry: () => load(retryReset),
    async revalidate(fetch: (ids: string[]) => Promise<Recommendation[]>) {
      if (!active || state.loading || !state.items.length) return;
      const turn = generation, previous = state.items;
      const updated = new Map((await fetch(previous.map(item => item.id))).map(item => [item.id, item]));
      if (active && turn === generation && state.items === previous) publish({ items: previous.flatMap(item => updated.has(item.id) ? [updated.get(item.id)!] : []) });
    },
    dispose: () => { active = false; generation++; },
  };
}
