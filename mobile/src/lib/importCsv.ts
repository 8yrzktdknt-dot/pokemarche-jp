import type { Card, CardLang, GameId, SetInfo } from './types.ts';
import { CONDITIONS, GRADERS, type Condition, type CopyDetails } from './condition.ts';
import { normalize } from './search.ts';
import { withVariant } from './variants.ts';

/**
 * Import d'une collection exportée d'une autre appli ou d'un site (Cardmarket, Collectr, Dragon Shield, TCGplayer,
 * tableur…) en CSV. Les colonnes sont reconnues par leur nom (plusieurs langues) ; chaque ligne est retrouvée dans
 * le catalogue par son extension (nom ou code) et son numéro, sinon par son nom.
 */

export type Field = 'cmId' | 'name' | 'set' | 'setCode' | 'number' | 'quantity' | 'lang' | 'condition' | 'printing' | 'paid' | 'currency' | 'grade' | 'game';

/** Noms de colonnes reconnus (comparés sans accents, espaces ni ponctuation). */
const HEADERS: Record<Field, string[]> = {
  cmId: ['idproduct', 'productid', 'cardmarketid', 'cmid', 'cardmarketproductid'],
  name: ['name', 'cardname', 'productname', 'card', 'nom', 'carte', 'nomdelacarte', 'nombre', 'nome', 'kartenname', 'naam'],
  set: ['set', 'setname', 'expansion', 'expansionname', 'extension', 'edition', 'serie', 'series', 'erweiterung', 'expansao', 'espansione', 'coleccion'],
  setCode: ['setcode', 'setid', 'expansioncode', 'code', 'codeextension', 'abbreviation'],
  number: ['number', 'cardnumber', 'collectornumber', 'no', 'nr', 'num', 'numero', 'numerodecarte', 'nummer', 'cardno'],
  quantity: ['quantity', 'qty', 'count', 'amount', 'quantite', 'cantidad', 'quantita', 'quantidade', 'anzahl', 'aantal', 'havequantity', 'totalquantity', 'copies'],
  lang: ['language', 'lang', 'langue', 'idioma', 'lingua', 'sprache', 'taal', 'cardlanguage'],
  condition: ['condition', 'cardcondition', 'etat', 'zustand', 'estado', 'condizione', 'conditie'],
  printing: ['printing', 'variance', 'finish', 'foil', 'isfoil', 'variant', 'version', 'reverse', 'isreverseholo', 'holo', 'variante', 'finition'],
  paid: ['pricepaid', 'purchaseprice', 'averagecostpaid', 'pricebought', 'buyprice', 'cost', 'costpaid', 'prixachat', 'prixdachat', 'prixpaye', 'paid', 'acquisitionprice', 'kaufpreis', 'preciodecompra', 'prezzodiacquisto', 'precodecompra'],
  currency: ['currency', 'devise', 'waehrung', 'wahrung', 'moneda', 'valuta', 'moeda'],
  grade: ['grade', 'graded', 'grading', 'gradedby', 'note'],
  game: ['game', 'category', 'jeu', 'tcg', 'productline', 'spiel', 'juego', 'gioco'],
};

const key = (s: string) => normalize(s).replace(/[^a-z0-9]/g, '');

/** Lecture d'un CSV (séparateur virgule, point-virgule ou tabulation ; champs entre guillemets). */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '');
  const first = clean.split(/\r?\n/, 1)[0] ?? '';
  const sep = ['\t', ';', ','].map((c) => [c, first.split(c).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && !cell) quoted = true;
    else if (ch === sep) { row.push(cell.trim()); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      row.push(cell.trim()); cell = '';
      if (row.some((c) => c)) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell.trim());
  if (row.some((c) => c)) rows.push(row);
  return rows;
}

/** Colonne de chaque champ reconnu (première colonne qui correspond). */
export function mapHeaders(header: string[]): Partial<Record<Field, number>> {
  const out: Partial<Record<Field, number>> = {};
  header.forEach((h, i) => {
    const k = key(h);
    for (const f of Object.keys(HEADERS) as Field[]) if (out[f] === undefined && HEADERS[f].includes(k)) { out[f] = i; return; }
  });
  return out;
}

export interface ImportRow {
  /** Ligne du fichier (à partir de 2 : la 1re est l'en-tête). */
  line: number;
  /** N° de produit Cardmarket (export Cardmarket). */
  cmId?: number;
  name?: string;
  set?: string;
  setCode?: string;
  number?: string;
  quantity: number;
  lang?: CardLang;
  game?: GameId;
  variant?: 'reverse' | 'holo' | 'foil' | '1st-edition';
  details: CopyDetails;
}

