import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { readAccountConfig } from './config';
import { createTemporaryRecoveryClient } from './recovery';

const config = readAccountConfig(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
const serverRendering = Platform.OS === 'web' && typeof window === 'undefined';
export const supabase = config && !serverRendering ? createClient(config.url, config.key, {
  auth: { storage: AsyncStorage, storageKey: 'my-hub:auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
}) : null;

// Recovery must not persist a signed-in session before the password is reset.
export function createRecoveryClient() {
  return config ? createTemporaryRecoveryClient(config) : null;
}
