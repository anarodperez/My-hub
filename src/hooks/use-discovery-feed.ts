import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useHub } from '@/features/hub/provider';
import { createDiscoveryFeed, type FeedState } from '@/features/hub/feed';
import { hydrateRecommendations } from '@/features/hub/cloud-state';
import type { Category } from '@/features/hub/model';

const empty: FeedState = { items: [], loading: true, refreshing: false, hasMore: true, error: '' };
export function useDiscoveryFeed(category: Category | 'all') {
  const { repository, media, loading, error, needsImport } = useHub();
  const ready = !loading && !error && !needsImport;
  const key = `${repository?.accountId}/${category}`;
  const [results, setResults] = useState<Record<string, FeedState>>({});
  const controller = useRef<ReturnType<typeof createDiscoveryFeed> | null>(null);
  const cachedFeeds = useRef(new Map<string, ReturnType<typeof createDiscoveryFeed>>());
  useEffect(() => {
    const cache = cachedFeeds.current;
    return () => { cache.forEach(feed => feed.dispose()); cache.clear(); };
  }, [repository, media]);
  useEffect(() => {
    if (!repository || !media || !ready) return;
    let feed = cachedFeeds.current.get(key);
    if (!feed) {
      const created = createDiscoveryFeed(async cursor => hydrateRecommendations(repository, media, await repository.listDiscoveries(cursor, 20, category)),
        () => setResults(previous => ({ ...previous, [key]: created.getState() })));
      feed = created;
      cachedFeeds.current.set(key, created);
      void created.load();
    }
    controller.current = feed;
    return () => { controller.current = null; };
  }, [repository, media, category, ready, key]);
  useFocusEffect(useCallback(() => {
    if (!repository || !media || !ready) return;
    void cachedFeeds.current.get(key)?.revalidate(async ids => {
      const items = [];
      for (let offset = 0; offset < ids.length; offset += 100) {
        items.push(...await hydrateRecommendations(repository, media, await repository.getSavedRecommendations(ids.slice(offset, offset + 100))));
      }
      return items;
    }).catch(() => {});
  }, [repository, media, ready, key]));
  return {
    ...(results[key] || empty),
    loadMore: () => { void controller.current?.load(); },
    refresh: () => { void controller.current?.refresh(); },
    retry: () => { void controller.current?.retry(); },
  };
}
