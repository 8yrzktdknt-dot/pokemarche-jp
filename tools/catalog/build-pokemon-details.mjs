// Détails des cartes Pokémon publiés avec le catalogue (étape « pokemon-details », chaque jour) :
// prix Cardmarket (moyennes des ventes, tendance, plus bas) et TCGplayer, n° produit Cardmarket et TCGplayer,
// attributs (illustrateur, n° Pokédex, type, PV, stade, catégorie, marque de régulation).
// Source : fiche TCGdex de chaque carte, dans la langue de la carte (les prix sont communs aux langues).
// Les cartes japonaises sont retrouvées par extension et numéro dans le catalogue japonais de TCGdex.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOG, getJson, pool, writeJson } from './lib.mjs';

const API = 'https://api.tcgdex.net/v2';
const enc = encodeURIComponent;

/** Prix Cardmarket d'une fiche TCGdex ; les cartes uniquement holo n'ont que les champs « -holo ». */
export function cardmarketOf(cm) {
  if (!cm) return undefined;
  const pick = (k) => cm[k] || cm[`${k}-holo`] || undefined;
  const out = { id: cm.idProduct || undefined, avg7: pick('avg7'), avg1: pick('avg1'), avg30: pick('avg30'), trend: pick('trend'), low: pick('low') };
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  return Object.keys(out).length ? out : undefined;
}

/** Prix « Market » TCGplayer (USD) de la variante la plus courante, et n° produit. */
export function tcgplayerOf(tp) {
  if (!tp || typeof tp !== 'object') return {};
  const order = ['normal', 'holofoil', 'reverse-holofoil', '1st-edition-holofoil', 'unlimited-holofoil', '1st-edition'];
  const variants = Object.entries(tp).filter(([, v]) => v && typeof v === 'object');
  variants.sort(([a], [b]) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
  const market = variants.find(([, v]) => v.marketPrice)?.[1]?.marketPrice;
  const id = variants.find(([, v]) => v.productId)?.[1]?.productId;
  return { market, id };
}

// Libellés japonais de TCGdex → français (l'app est en français ; le reste est gardé tel quel).
const JA_TYPES = { 草: 'Plante', 炎: 'Feu', 水: 'Eau', 雷: 'Électrique', 超: 'Psy', 闘: 'Combat', 悪: 'Obscurité', 鋼: 'Métal', ドラゴン: 'Dragon', 無色: 'Incolore', フェアリー: 'Fée' };
const JA_STAGES = { たね: 'De base', '1進化': 'Niveau 1', '2進化': 'Niveau 2', 'V進化': 'VMAX', VMAX: 'VMAX', VSTAR: 'VSTAR', メガ: 'Méga', BREAK: 'TURBO', レベルアップ: 'Niveau X' };
const JA_CATEGORIES = { ポケモン: 'Pokémon', トレーナーズ: 'Dresseur', エネルギー: 'Énergie', グッズ: 'Objet', サポート: 'Supporter', スタジアム: 'Stade', ポケモンのどうぐ: 'Outil Pokémon' };
const ja = (map, v) => (v ? map[v] ?? v : v);

/** Attributs d'une fiche TCGdex (clés de l'app). */
export function attrsOf(d, lang) {
  const tr = lang === 'ja';
  const types = d.types?.map((t) => (tr ? ja(JA_TYPES, t) : t)).join(' / ') || (tr ? ja(JA_TYPES, d.energyType) : d.energyType);
  const category = tr ? ja(JA_CATEGORIES, d.category) : d.category;
  const trainer = tr ? ja(JA_CATEGORIES, d.trainerType) : d.trainerType;
  const out = {
    illustrator: d.illustrator,
    dex: d.dexId?.length ? d.dexId.join(', ') : undefined,
    type: types,
    hp: d.hp ? String(d.hp) : undefined,
    stage: tr ? ja(JA_STAGES, d.stage) : d.stage,
    category: trainer ? `${category} · ${trainer}` : category,
    regulation: d.regulationMark,
  };
  for (const k of Object.keys(out)) if (!out[k]) delete out[k];
  return out;
}

/** Applique une fiche TCGdex à une carte du catalogue (garde ce que TCGdex n'a pas). */
export function applyDetails(c, d, lang) {
  const attrs = { ...(c.attrs ?? {}), ...attrsOf(d, lang) };
  if (Object.keys(attrs).length) c.attrs = attrs;
  const cm = cardmarketOf(d.pricing?.cardmarket);
  if (cm) c.cm = cm; else delete c.cm;
  const tp = tcgplayerOf(d.pricing?.tcgplayer);
  if (tp.id) c.tcgplayer = tp.id;
  if (tp.market) c.price = { value: tp.market, currency: 'USD', source: 'tcgplayer' };
  if (!c.rarity && d.rarity) c.rarity = d.rarity;
}

const numKey = (n) => (/^\d+$/.test(n) ? String(Number(n)) : String(n).toUpperCase());

/** Fiches TCGdex des cartes japonaises : extension TCGdex de même code, carte de même numéro. */
async function japaneseIds(files) {
  const sets = (await getJson(`${API}/ja/sets`)) ?? [];
  const byCode = new Map(sets.map((s) => [s.id.toLowerCase(), s.id]));
  const out = new Map();
  await pool(files, 6, async (f) => {
    const setId = f.replace(/\.json$/, '');
    const tid = byCode.get(setId.toLowerCase());
    if (!tid) return;
    const full = await getJson(`${API}/ja/sets/${enc(tid)}`);
    const byNum = new Map((full?.cards ?? []).map((c) => [numKey(c.localId), c.id]));
    out.set(setId, byNum);
  });
  return out;
}

export async function buildPokemonDetails(langs = (process.env.DETAILS_LANGS || 'en,fr,ja').split(',')) {
  for (const lang of langs) {
    const dir = join(CATALOG, 'cards', `pokemon-${lang}`);
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
    const jaIds = lang === 'ja' ? await japaneseIds(files) : null;
    const stat = { cards: 0, found: 0, priced: 0, attrs: 0 };
    await pool(files, 2, async (f) => {
      const setId = f.replace(/\.json$/, '');
      const cards = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      const map = jaIds?.get(setId);
      if (jaIds && !map) { stat.cards += cards.length; return; }
      await pool(cards, 8, async (c) => {
        stat.cards++;
        const id = map ? map.get(numKey(c.localId)) : c.id;
        if (!id) return;
        const d = await getJson(`${API}/${lang}/cards/${enc(id)}`);
        if (!d) return;
        stat.found++;
        applyDetails(c, d, lang);
        if (c.cm?.avg7 || c.cm?.trend) stat.priced++;
        if (c.attrs?.illustrator || c.attrs?.hp) stat.attrs++;
      });
      writeJson(`cards/pokemon-${lang}/${f}`, cards);
    });
    console.log(`Détails Pokémon ${lang} : ${stat.found}/${stat.cards} fiches TCGdex, ${stat.priced} avec prix Cardmarket, ${stat.attrs} avec attributs`);
  }
}
