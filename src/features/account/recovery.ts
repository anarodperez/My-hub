import { createClient } from '@supabase/supabase-js';

// Keep recovery tokens in memory, separate from the app's persisted session.
export function createTemporaryRecoveryClient(config: { url: string; key: string }, request: typeof fetch = fetch) {
  return createClient(config.url, config.key, {
    auth: { storageKey: 'my-hub:recovery', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: request },
  });
}
