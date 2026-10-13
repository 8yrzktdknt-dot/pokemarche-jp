// Sources japonaises complémentaires :
//  - base officielle pokemon-card.com : cartes absentes de Limitless (ex. cartes rares de M6a), avec image officielle ;
//  - Serebii : vrais logos des extensions japonaises (Limitless n'a que de petits symboles).
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOG, getBuffer, getJson, getText, pool, unescapeHtml } from './lib.mjs';

const PCC = 'https://www.pokemon-card.com';

/** Nom affiché sur le site officiel : le symbole Méga (balise) devient « M », les autres balises sont retirées. */
export const cleanName = (s) => unescapeHtml(s.replace(/<span class="pcg pcg-megamark"><\/span>/g, 'M').replace(/<[^>]*>/g, '')).trim();
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
      bySet.get(key).push({ cardID: c.cardID, image: `${PCC}${c.cardThumbFile}`, name: cleanName(c.cardNameViewText ?? c.cardNameAltText ?? ''), energy: m[2] === 'E' });
    }
  }
  return bySet;
}

/**
 * Numéros imprimés et rareté d'une fiche officielle :
 * « <img … alt="M6a" />&nbsp;039&nbsp;/&nbsp;103&nbsp;<img src="…/rarity/ic_rare_rr.gif"> » → { n: '039', total: 103, rarity: 'RR' }.
 * Les cartes LEGEND (deux moitiés) portent deux numéros : `numbers` les contient tous.
 */
export function parseOfficialNumber(html) {
  const block = html.match(/class="subtext[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '';
  const text = block.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');
  const all = [...text.matchAll(/([A-Z]{0,3}\d{1,3})\s*\/\s*([A-Z]{0,3}\d{1,3})/g)];
  if (!all.length) return null;
  const rarity = block.match(/ic_rare_([a-z]+)\.gif/)?.[1]?.toUpperCase();
  return {
    n: all[0][1],
    total: Number(all[0][2].replace(/\D/g, '')) || undefined,
    ...(all.length > 1 ? { numbers: all.map((m) => m[1]) } : {}),
    ...(rarity ? { rarity } : {}),
  };
}

/** Fiche officielle complète : numéro(s), rareté, nom, image et code d'extension. */
export function parseOfficialCard(html) {
  const num = parseOfficialNumber(html);
  const image = html.match(/<img class="fit" src="([^"]+)"/)?.[1];
  const name = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1];
  const set = html.match(/class="img-regulation" alt="([^"]+)"/)?.[1];
  return { ...(num ?? {}), name: name ? cleanName(name) || undefined : undefined, image: image ? `${PCC}${image}` : undefined, set };
}

export async function officialCard(cardID) {
  const html = await getText(`${PCC}/card-search/details.php/card/${cardID}/regu/all`);
  return html ? parseOfficialCard(html) : null;
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

/**
 * PokemonWizard : listes complètes des extensions japonaises récentes (nom anglais, numéro, rareté, image),
 * y compris les cartes secrètes absentes de la base officielle (ex. M6a 104-135).
 * Identifiant de l'extension sur le site → code de l'extension.
 */
export const WIZARD_SETS = { M6a: '24721/30th-celebration-m6a' };

const WIZARD_RARITY = {
  'art rare': 'AR', 'special art rare': 'SAR', 'futuristic rare': 'FUR', 'ultra rare': 'SR', 'hyper rare': 'UR',
  'mega hyper rare': 'MUR', 'double rare': 'RR', 'triple rare': 'RRR', 'rare': 'R', 'uncommon': 'U', 'common': 'C',
  'character rare': 'CHR', 'character super rare': 'CSR', 'secret rare': 'UR', 'ace spec rare': 'ACE',
};

/**
 * Cartes d'une page d'extension PokemonWizard. Les données sont dans le JSON embarqué par Next.js
 * (guillemets échappés) : {"tcgplayer_product_id":716932,"name":"Mew ex - 135/103","card_number":"135","rarity":"Futuristic Rare",…,"image_url":"…-full.jpg"}.
 */
export function parseWizardSet(html) {
  const text = html.replace(/\\"/g, '"');
  const out = new Map();
  for (const m of text.matchAll(/"tcgplayer_product_id":(\d+),"name":"([^"]*)","slug":"[^"]*","card_number":"([^"]*)","rarity":"([^"]*)"[\s\S]{0,300}?"image_url":"([^"]+)"/g)) {
    const [, tp, rawName, n, rarityName, image] = m;
    const head = rawName.match(/^(.+?) - ([A-Z]{0,3}\d{1,3})\/(\d{1,3})$/);
    if (!head || out.has(n)) continue;
    out.set(n, {
      n,
      total: Number(head[3]),
      nameEn: unescapeHtml(head[1]).trim(),
      rarity: WIZARD_RARITY[rarityName.toLowerCase()] ?? (rarityName || undefined),
      image,
      tcgplayer: Number(tp),
    });
  }
  return [...out.values()];
}

/** Toutes les pages (60 cartes par page) d'une extension PokemonWizard. */
export async function wizardCards(setId) {
  const path = WIZARD_SETS[setId];
  if (!path) return [];
  const all = new Map();
  for (let page = 1; page <= 10; page++) {
    const html = await getText(`https://www.pokemonwizard.com/sets/${path}?page=${page}`);
    const cards = html ? parseWizardSet(html) : [];
    const before = all.size;
    for (const c of cards) if (!all.has(c.n)) all.set(c.n, c);
    if (all.size === before) break;
  }
  return [...all.values()];
}
