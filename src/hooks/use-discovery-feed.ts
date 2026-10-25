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
  const [result, setResult] = useState({ key: '', state: empty });
  const controller = useRef<ReturnType<typeof createDiscoveryFeed> | null>(null);
  useEffect(() => {
    if (!repository || !media || !ready) return;
    const feed = createDiscoveryFeed(async cursor => hydrateRecommendations(repository, media, await repository.listDiscoveries(cursor, 20, category)),
      () => setResult({ key, state: feed.getState() }));
    controller.current = feed;
    void feed.load();
    return () => { feed.dispose(); controller.current = null; };
  }, [repository, media, category, ready, key]);
  useFocusEffect(useCallback(() => {
    if (!repository || !media) return;
    void controller.current?.revalidate(async ids => {
      const items = [];
      for (let offset = 0; offset < ids.length; offset += 100) {
        items.push(...await hydrateRecommendations(repository, media, await repository.getSavedRecommendations(ids.slice(offset, offset + 100))));
      }
      return items;
    }).catch(() => {});
  }, [repository, media]));
  return {
    ...(result.key === key ? result.state : empty),
    loadMore: () => { void controller.current?.load(); },
    refresh: () => { void controller.current?.refresh(); },
    retry: () => { void controller.current?.retry(); },
  };
}
