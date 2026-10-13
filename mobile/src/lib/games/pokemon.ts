import { getJson } from '../http.ts';
import { nameScore } from '../scan/parse.ts';
import { applyFilters, sortCards } from '../search.ts';
import type { Card, CardLang, FilterOptions, GameProvider, Price, ScanHint, SearchFilters } from '../types.ts';

/**
 * Pokémon via l'API publique TCGdex (https://tcgdex.dev), sans clé.
 * Couvre l'international (EN/FR/DE/ES/IT/PT) et l'Asie (JA/KO/ZH/ID/TH),
 * avec des prix Cardmarket (EUR) et TCGplayer (USD) quand ils existent.
 */
const API = 'https://api.tcgdex.net/v2';
const DAY = 24 * 3600 * 1000;
const enc = encodeURIComponent;

const TCGDEX_LANG: Record<CardLang, string> = {
  en: 'en', fr: 'fr', de: 'de', es: 'es', it: 'it', pt: 'pt',
  ja: 'ja', ko: 'ko', 'zh-tw': 'zh-tw', 'zh-cn': 'zh-cn', id: 'id', th: 'th',
};

interface TcgdexBrief { id: string; localId: string; name: string; image?: string }
interface TcgdexSetBrief { id: string; name: string; cardCount: { total: number; official: number } }
interface TcgdexCard extends TcgdexBrief {
  rarity?: string;
  set: { id: string; name: string; cardCount?: { official: number } };
  pricing?: {
    cardmarket?: { trend?: number; avg?: number; low?: number; unit?: string };
    tcgplayer?: Record<string, { marketPrice?: number } | string | undefined>;
  };
}

function prices(c: TcgdexCard): Price[] {
  const out: Price[] = [];
  const cm = c.pricing?.cardmarket;
  if (cm?.trend) out.push({ source: 'cardmarket', label: 'Tendance', value: cm.trend, currency: 'EUR' });
  if (cm?.low) out.push({ source: 'cardmarket', label: 'À partir de', value: cm.low, currency: 'EUR' });
  const tp = c.pricing?.tcgplayer;
  if (tp) {
    for (const [variant, v] of Object.entries(tp)) {
      if (v && typeof v === 'object' && v.marketPrice) {
        out.push({ source: 'tcgplayer', label: `Market (${variant})`, value: v.marketPrice, currency: 'USD' });
      }
    }
  }
  return out;
}

function fromBrief(b: TcgdexBrief, lang: CardLang): Card {
  return {
    game: 'pokemon', id: b.id, lang, name: b.name, number: b.localId,
    imageSmall: b.image ? `${b.image}/low.webp` : undefined,
    imageLarge: b.image ? `${b.image}/high.webp` : undefined,
    prices: [],
  };
}

function fromFull(c: TcgdexCard, lang: CardLang): Card {
  const official = c.set.cardCount?.official;
  return {
    ...fromBrief(c, lang),
    number: official ? `${c.localId}/${String(official).padStart(3, '0')}` : c.localId,
    setId: c.set.id,
    setName: c.set.name,
    rarity: c.rarity,
    prices: prices(c),
  };
}

async function getCard(id: string, lang: CardLang): Promise<Card | null> {
  const c = await getJson<TcgdexCard>(`${API}/${TCGDEX_LANG[lang]}/cards/${encodeURIComponent(id)}`);
  return c ? fromFull(c, lang) : null;
}

const setsOf = async (l: string) => (await getJson<TcgdexSetBrief[]>(`${API}/${l}/sets`, DAY)) ?? [];

async function filterOptions(lang: CardLang): Promise<FilterOptions> {
  const l = TCGDEX_LANG[lang];
  const [sets, rarities, types] = await Promise.all([
    setsOf(l),
    getJson<string[]>(`${API}/${l}/rarities`, DAY).catch(() => null),
    getJson<string[]>(`${API}/${l}/types`, DAY).catch(() => null),
  ]);
  return {
    // Extensions les plus récentes en premier.
    sets: [...sets].reverse().map((x) => ({ id: x.id, name: x.name })),
    facets: [
      { key: 'rarity', label: 'Rareté', values: rarities ?? [] },
      { key: 'type', label: 'Type', values: types ?? [] },
    ],
    sorts: ['relevance', 'name', 'number'],
  };
}

/**
 * Le nom, la rareté et le type sont filtrés par l'API TCGdex ; l'extension se déduit de l'id
 * (« sv08-132 » → « sv08 »). Une extension seule liste toutes ses cartes.
 */
async function search(f: SearchFilters, lang: CardLang): Promise<Card[]> {
  const l = TCGDEX_LANG[lang];
  const text = f.text.trim();
  const { rarity, type } = f.facets;
  const sets = await setsOf(l);
  const setName = new Map(sets.map((x) => [x.id, x.name]));

  let briefs: TcgdexBrief[];
  if (!text && !rarity && !type && f.setId) {
    briefs = (await getJson<{ cards: TcgdexBrief[] }>(`${API}/${l}/sets/${enc(f.setId)}`))?.cards ?? [];
  } else {
    const params = ['pagination:itemsPerPage=250'];
    if (/^\d{1,3}(\/\d+)?$/.test(text)) params.push(`localId=eq:${enc(text.split('/')[0])}`);
    else if (text) params.push(`name=${enc(text)}`);
    if (rarity) params.push(`rarity=eq:${enc(rarity)}`);
    if (type) params.push(`types=${enc(type)}`);
    briefs = (await getJson<TcgdexBrief[]>(`${API}/${l}/cards?${params.join('&')}`)) ?? [];
  }
  const cards = briefs.map((b) => {
    const setId = b.id.slice(0, b.id.lastIndexOf('-'));
    return { ...fromBrief(b, lang), setId, setName: setName.get(setId) };
  });
  return sortCards(applyFilters(cards, { ...f, text: '' }), f.sort, text);
}

async function resolveScan(hint: ScanHint, lang: CardLang): Promise<Card[]> {
  if (!hint.localId) return [];
  const l = TCGDEX_LANG[lang];
  const sets = await setsOf(l);

  // 1) Code d'extension imprimé (« SV4a » sur les cartes japonaises = id TCGdex).
  let candidates = hint.setCode
    ? sets.filter((s) => s.id.toLowerCase() === hint.setCode!.toLowerCase())
    : [];
  // 2) Sinon : extensions dont le nombre officiel de cartes correspond au total imprimé, les plus récentes d'abord.
  if (!candidates.length && hint.setTotal) {
    candidates = sets.filter((s) => s.cardCount.official === hint.setTotal).reverse().slice(0, 8);
  }

  const ids = [...new Set([hint.localId, hint.localId.replace(/^0+(?=\d)/, '')])];
  const found = await Promise.all(
    candidates.flatMap((s) =>
      ids.map((id) =>
        getJson<TcgdexCard>(`${API}/${l}/sets/${encodeURIComponent(s.id)}/${encodeURIComponent(id)}`).catch(() => null),
      ),
    ),
  );
  const unique = new Map<string, Card>();
  for (const c of found) if (c) unique.set(c.id, fromFull(c, lang));
  return [...unique.values()].sort((a, b) => nameScore(b.name, hint.text) - nameScore(a.name, hint.text));
}

export const pokemon: GameProvider = {
  id: 'pokemon',
  label: 'Pokémon',
  langs: ['fr', 'en', 'ja', 'de', 'es', 'it', 'pt', 'ko', 'zh-tw', 'zh-cn', 'id', 'th'],
  search,
  filterOptions,
  getCard,
  resolveScan,
};
