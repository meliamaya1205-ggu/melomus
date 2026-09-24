import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve public environment variables from Vite or Node process
const metaEnv = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env : {};
const procEnv = (globalThis as any).process?.env || {};
const supabaseUrl = (metaEnv.VITE_SUPABASE_URL || procEnv.VITE_SUPABASE_URL || '') as string;
const supabaseAnonKey = (metaEnv.VITE_SUPABASE_ANON_KEY || procEnv.VITE_SUPABASE_ANON_KEY || '') as string;

/**
 * Validates whether Supabase credentials are provided and valid
 */
export const isSupabaseConfigured = (): boolean => {
  return (
    typeof supabaseUrl === 'string' &&
    typeof supabaseAnonKey === 'string' &&
    supabaseUrl.trim().length > 0 &&
    supabaseAnonKey.trim().length > 0 &&
    !supabaseUrl.includes('your-project-ref') &&
    supabaseUrl.startsWith('http')
  );
};

/**
 * Singleton Supabase Client instance
 * Instantiated only when valid credentials exist, avoiding runtime crashes in demo/offline mode
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'nuestro_hogar_auth_session',
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

/**
 * Returns active Supabase client or throws a descriptive error
 */
export const getSupabase = (): SupabaseClient => {
  if (!supabase) {
    throw new Error(
      'Supabase no está configurado. Por favor define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env'
    );
  }
  return supabase;
};
