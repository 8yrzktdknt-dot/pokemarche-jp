import type { Card, SearchFilters, SortKey } from './types.ts';

export const SORT_LABEL: Record<SortKey, string> = {
  relevance: 'Pertinence',
  name: 'Nom (A→Z)',
  number: 'Numéro',
  'price-desc': 'Prix décroissant',
  'price-asc': 'Prix croissant',
};

export const normalize = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9぀-鿿가-힯/ -]/g, '');

/** La carte correspond-elle au texte tapé (nom, ou numéro « 136 », « OP05-119 ») ? */
export function matchesText(card: Card, text: string): boolean {
  const q = normalize(text).trim();
  if (!q) return true;
  const name = normalize(card.name);
  const number = normalize(card.number);
  return q.split(/\s+/).every((w) => name.includes(w) || number.startsWith(w) || number.includes(w));
}

/**
 * Filtre local. Une facette absente de la carte n'élimine pas celle-ci :
 * pour Pokémon, ce filtrage est déjà fait par l'API et les résultats n'ont pas le détail.
 */
export function applyFilters(cards: Card[], f: SearchFilters): Card[] {
  return cards.filter((c) => {
    if (!matchesText(c, f.text)) return false;
    if (f.setId && c.setId && c.setId !== f.setId) return false;
    for (const [key, value] of Object.entries(f.facets)) {
      if (!value) continue;
      if (key === 'rarity' && c.rarity !== undefined) {
        if (c.rarity !== value) return false;
        continue;
      }
      const vals = c.facets?.[key];
      if (vals && !vals.includes(value)) return false;
    }
    return true;
  });
}

const numKey = (n: string) => {
  const m = n.match(/(\d+)(?!.*\d)/);
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
};
const price = (c: Card) => c.prices[0]?.value;

export function sortCards(cards: Card[], sort: SortKey, text = ''): Card[] {
  const out = [...cards];
  switch (sort) {
    case 'relevance': {
      // Les noms qui commencent par le texte tapé d'abord, sinon ordre d'origine.
      const q = normalize(text).trim();
      if (!q) return out;
      const starts = (c: Card) => (normalize(c.name).startsWith(q) ? 0 : 1);
      return out.sort((a, b) => starts(a) - starts(b));
    }
    case 'name':
      return out.sort((a, b) => a.name.localeCompare(b.name));
    case 'number':
      return out.sort((a, b) => (a.setId ?? '').localeCompare(b.setId ?? '') || numKey(a.number) - numKey(b.number));
    case 'price-desc':
    case 'price-asc': {
      const dir = sort === 'price-desc' ? -1 : 1;
      // Cartes sans prix toujours en fin de liste.
      return out.sort((a, b) => {
        const pa = price(a);
        const pb = price(b);
        if (pa === undefined) return pb === undefined ? 0 : 1;
        if (pb === undefined) return -1;
        return (pa - pb) * dir;
      });
    }
    default:
      return out;
  }
}

/** Valeurs distinctes triées d'une liste, sans vides. */
export function distinct(values: (string | undefined | null)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v && !!v.trim()))].sort((a, b) => a.localeCompare(b));
}

export const hasCriteria = (f: SearchFilters) =>
  f.text.trim().length >= 2 || !!f.setId || Object.values(f.facets).some(Boolean);
