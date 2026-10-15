// Outils communs du robot de catalogue : téléchargements avec reprises, parallélisme borné, écriture JSON.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CATALOG = join(ROOT, 'catalog');
const UA = 'Mozilla/5.0 (compatible; PokeMarket-catalog/1.0; +https://github.com/BananaInTrouble/tcgmarket)';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchRetry(url, tries = 4) {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en,fr;q=0.8,ja;q=0.6' } });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r;
    } catch (e) {
      if (i >= tries) { console.warn(`échec ${url} : ${e.message}`); return null; }
      await sleep(1000 * 2 ** i);
    }
  }
}

export async function getJson(url) {
  const r = await fetchRetry(url);
  return r ? r.json() : null;
}
export async function getText(url) {
  const r = await fetchRetry(url);
  return r ? r.text() : null;
}
export async function getBuffer(url) {
  const r = await fetchRetry(url, 2);
  return r ? Buffer.from(await r.arrayBuffer()) : null;
}

/** map() avec au plus `n` traitements en parallèle. */
export async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) {
      const k = i++;
      out[k] = await fn(items[k], k);
    }
  }));
  return out;
}

export function writeJson(rel, data) {
  const file = join(CATALOG, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data));
  return file;
}

export const pad3 = (n) => String(n).padStart(3, '0');

/** Entités HTML courantes. */
export const unescapeHtml = (s) =>
  s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;|&rsquo;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).trim();

const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
/** « 31 Jul 26 » → « 2026-07-31 ». */
export function parseShortDate(s) {
  const m = s.trim().match(/^(\d{1,2}) (\w{3}) (\d{2})$/);
  if (!m) return undefined;
  const y = +m[3] + (+m[3] > 90 ? 1900 : 2000);
  return `${y}-${String(MONTHS[m[2]] ?? 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

/** Trie les extensions de chaque bloc et les blocs eux-mêmes du plus récent au plus ancien. */
export function sortByRelease(blocs) {
  const latest = (b) => b.sets.reduce((m, s) => (s.releaseDate && s.releaseDate > m ? s.releaseDate : m), '');
  for (const b of blocs) b.sets.sort((a, b2) => (b2.releaseDate ?? '').localeCompare(a.releaseDate ?? ''));
  // Tri sur place (les appelants gardent leur tableau) ; les blocs vides sont retirés.
  blocs.sort((a, b) => latest(b).localeCompare(latest(a)));
  for (let i = blocs.length - 1; i >= 0; i--) if (!blocs[i].sets.length) blocs.splice(i, 1);
  return blocs;
}
