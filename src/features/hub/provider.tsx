import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { emptyState, resolveTheme, type HubState } from './model';
import { createLocalStore } from './storage';
import { addExamples, addSongExample, improveStarsideCover } from './samples';
import { addRomantasyReleases } from './releases';

const palettes = {
  light: { background: '#FAF7F2', surface: '#FFFDFA', text: '#302936', muted: '#716777', accent: '#705080', onAccent: '#FFFFFF', soft: '#EDE4F1', line: '#E4DDE4', sage: '#DCE8DA', sageText: '#3C5940', danger: '#AD3548' },
  dark: { background: '#19161D', surface: '#25212B', text: '#F5EFF7', muted: '#B8AABD', accent: '#C4A7DC', onAccent: '#24182D', soft: '#3B2E45', line: '#443B49', sage: '#33463B', sageText: '#C2DAC5', danger: '#FFA9B6' },
};
type HubContextValue = { state: HubState; loading: boolean; error: string | null; retry: () => void; update: (change: (state: HubState) => HubState) => Promise<void> };
const HubContext = createContext<HubContextValue | null>(null);
export function HubProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HubState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const store = useRef(createLocalStore(AsyncStorage));
  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    store.current.load().then((loaded) => loaded.examplesAdded && loaded.songExampleAdded && loaded.starsideCoverUpdated && loaded.romantasyReleasesAdded ? loaded : store.current.update((previous) => addRomantasyReleases(improveStarsideCover(addSongExample(addExamples(previous)))))).then((loaded) => {
      setState(loaded);
    }).catch(() => setError('No hemos podido leer tus datos. No se ha borrado nada.')).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  const update = useCallback((change: (previous: HubState) => HubState) => {
    return store.current.update(change).then(setState);
  }, []);
  return <HubContext.Provider value={{ state, loading, error, retry: load, update }}>{children}</HubContext.Provider>;
}
export function useHub() {
  const value = useContext(HubContext);
  if (!value) throw new Error('HubProvider no disponible');
  return value;
}
export function usePalette() {
  const { state } = useHub();
  const scheme = resolveTheme(state.preferences.theme, useColorScheme());
  return { ...palettes[scheme], dark: scheme === 'dark' };
}
