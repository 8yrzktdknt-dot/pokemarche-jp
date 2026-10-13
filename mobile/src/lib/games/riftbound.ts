import { getJson } from '../http.ts';
import { nameScore } from '../scan/parse.ts';
import { applyFilters, distinct, sortCards } from '../search.ts';
import type { Card, CardLang, FilterOptions, GameProvider, ScanHint, SearchFilters } from '../types.ts';

/**
 * Riftbound (League of Legends TCG) via Riftcodex (https://riftcodex.com), sans clé.
 * Les prix viennent des liens Cardmarket / TCGplayer / CardTrader / eBay.
 */
const API = 'https://api.riftcodex.com';
const DAY = 24 * 3600 * 1000;
const PAGE_SIZE = 100;

interface RiftCard {
  id: string;
  name: string;
  riftbound_id?: string;
  collector_number?: number | string;
  public_code?: string;
  set?: { set_id?: string; label?: string };
  media?: { image_url?: string };
  classification?: { rarity?: string; type?: string; domain?: string[] | string };
}

interface Page { items?: RiftCard[]; data?: RiftCard[] }

function toCard(c: RiftCard, lang: CardLang): Card {
  const setCode = c.set?.set_id?.toUpperCase();
  const num = c.collector_number != null ? String(c.collector_number).padStart(3, '0') : '';
  return {
    game: 'riftbound',
    id: c.id,
    lang,
    name: c.name,
    number: c.public_code ?? (setCode ? `${setCode}-${num}` : num),
    setId: setCode,
    setName: c.set?.label,
    rarity: c.classification?.rarity,
    imageSmall: c.media?.image_url,
    imageLarge: c.media?.image_url,
    prices: [],
    facets: {
      domain: ([] as string[]).concat(c.classification?.domain ?? []),
      type: c.classification?.type ? [c.classification.type] : [],
    },
  };
}

const items = (p: Page | RiftCard[] | null) => (Array.isArray(p) ? p : p?.items ?? p?.data ?? []);

async function getCard(id: string, lang: CardLang): Promise<Card | null> {
  const c = await getJson<RiftCard>(`${API}/cards/${encodeURIComponent(id)}`);
  return c ? toCard(c, lang) : null;
}

/** Catalogue complet (quelques centaines de cartes), page par page, en cache une journée. */
async function catalogue(lang: CardLang): Promise<Card[]> {
  const all: RiftCard[] = [];
  for (let page = 1; page <= 40; page++) {
    const batch = items(await getJson<Page>(`${API}/cards?page=${page}&size=${PAGE_SIZE}`, DAY));
    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return all.map((c) => toCard(c, lang));
}

async function filterOptions(lang: CardLang): Promise<FilterOptions> {
  const cards = await catalogue(lang);
  const setName = new Map<string, string>();
  for (const c of cards) if (c.setId && !setName.has(c.setId)) setName.set(c.setId, c.setName ?? c.setId);
  return {
    sets: [...setName].map(([id, name]) => ({ id, name: `${id} · ${name}` })),
    facets: [
      { key: 'rarity', label: 'Rareté', values: distinct(cards.map((c) => c.rarity)) },
      { key: 'domain', label: 'Domaine', values: distinct(cards.flatMap((c) => c.facets?.domain ?? [])) },
      { key: 'type', label: 'Type', values: distinct(cards.flatMap((c) => c.facets?.type ?? [])) },
    ],
    sorts: ['relevance', 'name', 'number'],
  };
}

async function search(f: SearchFilters, lang: CardLang): Promise<Card[]> {
  return sortCards(applyFilters(await catalogue(lang), f), f.sort, f.text);
}

async function resolveScan(hint: ScanHint, lang: CardLang): Promise<Card[]> {
  if (!hint.setCode || !hint.localId) return [];
  const page = await getJson<Page>(
    `${API}/cards?set_id=${hint.setCode.toLowerCase()}&collector_number=${Number(hint.localId.replace(/\D/g, ''))}`,
  ).catch(() => null);
  const prefix = `${hint.setCode}-${hint.localId}`.toLowerCase();
  return items(page)
    .map((c) => toCard(c, lang))
    .filter((c) => c.number.toLowerCase().startsWith(prefix.replace(/[a-z*]$/, '')))
    .sort((a, b) => nameScore(b.name, hint.text) - nameScore(a.name, hint.text));
}

export const riftbound: GameProvider = {
  id: 'riftbound',
  label: 'Riftbound',
  langs: ['en', 'fr', 'zh-cn'],
  search,
  filterOptions,
  getCard,
  resolveScan,
};
