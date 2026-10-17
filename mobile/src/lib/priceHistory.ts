import type { Card, CardLang, GameId } from './types.ts';

/**
 * Historique des prix publié avec le catalogue (tools/catalog/price-history.mjs) : un relevé par jour du prix
 * affiché (Cardmarket : moyenne des ventes sur 7 jours, sinon la période suivante), par carte et par variante.
 * Fichier par extension : { from: '2026-10-14', p: { 'me05-001': [0.02, 0.03, null…], 'me05-001#reverse': […] } } :
 * un prix par jour pendant 90 jours, puis un par semaine (`w`) jusqu'à 3 ans.
 */
export interface History {
  from: string;
  p: Record<string, (number | null)[]>;
  /** Avant `from` : un prix par semaine (semaine qui commence à `w.from` + 7 × n jours), jusqu'à 3 ans en tout. */
  w?: { from: string; p: Record<string, (number | null)[]> };
}

export interface Point {
  /** Jour (« 2026-10-15 »). */
  d: string;
  v: number;
}

/** Cartes allemandes, espagnoles, italiennes et portugaises : prix du catalogue anglais (mêmes numéros). */
const INTL = new Set<CardLang>(['de', 'es', 'it', 'pt']);
const PUBLISHED: Record<GameId, CardLang[]> = {
  pokemon: ['en', 'fr', 'ja', 'zh-tw', 'zh-cn'],
  onepiece: ['en', 'ja', 'fr'],
  riftbound: ['en', 'zh-cn', 'zh-tw', 'ko'],
};

/** Dossier de l'historique d'un jeu et d'une langue (« pokemon-en ») ; undefined s'il n'y en a pas. */
export function historyDir(game: GameId, lang: CardLang): string | undefined {
  const l = game === 'pokemon' && INTL.has(lang) ? 'en' : lang;
  return PUBLISHED[game]?.includes(l) ? `${game}-${l}` : undefined;
}

/** Clé d'une carte dans l'historique : son id, suivi de la variante quand ce n'est pas la variante de base. */
export function historyKey(c: Card): string {
  const v = c.variant && c.variant !== c.variants?.[0]?.key ? c.variant : undefined;
  return v ? `${c.id}#${v}` : c.id;
}

const DAY = 86400000;
export const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

/** Prix connus d'une carte, jour par jour (jours sans prix ignorés). */
export function pointsOf(h: History | null | undefined, c: Card): Point[] {
  if (!h) return [];
  const k = historyKey(c);
  const out: Point[] = [];
  // Relevés par semaine (les plus anciens), puis jour par jour.
  h.w?.p[k]?.forEach((v, i) => { if (v !== null && v !== undefined) out.push({ d: addDays(h.w!.from, i * 7), v }); });
  h.p[k]?.forEach((v, i) => { if (v !== null && v !== undefined) out.push({ d: addDays(h.from, i), v }); });
  return out;
}

export interface Change {
  /** Écart avec le relevé précédent (devise du prix), et en pourcentage. */
  delta: number;
  pct: number;
  /** Jour du relevé précédent. */
  since: string;
}

/** Variation depuis la veille : dernier relevé comparé au précédent. null sans deux relevés. */
export function dayChange(points: Point[]): Change | null {
  if (points.length < 2) return null;
  const last = points[points.length - 1], prev = points[points.length - 2];
  const delta = Math.round((last.v - prev.v) * 100) / 100;
  return { delta, pct: prev.v ? (delta / prev.v) * 100 : 0, since: prev.d };
}

/**
 * Valeur de la collection jour par jour (devise choisie), avec ses cartes actuelles : chaque jour, chaque carte au
 * dernier prix connu à cette date (avant son premier relevé : son premier prix, pour comparer à composition égale).
 */
export function collectionSeries(
  items: { card: Card; quantity: number; points: Point[]; factor?: number }[],
  toCurrency: (v: number, from: string) => number,
): Point[] {
  const days = [...new Set(items.flatMap((x) => x.points.map((p) => p.d)))].sort();
  if (!days.length) return [];
  return days.map((d) => {
    let v = 0;
    for (const x of items) {
      if (!x.points.length) continue;
      const cur = x.card.prices[0]?.currency ?? 'EUR';
      let p = x.points[0].v;
      for (const pt of x.points) { if (pt.d > d) break; p = pt.v; }
      v += toCurrency(p, cur) * x.quantity * (x.factor ?? 1);
    }
    return { d, v };
  });
}
