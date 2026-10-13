// Noms anglais et français des cartes japonaises que la traduction par espèce ne couvre pas
// (Dresseurs, Objets, Stades, Énergies…) : la fiche Limitless de la carte japonaise renvoie vers sa version
// internationale (« Int. Prints » → /cards/en/SSP/163), dont le catalogue anglais donne le nom anglais et français.
// Les traductions trouvées sont gardées dans catalog/names/ja.json (le robot ne cherche que les nouveaux noms).
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOG, getText, pool, sleep, writeJson } from './lib.mjs';

const CACHE = join(CATALOG, 'names', 'ja.json');

/** Première version internationale citée sur une fiche Limitless japonaise : { code: 'SSP', n: '163' }. */
export function parseIntPrint(html) {
  const block = html.split('Int. Prints')[1]?.split('JP. Prints')[0] ?? '';
  const m = block.match(/href="\/cards\/(?:en\/)?([A-Za-z0-9.-]+)\/([A-Za-z0-9-]+)"/);
  return m ? { code: m[1].toUpperCase(), n: m[2] } : null;
}

/** Catalogue anglais : code d'extension (« SSP ») + numéro → [nom anglais, nom français]. */
export function loadEnglishNames() {
  const sets = JSON.parse(readFileSync(join(CATALOG, 'sets', 'pokemon-en.json'), 'utf8'));
  const byCode = new Map();
  for (const s of sets.blocs.flatMap((b) => b.sets)) if (!byCode.has(s.code)) byCode.set(s.code, s.id);
  const cache = new Map();
  return (code, n) => {
    const id = byCode.get(code);
    if (!id) return null;
    if (!cache.has(id)) {
      const f = join(CATALOG, 'cards', 'pokemon-en', `${id}.json`);
      cache.set(id, existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : []);
    }
    const key = (x) => (/^\d+$/.test(x) ? String(Number(x)) : x.toUpperCase());
    const c = cache.get(id).find((x) => key(x.localId) === key(n));
    return c ? [c.nameEn ?? c.name, c.nameFr ?? c.nameEn ?? c.name] : null;
  };
}

/**
 * Cartes très courantes dont la version internationale n'est pas reliée automatiquement
 * (impressions promo, decks) : noms officiels anglais et français (anglais quand le français n'est pas sûr).
 */
const STAPLES = {
  '博士の研究': ["Professor's Research", 'Recherches Professorales'],
  'ポケモンキャッチャー': ['Pokémon Catcher', 'Pokémon Catcher'],
  'ボスの指令': ["Boss's Orders", 'Ordres du Boss'],
  'クラッシュハンマー': ['Crushing Hammer', 'Maillet Écrasant'],
  'エネルギーつけかえ': ['Energy Switch', "Échange d'Énergie"],
  'チェレン': ['Cheren', 'Tcheren'],
  'マリィ': ['Marnie', 'Rosemary'],
  'N': ['N', 'N'],
  'ベル': ['Bianca', 'Bianca'],
  'まんたんのくすり': ['Max Potion', 'Potion Max'],
  'ポケモンだいすきクラブ': ['Pokémon Fan Club', 'Club des Fans de Pokémon'],
  'レスキュータンカ': ['Rescue Stretcher', 'Brancard de Secours'],
  'アセロラ': ['Acerola', 'Acerola'],
  'カキ': ['Kiawe', 'Kiawe'],
  'デンジ': ['Volkner', 'Tanguy'],
  '勝利の勲章': ['Victory Medal', 'Victory Medal'],
};

/** Énergies de base : « 基本水エネルギー » → Basic Water Energy / Énergie Eau de base. */
const ENERGY = {
  草: ['Grass', 'Plante'], 炎: ['Fire', 'Feu'], 水: ['Water', 'Eau'], 雷: ['Lightning', 'Électrique'], 超: ['Psychic', 'Psy'],
  闘: ['Fighting', 'Combat'], 悪: ['Darkness', 'Obscurité'], 鋼: ['Metal', 'Métal'], フェアリー: ['Fairy', 'Fée'],
};
export function basicEnergy(name) {
  const m = name.match(/^基本(.+)エネルギー$/);
  const t = m && ENERGY[m[1]];
  return t ? [`Basic ${t[0]} Energy`, `Énergie ${t[1]} de base`] : null;
}

/**
 * Complète nameEn / nameFr des cartes japonaises encore non traduites, dans tous les fichiers cards/pokemon-ja.
 * Renvoie le nombre de cartes traduites.
 */
export async function translateRemaining() {
  const dir = join(CATALOG, 'cards', 'pokemon-ja');
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  const decks = files.map((f) => ({ f, cards: JSON.parse(readFileSync(join(dir, f), 'utf8')) }));
  const known = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};

  // Un exemplaire de chaque nom encore inconnu (extension + numéro pour la fiche Limitless).
  const todo = new Map();
  for (const { f, cards } of decks) {
    for (const c of cards) {
      if (c.nameEn || known[c.name]) continue;
      const energy = basicEnergy(c.name) ?? STAPLES[c.name];
      if (energy) { known[c.name] = energy; continue; }
      if (!/^\d+$/.test(c.localId)) continue;
      // Plusieurs exemplaires par nom : une impression exclusive au Japon n'a pas de version internationale.
      const list = todo.get(c.name) ?? [];
      list.push({ set: f.replace(/\.json$/, ''), n: String(Number(c.localId)) });
      todo.set(c.name, list);
    }
  }
  const english = loadEnglishNames();
  let found = 0;
  await pool([...todo], 4, async ([name, samples]) => {
    // Jusqu'à 6 impressions réparties dans toutes les extensions où la carte apparaît.
    const step = Math.max(1, Math.floor(samples.length / 6));
    for (const { set, n } of samples.filter((_, i) => i % step === 0).slice(0, 6)) {
      await sleep(100);
      const html = await getText(`https://limitlesstcg.com/cards/jp/${set}/${n}`);
      const p = html && parseIntPrint(html);
      const t = p && english(p.code, p.n);
      if (t) { known[name] = t; found++; return; }
    }
  });
  writeJson('names/ja.json', known);

  let translated = 0;
  for (const { f, cards } of decks) {
    let changed = false;
    for (const c of cards) {
      const t = !c.nameEn && known[c.name];
      if (t) { c.nameEn = t[0]; c.nameFr = c.nameFr ?? t[1]; changed = true; translated++; }
    }
    if (changed) writeJson(`cards/pokemon-ja/${f}`, cards);
  }
  console.log(`Traductions JP : ${todo.size} noms cherchés, ${found} trouvés ; ${Object.keys(known).length} en cache ; ${translated} cartes traduites`);
  return translated;
}
