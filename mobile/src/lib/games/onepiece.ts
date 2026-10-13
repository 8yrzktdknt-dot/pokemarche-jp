import { getJson } from '../http.ts';
import { nameScore } from '../scan/parse.ts';
import { applyFilters, distinct, sortCards } from '../search.ts';
import type { Card, CardLang, FilterOptions, GameProvider, Price, ScanHint, SearchFilters } from '../types.ts';

/**
 * One Piece Card Game via OPTCG API (https://optcgapi.com), sans clé, données anglaises
 * avec prix TCGplayer. Le code carte (OP05-119) est identique dans toutes les langues ;
 * seules les images officielles changent selon la langue.
 */
const API = 'https://optcgapi.com/api';
const DAY = 24 * 3600 * 1000;

interface OptcgCard {
  card_name: string;
  card_set_id: string;
  card_image_id?: string;
  card_image?: string;
  set_name?: string;
  set_id?: string;
  rarity?: string;
  card_color?: string;
  card_type?: string;
  market_price?: number | string | null;
  inventory_price?: number | string | null;
}

const OFFICIAL_IMG: Partial<Record<CardLang, string>> = {
  ja: 'https://www.onepiece-cardgame.com/images/cardlist/card',
  en: 'https://en.onepiece-cardgame.com/images/cardlist/card',
};

function endpointFor(code: string): string {
  if (code.startsWith('ST')) return `${API}/decks/card/${code}/`;
  if (code.startsWith('P-')) return `${API}/promos/card/${code}/`;
  return `${API}/sets/card/${code}/`;
}

function toCard(c: OptcgCard, lang: CardLang): Card {
  const prices: Price[] = [];
  const market = Number(c.market_price);
  if (market > 0) prices.push({ source: 'tcgplayer', label: 'Market', value: market, currency: 'USD' });
  const imageId = c.card_image_id ?? c.card_set_id;
  const official = OFFICIAL_IMG[lang];
  const image = official ? `${official}/${imageId}.png` : c.card_image;
  return {
    game: 'onepiece',
    id: imageId,
    lang,
    name: c.card_name,
    number: c.card_set_id,
    setId: c.card_set_id.split('-')[0],
    setName: c.set_name,
    rarity: c.rarity,
    imageSmall: image,
    imageLarge: image,
    prices,
    facets: {
      color: (c.card_color ?? '').split(/[\s/]+/).filter(Boolean),
      category: c.card_type ? [c.card_type] : [],
    },
  };
}

async function byCode(code: string, lang: CardLang): Promise<Card[]> {
  const list = await getJson<OptcgCard[]>(endpointFor(code)).catch(() => null);
  return (list ?? []).map((c) => toCard(c, lang));
}

async function getCard(id: string, lang: CardLang): Promise<Card | null> {
  // L'id peut être une variante parallèle (« OP05-119_p1 »).
  const code = id.replace(/_.*$/, '');
  const cards = await byCode(code, lang);
  return cards.find((c) => c.id === id) ?? cards[0] ?? null;
}

/** Catalogue complet (boosters + decks de démarrage), gardé en cache une journée : filtres et tris se font localement. */
async function catalogue(lang: CardLang): Promise<Card[]> {
  const lists = await Promise.all(
    [`${API}/allSetCards/`, `${API}/allSTCards/`].map((u) => getJson<OptcgCard[]>(u, DAY).catch(() => null)),
  );
  return lists.flatMap((l) => l ?? []).map((c) => toCard(c, lang));
}

async function filterOptions(lang: CardLang): Promise<FilterOptions> {
  const cards = await catalogue(lang);
  const setName = new Map<string, string>();
  for (const c of cards) if (c.setId && !setName.has(c.setId)) setName.set(c.setId, c.setName ?? c.setId);
  return {
    sets: [...setName].map(([id, name]) => ({ id, name: `${id} · ${name}` })).sort((a, b) => b.id.localeCompare(a.id)),
    facets: [
      { key: 'rarity', label: 'Rareté', values: distinct(cards.map((c) => c.rarity)) },
      { key: 'color', label: 'Couleur', values: distinct(cards.flatMap((c) => c.facets?.color ?? [])) },
      { key: 'category', label: 'Catégorie', values: distinct(cards.flatMap((c) => c.facets?.category ?? [])) },
    ],
    sorts: ['relevance', 'name', 'number', 'price-desc', 'price-asc'],
  };
}

async function search(f: SearchFilters, lang: CardLang): Promise<Card[]> {
  const code = f.text.trim().toUpperCase();
  if (/^((OP|ST|EB|PRB)\d{2}|P)-\d{3}$/.test(code)) return byCode(code, lang);
  return sortCards(applyFilters(await catalogue(lang), f), f.sort, f.text);
}

async function resolveScan(hint: ScanHint, lang: CardLang): Promise<Card[]> {
  const cards = await byCode(hint.code, lang);
  return cards.sort((a, b) => nameScore(b.name, hint.text) - nameScore(a.name, hint.text));
}

export const onepiece: GameProvider = {
  id: 'onepiece',
  label: 'One Piece',
  langs: ['en', 'ja', 'fr', 'zh-cn', 'ko'],
  search,
  filterOptions,
  getCard,
  resolveScan,
};
