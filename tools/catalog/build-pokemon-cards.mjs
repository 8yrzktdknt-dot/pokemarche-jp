// Pokémon (cartes internationales, français puis anglais) : toutes les cartes de chaque extension TCGdex,
// avec rareté, nom dans l'autre langue et une image pour chaque carte quand une source en a une :
//   1) image TCGdex dans la langue de la carte,
//   2) image officielle pokemon.com dans la langue de la carte (promos, 30e anniversaire…),
//   3) image TCGdex anglaise de la même carte,
//   4) image pokemontcg.io (anglaise) — promos, galeries, kits et anciennes extensions que TCGdex n'illustre pas,
//   5) image officielle pokemon.com anglaise,
//   6) image Scrydex (anglaise),
//   7) image TCGdex de la même carte en italien, espagnol, allemand ou portugais (kits du dresseur…).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOG, getJson, pad3, pool, writeJson } from './lib.mjs';

const API = 'https://api.tcgdex.net/v2';
const PTCG = 'https://api.pokemontcg.io/v2';
const enc = encodeURIComponent;

/** Identifiants pokemontcg.io possibles pour une extension TCGdex (sv03.5 → sv3pt5, sm7.5 → sm75, cel25cc → cel25c…). */
/** Extensions dont l'identifiant pokemontcg.io ne se déduit pas (30e anniversaire, kits du dresseur EX). */
const PTCG_ALIASES = {
  '30th': 'me55', '30th-c': 'me55c',
  // Collection Zarbi (numéros « A », « ! » de Forces Cachées), Best of Game, promos HGSS.
  exu: 'ex10', bog: 'bp', hgssp: 'hsp',
  'tk-ex-latia': 'tk1a', 'tk-ex-latio': 'tk1b', 'tk-ex-p': 'tk2a', 'tk-ex-m': 'tk2b',
};

export function ptcgCandidates(id) {
  const base = id.toLowerCase().replace(/(^|[a-z])0+(?=\d)/g, '$1');
  return [...new Set([
    ...(PTCG_ALIASES[id.toLowerCase()] ? [PTCG_ALIASES[id.toLowerCase()]] : []),
    base,
    base.replace(/\.5/g, 'pt5'),
    base.replace(/\./g, ''),
    base.replace(/cc$/, 'c'),
    base.replace(/-fr$/, ''),
    // Collections McDonald's : « 2019sm » → « mcd19 »
    ...(/^20(\d\d)[a-z]+(-fr)?$/.test(base) ? [`mcd${base.slice(2, 4)}`] : []),
  ])];
}

/** Numéro de carte comparable entre sources : « 007 » → « 7 », « TG01 » reste « TG01 », « %3F » → « ? ». */
export const numberKey = (n) => {
  const s = (() => { try { return decodeURIComponent(String(n)); } catch { return String(n); } })();
  return /^\d+$/.test(s) ? String(Number(s)) : s.toUpperCase();
};
/** Numéro sans zéros après les lettres (« H01 » → « H1 ») : TCGdex et pokemontcg.io ne les écrivent pas pareil. */
export const looseKey = (n) => numberKey(n).replace(/^([A-Z]+)0+(\d)/, '$1$2');

/** Données pokemontcg.io publiées sur GitHub (l'API publique est souvent lente ou vide sans clé). */
const PTCG_DATA = 'https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master';

