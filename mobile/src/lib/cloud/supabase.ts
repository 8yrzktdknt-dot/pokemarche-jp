import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { SUPABASE_KEY, SUPABASE_URL, cloudEnabled } from './config';
import type { SyncEntry } from './merge';

let client: SupabaseClient | null = null;

/** Client Supabase (session gardée sur l'appareil) ; null tant que le projet n'est pas configuré. */
export function supabase(): SupabaseClient | null {
  if (!cloudEnabled()) return null;
  client ??= createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      // Retour de Google : la session arrive dans l'adresse de la page.
      detectSessionInUrl: Platform.OS === 'web',
      flowType: 'pkce',
    },
  });
  return client;
}

/** Adresse de retour après Google : la page Compte de l'app, à la même adresse que l'app. */
function returnUrl(): string | undefined {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
  const i = window.location.pathname.indexOf('/app');
  return `${window.location.origin}${i >= 0 ? window.location.pathname.slice(0, i) : ''}/app/account`;
}

/** Création de compte par e-mail et mot de passe ; true si un e-mail de confirmation doit d'abord être validé. */
export async function signUpWithPassword(email: string, password: string): Promise<boolean> {
  const sb = supabase();
  if (!sb) throw new Error('cloud');
  const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: returnUrl() } });
  if (error) throw error;
  return !data.session;
}

export async function signInWithPassword(email: string, password: string) {
  const sb = supabase();
  if (!sb) throw new Error('cloud');
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/** Lien de réinitialisation du mot de passe (ouvre l'app, page Compte, pour choisir le nouveau). */
export async function sendPasswordReset(email: string) {
  const sb = supabase();
  if (!sb) throw new Error('cloud');
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: returnUrl() });
  if (error) throw error;
}

export async function updatePassword(password: string) {
  const sb = supabase();
  if (!sb) throw new Error('cloud');
  const { error } = await sb.auth.updateUser({ password });
  if (error) throw error;
}

export async function signInWith(provider: 'google' | 'apple') {
  const sb = supabase();
  if (!sb) throw new Error('cloud');
  const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: returnUrl() } });
  if (error) throw error;
}

export async function signOut() {
  await supabase()?.auth.signOut();
}

/** Collection et réglages enregistrés sur le compte (une ligne par utilisateur). */
export async function loadRemote(userId: string): Promise<{ entries: SyncEntry[]; settings?: Record<string, unknown> } | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data, error } = await sb.from('collections').select('data, settings').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data ? { entries: (data.data as SyncEntry[]) ?? [], settings: (data.settings as Record<string, unknown>) ?? undefined } : { entries: [] };
}

export async function saveRemote(userId: string, entries: SyncEntry[], settings: Record<string, unknown>) {
  const sb = supabase();
  if (!sb) return;
  const { error } = await sb.from('collections').upsert({ user_id: userId, data: entries, settings, updated_at: new Date().toISOString() });
  if (error) throw error;
}
