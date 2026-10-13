// Sources japonaises complémentaires :
//  - base officielle pokemon-card.com : cartes absentes de Limitless (ex. cartes rares de M6a), avec image officielle ;
//  - Serebii : vrais logos des extensions japonaises (Limitless n'a que de petits symboles).
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOG, getBuffer, getJson, getText, pool, unescapeHtml } from './lib.mjs';

const PCC = 'https://www.pokemon-card.com';
const SEREBII = 'https://www.serebii.net';

/**
 * Cartes les plus récentes de la base officielle (40 par page, extensions récentes d'abord),
 * regroupées par code d'extension en majuscules (dossier de l'image : …/large/M6a/050613_P_TAMATAMA.jpg).
 */
export async function officialRecentCards(pages = Number(process.env.OFFICIAL_JP_PAGES || 12)) {
  const bySet = new Map();
  const lists = await pool(Array.from({ length: pages }, (_, i) => i + 1), 3, (p) =>
    getJson(`${PCC}/card-search/resultAPI.php?keyword=&regulation_sidebar_form=all&page=${p}`),
  );
  for (const r of lists) {
    for (const c of r?.cardList ?? []) {
      const m = c.cardThumbFile?.match(/\/large\/([^/]+)\/\d+_([A-Z])_/);
      if (!m) continue;
      const key = m[1].toUpperCase();
      if (!bySet.has(key)) bySet.set(key, []);
      bySet.get(key).push({ cardID: c.cardID, image: `${PCC}${c.cardThumbFile}`, name: unescapeHtml(c.cardNameViewText ?? c.cardNameAltText ?? ''), energy: m[2] === 'E' });
    }
  }
  return bySet;
}

/** Numéro imprimé d'une fiche officielle : « 039 / 103 » → { n: '039', total: 103 }. */
export function parseOfficialNumber(html) {
  const block = html.match(/class="subtext[^"]*"[^>]*>[\s\S]*?\/>([^<]*)<\/div>/)?.[1];
  const m = block?.replace(/&nbsp;/g, ' ').match(/([A-Z]{0,3}\d{1,3})\s*\/\s*([A-Z]{0,3}\d{1,3})/);
  return m ? { n: m[1], total: Number(m[2].replace(/\D/g, '')) || undefined } : null;
}

export async function officialNumber(cardID) {
  const html = await getText(`${PCC}/card-search/details.php/card/${cardID}/regu/all`);
  return html ? parseOfficialNumber(html) : null;
}

/** Nom d'extension comparable entre sources (« White Flare - Jp », « 30th Celebration Japan » → sans suffixe). */
export const setKey = (name) => name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '').replace(/(jp|japan|japanese)$/, '');

/** Logos Serebii de la page des extensions japonaises : nom anglais → URL. */
export function parseSerebiiLogos(html) {
  const out = new Map();
  for (const m of html.matchAll(/<img src="(\/card\/logo\/[^"]+\.png)"[^>]*alt="([^"]+?) Set Icon"/g)) {
    const k = setKey(unescapeHtml(m[2]));
    if (k && !out.has(k)) out.set(k, `${SEREBII}${m[1]}`);
  }
  return out;
}

/**
 * Télécharge les logos Serebii des extensions trouvées et les publie avec le catalogue
 * (catalog/logos/pokemon-ja/<id>.png, chemin relatif au catalogue). Renvoie id → chemin.
 */
export async function serebiiLogos(sets) {
  const html = await getText(`${SEREBII}/card/japanese.shtml`);
  if (!html) return new Map();
  const logos = parseSerebiiLogos(html);
  const dir = join(CATALOG, 'logos', 'pokemon-ja');
  mkdirSync(dir, { recursive: true });
  const found = new Map();
  await pool(sets, 4, async (s) => {
    const url = logos.get(setKey(s.name));
    if (!url) return;
    const file = join(dir, `${s.id}.png`);
    if (!existsSync(file)) {
      const buf = await getBuffer(url);
      if (!buf || buf[0] !== 0x89) return;
      writeFileSync(file, buf);
    }
    found.set(s.id, `logos/pokemon-ja/${s.id}.png`);
  });
  console.log(`Serebii : ${logos.size} logos, ${found.size} extensions associées`);
  return found;
}
