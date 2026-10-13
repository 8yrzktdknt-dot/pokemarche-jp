import { getJson } from '../http.ts';
import { nameScore } from '../scan/parse.ts';
import type { Card, CardLang, GameProvider, ScanHint } from '../types.ts';

/**
 * Riftbound (League of Legends TCG) via Riftcodex (https://riftcodex.com), sans clé.
 * Les prix viennent des liens Cardmarket / TCGplayer / CardTrader / eBay.
 */
const API = 'https://api.riftcodex.com';

interface RiftCard {
  id: string;
  name: string;
  riftbound_id?: string;
  collector_number?: number | string;
  public_code?: string;
  set?: { set_id?: string; label?: string };
  media?: { image_url?: string };
  classification?: { rarity?: string };
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
  };
}

const items = (p: Page | RiftCard[] | null) => (Array.isArray(p) ? p : p?.items ?? p?.data ?? []);

async function getCard(id: string, lang: CardLang): Promise<Card | null> {
  const c = await getJson<RiftCard>(`${API}/cards/${encodeURIComponent(id)}`);
  return c ? toCard(c, lang) : null;
}

async function search(query: string, lang: CardLang): Promise<Card[]> {
  const page = await getJson<Page>(`${API}/cards/name?fuzzy=${encodeURIComponent(query)}&size=60`)
    .catch(() => getJson<Page>(`${API}/cards?name=${encodeURIComponent(query)}&size=60`));
  return items(page).map((c) => toCard(c, lang));
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
  getCard,
  resolveScan,
};
