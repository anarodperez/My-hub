import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState } from 'react-native';

export function useGroupAutoRefresh(refresh: () => Promise<void>, paused: boolean) {
  useFocusEffect(useCallback(() => {
    if (paused) return;
    let pending = false;
    const timer = setInterval(() => {
      if (pending || AppState.currentState !== 'active') return;
      pending = true;
      void refresh().catch(() => {}).finally(() => { pending = false; });
    }, 20000);
    return () => clearInterval(timer);
  }, [refresh, paused]));
}
