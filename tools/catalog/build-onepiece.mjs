// One Piece Card Game : listes officielles (anglais, japonais, français), versions regroupées en variantes
// (normale, parallèles, réimpressions) et prix Cardmarket (jeu n° 18 : moyenne des ventes sur 7 jours, sinon 30 jours…).
import { getJson, getText, pool, sleep, unescapeHtml, writeJson } from './lib.mjs';
import { ownLogo, saveLogos, scrydexLogo } from './logos.mjs';
import { applyProductIds, expansionRegions, groupVersions, indexProducts, matchVersions, pickExpansion } from './onepiece-variants.mjs';
import { applyCardmarketPrices } from './variants.mjs';

const SITES = { en: 'https://en.onepiece-cardgame.com', ja: 'https://www.onepiece-cardgame.com', fr: 'https://fr.onepiece-cardgame.com' };
const BLOCS = [
  { id: 'op', test: /BOOSTER PACK|ブースターパック|^BOOSTER\b/i, name: 'Booster Packs' },
  { id: 'eb', test: /EXTRA BOOSTER|エクストラブースター/i, name: 'Extra Boosters' },
  { id: 'prb', test: /PREMIUM BOOSTER|プレミアムブースター/i, name: 'Premium Boosters' },
  { id: 'st', test: /DECK|デッキ/i, name: 'Starter Decks' },
];
/** Noms des blocs dans les langues de l'app. */
const BLOC_NAMES = {
  op: { fr: 'Boosters', en: 'Booster Packs', ja: 'ブースターパック', de: 'Booster', es: 'Sobres', it: 'Buste', pt: 'Boosters', 'zh-tw': '補充包', 'zh-cn': '补充包', ko: '부스터 팩' },
  eb: { fr: 'Boosters Extra', en: 'Extra Boosters', ja: 'エクストラブースター', de: 'Extra-Booster', es: 'Sobres Extra', it: 'Buste Extra', pt: 'Boosters Extra', 'zh-tw': '額外補充包', 'zh-cn': '额外补充包', ko: '엑스트라 부스터' },
  prb: { fr: 'Boosters Premium', en: 'Premium Boosters', ja: 'プレミアムブースター', de: 'Premium-Booster', es: 'Sobres Premium', it: 'Buste Premium', pt: 'Boosters Premium', 'zh-tw': '高級補充包', 'zh-cn': '高级补充包', ko: '프리미엄 부스터' },
  st: { fr: 'Decks de démarrage', en: 'Starter Decks', ja: 'スタートデッキ', de: 'Starterdecks', es: 'Barajas de inicio', it: 'Mazzi base', pt: 'Decks iniciais', 'zh-tw': '起始牌組', 'zh-cn': '起始卡组', ko: '스타터 덱' },
  other: { fr: 'Autres', en: 'Other', ja: 'その他', de: 'Andere', es: 'Otros', it: 'Altro', pt: 'Outros', 'zh-tw': '其他', 'zh-cn': '其他', ko: '기타' },
};

/** Dates de sortie des boosters (anglais et japonais). */
const RELEASES = {
  en: {
    OP01: '2022-12-02', OP02: '2023-03-10', OP03: '2023-06-30', OP04: '2023-09-22', OP05: '2023-12-08', OP06: '2024-03-15',
    EB01: '2024-05-03', OP07: '2024-06-28', OP08: '2024-09-13', PRB01: '2024-11-08', OP09: '2024-12-13', OP10: '2025-03-21',
    EB02: '2025-05-09', OP11: '2025-06-06', OP12: '2025-08-22', PRB02: '2025-10-03', OP13: '2025-11-07', OP14: '2026-01-16',
    EB03: '2026-02-20', OP15: '2026-04-03', OP16: '2026-06-12', OP17: '2026-08-28',
  },
  ja: {
    OP01: '2022-07-22', OP02: '2022-11-04', OP03: '2023-02-11', OP04: '2023-05-27', OP05: '2023-08-26', OP06: '2023-11-25',
    EB01: '2024-02-10', OP07: '2024-02-24', OP08: '2024-05-25', PRB01: '2024-07-27', OP09: '2024-08-31', OP10: '2024-11-30',
    EB02: '2025-01-25', OP11: '2025-03-01', OP12: '2025-05-31', OP13: '2025-08-23', PRB02: '2025-09-30', EB03: '2025-10-25',
    OP14: '2026-01-16', EB04: '2026-01-31', OP15: '2026-02-28', OP16: '2026-05-30', OP17: '2026-08-21',
  },
};