/** Nom comparable entre sources (« Charizard ex », « Dark Tyranitar » → « charizardex », « darktyranitar »). */
export const nameKey = (n) => (n ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');

/**
 * Images pokemontcg.io d'une extension, par numéro (« 7 », « TG01 ») et par nom anglais (« name:charizard »)
 * pour les collections qui reprennent les numéros d'origine (Collection Classique : 4/102…).
 */
async function ptcgImages(ptcgId) {
  const out = new Map();
  const names = new Map();
  const add = (c) => {
    if (!c.images?.small) return;
    out.set(numberKey(c.number), c.images.small);
    out.set(`loose:${looseKey(c.number)}`, c.images.small);
    out.set(`nameof:${numberKey(c.number)}`, nameKey(c.name));
    const k = `name:${nameKey(c.name)}`;
    names.set(k, names.has(k) ? null : c.images.small);
  };
  const data = await getJson(`${PTCG_DATA}/cards/en/${enc(ptcgId)}.json`).catch(() => null);
  if (Array.isArray(data) && data.length) data.forEach(add);
  else {
    for (let page = 1; page <= 4; page++) {
      const r = await getJson(`${PTCG}/cards?q=set.id:${enc(ptcgId)}&select=number,name,images&pageSize=250&page=${page}`);
      (r?.data ?? []).forEach(add);
      if (!r || (r.page ?? page) * (r.pageSize ?? 250) >= (r.totalCount ?? 0)) break;
    }
  }
  // Noms uniques seulement (deux cartes du même nom : on ne devine pas).
  for (const [k, v] of names) if (v) out.set(k, v);
  return out;
}

// Scrydex : images anglaises « …/pokemon/mcd23-1/large » ; une image générique quand la carte est inconnue.
const SCRYDEX = (pid, n) => `https://images.scrydex.com/pokemon/${pid}-${n}/large`;
let scrydexBlank;
/** Taille totale de l'image (« Content-Range: bytes 0-0/608467 ») sans la télécharger. */
async function scrydexSize(url) {
  try {
    const r = await fetch(url, { headers: { Range: 'bytes=0-0' } });
    await r.arrayBuffer();
    if (!r.ok) return 0;
    return Number(r.headers.get('content-range')?.split('/')[1] ?? r.headers.get('content-length') ?? 0);
  } catch {
    return 0;
  }
}

/** Images Scrydex des cartes demandées (numéro → URL), en écartant l'image générique. */
async function scrydexImages(setId, localIds) {
  const out = new Map();
  if (!localIds.length) return out;
  scrydexBlank ??= await scrydexSize(SCRYDEX('zz-inconnu', 1));
  for (const pid of ptcgCandidates(setId)) {
    await pool(localIds, 6, async (id) => {
      if (out.has(id)) return;
      const n = /^\d+$/.test(id) ? String(Number(id)) : id;
      const size = await scrydexSize(SCRYDEX(pid, n));
      if (size && size !== scrydexBlank) out.set(id, SCRYDEX(pid, n));
    });
    if (out.size) break;
  }
  return out;
}

// Images officielles pokemon.com : …/cms2-fr-fr/img/cards/web/SVP/SVP_FR_1.png, …/cms2/img/cards/web/SWSHP/SWSHP_EN_SWSH001.png.
const POKEMON_COM = { fr: 'https://www.pokemon.com/static-assets/content-assets/cms2-fr-fr/img/cards/web', en: 'https://www.pokemon.com/static-assets/content-assets/cms2/img/cards/web' };

/** Codes d'extension possibles chez pokemon.com (« me02.5 » → ME2PT5, « sv03.5 » → SV3PT5, « 30th » → 30TH). */
export function pokemonComCodes(id) {
  const u = id.toUpperCase();
  const noZero = u.replace(/([A-Z])0+(\d)/, '$1$2');
  return [...new Set([u, u.replace(/\.5$/, 'PT5'), noZero, noZero.replace(/\.5$/, 'PT5'), u.replace(/\./g, ''), u.replace(/-/g, ''), noZero.replace(/\./g, '')])].filter((c) => /^[A-Z0-9]+$/.test(c));
}

/** Numéros possibles : « 001 » → 1 ; « SWSH001 » tel quel. */
const pokemonComNumbers = (n) => (/^\d+$/.test(n) ? [String(Number(n))] : [...new Set([n.toUpperCase(), n.toUpperCase().replace(/^([A-Z]+)0+(\d)/, '$1$2')])]);

async function exists(url) {
  try {
    const r = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15' } });
    return r.ok && (r.headers.get('content-type') ?? '').startsWith('image/');
  } catch {
    return false;
  }
}

/**
 * Images pokemon.com des cartes d'une extension (numéro → URL), pour les numéros demandés.
 * Le code de l'extension est trouvé une fois sur la première carte, puis chaque image est vérifiée.
 */
export async function pokemonComImages(lang, setId, localIds) {
  const out = new Map();
  if (!localIds.length || !POKEMON_COM[lang]) return out;
  const L = lang.toUpperCase();
  const url = (code, n) => `${POKEMON_COM[lang]}/${code}/${code}_${L}_${n}.png`;
  let code;
  for (const c of pokemonComCodes(setId)) {
    for (const id of localIds.slice(0, 3)) {
      for (const n of pokemonComNumbers(id)) if (!code && (await exists(url(c, n)))) code = c;
    }
    if (code) break;
  }
  if (!code) return out;
  await pool(localIds, 6, async (id) => {
    for (const n of pokemonComNumbers(id)) {
      if (await exists(url(code, n))) { out.set(id, url(code, n)); return; }
    }
  });
  return out;
}

/**
 * Dernier recours : visuel TCGdex de la même carte dans une autre langue (kits du dresseur illustrés seulement en
 * italien et en espagnol…). Numéro de carte → image.
 */
async function otherLangImages(setId) {
  const out = new Map();
  for (const l of ['it', 'es', 'de', 'pt']) {
    const st = await getJson(`${API}/${l}/sets/${enc(setId)}`).catch(() => null);
    for (const c of st?.cards ?? []) if (c.image && !out.has(c.localId)) out.set(c.localId, tcgdexImage(c.image));
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
  const ptcgList = await getJson(`${PTCG_DATA}/sets/en.json`).catch(() => null);
  const ptcgSets = new Set((Array.isArray(ptcgList) && ptcgList.length ? ptcgList : (await getJson(`${PTCG}/sets?select=id&pageSize=250`))?.data ?? []).map((s) => s.id));
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
    let total = 0, withImage = 0, fromEn = 0, fromPtcg = 0, fromOfficial = 0, fromScrydex = 0, fromForeign = 0;

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
      // Images officielles pokemon.com dans la langue de la carte quand TCGdex n'en a pas.
      const officialImg = await pokemonComImages(lang, s.id, list.filter((c) => !c.image).map((c) => c.localId));
      const stillMissing = list.filter((c) => !c.image && !officialImg.has(c.localId) && !en.get(c.id)?.image);
      // Par numéro quand le nom concorde (ou est inconnu), sinon par nom anglais.
      const ptcgOf = (c) => {
        if (!ptcg) return undefined;
        const name = nameKey(en.get(c.id)?.name ?? (lang === 'en' ? c.name : other.get(c.id)?.name));
        const byNum = ptcg.get(numberKey(c.localId)) ?? ptcg.get(`loose:${looseKey(c.localId)}`);
        const numName = ptcg.get(`nameof:${numberKey(c.localId)}`);
        if (byNum && (!name || !numName || numName === name)) return byNum;
        return ptcg.get(`name:${name}`) ?? (byNum && !ptcg.has(`name:${name}`) && !name ? byNum : undefined);
      };
      const officialEn = lang === 'en' ? new Map() : await pokemonComImages('en', s.id, stillMissing.filter((c) => !ptcgOf(c)).map((c) => c.localId));
      const scrydex = await scrydexImages(s.id, stillMissing.filter((c) => !ptcgOf(c) && !officialEn.has(c.localId)).map((c) => c.localId));
      const leftover = stillMissing.filter((c) => !ptcgOf(c) && !officialEn.has(c.localId) && !scrydex.has(c.localId));
      const foreign = leftover.length ? await otherLangImages(s.id) : new Map();
      const cards = list.map((c) => {
        let image = tcgdexImage(c.image);
        if (!image && officialImg.get(c.localId)) { image = officialImg.get(c.localId); fromOfficial++; }
        if (!image && en.get(c.id)?.image) { image = tcgdexImage(en.get(c.id).image); fromEn++; }
        if (!image && ptcgOf(c)) { image = ptcgOf(c); fromPtcg++; }
        if (!image && officialEn.get(c.localId)) { image = officialEn.get(c.localId); fromOfficial++; }
        if (!image && scrydex.get(c.localId)) { image = scrydex.get(c.localId); fromScrydex++; }
        if (!image && foreign.get(c.localId)) { image = foreign.get(c.localId); fromForeign++; }
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
    console.log(`Pokémon ${lang} : ${total} cartes, ${withImage} avec image (dont ${fromOfficial} pokemon.com, ${fromEn} anglaises TCGdex, ${fromPtcg} pokemontcg.io, ${fromScrydex} Scrydex, ${fromForeign} autre langue), ${total - withImage} sans image`);
  }
}
