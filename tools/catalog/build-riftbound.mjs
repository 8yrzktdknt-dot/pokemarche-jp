// Riftbound : galerie officielle de Riot (données de la page) dans chaque langue où elle existe, et prix Cardmarket.
//  - cartes anglaises (aussi publiées en « fr » : la galerie française montre les cartes anglaises) ;
//  - cartes chinoises (simplifiées et traditionnelles) et coréennes : noms et visuels imprimés dans ces langues ;
//  - noms d'extensions et de cartes des autres langues de la galerie (allemand, espagnol, italien, japonais…) ;
//  - prix : fichiers publics Cardmarket (jeu n° 22), moyenne des ventes sur 7 jours, version normale et foil.
import { getJson, getText, writeJson } from './lib.mjs';
import { ownLogo, saveLogos, scrydexLogo } from './logos.mjs';
import { applyCardmarketPrices } from './variants.mjs';

/** Langues de la galerie → locale Riot. */
const LOCALES = { en: 'en-us', fr: 'fr-fr', de: 'de-de', es: 'es-es', it: 'it-it', ja: 'ja-jp', ko: 'ko-kr', 'zh-cn': 'zh-cn', 'zh-tw': 'zh-tw' };
/** Catalogues publiés (langue des cartes) et galerie qui les décrit. */
const CARD_LANGS = { en: 'en', fr: 'en', 'zh-cn': 'zh-cn', 'zh-tw': 'zh-tw', ko: 'ko' };
// La galerie ne donne pas les dates de sortie : ordre de sortie connu (du plus récent au plus ancien).
// Les extensions absentes de cette liste sont placées en tête (probablement les plus récentes).
const RELEASE_ORDER = ['VEN', 'RAD', 'UNL', 'SFD', 'OGS', 'OGN'];
/** Dates de sortie (anglais) connues. */
const RELEASES = { OGN: '2025-10-31', OGS: '2025-10-31', SFD: '2026-02-13' };

/** Fichiers publics Cardmarket de Riftbound (jeu n° 22). */
const CM_PRODUCTS = 'https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_22.json';
export const CM_PRICES = 'https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_22.json';

function nextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  return m ? JSON.parse(m[1]) : null;
}
function findKey(o, key) {
  if (!o || typeof o !== 'object') return null;
  if (o[key] && typeof o[key] === 'object' && Array.isArray(o[key].items)) return o[key];
  for (const v of Object.values(o)) {
    const r = findKey(v, key);
    if (r) return r;
  }
  return null;
}

/** Visuel réduit par le CDN de Riot (WebP de 360 px : ~25 Ko au lieu d'un PNG de ~800 Ko). */
export const smallImage = (url) => (url ? `${url}${url.includes('?') ? '&' : '?'}w=360&fm=webp` : url);

