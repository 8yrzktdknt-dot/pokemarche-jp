// Pokémon (cartes internationales, français puis anglais) : toutes les cartes de chaque extension TCGdex,
// avec rareté, nom dans l'autre langue et une image pour chaque carte quand une source en a une :
//   1) image TCGdex dans la langue de la carte,
//   2) image TCGdex anglaise de la même carte,
//   3) image pokemontcg.io (anglaise) — promos, galeries, kits et anciennes extensions que TCGdex n'illustre pas.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOG, getJson, pad3, pool, writeJson } from './lib.mjs';

const API = 'https://api.tcgdex.net/v2';
const PTCG = 'https://api.pokemontcg.io/v2';
const enc = encodeURIComponent;

/** Identifiants pokemontcg.io possibles pour une extension TCGdex (sv03.5 → sv3pt5, sm7.5 → sm75, cel25cc → cel25c…). */
export function ptcgCandidates(id) {
  const base = id.toLowerCase().replace(/(^|[a-z])0+(?=\d)/g, '$1');
  return [...new Set([
    base,
    base.replace(/\.5/g, 'pt5'),
    base.replace(/\./g, ''),
    base.replace(/cc$/, 'c'),
    base.replace(/-fr$/, ''),
  ])];
}

/** Numéro de carte comparable entre sources : « 007 » → « 7 », « TG01 » reste « TG01 ». */
export const numberKey = (n) => (/^\d+$/.test(n) ? String(Number(n)) : String(n).toUpperCase());

async function ptcgImages(ptcgId) {
  const out = new Map();
  for (let page = 1; page <= 4; page++) {
    const r = await getJson(`${PTCG}/cards?q=set.id:${enc(ptcgId)}&select=number,images&pageSize=250&page=${page}`);
    for (const c of r?.data ?? []) if (c.images?.small) out.set(numberKey(c.number), c.images.small);
    if (!r || (r.page ?? page) * (r.pageSize ?? 250) >= (r.totalCount ?? 0)) break;
  }
  return out;
}

/** Image « petite » d'une carte TCGdex (la grande s'obtient en remplaçant low par high). */
const tcgdexImage = (base) => (base ? `${base}/low.webp` : undefined);

async function rarities(lang) {
  const names = (await getJson(`${API}/${lang}/rarities`)) ?? [];
  const byId = new Map();
  await pool(names, 4, async (r) => {
    for (const c of (await getJson(`${API}/${lang}/cards?rarity=eq:${enc(r)}`)) ?? []) byId.set(c.id, r);
  });
  return byId;
}

export async function buildPokemonCards(langs = ['fr', 'en']) {
  const ptcgSets = new Set(((await getJson(`${PTCG}/sets?select=id&pageSize=250`))?.data ?? []).map((s) => s.id));
  const all = Object.fromEntries(await Promise.all(['en', 'fr'].map(async (l) => [l, (await getJson(`${API}/${l}/cards`)) ?? []])));
  const byId = (l) => new Map(all[l].map((c) => [c.id, c]));
  const en = byId('en');
  const fr = byId('fr');

  for (const lang of langs) {
    const setsFile = join(CATALOG, 'sets', `pokemon-${lang}.json`);
    if (!existsSync(setsFile)) { console.warn(`pokemon-${lang} : pas de liste d'extensions`); continue; }
    const { blocs } = JSON.parse(readFileSync(setsFile, 'utf8'));
    const rarity = await rarities(lang);
    const other = lang === 'fr' ? en : fr;
    let total = 0, withImage = 0, fromEn = 0, fromPtcg = 0;

    await pool(blocs.flatMap((b) => b.sets), 6, async (s) => {
      const st = await getJson(`${API}/${lang}/sets/${enc(s.id)}`);
      const list = st?.cards ?? [];
      if (!list.length) return;
      const official = st.cardCount?.official;
      // pokemontcg.io seulement pour les extensions où il manque des images.
      let ptcg = null;
      if (list.some((c) => !c.image && !en.get(c.id)?.image)) {
        const pid = ptcgCandidates(s.id).find((x) => ptcgSets.has(x));
        if (pid) ptcg = await ptcgImages(pid);
      }
      const cards = list.map((c) => {
        let image = tcgdexImage(c.image);
        if (!image && en.get(c.id)?.image) { image = tcgdexImage(en.get(c.id).image); fromEn++; }
        if (!image && ptcg?.get(numberKey(c.localId))) { image = ptcg.get(numberKey(c.localId)); fromPtcg++; }
        if (image) withImage++;
        const alt = other.get(c.id)?.name;
        return {
          id: c.id,
          localId: c.localId,
          number: official && /^\d+$/.test(c.localId) ? `${c.localId}/${pad3(official)}` : c.localId,
          name: c.name,
          ...(lang === 'fr' ? { nameEn: alt, nameFr: c.name } : { nameEn: c.name, nameFr: alt }),
          rarity: rarity.get(c.id),
          image,
        };
      });
      total += cards.length;
      writeJson(`cards/pokemon-${lang}/${s.id}.json`, cards);
    });
    console.log(`Pokémon ${lang} : ${total} cartes, ${withImage} avec image (dont ${fromEn} anglaises TCGdex, ${fromPtcg} pokemontcg.io), ${total - withImage} sans image`);
  }
}
