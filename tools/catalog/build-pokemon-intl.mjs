// Pokémon (cartes internationales) : extensions TCGdex par langue, triées par date de sortie, avec logos.
import { ptcgCandidates } from './build-pokemon-cards.mjs';
import { getJson, pool, sortByRelease, writeJson } from './lib.mjs';
import { findLogo, pokellectorLogos, saveLogo } from './logos.mjs';

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
    // Logos absents de TCGdex : pokemontcg.io puis Pokellector (anglais), enregistrés avec le catalogue.
    // Les autres langues reprennent le logo anglais de la même extension (fallback).
    if (lang === 'en') {
      const pokellector = await pokellectorLogos('https://www.pokellector.com').catch(() => new Map());
      const missing = blocs.flatMap((b) => b.sets).filter((x) => !x.logo);
      await pool(missing, 6, async (x) => {
        for (const id of ptcgCandidates(x.id)) {
          const rel = await saveLogo(`https://images.pokemontcg.io/${id}/logo.png`, 'pokemon-intl', x.id);
          if (rel) { x.logo = rel; break; }
        }
        if (!x.logo) {
          const url = findLogo(x.name, [pokellector]);
          if (url) x.logo = await saveLogo(url, 'pokemon-intl', x.id);
        }
        if (x.logo) fallback.set(x.id, { ...fallback.get(x.id), logo: x.logo });
      });
      const left = missing.filter((x) => !x.logo);
      console.log(`Logos EN ajoutés : ${missing.length - left.length}/${missing.length}${left.length ? ` ; sans logo : ${left.map((x) => x.id).join(', ')}` : ''}`);
    } else {
      for (const x of blocs.flatMap((b) => b.sets)) if (!x.logo) x.logo = fallback.get(x.id)?.logo;
    }
    sortByRelease(blocs);
    blocs.sort((a, b) => Number(SIDE.has(a.id)) - Number(SIDE.has(b.id)));
    writeJson(`sets/pokemon-${lang}.json`, { built: new Date().toISOString(), blocs });
    console.log(`Pokémon ${lang} : ${blocs.length} blocs, ${blocs.reduce((n, b) => n + b.sets.length, 0)} extensions`);
  }
}
