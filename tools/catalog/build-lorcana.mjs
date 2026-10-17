// Disney Lorcana : cartes de LorcanaJSON (https://lorcanajson.org, données de l'appli officielle Ravensburger) en
// anglais, français, allemand et italien, visuels officiels de chaque langue, prix Cardmarket (jeu n° 19).
//  - une extension par set (1, 2… 14), par quête des Illumineurs (Q1…) et par groupe de promos (P1, P2, C1…) ;
//  - variantes : normale et foil (« None » + « Silver ») pour les raretés de base, foil seule pour les Enchantées,
//    Épiques, Iconiques… ; fiche Cardmarket de chaque carte donnée par LorcanaJSON (commune à toutes les langues) ;
//  - raretés, encres et types : identifiants anglais (traduits par l'app), noms des autres langues dans `n`.
import { getJson, writeJson } from './lib.mjs';
import { saveLogos, scrydexLogo } from './logos.mjs';
import { applyCardmarketPrices } from './variants.mjs';
import { foilAsHolo } from './build-riftbound.mjs';

export const LANGS = ['en', 'fr', 'de', 'it'];
const SOURCE = (lang) => `https://lorcanajson.org/files/current/${lang}/allCards.json`;
export const CM_PRICES = 'https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_19.json';

/** Visuel officiel réduit par le proxy d'images wsrv.nl (WebP de 360 px ; 900 px sur la fiche). */
export const smallImage = (url) => (url ? `https://wsrv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//, ''))}&w=360&output=webp` : url);

