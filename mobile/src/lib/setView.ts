import type { Card } from './types.ts';
import { withVariant } from './variants.ts';

/**
 * Cartes affichées dans une extension : recherche, variantes empilées (une case par carte) ou séparées
 * (une case par variante), tri croissant ou décroissant, état (toutes, possédées, non possédées).
 */
export type SetSort = 'number' | 'name' | 'illustrator' | 'price' | 'quantity';
export type SetState = 'all' | 'owned' | 'missing';
export interface SetViewOptions {
  query: string;
  split: boolean;
  sort: SetSort;
  desc: boolean;
  state: SetState;
}
export interface SetTile {
  /** Carte, dans sa variante quand les variantes sont séparées. */
  card: Card;
  key: string;
  /** Exemplaires possédés (toutes variantes confondues quand elles sont empilées). */
  quantity: number;
  /** Variante affichée sous l'aperçu (variantes séparées uniquement), déduite de la rareté si la carte n'en a pas. */
  variantKey?: string;
}

/** Variante d'une carte sans liste de variantes : normale pour les communes et peu communes, holo sinon. */
export function baseVariant(rarity?: string): string {
  return !rarity || /^(c|u|common|uncommon|commune|peu commune|comune|non comune|común|poco común|comum|incomum|häufig|nicht so häufig)$/i.test(rarity.trim())
    ? 'normal'
    : 'holo';
}

export const DEFAULT_SET_VIEW: SetViewOptions = { query: '', split: false, sort: 'number', desc: false, state: 'all' };

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

export function setView(
  cards: Card[],
  o: SetViewOptions,
  quantityOf: (card: Card) => number,
  nameOf: (card: Card) => string,
): SetTile[] {
  const q = norm(o.query.trim());
  const found = q
    ? cards.filter((c) => [nameOf(c), c.name, c.nameEn, c.nameFr, c.number].some((x) => x && norm(x).includes(q)))
    : cards;
  const tiles: (SetTile & { index: number })[] = [];
  found.forEach((c, index) => {
    const variants = c.variants?.length ? c.variants : undefined;
    if (o.split && variants) {
      for (const v of variants) {
        const card = withVariant(c, v.key);
        tiles.push({ card, key: `${c.id}#${v.key}`, quantity: quantityOf(card), index, variantKey: v.key });
      }
    } else if (o.split) {
      tiles.push({ card: c, key: c.id, quantity: quantityOf(c), index, variantKey: baseVariant(c.rarity) });
    } else {
      const card = variants ? withVariant(c) : c;
      const quantity = variants ? variants.reduce((n, v) => n + quantityOf(withVariant(c, v.key)), 0) : quantityOf(c);
      tiles.push({ card, key: c.id, quantity, index });
    }
  });
  const shown = o.state === 'all' ? tiles : tiles.filter((t) => (o.state === 'owned') === t.quantity > 0);
  const illustrator = (c: Card) => c.attributes?.find((a) => a.key === 'illustrator')?.value ?? '';
  const price = (c: Card) => c.prices[0]?.value;
  const cmp = (a: SetTile & { index: number }, b: SetTile & { index: number }): number => {
    switch (o.sort) {
      case 'name': return nameOf(a.card).localeCompare(nameOf(b.card));
      case 'illustrator': return illustrator(a.card).localeCompare(illustrator(b.card));
      case 'quantity': return a.quantity - b.quantity;
      case 'price': return (price(a.card) ?? -1) - (price(b.card) ?? -1);
      default: return 0;
    }
  };
  // Ordre de l'extension (numéros) pour départager ; le sens choisi s'applique au critère principal.
  const sorted = [...shown].sort((a, b) => (o.desc ? -cmp(a, b) : cmp(a, b)) || (o.sort === 'number' && o.desc ? b.index - a.index : a.index - b.index));
  // Cartes sans prix toujours à la fin, quel que soit le sens.
  if (o.sort === 'price') sorted.sort((a, b) => Number(price(a.card) === undefined) - Number(price(b.card) === undefined));
  return sorted.map(({ index: _i, ...t }) => t);
}