/** Fichiers publics Cardmarket du One Piece Card Game (jeu n° 18) : fiches produits et guide des prix. */
const CM_PRODUCTS = 'https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_18.json';
const CM_SEALED = 'https://downloads.s3.cardmarket.com/productCatalog/productList/products_nonsingles_18.json';
export const CM_PRICES = 'https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_18.json';

const clean = (s) => unescapeHtml(unescapeHtml(s)).replace(/<br[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/** Options du sélecteur d'extensions : [{ value, label, code }]. */
export function parseSeries(html) {
  return [...html.matchAll(/<option value="(\d+)"[^>]*>([^<]+)/g)]
    .map(([, value, raw]) => {
      const label = clean(raw);
      const code = label.match(/[\[【]([A-Z]+-?\d+)(?:-[A-Z]+-?\d+)?[\]】]\s*$/)?.[1];
      return { value, label, code };
    })
    .filter((o) => o.code);
}

/** Cartes d'une page de liste officielle. */
export function parseCards(html, site) {
  const cards = [];
  for (const block of html.split('<dl class="modalCol"').slice(1)) {
    const id = block.match(/id="([^"]+)"/)?.[1];
    const info = [...block.matchAll(/<div class="infoCol">([\s\S]*?)<\/div>/g)][0]?.[1] ?? '';
    const spans = [...info.matchAll(/<span>([^<]*)<\/span>/g)].map((m) => m[1].trim());
    const name = block.match(/<div class="cardName">([^<]+)<\/div>/)?.[1];
    const img = block.match(/data-src="([^"]+)"/)?.[1];
    const color = block.match(/<div class="color"><h3>[^<]*<\/h3>([^<]+)<\/div>/)?.[1];
    if (!id || !name) continue;
    // Dos de la fiche : coût (ou vie pour un Leader), puissance, contre, attribut, type, bloc.
    const field = (cls) => block.match(new RegExp(`<div class="${cls}"><h3>([\\s\\S]*?)<\\/h3>([^<]*)<\\/div>`));
    const value = (cls) => { const v = clean(field(cls)?.[2] ?? ''); return v && v !== '-' ? v : undefined; };
    const costHead = clean(field('cost')?.[1] ?? '');
    const attribute = block.match(/<div class="attribute">[\s\S]*?<i>([^<]+)<\/i>/)?.[1];
    const attrs = {
      [/life|ライフ/i.test(costHead) ? 'life' : 'cost']: value('cost'),
      power: value('power'),
      counter: value('counter'),
      attribute: attribute && clean(attribute) !== '-' ? clean(attribute) : undefined,
      feature: value('feature'),
      block: value('block'),
    };
    cards.push({
      id,
      number: spans[0] ?? id.replace(/_.*$/, ''),
      rarity: spans[1],
      category: spans[2],
      name: unescapeHtml(name),
      image: img ? new URL(img.replace(/\?.*$/, ''), `${site}/cardlist/`).href : undefined,
      colors: (color ?? '').split('/').map((c) => c.trim()).filter(Boolean),
      attrs: Object.fromEntries(Object.entries(attrs).filter(([, v]) => v)),
    });
  }
  return cards;
}

const setId = (code) => code.replace('-', '');

/**
 * Logo indiqué dans la page produit officielle (les pages récentes rangent leurs images
 * dans des dossiers aléatoires : …/products/2026/03/19/PH7hkxHZKAf8gXnn/logo.webp).
 */
