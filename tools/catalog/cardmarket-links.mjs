// Adresse exacte de la fiche Cardmarket de chaque carte Pokémon (« Mega-Evolution/Bulbasaur-V1-MEG001 »),
// relevée sur la page de la carte chez Limitless (lien « Cardmarket »). Cardmarket refuse les robots :
// c'est la seule façon de connaître le chemin de chaque fiche sans le deviner.
// Les chemins trouvés sont gardés dans catalog/cardmarket/pokemon.json (une page Limitless par carte, une seule fois).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOG, getText, pool, sleep, writeJson } from './lib.mjs';

const CACHE = join(CATALOG, 'cardmarket', 'pokemon.json');
const RETRY_DAYS = 30;

/** Chemins « Extension/Carte » des liens Cardmarket d'une page Limitless, dans l'ordre de la page. */
export function parseCardmarketPaths(html) {
  const out = [];
  for (const m of html.matchAll(/https:\/\/www\.cardmarket\.com\/[a-z]{2}\/Pokemon\/Products\/Singles\/([^"?&#\s]+)/g)) {
    const path = decodeURIComponent(m[1]);
    if (!out.includes(path)) out.push(path);
  }
  return out;
}

/**
 * Lien de la carte elle-même : sur une page internationale, celui qui finit par code + numéro (« MEG001 », « BS4 »),
 * les autres étant des réimpressions ; sur une page japonaise, le premier (la version internationale de la carte).
 */
export function pickCardmarketPath(paths, code, n, japanese) {
  if (japanese) return paths[0];
  const C = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const N = String(n).toUpperCase();
  const nums = /^\d+$/.test(N) ? [N.padStart(3, '0'), String(Number(N))] : [N];
  return paths.find((p) => {
    const card = p.split('/').pop().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    return nums.some((x) => card.endsWith(`-${C}${x}`) || card.endsWith(`-${C}-${x}`));
  });
}

const loadCache = () => (existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {});

/**
 * Complète le cache pour les cartes données ({ key, url, code, n, japanese }), au plus `max` pages Limitless,
 * puis renvoie la table clé → chemin.
 */
export async function cardmarketPaths(cards, max = Number(process.env.CM_LINKS_MAX || 50000)) {
  const cache = loadCache();
  const now = Date.now();
  const todo = cards.filter((c) => {
    const e = cache[c.key];
    return !e || (!e.p && now - (e.t ?? 0) > RETRY_DAYS * 864e5);
  }).slice(0, max);
  let found = 0;
  await pool(todo, 6, async (c) => {
    await sleep(80);
    const html = await getText(c.url);
    if (html === null) { cache[c.key] = { t: now }; return; }
    const p = pickCardmarketPath(parseCardmarketPaths(html), c.code, c.n, c.japanese);
    cache[c.key] = p ? { p } : { t: now };
    if (p) found++;
  });
  if (todo.length) writeJson('cardmarket/pokemon.json', cache);
  const total = Object.values(cache).filter((e) => e.p).length;
  console.log(`Liens Cardmarket : ${todo.length} pages Limitless lues, ${found} nouveaux liens ; ${total} en tout`);
  return new Map(Object.entries(cache).filter(([, e]) => e.p).map(([k, e]) => [k, e.p]));
}

/**
 * Collection Classique des 30 ans (30th-c) : même code « 30C » que l'extension principale, mais pages Limitless
 * à part (CC1…CC30, dans un autre ordre) et fiches Cardmarket au code d'origine (« 30th-Celebration/Charizard-30CBS-4 »).
 * Nom anglais (comparable) → chemin Cardmarket.
 */
export async function classicCollectionPaths(count = 30) {
  const out = new Map();
  const key = (n) => n.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');
  await pool(Array.from({ length: count }, (_, i) => i + 1), 4, async (n) => {
    const html = await getText(`https://limitlesstcg.com/cards/30C/CC${n}`);
    if (!html) return;
    const name = html.match(/class="card-text-name">\s*<a[^>]*>([^<]+)</)?.[1];
    const path = parseCardmarketPaths(html).find((p) => p.startsWith('30th-Celebration/'));
    if (name && path) out.set(key(name), path);
  });
  console.log(`Collection Classique 30 ans : ${out.size} liens Cardmarket`);
  return out;
}
