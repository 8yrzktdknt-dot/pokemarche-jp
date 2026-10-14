// One Piece Card Game : listes officielles (anglais et japonais) + prix TCGplayer d'OPTCG API pour l'anglais.
import { getJson, getText, pool, sleep, unescapeHtml, writeJson } from './lib.mjs';
import { ownLogo, saveLogos, scrydexLogo } from './logos.mjs';

const SITES = { en: 'https://en.onepiece-cardgame.com', ja: 'https://www.onepiece-cardgame.com' };
const BLOCS = [
  { id: 'op', test: /BOOSTER PACK|ブースターパック/i, name: { en: 'Booster Packs', ja: 'Booster Packs' } },
  { id: 'eb', test: /EXTRA BOOSTER|エクストラブースター/i, name: { en: 'Extra Boosters', ja: 'Extra Boosters' } },
  { id: 'prb', test: /PREMIUM BOOSTER|プレミアムブースター/i, name: { en: 'Premium Boosters', ja: 'Premium Boosters' } },
  { id: 'st', test: /DECK|デッキ/i, name: { en: 'Starter Decks', ja: 'Starter Decks' } },
];

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

const TYPES = /^(BOOSTER PACK|EXTRA BOOSTER|PREMIUM BOOSTER|STARTER DECK EX|STARTER DECK|ULTRA DECK|ブースターパック|エクストラブースター|プレミアムブースター|スタートデッキEX|スタートデッキ|アルティメットデッキ)\s*/i;
const titleCase = (s) => (s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase()) : s);

/** « BOOSTER PACK -AWAKENING OF THE NEW ERA- [OP-05] » → « Awakening Of The New Era » ; « ブースターパック 新時代の主役【OP-05】 » → « 新時代の主役 ». */
export function setName(label) {
  const core = label.replace(/\s*[\[【][^\]】]*[\]】]\s*$/, '').replace(TYPES, '').trim().replace(/^-\s*|\s*-$/g, '').trim();
  return titleCase(core);
}

export async function buildOnePiece() {
  // Prix TCGplayer (anglais) par identifiant d'image.
  const priceLists = await Promise.all(['allSetCards', 'allSTCards'].map((p) => getJson(`https://optcgapi.com/api/${p}/`)));
  const prices = new Map();
  for (const c of priceLists.flat().filter(Boolean)) {
    const v = Number(c.market_price);
    if (v > 0) prices.set(c.card_image_id ?? c.card_set_id, v);
  }

  for (const [lang, site] of Object.entries(SITES)) {
    const index = await getText(`${site}/cardlist/`);
    const series = index ? parseSeries(index) : [];
    if (!series.length) { console.warn(`One Piece ${lang} : liste des extensions illisible`); continue; }
    const blocs = BLOCS.map((b) => ({ id: b.id, name: b.name[lang], sets: [] }));
    const other = { id: 'other', name: 'Other', sets: [] };
    let total = 0;
    await pool(series, 3, async (s) => {
      await sleep(200);
      const html = await getText(`${site}/cardlist/?series=${s.value}`);
      if (!html) return;
      const cards = parseCards(html, site).map((c) => ({
        id: c.id,
        localId: c.number.split('-').pop(),
        number: c.number,
        name: c.name,
        image: c.image,
        rarity: c.rarity,
        price: lang === 'en' && prices.has(c.id) ? { value: prices.get(c.id), currency: 'USD', source: 'tcgplayer' } : undefined,
        facets: { color: c.colors, category: c.category ? [c.category] : [] },
        attrs: Object.keys(c.attrs ?? {}).length ? c.attrs : undefined,
      }));
      if (!cards.length) return;
      total += cards.length;
      const id = setId(s.code);
      writeJson(`cards/onepiece-${lang}/${id}.json`, cards);
      const name = setName(s.label);
      const bloc = blocs.find((b) => BLOCS.find((x) => x.id === b.id).test.test(s.label)) ?? other;
      bloc.sets.push({ id, code: s.code, name: name || s.label, count: cards.length, order: Number(s.value) });
    });
    for (const b of [...blocs, other]) b.sets.sort((a, b2) => b2.order - a.order);
    // Logos : Scrydex (nom de l'extension stylisé), puis pages produits officielles (logo, sinon bannière).
    const all = [...blocs, other].flatMap((b) => b.sets);
    const logos = await saveLogos(all, `onepiece-${lang}`, async (x) => {
      const candidates = [await productPageLogo(SITES[lang], x.id), ...logoCandidates(SITES[lang], x.id)].filter(Boolean);
      let official;
      for (const url of candidates) {
        const r = await fetch(url, { method: 'HEAD' }).catch(() => null);
        if (r?.ok) { official = url; break; }
      }
      const banner = official && /mv_01\.jpg/.test(official);
      // Japonais : logo Scrydex japonais, logo officiel (en japonais), puis logo anglais ; la bannière en dernier.
      return lang === 'en'
        ? [scrydexLogo(x.id, 'onepiece'), official]
        : [scrydexLogo(`${x.id}_ja`, 'onepiece'), banner ? null : official, scrydexLogo(x.id, 'onepiece'), official];
    });
    for (const x of all) x.logo = logos.get(x.id) ?? ownLogo(`onepiece-${lang}`, x.id);
    console.log(`One Piece ${lang} : logos ${logos.size}/${all.length}`);
    writeJson(`sets/onepiece-${lang}.json`, { built: new Date().toISOString(), blocs: [...blocs, other].filter((b) => b.sets.length) });
    console.log(`One Piece ${lang} : ${series.length} extensions, ${total} cartes`);
  }
}
