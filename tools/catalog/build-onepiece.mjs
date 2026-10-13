// One Piece Card Game : listes officielles (anglais et japonais) + prix TCGplayer d'OPTCG API pour l'anglais.
import { getJson, getText, pool, sleep, unescapeHtml, writeJson } from './lib.mjs';

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
    cards.push({
      id,
      number: spans[0] ?? id.replace(/_.*$/, ''),
      rarity: spans[1],
      category: spans[2],
      name: unescapeHtml(name),
      image: img ? new URL(img.replace(/\?.*$/, ''), `${site}/cardlist/`).href : undefined,
      colors: (color ?? '').split('/').map((c) => c.trim()).filter(Boolean),
    });
  }
  return cards;
}

const setId = (code) => code.replace('-', '');

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
    writeJson(`sets/onepiece-${lang}.json`, { built: new Date().toISOString(), blocs: [...blocs, other].filter((b) => b.sets.length) });
    console.log(`One Piece ${lang} : ${series.length} extensions, ${total} cartes`);
  }
}
