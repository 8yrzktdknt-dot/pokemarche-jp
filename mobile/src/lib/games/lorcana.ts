import { staticBlocs, staticFilterOptions, staticGetCard, staticSearch, staticSetCards, staticSetCardsAsApp, staticToCard, toBlocs } from '../catalog/static';
import { nameScore } from '../scan/parse.ts';
import type { Card, CardLang, GameProvider, ScanHint, SearchFilters } from '../types.ts';

/**
 * Disney Lorcana : catalogue publié avec l'app (tools/catalog/build-lorcana.mjs, données LorcanaJSON et visuels
 * officiels Ravensburger), en anglais, français, allemand et italien.
 */
async function resolveScan(hint: ScanHint, lang: CardLang): Promise<Card[]> {
  if (!hint.setCode || !hint.localId) return [];
  const cards = await staticSetCards('lorcana', lang, hint.setCode);
  const n = Number(hint.localId);
  return (cards ?? [])
    .filter((c) => Number(c.localId) === n)
    .map((c) => staticToCard('lorcana', lang, c, { id: hint.setCode! }))
    .sort((a, b) => nameScore(b.name, hint.text) - nameScore(a.name, hint.text));
}

export const lorcana: GameProvider = {
  id: 'lorcana',
  label: 'Lorcana',
  langs: ['en', 'fr', 'de', 'it'],
  blocs: async (lang: CardLang) => toBlocs((await staticBlocs('lorcana', lang)) ?? []),
  setCards: async (setId: string, lang: CardLang) => (await staticSetCardsAsApp('lorcana', lang, setId)) ?? { set: null, cards: [] },
  search: async (f: SearchFilters, lang: CardLang) => (await staticSearch('lorcana', lang, f)) ?? [],
  filterOptions: async (lang: CardLang) => (await staticFilterOptions('lorcana', lang, ['ink', 'type'])) ?? { blocs: [], sets: [], facets: [], sorts: ['relevance', 'name', 'number'] },
  getCard: (id: string, lang: CardLang) => staticGetCard('lorcana', lang, id),
  resolveScan,
};
