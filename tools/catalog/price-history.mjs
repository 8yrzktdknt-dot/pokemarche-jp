// Historique des prix : un relevé par jour du prix affiché dans l'app pour chaque carte et chaque variante
// (Cardmarket : moyenne des ventes sur 7 jours, sinon 30 jours, toutes les ventes, offres ; autres jeux : prix du
// catalogue). Sert à la variation depuis la veille et au graphique de la fiche carte.
// Fichiers : history/<jeu>-<langue>/<extension>.json = { from: '2026-10-14', p: { 'me05-001': [0.02, 0.03, null…],
// 'me05-001#reverse': […] }, w: { from: '2026-07-01', p: { … } } } — un prix par jour à partir de `from` pendant les
// 90 derniers jours (null quand il manque), puis un prix par semaine (`w`, dernier prix connu de la semaine qui commence
// à `w.from` + 7 × n jours) jusqu'à 3 ans : l'historique reste assez léger pour le site (environ 140 Mo au plus).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TIERS } from './variants.mjs';
import { CATALOG, writeJson } from './lib.mjs';

/** Jours gardés en tout (3 ans), dont les derniers jour par jour, les plus anciens semaine par semaine. */
export const MAX_DAYS = 3 * 365 + 1;
export const DAILY_DAYS = 90;
const MAX_WEEKS = Math.ceil((MAX_DAYS - DAILY_DAYS) / 7);

const DAY = 86400000;
const dayIndex = (from, day) => Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);
const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

/** Prix affichés d'une carte du catalogue : carte de base (son id) et variantes suivantes (« id#reverse »). */
export function displayedPrices(c) {
  const out = {};
  const tier = TIERS.find((t) => c.cm?.[t]);
  const base = tier ? c.cm[tier] : c.v?.[0]?.p ?? c.price?.value;
  if (base) out[c.id] = base;
  for (const v of (c.v ?? []).slice(1)) if (v.p) out[`${c.id}#${v.k}`] = v.p;
  return out;
}

/** Ajoute (ou remplace) les prix du jour dans un historique ; garde les jours récents, puis une semaine sur sept. */
export function addDay(history, day, prices) {
  let from = history?.from ?? day;
  const p = { ...(history?.p ?? {}) };
  if (dayIndex(from, day) < 0) {
    // Jour plus ancien que le début (reconstitution) : décaler tout l'historique.
    const shift = -dayIndex(from, day);
    for (const k of Object.keys(p)) p[k] = [...Array(shift).fill(null), ...p[k]];
    from = day;
  }
  const i = dayIndex(from, day);
  for (const [k, v] of Object.entries(prices)) {
    const a = p[k] ?? [];
    while (a.length <= i) a.push(null);
    a[i] = v;
    p[k] = a;
  }
  // Toutes les séries à la même longueur (jour sans prix : null).
  const len = Math.max(i + 1, ...Object.values(p).map((a) => a.length));
  for (const k of Object.keys(p)) while (p[k].length < len) p[k].push(null);
  // Jours au-delà des DAILY_DAYS derniers : versés dans l'historique par semaine.
  let w = history?.w ? { from: history.w.from, p: { ...history.w.p } } : null;
  const cut = Math.max(0, len - DAILY_DAYS);
  if (cut) {
    w ??= { from, p: {} };
    for (let j = 0; j < cut; j++) {
      const slot = Math.floor(dayIndex(w.from, addDays(from, j)) / 7);
      if (slot < 0) continue;
      for (const [k, a] of Object.entries(p)) {
        if (a[j] === null || a[j] === undefined) continue;
        const wa = (w.p[k] = [...(w.p[k] ?? [])]);
        while (wa.length <= slot) wa.push(null);
        wa[slot] = a[j];
      }
    }
    for (const k of Object.keys(p)) p[k] = p[k].slice(cut);
    from = addDays(from, cut);
  }
  if (w) {
    const wlen = Math.max(0, ...Object.values(w.p).map((a) => a.length));
    for (const k of Object.keys(w.p)) while (w.p[k].length < wlen) w.p[k].push(null);
    const wcut = Math.max(0, wlen - MAX_WEEKS);
    if (wcut) {
      for (const k of Object.keys(w.p)) w.p[k] = w.p[k].slice(wcut);
      w.from = addDays(w.from, wcut * 7);
    }
    for (const k of Object.keys(w.p)) if (w.p[k].every((x) => x === null)) delete w.p[k];
    if (!Object.keys(w.p).length) w = null;
  }
  for (const k of Object.keys(p)) if (p[k].every((x) => x === null)) delete p[k];
  return w ? { from, p, w } : { from, p };
}

/** Relevé du jour pour tout le catalogue (toutes les extensions de tous les jeux). */
export function buildPriceHistory(day = new Date().toISOString().slice(0, 10), catalog = CATALOG) {
  let files = 0;
  const cardsDir = join(catalog, 'cards');
  for (const dir of readdirSync(cardsDir)) {
    for (const f of readdirSync(join(cardsDir, dir)).filter((x) => x.endsWith('.json'))) {
      const cards = JSON.parse(readFileSync(join(cardsDir, dir, f), 'utf8'));
      const prices = Object.assign({}, ...cards.map(displayedPrices));
      if (!Object.keys(prices).length) continue;
      const rel = `history/${dir}/${f}`;
      const old = existsSync(join(catalog, rel)) ? JSON.parse(readFileSync(join(catalog, rel), 'utf8')) : null;
      writeJson(rel, addDay(old, day, prices));
      files++;
    }
  }
  console.log(`Historique des prix (${day}) : ${files} extensions`);
  return files;
}
