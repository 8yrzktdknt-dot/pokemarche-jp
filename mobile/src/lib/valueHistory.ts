/**
 * Historique de la valeur de la collection : un relevé par jour (le dernier de la journée l'emporte), gardé sur
 * l'appareil, pour tracer son évolution sur le tableau de bord. Chaque relevé garde sa devise : changer de devise
 * repart d'une nouvelle courbe plutôt que de mélanger euros et dollars.
 */
export interface ValuePoint {
  /** Jour (« 2026-10-15 », heure locale). */
  d: string;
  v: number;
  c: string;
}

export const MAX_POINTS = 400;

/** Jour local d'un instant. */
export function dayKey(t: number): string {
  const x = new Date(t);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

/** Ajoute le relevé du jour (remplace celui du même jour et de même devise). */
export function record(history: ValuePoint[], p: ValuePoint): ValuePoint[] {
  const next = history.filter((x) => !(x.d === p.d && x.c === p.c));
  next.push(p);
  next.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
  return next.slice(-MAX_POINTS);
}

/** Relevés d'une devise, les `n` derniers. */
export function series(history: ValuePoint[], currency: string, n = 30): ValuePoint[] {
  return history.filter((x) => x.c === currency).slice(-n);
}

/**
 * Variation de la valeur : depuis le relevé d'il y a `days` jours (ou le plus récent avant), sinon depuis le premier.
 * `week` : la référence a bien `days` jours. null tant qu'il n'y a qu'un jour de relevés.
 */
export function change(history: ValuePoint[], currency: string, today: string, days = 7): { delta: number; pct?: number; since: string; week: boolean } | null {
  const pts = history.filter((x) => x.c === currency);
  if (pts.length < 2) return null;
  const last = pts[pts.length - 1];
  const limit = dayKey(new Date(`${today}T12:00:00`).getTime() - days * 86400000);
  const ref = [...pts].reverse().find((x) => x.d <= limit) ?? pts[0];
  if (ref === last) return null;
  const delta = last.v - ref.v;
  return { delta, pct: ref.v ? (delta / ref.v) * 100 : undefined, since: ref.d, week: ref.d <= limit };
}