export function parseProductLogo(html, pageUrl) {
  const m = html.match(/["']([^"']*\/logo\.(?:webp|png))(?:\?[^"']*)?["']/);
  return m ? new URL(m[1], pageUrl).href : undefined;
}

async function productPageLogo(site, id) {
  const x = id.toLowerCase();
  const url = `${site}/products/${/^st/.test(x) ? 'decks' : 'boosters'}/${x}.php`;
  const html = await getText(url);
  return html ? parseProductLogo(html, url) : undefined;
}

/** Emplacements possibles du logo d'une extension sur le site officiel. */
export function logoCandidates(site, id) {
  const x = id.toLowerCase();
  const kinds = /^st/.test(x) ? ['decks'] : ['boosters'];
  return kinds.flatMap((k) => [
    `${site}/products/${k}/${x}/images/mv/logo.webp`,
    `${site}/products/${k}/${x}/images/logo.webp`,
    `${site}/products/${k}/${x}/images/mv/logo.png`,
    // Pages plus anciennes : pas de logo séparé, la bannière de l'extension (avec son logo).
    `${site}/images/products/${k}/${x}/mv_01.jpg`,
  ]);
}

const TYPES = /^(BOOSTER PACK|EXTRA BOOSTER|PREMIUM BOOSTER|STARTER DECK EX|STARTER DECK|ULTRA DECK|DECK DE DÉMARRAGE EX|DECK DE DÉMARRAGE|DECK ULTRA|BOOSTER|ブースターパック|エクストラブースター|プレミアムブースター|スタートデッキEX|スタートデッキ|アルティメットデッキ)\s*/i;
const titleCase = (s) => (s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase()) : s);

/** « BOOSTER PACK -AWAKENING OF THE NEW ERA- [OP-05] » → « Awakening Of The New Era » ; « ブースターパック 新時代の主役【OP-05】 » → « 新時代の主役 ». */
export function setName(label) {
  const core = label.replace(/\s*[\[【][^\]】]*[\]】]\s*$/, '').replace(TYPES, '').trim().replace(/^-\s*|\s*-$/g, '').trim();
  return titleCase(core);
}

/** Versions d'une extension (site officiel) au format du catalogue, avant regroupement. */
const toEntry = (c) => ({
  id: c.id,
  localId: c.number.split('-').pop(),
  number: c.number,
  name: c.name,
  image: c.image,
  rarity: c.rarity,
  facets: { color: c.colors, category: c.category ? [c.category] : [] },
  attrs: Object.keys(c.attrs ?? {}).length ? c.attrs : undefined,
});

/** Listes officielles d'une langue : extensions (bloc, nom, ordre) et leurs versions de cartes. */
async function officialLists(lang, site) {
  const index = await getText(`${site}/cardlist/`);
  const series = index ? parseSeries(index) : [];
  if (!series.length) { console.warn(`One Piece ${lang} : liste des extensions illisible`); return []; }
  const sets = [];
  await pool(series, 3, async (s) => {
    await sleep(200);
    const html = await getText(`${site}/cardlist/?series=${s.value}`);
    const entries = html ? parseCards(html, site).map(toEntry) : [];
    if (!entries.length) return;
    const bloc = BLOCS.find((b) => b.test.test(s.label))?.id ?? 'other';
    sets.push({ id: setId(s.code), code: s.code, name: setName(s.label) || s.label, bloc, order: Number(s.value), entries });
  });
  return sets;
}

