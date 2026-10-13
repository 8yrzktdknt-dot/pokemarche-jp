// Pokémon (cartes internationales) : extensions TCGdex par langue, triées par date de sortie, avec logos.
import { getJson, pool, sortByRelease, writeJson } from './lib.mjs';

const API = 'https://api.tcgdex.net/v2';
const asset = (u) => (u ? `${u}.webp` : undefined);

// Blocs à part (promos, kits, cartes géantes) placés après les blocs principaux ; TCG Pocket (jeu mobile) exclu.
const SIDE = new Set(['misc', 'tk', 'pop', 'mc', 'mcd']);
const EXCLUDED = new Set(['tcgp']);

export async function buildPokemonIntl(langs = ['en', 'fr', 'de', 'es', 'it', 'pt']) {
  // Les identifiants d'extensions sont communs aux langues : dates et logos anglais en secours.
  const fallback = new Map();
  for (const lang of langs) {
    const series = ((await getJson(`${API}/${lang}/series`)) ?? []).filter((s) => !EXCLUDED.has(s.id));
    const full = await pool(series, 4, (s) => getJson(`${API}/${lang}/series/${encodeURIComponent(s.id)}`));
    const blocs = [];
    for (const s of full) {
      if (!s?.sets?.length) continue;
      const sets = await pool(s.sets, 6, async (b) => {
        const st = await getJson(`${API}/${lang}/sets/${encodeURIComponent(b.id)}`);
        const fb = fallback.get(b.id);
        const set = {
          id: b.id,
          code: (st?.abbreviation?.official ?? st?.tcgOnline ?? b.id).toUpperCase(),
          name: b.name,
          releaseDate: st?.releaseDate ?? fb?.releaseDate,
          logo: asset(b.logo ?? st?.logo) ?? fb?.logo,
          count: b.cardCount?.total ?? st?.cardCount?.total,
        };
        if (!fallback.has(b.id)) fallback.set(b.id, { releaseDate: set.releaseDate, logo: set.logo });
        return set;
      });
      blocs.push({ id: s.id, name: s.name, sets });
    }
    sortByRelease(blocs);
    blocs.sort((a, b) => Number(SIDE.has(a.id)) - Number(SIDE.has(b.id)));
    writeJson(`sets/pokemon-${lang}.json`, { built: new Date().toISOString(), blocs });
    console.log(`Pokémon ${lang} : ${blocs.length} blocs, ${blocs.reduce((n, b) => n + b.sets.length, 0)} extensions`);
  }
}