/** Attributs de la fiche : artiste, énergie, puissance (« might »), coût en puissance. */
export function attrsOf(c) {
  const label = (f) => f?.value?.label ?? f?.values?.map((v) => v.label).join(', ');
  const a = {
    illustrator: label(c.illustrator),
    energy: label(c.energy),
    might: label(c.might),
    power: label(c.power),
  };
  const out = Object.fromEntries(Object.entries(a).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  return Object.keys(out).length ? out : undefined;
}

const isLegend = (c) => (c.cardType?.type ?? []).some((t) => t.id === 'legend');

/**
 * Nom complet tel que vendu sur Cardmarket : « Jinx, Demolitionist » (nom et sous-titre) ; une légende ne porte que son
 * titre (« Loose Cannon ») : elle prend le nom de son champion (« Jinx, Loose Cannon »).
 */
export function fullName(c, champions = new Map()) {
  if (c.subtitle) return `${c.name}, ${c.subtitle}`;
  const tag = c.tags?.tags?.[0];
  if (isLegend(c) && tag) return `${champions.get(tag) ?? tag}, ${c.name}`;
  return c.name;
}

/** Nom de chaque champion dans une langue (étiquette anglaise → nom de sa carte champion). */
export function championNames(cards) {
  const out = new Map();
  for (const c of cards) {
    const tag = c.tags?.tags?.[0];
    if (!tag || !c.subtitle || !(c.cardType?.superType ?? []).some((s) => s.id === 'champion')) continue;
    // Nom traduit de préférence (certaines cartes de la galerie restent en anglais).
    if (!out.has(tag) || (out.get(tag) === tag && c.name !== tag)) out.set(tag, c.name);
  }
  return out;
}

/** Version imprimée d'après le numéro : 0 normale (et hors série « 301 »), 1 illustration alternative (« 030a »), 2 signée (« 301* »). */
export const printRank = (code = '') => (/\*/.test(code) ? 2 : /\d[a-z](\/|$)/i.test(code) ? 1 : 0);

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

/** Fiches Cardmarket par extension : n° extension → nom normalisé → n° produits (dans l'ordre de création). */
export function indexProducts(products) {
  const out = new Map();
  for (const p of [...products].sort((a, b) => a.idProduct - b.idProduct)) {
    if (!out.has(p.idExpansion)) out.set(p.idExpansion, new Map());
    const m = out.get(p.idExpansion);
    const k = norm(p.name);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(p.idProduct);
  }
  return out;
}

/** Extension Cardmarket d'une extension de la galerie : celle qui contient le plus de ses noms (pas déjà prise). */
export function pickExpansion(names, byExp, taken) {
  let best, score = 0;
  for (const [exp, m] of byExp) {
    if (taken.has(exp)) continue;
    let n = 0;
    for (const k of names) if (m.has(k)) n++;
    if (n > score) { best = exp; score = n; }
  }
  return score >= Math.min(5, names.size) ? best : undefined;
}

/**
 * Fiches Cardmarket des cartes d'une extension : pour un même nom, les fiches (par ordre de création) vont aux cartes
 * normales, puis aux illustrations alternatives, puis aux hors série et à leur version signée (« 301* ») ; les fiches
 * en trop (réimpressions, promos sans carte dans la galerie) sont ignorées. Renvoie id de carte → { id }.
 */
export function matchProducts(cards, names) {
  const groups = new Map();
  for (const c of cards) {
    const k = norm(c.full);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(c);
  }
  const out = new Map();
  for (const [k, list] of groups) {
    const ids = names?.get(k);
    if (!ids?.length) continue;
    list.sort((a, b) => printRank(a.number) - printRank(b.number) || Number(a.localId) - Number(b.localId) || a.number.localeCompare(b.number));
    list.forEach((c, i) => { if (ids[i]) out.set(c.id, { id: ids[i] }); });
  }
  return out;
}

/** Les communes et peu communes existent en normale et en foil ; les autres raretés seulement en foil. */
export function variantsFor(rarityId, product) {
  if (!product) return undefined;
  const v = rarityId === 'common' || rarityId === 'uncommon'
    ? [{ k: 'normal', id: product.id }, { k: 'foil', id: product.id }]
    : [{ k: 'foil', id: product.id }];
  return v;
}

/** Guide des prix Riftbound : champs « -foil » → « -holo » (nom utilisé par le calcul des prix des variantes). */
export function foilAsHolo(x) {
  const out = { ...x };
  for (const [k, v] of Object.entries(x)) if (k.endsWith('-foil') && out[k.replace(/-foil$/, '-holo')] === undefined) out[k.replace(/-foil$/, '-holo')] = v;
  return out;
}

const clean = (s) => String(s ?? '').replace(/\s*\([^)]*\)\s*$/, '').trim();

async function gallery(locale) {
  const html = await getText(`https://riftbound.leagueoflegends.com/${locale}/card-gallery/`);
  const data = html && nextData(html);
  const cards = data && findKey(data, 'cards');
  const sets = data && findKey(data, 'sets');
  return cards?.items?.length && sets?.items?.length ? { cards: cards.items, sets: sets.items } : null;
}

