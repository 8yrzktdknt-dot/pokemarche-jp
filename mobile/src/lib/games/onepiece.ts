import { getJson } from '../http.ts';
import { nameScore } from '../scan/parse.ts';
import { applyFilters, distinct, sortCards } from '../search.ts';
import { staticBlocs, staticFilterOptions, staticGetCard, staticSearch, staticSetCardsAsApp, toBlocs } from '../catalog/static';
import type { Bloc, Card, CardLang, FilterOptions, GameProvider, Price, ScanHint, SearchFilters, SetInfo } from '../types.ts';

/**
 * One Piece Card Game : catalogue publié avec l'app (listes officielles anglaise, japonaise et française, variantes,
 * prix Cardmarket) ; en secours, OPTCG API (https://optcgapi.com), sans clé, données anglaises.
 * Le code carte (OP05-119) est identique dans toutes les langues ; seules les images officielles changent.
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
  // Prix affiché : Cardmarket uniquement (pas encore de source Cardmarket pour One Piece).
  const prices: Price[] = [];
  const imageId = c.card_image_id ?? c.card_set_id;
  const official = OFFICIAL_IMG[lang];
  // Le site officiel interdit l'affichage de ses images ailleurs : proxy d'images wsrv.nl.
  const raw = official ? `${official}/${imageId}.png` : c.card_image;
  const image = raw ? `https://wsrv.nl/?url=${encodeURIComponent(raw.replace(/^https?:\/\//, ''))}&w=360&output=webp` : raw;
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

const BLOC_OF: [RegExp, string, string][] = [
  [/^OP/, 'op', 'Boosters'],
  [/^EB/, 'eb', 'Extra Boosters'],
  [/^PRB/, 'prb', 'Premium Boosters'],
  [/^ST/, 'st', 'Starter Decks'],
];

/** Blocs One Piece : boosters, extra boosters, premium boosters et decks de démarrage. */
async function blocs(lang: CardLang): Promise<Bloc[]> {
  const cards = await catalogue(lang);
  const sets = new Map<string, SetInfo>();
  for (const c of cards) {
    if (!c.setId) continue;
    const s = sets.get(c.setId);
    if (s) s.count = (s.count ?? 0) + 1;
    else sets.set(c.setId, { id: c.setId, code: c.setId, name: c.setName ?? c.setId, count: 1 });
  }
  return BLOC_OF.map(([re, id, name]) => ({
    id,
    name,
    sets: [...sets.values()].filter((x) => re.test(x.id)).map((x) => ({ ...x, blocId: id })).sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true })),
  })).filter((b) => b.sets.length);
}

async function setCards(setId: string, lang: CardLang): Promise<{ set: SetInfo | null; cards: Card[] }> {
  const all = await blocs(lang);
  const set = all.flatMap((b) => b.sets).find((x) => x.id === setId) ?? null;
  const cards = (await catalogue(lang)).filter((c) => c.setId === setId);
  return { set, cards: sortCards(cards, 'number') };
}

async function filterOptions(lang: CardLang): Promise<FilterOptions> {
  const cards = await catalogue(lang);
  const setName = new Map<string, string>();
  for (const c of cards) if (c.setId && !setName.has(c.setId)) setName.set(c.setId, c.setName ?? c.setId);
  return {
    blocs: await blocs(lang),
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
  const inBloc = (c: Card) => !f.blocId || BLOC_OF.some(([re, id]) => id === f.blocId && re.test(c.setId ?? ''));
  return sortCards(applyFilters((await catalogue(lang)).filter(inBloc), f), f.sort, f.text);
}

async function resolveScan(hint: ScanHint, lang: CardLang): Promise<Card[]> {
  // Catalogue d'abord (variantes et prix Cardmarket) : la carte de ce numéro dans son extension.
  const setId = hint.code.split('-')[0];
  const fromCatalog = (await staticSetCardsAsApp('onepiece', lang, setId).catch(() => null))?.cards.filter((c) => c.number === hint.code) ?? [];
  const cards = fromCatalog.length ? fromCatalog : await byCode(hint.code, lang);
  return cards.sort((a, b) => nameScore(b.name, hint.text) - nameScore(a.name, hint.text));
}

/** Catalogue publié avec l'app d'abord (listes officielles), source en direct ensuite. */
const withStatic = {
  blocs: async (lang: CardLang) => {
    const st = await staticBlocs('onepiece', lang);
    return st ? toBlocs(st) : blocs(lang);
  },
  setCards: async (setId: string, lang: CardLang) => (await staticSetCardsAsApp('onepiece', lang, setId)) ?? setCards(setId, lang),
  search: async (f: SearchFilters, lang: CardLang) => (await staticSearch('onepiece', lang, f)) ?? search(f, lang),
  filterOptions: async (lang: CardLang) => (await staticFilterOptions('onepiece', lang, ['color', 'category'])) ?? filterOptions(lang),
  getCard: async (id: string, lang: CardLang) => (await staticGetCard('onepiece', lang, id)) ?? getCard(id, lang),
};

export const onepiece: GameProvider = {
  id: 'onepiece',
  label: 'One Piece',
  langs: ['en', 'ja', 'fr', 'zh-cn', 'ko'],
  ...withStatic,
  resolveScan,
};
