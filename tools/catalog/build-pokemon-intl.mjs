// Pokémon (cartes internationales) : extensions TCGdex par langue, triées par date de sortie, avec logos.
import { getJson, pool, sortByRelease, writeJson } from './lib.mjs';

const API = 'https://api.tcgdex.net/v2';
const asset = (u) => (u ? `${u}.webp` : undefined);

export async function buildPokemonIntl(langs = ['en', 'fr', 'de', 'es', 'it', 'pt']) {
  for (const lang of langs) {
    const series = (await getJson(`${API}/${lang}/series`)) ?? [];
    const full = await pool(series, 4, (s) => getJson(`${API}/${lang}/series/${encodeURIComponent(s.id)}`));
    const blocs = [];
    for (const s of full) {
      if (!s?.sets?.length) continue;
      const sets = await pool(s.sets, 6, async (b) => {
        const st = await getJson(`${API}/${lang}/sets/${encodeURIComponent(b.id)}`);
        return {
          id: b.id,
          code: (st?.tcgOnline ?? st?.abbreviation?.official ?? b.id).toUpperCase(),
          name: b.name,
          releaseDate: st?.releaseDate,
          logo: asset(b.logo ?? st?.logo),
          count: b.cardCount?.total ?? st?.cardCount?.total,
        };
      });
      blocs.push({ id: s.id, name: s.name, sets });
    }
    sortByRelease(blocs);
    writeJson(`sets/pokemon-${lang}.json`, { built: new Date().toISOString(), blocs });
    console.log(`Pokémon ${lang} : ${blocs.length} blocs, ${blocs.reduce((n, b) => n + b.sets.length, 0)} extensions`);
  }
}
