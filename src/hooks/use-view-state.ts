import { useCallback, useState, useSyncExternalStore, type SetStateAction } from 'react';
import { useHub } from '@/features/hub/provider';
import { readViewState, subscribeViewState, viewStateKey, writeViewState } from '@/features/hub/view-state';

export function useViewState<T>(screen: string, initial: T | (() => T)) {
  const { repository } = useHub();
  const [fallback] = useState(initial);
  const key = viewStateKey(repository?.accountId || 'guest', screen);
  const subscribe = useCallback((changed: () => void) => subscribeViewState(key, changed), [key]);
  const snapshot = useCallback(() => readViewState(key, fallback), [key, fallback]);
  const serverSnapshot = useCallback(() => fallback, [fallback]);
  const value = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const setValue = useCallback((next: SetStateAction<T>) => {
    const previous = readViewState(key, fallback);
    writeViewState(key, typeof next === 'function' ? (next as (value: T) => T)(previous) : next);
  }, [key, fallback]);
  return [value, setValue] as const;
}