const LANGS: [RegExp, CardLang][] = [
  [/^(fr|fre|fra|french|francais)$/, 'fr'],
  [/^(en|eng|english|anglais|us|uk|international)$/, 'en'],
  [/^(ja|jp|jpn|japanese|japonais|japanisch|giapponese|japones)$/, 'ja'],
  [/^(zhtw|tw|traditionalchinese|chinesetraditional|chinoistraditionnel|chinoistrad|chinest|zhhant|cht)$/, 'zh-tw'],
  [/^(zhcn|cn|zh|simplifiedchinese|chinesesimplified|chinoissimplifie|chinoissimpl|chineses|zhhans|chs|chinese)$/, 'zh-cn'],
  [/^(ko|kr|kor|korean|coreen)$/, 'ko'],
  [/^(de|ger|deu|german|allemand|deutsch)$/, 'de'],
  [/^(es|spa|spanish|espagnol|espanol)$/, 'es'],
  [/^(it|ita|italian|italien|italiano)$/, 'it'],
  [/^(pt|por|portuguese|portugais|portugues)$/, 'pt'],
];
export const parseLang = (s?: string): CardLang | undefined => {
  const k = key(s ?? '');
  return k ? LANGS.find(([re]) => re.test(k))?.[1] : undefined;
};

const CONDITION_WORDS: [RegExp, Condition][] = [
  [/^(mt|m|mint|neuf)$/, 'MT'],
  [/^(nm|nearmint|nmm|quasineuf|nahezuneuwertig|casinuevo)$/, 'NM'],
  [/^(ex|excellent|exc|tresbon)$/, 'EX'],
  [/^(gd|good|g|bon|lightlyplayedgood)$/, 'GD'],
  [/^(lp|lightplayed|lightlyplayed|sp|slightlyplayed|legerementjouee|leicht)$/, 'LP'],
  [/^(pl|played|p|mp|moderatelyplayed|hp|heavilyplayed|jouee|bespielt)$/, 'PL'],
  [/^(po|poor|damaged|dmg|abimee|mauvais)$/, 'PO'],
];
export const parseCondition = (s?: string): Condition | undefined => {
  const k = key(s ?? '');
  return k ? (CONDITIONS as readonly string[]).includes(k.toUpperCase()) ? (k.toUpperCase() as Condition) : CONDITION_WORDS.find(([re]) => re.test(k))?.[1] : undefined;
};

/** « PSA 10 », « BGS 9.5 », « CGC Pristine 10 » → gradation ; undefined sinon (« Ungraded », vide). */
export function parseGrade(s?: string): CopyDetails['graded'] {
  const m = (s ?? '').toUpperCase().match(/\b(PSA|BGS|CGC|PCA|SGC|ACE|BECKETT)\b[^0-9]*(\d+(?:[.,]5)?)/);
  if (!m) return undefined;
  const by = m[1] === 'BECKETT' ? 'BGS' : m[1];
  return (GRADERS as readonly string[]).includes(by) ? { by, grade: m[2].replace(',', '.') } : undefined;
}

export function parseVariant(s?: string): ImportRow['variant'] {
  const k = key(s ?? '');
  if (!k || /^(no|non|false|0|normal|normale|nonfoil|regular|standard|nein)$/.test(k)) return undefined;
  if (k.includes('reverse') || k === 'rh') return 'reverse';
  if (k.includes('1st') || k.includes('firstedition') || k.includes('1reedition')) return '1st-edition';
  if (k.includes('holo')) return 'holo';
  if (/^(yes|oui|true|1|foil|x|ja|si)$/.test(k) || k.includes('foil')) return 'foil';
  return undefined;
}

export function parseGame(s?: string): GameId | undefined {
  const k = key(s ?? '');
  if (!k) return undefined;
  if (k.includes('pokemon') || k.includes('pokmon')) return 'pokemon';
  if (k.includes('onepiece')) return 'onepiece';
  if (k.includes('riftbound') || k.includes('leagueoflegends')) return 'riftbound';
  return undefined;
}

const parseAmount = (s?: string): number | undefined => {
  const t = (s ?? '').replace(/[^\d.,-]/g, '');
  if (!t) return undefined;
  // « 1.234,56 » / « 1,234.56 » / « 12,5 »
  const dec = t.lastIndexOf(',') > t.lastIndexOf('.') ? ',' : '.';
  const v = Number(t.replace(dec === ',' ? /\./g : /,/g, '').replace(',', '.'));
  return Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : undefined;
};

