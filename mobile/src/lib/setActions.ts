import type { Card, GameId } from './types.ts';
import { collectionKey, variantLabel, withVariant } from './variants.ts';

/** Clé d'une extension favorite : « pokemon:fr:sv10 ». */
export const favoriteKey = (game: GameId, lang: string, setId: string) => `${game}:${lang}:${setId}`;

/** Master Set : chaque carte dans chacune de ses variantes (une carte sans variantes compte une fois). */
export function masterCards(cards: Card[]): Card[] {
  return cards.flatMap((c) => (c.variants?.length ? c.variants.map((v) => withVariant(c, v.key)) : [c]));
}

/** Cartes du Master Set absentes de la collection (`has` : clé de collection possédée). */
export function missingMaster(cards: Card[], has: (key: string) => boolean): Card[] {
  return masterCards(cards).filter((c) => !has(collectionKey(c)));
}

export interface CsvLabels {
  number: string; name: string; rarity: string; variant: string; quantity: string; price: string; currency: string;
}

/**
 * Liste de l'extension au format CSV (une ligne par carte et par variante) : numéro, nom, rareté, variante, quantité
 * possédée, prix (devise choisie). Séparateur « ; » et virgule décimale pour les langues où Excel les attend.
 */
export function setCsv(
  cards: Card[],
  opts: { lang: string; labels: CsvLabels; quantity(c: Card): number; price(c: Card): number | undefined; name(c: Card): string },
): string {
  const comma = ['fr', 'de', 'es', 'it', 'pt', 'nl', 'ru'].includes(opts.lang);
  const sep = comma ? ';' : ',';
  const cell = (v: string | number | undefined) => {
    const s = v === undefined ? '' : typeof v === 'number' ? (comma ? String(v).replace('.', ',') : String(v)) : v;
    return s.includes(sep) || /["\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const l = opts.labels;
  const head = [l.number, l.name, l.rarity, l.variant, l.quantity, `${l.price} (${l.currency})`];
  const rows = masterCards(cards).map((c) => {
    const p = opts.price(c);
    return [c.number, opts.name(c), c.rarity && c.rarity !== 'None' ? c.rarity : '', c.variant ? variantLabel(c.variant, opts.lang) : '', opts.quantity(c), p === undefined ? undefined : Math.round(p * 100) / 100];
  });
  // BOM : Excel lit l'UTF-8 (accents, japonais) correctement.
  return `﻿${[head, ...rows].map((r) => r.map(cell).join(sep)).join('\r\n')}\r\n`;
}