export async function buildOnePiece() {
  const [products, sealed, guide] = await Promise.all([getJson(CM_PRODUCTS), getJson(CM_SEALED), getJson(CM_PRICES)]);
  const byExp = indexProducts(products?.products ?? []);
  const regions = expansionRegions(sealed?.products ?? []);
  const prices = { prices: new Map((guide?.priceGuides ?? []).map((x) => [x.idProduct, x])) };
  if (!byExp.size) console.warn('One Piece : fiches Cardmarket indisponibles');

  const lists = {};
  for (const [lang, site] of Object.entries(SITES)) lists[lang] = await officialLists(lang, site);

  // Fiches Cardmarket par région : internationales (cartes anglaises et françaises, d'après la liste anglaise, sinon
  // française) et asiatiques (cartes japonaises) ; les extensions sans produit scellé (promos) vont aux deux.
  // Les ids officiels sont les mêmes dans toutes les langues.
  const productIds = { intl: new Map(), asia: new Map() };
  for (const [region, langs] of [['intl', ['en', 'fr']], ['asia', ['ja']]]) {
    const taken = new Set();
    const seen = new Set();
    const allowed = (exp) => (regions.get(exp) ?? region) === region;
    for (const lang of langs) {
      for (const s of lists[lang]) {
        if (seen.has(s.id)) continue;
        seen.add(s.id);
        const cards = groupVersions(s.entries);
        const exp = pickExpansion(cards, byExp, taken, allowed);
        if (!exp) { console.warn(`One Piece : pas d'extension Cardmarket (${region}) pour ${s.id}`); continue; }
        taken.add(exp);
        for (const [o, id] of matchVersions(cards, byExp.get(exp))) productIds[region].set(o, id);
      }
    }
  }

  // Noms de chaque carte (id de sa première version) et de chaque extension, dans chaque langue.
  const cardNames = new Map();
  const setNames = new Map();
  for (const [lang, sets] of Object.entries(lists)) {
    for (const s of sets) {
      setNames.set(s.id, { ...(setNames.get(s.id) ?? {}), [lang]: s.name });
      for (const e of s.entries) cardNames.set(e.id, { ...(cardNames.get(e.id) ?? {}), [lang]: e.name });
    }
  }

  const logos = {};
  for (const lang of ['en', 'ja', 'fr']) {
    const sets = lists[lang];
    if (!sets.length) continue;
    let total = 0, priced = 0;
    for (const s of sets) {
      const cards = groupVersions(s.entries);
      applyProductIds(cards, productIds[lang === 'ja' ? 'asia' : 'intl']);
      priced += applyCardmarketPrices(cards, prices);
      for (const c of cards) {
        const names = cardNames.get(c.id) ?? {};
        if (lang !== 'en' && names.en) c.nameEn = names.en;
        if (lang !== 'fr' && names.fr) c.nameFr = names.fr;
        const other = Object.fromEntries(Object.entries(names).filter(([l, n]) => l !== lang && l !== 'en' && l !== 'fr' && n !== c.name));
        if (Object.keys(other).length) c.n = other;
      }
      total += cards.length;
      writeJson(`cards/onepiece-${lang}/${s.id}.json`, cards);
    }

    // Logos : l'anglais pour toutes les langues ; le français prend son logo officiel quand il existe ;
    // une extension sans version anglaise (EB04 japonais…) garde le sien.
    const official = async (x) => {
      for (const url of [await productPageLogo(SITES[lang], x.id).catch(() => undefined), ...logoCandidates(SITES[lang], x.id)].filter(Boolean)) {
        const r = await fetch(url, { method: 'HEAD' }).catch(() => null);
        if (r?.ok) return /mv_01\.jpg/.test(url) ? { banner: url } : { logo: url };
      }
      return {};
    };
    const mine = await saveLogos(sets, `onepiece-${lang}`, async (x) => {
      if (lang === 'en') { const o = await official(x); return [scrydexLogo(x.id, 'onepiece'), o.logo, o.banner]; }
      // Français : seulement le logo du visuel principal (« mv/logo ») ; la page peut montrer d'autres emblèmes
      // (anniversaire…).
      if (lang === 'fr') { const o = await official(x); return [o.logo && /\/mv\/logo\./.test(o.logo) ? o.logo : null]; }
      if (logos.en?.has(x.id)) return [];
      const o = await official(x);
      return [scrydexLogo(`${x.id}_ja`, 'onepiece'), o.logo, scrydexLogo(x.id, 'onepiece'), o.banner];
    });
    logos[lang] = mine;

    const blocs = [...BLOCS.map((b) => b.id), 'other'].map((id) => ({
      id, name: BLOC_NAMES[id].en, names: BLOC_NAMES[id],
      sets: sets.filter((s) => s.bloc === id).sort((a, b) => b.order - a.order).map((s) => {
        const logo = (lang === 'ja' ? logos.en?.get(s.id) : undefined) ?? mine.get(s.id) ?? logos.en?.get(s.id) ?? ownLogo(`onepiece-${lang}`, s.id);
        const releaseDate = RELEASES[lang]?.[s.id];
        return {
          id: s.id, code: s.code, name: s.name, names: setNames.get(s.id), count: groupVersions(s.entries).length,
          ...(releaseDate ? { releaseDate } : {}), ...(logo ? { logo } : {}),
        };
      }),
    })).filter((b) => b.sets.length);
    writeJson(`sets/onepiece-${lang}.json`, { built: new Date().toISOString(), blocs });
    console.log(`One Piece ${lang} : ${sets.length} extensions, ${total} cartes (${sets.reduce((n, s) => n + s.entries.length, 0)} versions), ${priced} avec prix Cardmarket, logos ${[...blocs.flatMap((b) => b.sets)].filter((x) => x.logo).length}`);
  }
}