/** Identifiant stable d'une rareté (« Super Rare » → « super_rare »), depuis la carte anglaise. */
export const rarityId = (r) => String(r ?? '').trim().toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, '') || undefined;
const idOf = (s) => String(s ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

/** Extension d'une carte : groupe de promos, sinon son set (« 1 », « Q1 »). */
export const setOf = (c) => String(c.promoGrouping ?? c.setCode);

/** Numéro imprimé : « 1/204 », « 207/204 » (Enchantée), « 1/P1 » (promos : « 1 TFC • EN • 1/P1 »). */
export function printedNumber(c) {
  const parts = String(c.fullIdentifier ?? '').split('•').map((x) => x.trim()).filter(Boolean);
  return parts.find((x) => x.includes('/')) ?? String(c.number);
}

/** Variantes : normale si « None » fait partie des finitions, foil si une autre finition existe. */
export function variantsOf(c, cardmarketId) {
  const types = c.foilTypes ?? [];
  const keys = [];
  if (!types.length || types.includes('None')) keys.push('normal');
  if (types.some((t) => t !== 'None')) keys.push('foil');
  return keys.map((k) => ({ k, ...(cardmarketId ? { id: cardmarketId } : {}) }));
}

/** Attributs de la fiche : illustrateur, coût, force, volonté, éclat (« lore »), histoire (film). */
export function attrsOf(c) {
  const a = {
    illustrator: c.artistsText ?? c.artists?.join(', '),
    cost: c.cost != null ? String(c.cost) : undefined,
    strength: c.strength != null ? String(c.strength) : undefined,
    willpower: c.willpower != null ? String(c.willpower) : undefined,
    lore: c.lore != null ? String(c.lore) : undefined,
    story: c.story,
  };
  const out = Object.fromEntries(Object.entries(a).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  return Object.keys(out).length ? out : undefined;
}

/** Nom d'un groupe de promos ou d'une extension. */
const setName = (meta, id) => meta?.name ?? (/^P\d+$/.test(id) ? `Promos ${id.slice(1)}` : id);

/** Tri : sets du plus récent au plus ancien, puis quêtes et promos. */
const kindRank = (id) => (/^\d+$/.test(id) ? 0 : /^Q\d+$/.test(id) ? 1 : 2);

export async function buildLorcana() {
  const data = {};
  for (const lang of LANGS) {
    data[lang] = await getJson(SOURCE(lang)).catch(() => null);
    if (!data[lang]?.cards?.length) console.warn(`Lorcana ${lang} : LorcanaJSON indisponible`);
  }
  const en = data.en;
  if (!en?.cards?.length) return;

  // Fiche Cardmarket et données de référence par carte (identifiant LorcanaJSON commun aux langues).
  const ref = new Map(en.cards.map((c) => [c.id, c]));
  const names = new Map();
  for (const lang of LANGS) for (const c of data[lang]?.cards ?? []) names.set(c.id, { ...(names.get(c.id) ?? {}), [lang]: c.fullName ?? c.name });
  const setNames = new Map();
  for (const lang of LANGS) for (const [id, s] of Object.entries(data[lang]?.sets ?? {})) setNames.set(id, { ...(setNames.get(id) ?? {}), [lang]: s.name });

  const guide = await getJson(CM_PRICES).catch(() => null);
  const prices = { prices: new Map((guide?.priceGuides ?? []).map((x) => [x.idProduct, foilAsHolo(x)])) };
  if (!prices.prices.size) console.warn('Lorcana : guide des prix Cardmarket indisponible');

  // Logos : Scrydex quand il les a (sinon le code de l'extension est affiché).
  const allSets = [...new Set(en.cards.map(setOf))].map((id) => ({ id }));
  const logos = await saveLogos(allSets, 'lorcana', (s) => scrydexLogo(`lorcana-${s.id}`.toLowerCase(), 'lorcana')).catch(() => new Map());

  for (const lang of LANGS) {
    const src = data[lang];
    if (!src?.cards?.length) continue;
    const bySet = new Map();
    for (const c of src.cards) {
      const r = ref.get(c.id) ?? c;
      const setId = setOf(r);
      if (!bySet.has(setId)) bySet.set(setId, []);
      const n = names.get(c.id) ?? {};
      const name = c.fullName ?? c.name;
      const other = Object.fromEntries(Object.entries(n).filter(([l, v]) => l !== lang && l !== 'en' && v !== name && v !== n.en));
      const cm = r.externalLinks?.cardmarketId ?? c.externalLinks?.cardmarketId;
      const inks = [r.color, ...(r.colors ?? [])].filter(Boolean).flatMap((x) => String(x).split(/[-/]/)).map(idOf).filter(Boolean);
      bySet.get(setId).push({
        id: `${setId}-${String(c.number).padStart(3, '0')}${c.variant ? c.variant.toLowerCase() : ''}`,
        localId: String(c.number),
        number: printedNumber(c),
        name,
        ...(n.en && n.en !== name ? { nameEn: n.en } : {}),
        image: smallImage(c.images?.full ?? r.images?.full),
        rarity: rarityId(r.rarity),
        attrs: attrsOf(c),
        facets: {
          ink: [...new Set(inks)],
          type: [idOf(r.type)].filter(Boolean),
        },
        ...(Object.keys(other).length ? { n: other } : {}),
        v: variantsOf(r, cm),
      });
    }
    const sets = [...bySet.keys()].map((id) => {
      const meta = src.sets?.[id] ?? en.sets?.[id];
      const logo = logos.get(id);
      return {
        id, code: id, name: setName(meta, id), names: setNames.get(id), count: bySet.get(id).length,
        ...(meta?.releaseDate ? { releaseDate: meta.releaseDate } : {}), ...(logo ? { logo } : {}),
      };
    }).sort((a, b) => kindRank(a.id) - kindRank(b.id) || (b.releaseDate ?? '').localeCompare(a.releaseDate ?? '') || b.id.localeCompare(a.id, undefined, { numeric: true }));
    let priced = 0;
    for (const [id, list] of bySet) {
      list.sort((a, b) => Number(a.localId) - Number(b.localId) || a.id.localeCompare(b.id));
      priced += applyCardmarketPrices(list, prices);
      writeJson(`cards/lorcana-${lang}/${id}.json`, list);
    }
    const group = (pred, id, label) => ({ id, ...label, sets: sets.filter(pred) });
    const blocs = [
      group((s) => kindRank(s.id) === 0, 'sets', { name: 'Disney Lorcana' }),
      group((s) => kindRank(s.id) === 1, 'quests', { name: "Illumineer's Quest", names: { en: "Illumineer's Quest", fr: 'Quêtes des Illumineurs', de: 'Die Luminari Chroniken', it: 'Avventure degli Illuminatori' } }),
      group((s) => kindRank(s.id) === 2, 'promos', { name: 'Promos', names: { en: 'Promos', fr: 'Promos', de: 'Promos', it: 'Promo' } }),
    ].filter((b) => b.sets.length);
    writeJson(`sets/lorcana-${lang}.json`, { built: new Date().toISOString(), blocs });
    console.log(`Lorcana ${lang} : ${src.cards.length} cartes, ${sets.length} extensions, ${priced} avec prix Cardmarket, logos ${logos.size}`);
  }
}
