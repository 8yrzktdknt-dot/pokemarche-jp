import { getJson } from '../http.ts';
import { nameScore } from '../scan/parse.ts';
import type { Card, CardLang, GameProvider, Price, ScanHint } from '../types.ts';

/**
 * One Piece Card Game via OPTCG API (https://optcgapi.com), sans clé, données anglaises
 * avec prix TCGplayer. Le code carte (OP05-119) est identique dans toutes les langues ;
 * seules les images officielles changent selon la langue.
 */
const API = 'https://optcgapi.com/api';

interface OptcgCard {
  card_name: string;
  card_set_id: string;
  card_image_id?: string;
  card_image?: string;
  set_name?: string;
  set_id?: string;
  rarity?: string;
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
    setId: c.set_id,
    setName: c.set_name,
    rarity: c.rarity,
    imageSmall: image,
    imageLarge: image,
    prices,
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

async function search(query: string, lang: CardLang): Promise<Card[]> {
  const code = query.trim().toUpperCase();
  if (/^((OP|ST|EB|PRB)\d{2}|P)-\d{3}$/.test(code)) return byCode(code, lang);
  const list = await getJson<OptcgCard[]>(
    `${API}/sets/filtered/?card_name=${encodeURIComponent(query)}`,
  ).catch(() => null);
  return (list ?? []).slice(0, 60).map((c) => toCard(c, lang));
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
  getCard,
  resolveScan,
};
