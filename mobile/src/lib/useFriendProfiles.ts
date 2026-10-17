import { useEffect, useState } from 'react';
import { fetchPublicProfile, type PublicProfile } from './cloud/supabase';

const TTL = 10 * 60 * 1000;
const cache = new Map<string, { at: number; p: Promise<PublicProfile | null | 'unavailable'> }>();

/** Profil public d'un pseudo, gardé dix minutes en mémoire (page des échanges, profils des amis). */
export function friendProfile(name: string, fresh = false): Promise<PublicProfile | null | 'unavailable'> {
  const hit = cache.get(name);
  if (hit && !fresh && Date.now() - hit.at < TTL) return hit.p;
  const p = fetchPublicProfile(name).catch(() => null);
  cache.set(name, { at: Date.now(), p });
  return p;
}

/** Profils publics des amis : undefined pendant le chargement ; null pour un profil introuvable ou privé. */
export function useFriendProfiles(names: string[], reload = 0): Map<string, PublicProfile | null> | undefined {
  const key = names.join('|');
  const [out, setOut] = useState<Map<string, PublicProfile | null> | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    setOut(undefined);
    Promise.all(names.map(async (n) => [n, await friendProfile(n, reload > 0)] as const)).then((r) => {
      if (alive) setOut(new Map(r.map(([n, p]) => [n, p === 'unavailable' ? null : p])));
    });
    return () => { alive = false; };
  }, [key, reload]);
  return out;
}
