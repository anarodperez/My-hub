import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { File } from 'expo-file-system';
import { randomUUID } from 'expo-crypto';
import { useAccount } from '@/features/account/provider';
import { supabase } from '@/features/account/client';
import { decodeState, emptyState, resolveTheme, type HubState } from './model';
import { createHubRepository, type HubRepository } from './repository';
import { createCloudCovers } from './cloud-covers';
import { applyCloudChange, loadCloudState, type CloudMedia } from './cloud-state';
import { importLocalHub } from './import-local';
import { useCalendarReminders } from '@/hooks/use-calendar-reminders';
import { purgeRetiredSubscriptions } from './storage';

const palettes = {
  light: { background: '#FAF7F2', surface: '#FFFDFA', text: '#302936', muted: '#716777', accent: '#705080', onAccent: '#FFFFFF', soft: '#EDE4F1', line: '#E4DDE4', sage: '#DCE8DA', sageText: '#3C5940', danger: '#AD3548' },
  dark: { background: '#19161D', surface: '#25212B', text: '#F5EFF7', muted: '#B8AABD', accent: '#C4A7DC', onAccent: '#24182D', soft: '#3B2E45', line: '#443B49', sage: '#33463B', sageText: '#C2DAC5', danger: '#FFA9B6' },
};
type HubContextValue = {
  state: HubState; loading: boolean; error: string | null; warning: string | null; retry: () => void;
  update: (change: (state: HubState) => HubState) => Promise<void>;
  repository: HubRepository | null; media: CloudMedia | null; refresh: () => Promise<void>;
  needsImport: boolean; importing: boolean; importProgress: string; importData: () => Promise<void>; skipImport: () => Promise<void>;
};
const HubContext = createContext<HubContextValue | null>(null);
const hasLegacyData = (state: HubState) => !!(state.recommendations.length || state.events.length || state.wishes?.length || state.song);
export function HubProvider({ children }: { children: ReactNode }) {
  const { session } = useAccount();
  const accountId = session?.user.id;
  const accountRef = useRef(accountId); accountRef.current = accountId;
  const generation = useRef(0);
  const [state, setState] = useState<HubState>(emptyState);
  const current = useRef<HubState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const reminderError = useCalendarReminders(accountId, state.events, !loading && !error);
  const [needsImport, setNeedsImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const preferences = useRef<{ id: string; revision: number } | undefined>(undefined);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const mutationVersion = useRef(0);
  const writing = useRef(false);
  const repository = useMemo(() => supabase && accountId ? createHubRepository(supabase, accountId) : null, [accountId]);
  const media = useMemo(() => supabase ? createCloudCovers(supabase, async (uri) => {
    if (Platform.OS === 'web') return new Uint8Array(await (await fetch(uri)).arrayBuffer());
    return new File(uri).bytes();
  }, randomUUID) : null, []);
  const refresh = useCallback(async () => {
    if (!repository || !media || !accountId) return;
    const turn = generation.current;
    const version = mutationVersion.current;
    if (writing.current) return;
    const loaded = await loadCloudState(repository, media);
    if (turn !== generation.current || accountRef.current !== accountId || version !== mutationVersion.current || writing.current) return;
    current.current = loaded.state; preferences.current = loaded.preferences;
    setState(loaded.state); setError(null); setWarning(null);
    await AsyncStorage.setItem('my-hub:account:' + accountId, JSON.stringify(loaded.state)).catch(() => { if (turn === generation.current) setWarning('Datos guardados en la nube; no se pudo actualizar la copia de este dispositivo.'); });
  }, [repository, media, accountId]);
  const load = useCallback(async () => {
    const turn = ++generation.current;
    mutationVersion.current++; writing.current = false;
    current.current = emptyState; preferences.current = undefined;
    setState(emptyState); setLoading(true); setError(null); setWarning(null); setNeedsImport(false); setImporting(false); queue.current = Promise.resolve();
    if (!accountId || !repository) { setLoading(false); return; }
    try {
      await purgeRetiredSubscriptions(AsyncStorage);
      if (turn !== generation.current || accountRef.current !== accountId) return;
      const [cached, legacy, legacyOwner, imported] = await Promise.all([
        AsyncStorage.getItem('my-hub:account:' + accountId), AsyncStorage.getItem('my-hub:v1'),
        AsyncStorage.getItem('my-hub:legacy-owner'), AsyncStorage.getItem('my-hub:imported:' + accountId),
      ]);
      if (turn !== generation.current || accountRef.current !== accountId) return;
      if (cached) { current.current = decodeState(cached); setState(current.current); }
      if (legacy && !imported && (!legacyOwner || legacyOwner === accountId)) setNeedsImport(hasLegacyData(decodeState(legacy)));
      try { await refresh(); }
      catch (failure) {
        if (turn !== generation.current || accountRef.current !== accountId) return;
        if (cached) setWarning('Sin conexión. Estás viendo la última copia de esta cuenta. No se pueden guardar cambios.');
        else throw failure;
      }
    } catch (failure) { if (turn === generation.current) setError(failure instanceof Error ? failure.message : 'No se pudieron cargar tus datos.'); }
    finally { if (turn === generation.current) setLoading(false); }
  }, [accountId, repository, refresh]);
  useEffect(() => { const guard = generation; void load(); return () => { guard.current++; }; }, [load]);
  useEffect(() => {
    if (!accountId) return;
    const timer = setInterval(() => { void refresh().catch(() => {}); }, 1800000);
    return () => clearInterval(timer);
  }, [accountId, refresh]);
  const update = useCallback((change: (previous: HubState) => HubState) => {
    const turn = generation.current;
    const task = queue.current.then(async () => {
      if (!repository || !media || !accountId || turn !== generation.current || accountRef.current !== accountId) throw new Error('Inicia sesión para guardar.');
      if (needsImport || importing) throw new Error('Importa tus datos o elige empezar en la nube antes de guardar.');
      const previous = current.current;
      const next = change(previous);
      decodeState(JSON.stringify(next));
      mutationVersion.current++; writing.current = true;
      try {
        const saved = await applyCloudChange(previous, next, repository, media, preferences.current);
        if (turn !== generation.current || accountRef.current !== accountId) throw new Error('La cuenta ha cambiado.');
        current.current = saved.state; preferences.current = saved.preferences;
        setState(saved.state); setWarning(null);
        await AsyncStorage.setItem('my-hub:account:' + accountId, JSON.stringify(saved.state)).catch(() => setWarning('Guardado en Supabase; copia local pendiente.'));
      } catch (failure) { if (turn === generation.current) { writing.current = false; await refresh().catch(() => {}); } throw failure; }
      finally { if (turn === generation.current) writing.current = false; }
    });
    queue.current = task.catch(() => {});
    return task;
  }, [repository, media, accountId, needsImport, importing, refresh]);
  const importData = useCallback(async () => {
    if (!supabase || !accountId || !media || importing) return;
    const turn = generation.current;
    setImporting(true); setImportProgress('Preparando datos');
    try {
      const legacyOwner = await AsyncStorage.getItem('my-hub:legacy-owner');
      if (legacyOwner && legacyOwner !== accountId) throw new Error('Los datos antiguos ya están asociados a otra cuenta.');
      const snapshot = decodeState(await AsyncStorage.getItem('my-hub:v1'));
      let deviceId = await AsyncStorage.getItem('my-hub:device-id');
      if (!deviceId) { deviceId = randomUUID(); await AsyncStorage.setItem('my-hub:device-id', deviceId); }
      await AsyncStorage.setItem('my-hub:legacy-owner', accountId);
      await importLocalHub(supabase, accountId, deviceId, snapshot, media, randomUUID,
        () => turn === generation.current && accountRef.current === accountId,
        (done, total) => { if (turn === generation.current) setImportProgress(done + ' de ' + total); });
      if (turn !== generation.current) return;
      await refresh();
      await AsyncStorage.setItem('my-hub:imported:' + accountId, 'yes');
      setNeedsImport(false); setImportProgress('Importación completada');
    } finally { if (turn === generation.current) setImporting(false); }
  }, [accountId, media, importing, refresh]);
  const skipImport = useCallback(async () => {
    if (!accountId || importing) return;
    await AsyncStorage.setItem('my-hub:imported:' + accountId, 'skipped');
    setNeedsImport(false);
  }, [accountId, importing]);
  return <HubContext.Provider value={{ state, loading, error, warning: warning || reminderError, retry: () => { void load(); }, update, repository, media, refresh, needsImport, importing, importProgress, importData, skipImport }}>{children}</HubContext.Provider>;
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
