import type { Card } from './types.ts';

/**
 * État des cartes (échelle Cardmarket) et cartes gradées. La cote Cardmarket correspond à une carte en bon état
 * (Near Mint) : les autres états en sont une estimation. Aucune source ne publie la cote des cartes gradées :
 * l'utilisateur indique alors sa propre valeur.
 */
export const CONDITIONS = ['MT', 'NM', 'EX', 'GD', 'LP', 'PL', 'PO'] as const;
export type Condition = (typeof CONDITIONS)[number];
export const CONDITION_NAMES: Record<Condition, string> = {
  MT: 'Mint', NM: 'Near Mint', EX: 'Excellent', GD: 'Good', LP: 'Light Played', PL: 'Played', PO: 'Poor',
};
/** Part de la cote retenue selon l'état (estimation). */
export const CONDITION_FACTOR: Record<Condition, number> = { MT: 1, NM: 1, EX: 0.85, GD: 0.7, LP: 0.55, PL: 0.4, PO: 0.25 };
export const GRADERS = ['PSA', 'BGS', 'CGC', 'PCA', 'SGC', 'ACE'] as const;

export interface Graded { by: string; grade: string }

/** Détails d'un exemplaire : état, gradation, valeur saisie (cartes gradées) et prix payé, avec leurs devises. */
export interface CopyDetails {
  condition?: Condition;
  graded?: Graded;
  /** Valeur estimée à l'unité saisie par l'utilisateur (cartes gradées) et sa devise. */
  value?: number;
  valueCurrency?: string;
  paid?: number;
  paidCurrency?: string;
}
export const COPY_FIELDS = ['condition', 'graded', 'value', 'valueCurrency', 'paid', 'paidCurrency'] as const;

/**
 * Ligne de la collection : ses détails valent pour tous ses exemplaires, sauf quand `copies` donne ceux de chaque
 * exemplaire (un Near Mint et un Light Played…).
 */
export interface ValuedEntry extends CopyDetails {
  card: Card;
  quantity: number;
  copies?: CopyDetails[];
}

const pick = (d: CopyDetails): CopyDetails => {
  const out: CopyDetails = {};
  for (const k of COPY_FIELDS) if (d[k] !== undefined) (out as Record<string, unknown>)[k] = d[k];
  return out;
};

/** Détails de chaque exemplaire (autant que la quantité). */
export function copiesOf(e: ValuedEntry): CopyDetails[] {
  const base = e.copies ? undefined : pick(e);
  return Array.from({ length: Math.max(0, e.quantity) }, (_, i) => base ?? pick(e.copies?.[i] ?? {}));
}

/**
 * Détails par exemplaire remis en forme : coupés à la quantité, et ramenés sur la ligne quand tous les exemplaires
 * sont identiques (pas de `copies` inutile).
 */
export function normalizeCopies<E extends ValuedEntry>(e: E): E {
  if (!e.copies) return e;
  const copies = copiesOf(e);
  const same = copies.every((c) => JSON.stringify(c) === JSON.stringify(copies[0]));
  const out = { ...e } as E;
  for (const k of COPY_FIELDS) delete out[k];
  delete out.copies;
  if (same) return Object.assign(out, copies[0] ?? {});
  return Object.assign(out, { copies });
}

/** Modifie un exemplaire (`index`) ou tous (`index` absent). */
export function patchCopies<E extends ValuedEntry>(e: E, patch: CopyDetails, index?: number): E {
  if (index === undefined && !e.copies) return normalizeCopies({ ...e, ...patch });
  const copies = copiesOf(e).map((c, i) => (index === undefined || i === index ? { ...c, ...patch } : c));
  return normalizeCopies({ ...e, copies });
}

const factorOf = (c: CopyDetails) => (c.graded || !c.condition ? 1 : CONDITION_FACTOR[c.condition] ?? 1);

/** Coefficient appliqué à la cote (moyenne des exemplaires) : 1 pour une carte gradée ou sans état indiqué. */
export function conditionFactor(e: ValuedEntry): number {
  const copies = copiesOf(e);
  return copies.length ? copies.reduce((a, c) => a + factorOf(c), 0) / copies.length : 1;
}

/** Valeur d'un exemplaire (devise choisie) : valeur saisie, sinon cote × coefficient d'état ; undefined sans cote. */
export function copyValue(card: Card, c: CopyDetails, toCurrency: (v: number, from: string) => number): number | undefined {
  if (c.value !== undefined && c.valueCurrency) return toCurrency(c.value, c.valueCurrency);
  const p = card.prices[0];
  return p ? toCurrency(p.value, p.currency) * factorOf(c) : undefined;
}

/** Valeur unitaire retenue (moyenne des exemplaires, devise choisie) ; undefined sans cote. */
export function unitValue(e: ValuedEntry, toCurrency: (v: number, from: string) => number): number | undefined {
  const vs = copiesOf(e).map((c) => copyValue(e.card, c, toCurrency)).filter((v): v is number => v !== undefined);
  if (!vs.length) return undefined;
  return vs.reduce((a, v) => a + v, 0) / vs.length;
}

/** « PSA 10 », « NM ». */
export const copyLabel = (c: CopyDetails) => (c.graded ? `${c.graded.by} ${c.graded.grade}` : c.condition ?? undefined);

/** État de la ligne : « NM », ou celui de chaque exemplaire quand ils diffèrent (« NM ×2, LP »). */
export function conditionLabel(e: ValuedEntry): string | undefined {
  const copies = copiesOf(e);
  if (!e.copies) return copyLabel(pick(e));
  const groups = new Map<string, number>();
  for (const c of copies) { const l = copyLabel(c); if (l) groups.set(l, (groups.get(l) ?? 0) + 1); }
  if (!groups.size) return undefined;
  return [...groups].map(([l, n]) => (n > 1 ? `${l} ×${n}` : l)).join(', ');
}