const CURRENCY: Record<string, string> = { '€': 'EUR', eur: 'EUR', '$': 'USD', usd: 'USD', '¥': 'JPY', jpy: 'JPY', yen: 'JPY' };
const currencyOf = (...texts: (string | undefined)[]) => {
  for (const t of texts) {
    const s = (t ?? '').trim().toLowerCase();
    if (!s) continue;
    if (CURRENCY[s]) return CURRENCY[s];
    for (const [sym, c] of Object.entries(CURRENCY)) if (s.includes(sym)) return c;
  }
  return undefined;
};

/** Lignes du fichier, ou null si l'en-tête ne permet pas de retrouver les cartes (ni nom, ni extension + numéro). */
export function rowsFromCsv(text: string, defaultCurrency: string): ImportRow[] | null {
  const table = parseCsv(text);
  if (table.length < 2) return null;
  const cols = mapHeaders(table[0]);
  if (cols.name === undefined && cols.number === undefined) return null;
  const get = (r: string[], f: Field) => (cols[f] === undefined ? undefined : r[cols[f]!]?.trim() || undefined);
  return table.slice(1).map((r, i) => {
    const q = Number((get(r, 'quantity') ?? '1').replace(',', '.'));
    const paid = parseAmount(get(r, 'paid'));
    const graded = parseGrade(get(r, 'grade')) ?? parseGrade(get(r, 'condition'));
    const condition = graded ? undefined : parseCondition(get(r, 'condition'));
    const details: CopyDetails = {};
    if (condition) details.condition = condition;
    if (graded) details.graded = graded;
    if (paid !== undefined) { details.paid = paid; details.paidCurrency = currencyOf(get(r, 'currency'), get(r, 'paid')) ?? defaultCurrency; }
    return {
      line: i + 2,
      cmId: Number(get(r, 'cmId')) || undefined,
      name: get(r, 'name'),
      set: get(r, 'set'),
      setCode: get(r, 'setCode'),
      number: get(r, 'number'),
      quantity: Number.isFinite(q) && q >= 1 ? Math.floor(q) : q === 0 ? 0 : 1,
      lang: parseLang(get(r, 'lang')),
      game: parseGame(get(r, 'game')),
      variant: parseVariant(get(r, 'printing')),
      details,
    };
  }).filter((r) => r.quantity > 0 && (r.name || r.number));
}

/** Numéro comparable : « 004/102 » → « 4 », « OP05-119 » → « op05119 », « OGN-042/298 » → « ogn42 ». */
export function numberKey(n?: string): string {
  const head = (n ?? '').split('/')[0].trim().toLowerCase();
  return head.split(/[^a-z0-9]+/).map((g) => g.replace(/^([a-z]*)0+(?=\d)/, '$1')).join('');
}

/** Extension désignée par un nom ou un code : code exact, nom exact (toutes langues), puis nom contenu. */
export function findSet(sets: SetInfo[], name?: string, code?: string): SetInfo | undefined {
  const c = key(code ?? '');
  if (c) {
    const hit = sets.find((s) => key(s.code) === c || key(s.id) === c);
    if (hit) return hit;
  }
  const n = key(name ?? '');
  if (!n) return undefined;
  const names = (s: SetInfo) => [s.name, s.code, s.id, ...Object.values(s.names ?? {})].map(key).filter(Boolean);
  return sets.find((s) => names(s).includes(n))
    ?? sets.filter((s) => names(s).some((x) => x.length > 3 && (x.includes(n) || n.includes(x))))
      .sort((a, b) => Math.max(...names(b).map((x) => x.length)) - Math.max(...names(a).map((x) => x.length)))[0];
}

/** Fiche Cardmarket d'une carte ou d'une de ses variantes : la carte et la variante concernée. */
export function findByCardmarket(cards: Card[], id?: number): { card: Card; variant?: string } | undefined {
  if (!id) return undefined;
  for (const c of cards) {
    const v = c.variants?.find((x) => x.cardmarket === id);
    if (v) return { card: c, variant: v.key === c.variants?.[0]?.key ? undefined : v.key };
    if (c.marketIds?.cardmarket === id) return { card: c };
  }
  return undefined;
}

