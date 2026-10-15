import { useEffect, useMemo, useState } from 'react';
import { catalogBase } from './catalog/static';
import { getJson } from './http';
import { historyDir, pointsOf, type History, type Point } from './priceHistory';
import type { Card } from './types';

const HOUR = 3600 * 1000;
const loaded = new Map<string, Promise<History | null>>();

/** Historique d'une extension (chargé une fois, gardé une heure en mémoire). */
function loadHistory(path: string): Promise<History | null> {
  let p = loaded.get(path);
  if (!p) {
    p = getJson<History>(`${catalogBase()}/history/${path}.json`, HOUR).catch(() => null);
    loaded.set(path, p);
    setTimeout(() => loaded.delete(path), HOUR);
  }
  return p;
}

const pathOf = (c: Card) => {
  const dir = historyDir(c.game, c.lang);
  return dir && c.setId ? `${dir}/${c.setId}` : undefined;
};

/** Relevés de prix des cartes données : `points(carte)` (vide tant que l'historique de son extension n'est pas là). */
export function usePriceHistory(cards: Card[]): (c: Card) => Point[] {
  const paths = useMemo(() => [...new Set(cards.map(pathOf).filter((x): x is string => !!x))].sort().join('|'), [cards]);
  const [histories, setHistories] = useState<Map<string, History | null>>(new Map());
  useEffect(() => {
    let alive = true;
    const list = paths ? paths.split('|') : [];
    Promise.all(list.map(async (p) => [p, await loadHistory(p)] as const)).then((r) => alive && setHistories(new Map(r)));
    return () => { alive = false; };
  }, [paths]);
  return useMemo(() => (c: Card) => { const p = pathOf(c); return p ? pointsOf(histories.get(p), c) : []; }, [histories]);
}
