import type { Report } from '../support';
import { supabase } from './supabase';

/** Signalement enregistré dans la base (table « reports », lisible seulement depuis le tableau de bord Supabase). */
export async function saveReport(r: Report): Promise<boolean> {
  const sb = supabase();
  if (!sb) return false;
  const { error } = await sb.from('reports').insert({
    topic: r.topic, message: r.message.trim(), email: r.email ?? null, card: r.card ?? null, version: r.version ?? null, app_lang: r.appLang ?? null,
  });
  if (error) throw error;
  return true;
}
