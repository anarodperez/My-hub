import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './client';
import { createSessionGuard } from './session';

type Profile = { id: string; name: string };
type Account = { configured: boolean; loading: boolean; session: Session | null; profile: Profile | null; error: string | null; saveName: (name: string) => Promise<void> };
const AccountContext = createContext<Account | null>(null);
export function AccountProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [error, setError] = useState<string | null>(null);
  const guard = useRef(createSessionGuard());
  const sessionRef = useRef<Session | null>(null);
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;
    const sessionGuard = guard.current;
    let receivedEvent = false;
    const applySession = (next: Session | null) => {
      const generation = guard.current.next();
      sessionRef.current = next;
      setSession(next); setProfile(null); setError(null); setLoading(false);
      if (!next) return;
      // Return from the Auth callback before making another Supabase request.
      setTimeout(() => {
        if (!active || !guard.current.isCurrent(generation)) return;
        void client.from('profiles').select('id,name').eq('id', next.user.id).maybeSingle().then(({ data, error: failure }) => {
          if (!active || !guard.current.isCurrent(generation)) return;
          if (failure) setError('No se ha podido cargar el perfil de tu cuenta. Comprueba la configuración y vuelve a entrar.');
          else setProfile(data);
        });
      }, 0);
    };
    const { data: listener } = client.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      receivedEvent = true;
      applySession(next);
    });
    void client.auth.getSession().then(({ data, error: failure }) => {
      if (!active || receivedEvent) return;
      if (failure) { setError('No se ha podido recuperar tu sesión.'); setLoading(false); }
      else applySession(data.session);
    });
    if (AppState.currentState === 'active') client.auth.startAutoRefresh();
    const appListener = AppState.addEventListener('change', (state) => {
      if (state === 'active') client.auth.startAutoRefresh(); else client.auth.stopAutoRefresh();
    });
    return () => { active = false; sessionGuard.next(); listener.subscription.unsubscribe(); appListener.remove(); client.auth.stopAutoRefresh(); };
  }, []);
  const saveName = useCallback(async (name: string) => {
    const current = sessionRef.current;
    if (!supabase || !current) throw new Error('Inicia sesión para guardar tu perfil.');
    const generation = guard.current.next();
    const trimmed = name.trim();
    if (trimmed.length > 100) throw new Error('El nombre admite hasta 100 caracteres.');
    const { error: insertError } = await supabase.from('profiles').upsert({ id: current.user.id, name: trimmed }, { onConflict: 'id', ignoreDuplicates: true });
    if (insertError) throw new Error('No se ha podido guardar el perfil. Comprueba la configuración de Supabase.');
    const { data, error: updateError } = await supabase.from('profiles').update({ name: trimmed }).eq('id', current.user.id).select('id,name').single();
    if (updateError) throw new Error('No se ha podido guardar el nombre. Vuelve a intentarlo.');
    if (guard.current.isCurrent(generation)) { setProfile(data); setError(null); }
  }, []);
  return <AccountContext.Provider value={{ configured: !!supabase, loading, session, profile, error, saveName }}>{children}</AccountContext.Provider>;
}
export function useAccount() {
  const account = useContext(AccountContext);
  if (!account) throw new Error('AccountProvider no disponible');
  return account;
}