export async function buildRiftbound() {
  const galleries = {};
  for (const [lang, locale] of Object.entries(LOCALES)) {
    galleries[lang] = await gallery(locale);
    if (!galleries[lang]) console.warn(`Riftbound ${lang} : galerie illisible`);
  }
  const en = galleries.en;
  if (!en) return;

  // Noms par langue : extensions et cartes (nom complet), quand ils diffèrent de l'anglais.
  const setNames = new Map();
  const cardNames = new Map();
  const champs = {};
  for (const [lang, g] of Object.entries(galleries)) {
    if (!g) continue;
    champs[lang] = championNames(g.cards);
    for (const s of g.sets) setNames.set(s.id, { ...(setNames.get(s.id) ?? {}), [lang]: clean(s.name) });
    for (const c of g.cards) cardNames.set(c.id, { ...(cardNames.get(c.id) ?? {}), [lang]: fullName(c, champs[lang]) });
  }

  // Fiches Cardmarket (communes à toutes les langues) : par extension, puis par nom et ordre d'impression.
  const [products, guide] = await Promise.all([getJson(CM_PRODUCTS).catch(() => null), getJson(CM_PRICES).catch(() => null)]);
  const byExp = indexProducts(products?.products ?? []);
  const prices = { prices: new Map((guide?.priceGuides ?? []).map((x) => [x.idProduct, foilAsHolo(x)])) };
  if (!byExp.size) console.warn('Riftbound : fiches Cardmarket indisponibles');
  const bySetEn = new Map();
  for (const c of en.cards) {
    const setId = c.set?.value?.id;
    if (!setId) continue;
    if (!bySetEn.has(setId)) bySetEn.set(setId, []);
    bySetEn.get(setId).push({ id: c.id, full: fullName(c, champs.en), number: c.publicCode ?? '', localId: String(c.collectorNumber ?? '') });
  }
  const productOf = new Map();
  const taken = new Set();
  for (const [setId, cards] of [...bySetEn].sort((a, b) => b[1].length - a[1].length)) {
    const exp = pickExpansion(new Set(cards.map((c) => norm(c.full))), byExp, taken);
    if (!exp) { console.warn(`Riftbound : pas d'extension Cardmarket pour ${setId}`); continue; }
    taken.add(exp);
    for (const [id, p] of matchProducts(cards, byExp.get(exp))) productOf.set(id, p);
  }

  // Logos Scrydex (communs aux langues), sinon logos créés (tools/logos/make-deck-logos.cjs).
  const enSets = en.sets.map((s) => ({ id: s.id }));
  const logos = await saveLogos(enSets, 'riftbound', (x) => scrydexLogo(x.id.toUpperCase(), 'riftbound'));
  const rank = (id) => { const i = RELEASE_ORDER.indexOf(id); return i < 0 ? -1 : i; };

  for (const [lang, source] of Object.entries(CARD_LANGS)) {
    const g = galleries[source];
    if (!g) continue;
    const bySet = new Map(g.sets.map((s) => [s.id, []]));
    let priced = 0;
    for (const c of g.cards) {
      const setId = c.set?.value?.id;
      if (!setId) continue;
      if (!bySet.has(setId)) bySet.set(setId, []);
      const names = cardNames.get(c.id) ?? {};
      const name = fullName(c, champs[source]);
      const other = Object.fromEntries(Object.entries(names).filter(([l, n]) => l !== 'en' && l !== lang && n !== name && n !== names.en));
      const types = [...(c.cardType?.superType ?? []), ...(c.cardType?.type ?? [])];
      bySet.get(setId).push({
        id: c.id,
        localId: String(c.collectorNumber ?? ''),
        number: c.publicCode ?? `${setId}-${c.collectorNumber}`,
        name,
        ...(names.en && names.en !== name ? { nameEn: names.en } : {}),
        image: smallImage(c.cardImage?.url),
        // Raretés, types et domaines : identifiants anglais (traduits par l'app).
        rarity: c.rarity?.value?.id,
        attrs: attrsOf(c),
        facets: {
          domain: (c.domain?.values ?? []).map((d) => d.id),
          type: types.map((t) => t.id),
        },
        ...(Object.keys(other).length ? { n: other } : {}),
        ...(() => { const v = variantsFor(c.rarity?.value?.id, productOf.get(c.id)); return v ? { v } : {}; })(),
      });
    }
    const setList = g.sets
      .map((s) => {
        const logo = logos.get(s.id) ?? ownLogo(`riftbound-${lang}`, s.id) ?? ownLogo('riftbound-en', s.id);
        return {
          id: s.id, code: s.id, name: clean(s.name), names: setNames.get(s.id), count: bySet.get(s.id)?.length ?? 0,
          ...(RELEASES[s.id] ? { releaseDate: RELEASES[s.id] } : {}), ...(logo ? { logo } : {}),
        };
      })
      .filter((s) => s.count > 0)
      .sort((a, b) => rank(a.id) - rank(b.id));
    for (const [id, list] of bySet) {
      if (!list.length) continue;
      list.sort((a, b) => Number(a.localId) - Number(b.localId) || printRank(a.number) - printRank(b.number) || a.number.localeCompare(b.number));
      priced += applyCardmarketPrices(list, prices);
      writeJson(`cards/riftbound-${lang}/${id}.json`, list);
    }
    writeJson(`sets/riftbound-${lang}.json`, { built: new Date().toISOString(), blocs: [{ id: 'riftbound', name: 'Riftbound', sets: setList }] });
    console.log(`Riftbound ${lang} : ${g.cards.length} cartes, ${setList.length} extensions, ${priced} avec prix Cardmarket, logos ${logos.size}/${setList.length}`);
  }
}