/** Carte d'une extension correspondant à la ligne : par numéro (et nom s'il y en a plusieurs), sinon par nom. */
export function findInSet(cards: Card[], row: Pick<ImportRow, 'number' | 'name'>): Card | undefined {
  const nk = numberKey(row.number);
  // « Pikachu (SVP 101) », « Dracaufeu [V.2] » : le nom sans ses précisions.
  const nm = key((row.name ?? '').replace(/\s*[([].*$/, ''));
  const sameName = (c: Card) => !nm || [c.name, c.nameEn, c.nameFr, ...Object.values(c.names ?? {})].some((x) => x && key(x) === nm);
  if (nk) {
    const byNumber = cards.filter((c) => numberKey(c.number) === nk || numberKey(c.id.split('-').pop()) === nk);
    return byNumber.find(sameName) ?? byNumber[0];
  }
  return nm ? cards.find(sameName) : undefined;
}

/** Variante de la carte correspondant à la colonne « finition » (Reverse, Holo, Foil…), si elle existe. */
export function variantFor(card: Card, wanted: ImportRow['variant']): string | undefined {
  const keys = (card.variants ?? []).map((v) => v.key);
  if (!wanted || !keys.length) return undefined;
  const pick = (test: (k: string) => boolean) => keys.find(test);
  switch (wanted) {
    case 'reverse': return pick((k) => k === 'reverse') ?? pick((k) => k.startsWith('reverse'));
    case '1st-edition': return pick((k) => k.includes('1st-edition'));
    case 'holo': return pick((k) => k === 'holo') ?? pick((k) => k === 'foil') ?? pick((k) => k.startsWith('reverse'));
    case 'foil': return pick((k) => k === 'foil') ?? pick((k) => k === 'holo') ?? pick((k) => k === 'reverse');
  }
}

export interface ImportDeps {
  langs(game: GameId): CardLang[];
  sets(game: GameId, lang: CardLang): Promise<SetInfo[]>;
  setCards(game: GameId, setId: string, lang: CardLang): Promise<Card[]>;
  search(game: GameId, text: string, lang: CardLang): Promise<Card[]>;
}

export interface ImportResult {
  found: { row: ImportRow; card: Card }[];
  missing: ImportRow[];
}

const GAME_ORDER: GameId[] = ['pokemon', 'onepiece', 'riftbound'];
/** Cartes allemandes, espagnoles, italiennes, portugaises : mêmes cartes que l'anglais dans le catalogue. */
const AS_ENGLISH = new Set<CardLang>(['de', 'es', 'it', 'pt']);

/** Retrouve chaque ligne dans le catalogue (jeu et langue par défaut quand la ligne ne les donne pas). */
export async function resolveImport(
  rows: ImportRow[], defaults: { game?: GameId; lang: CardLang }, deps: ImportDeps, onProgress?: (done: number) => void,
): Promise<ImportResult> {
  const memo = new Map<string, Promise<unknown>>();
  const once = <T>(k: string, f: () => Promise<T>): Promise<T> => {
    if (!memo.has(k)) memo.set(k, f().catch(() => null));
    return memo.get(k) as Promise<T>;
  };
  const langFor = (game: GameId, l?: CardLang): CardLang => {
    const langs = deps.langs(game);
    if (l && langs.includes(l)) return l;
    if (l && AS_ENGLISH.has(l) && langs.includes('en')) return 'en';
    return langs.includes(defaults.lang) ? defaults.lang : langs[0];
  };

  const one = async (row: ImportRow): Promise<Card | undefined> => {
    const games = row.game ? [row.game] : defaults.game ? [defaults.game] : GAME_ORDER;
    for (const game of games) {
      const lang = langFor(game, row.lang);
      let hit: { card: Card; variant?: string } | undefined;
      if (row.set || row.setCode) {
        const sets = (await once(`s:${game}:${lang}`, () => deps.sets(game, lang))) ?? [];
        const set = findSet(sets, row.set, row.setCode);
        if (set) {
          const cards = (await once(`c:${game}:${lang}:${set.id}`, () => deps.setCards(game, set.id, lang))) ?? [];
          hit = findByCardmarket(cards, row.cmId);
          const card = hit ? undefined : findInSet(cards, row);
          if (card) hit = { card };
        }
      }
      if (!hit && row.name && (!row.set || games.length === 1)) {
        const text = row.name.replace(/\s*[([].*$/, '');
        const cards = (await once(`q:${game}:${lang}:${key(text)}`, () => deps.search(game, text, lang))) ?? [];
        const card = findInSet(cards, row);
        if (card) hit = { card };
      }
      if (hit) {
        const v = hit.variant ?? variantFor(hit.card, row.variant);
        return withVariant(hit.card, v);
      }
    }
    return undefined;
  };

  const found: ImportResult['found'] = [], missing: ImportRow[] = [];
  let next = 0, done = 0;
  const worker = async () => {
    while (next < rows.length) {
      const row = rows[next++];
      const card = await one(row);
      if (card) found.push({ row, card }); else missing.push(row);
      onProgress?.(++done);
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  found.sort((a, b) => a.row.line - b.row.line);
  missing.sort((a, b) => a.line - b.line);
  return { found, missing };
}
