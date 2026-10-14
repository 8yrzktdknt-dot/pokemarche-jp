import { Platform } from 'react-native';
import { getJson } from '../http';
import { cardmarketPrice } from '../prices/cardmarket';
import { distinct, normalize, sortCards } from '../search';
import type { AttributeKey, Bloc, Card, CardAttribute, CardLang, FilterOptions, GameId, Price, SearchFilters, SetInfo } from '../types';

/**
 * Catalogue publié avec le site (construit chaque semaine par GitHub Actions, dossier catalog/ du dépôt) :
 * blocs et extensions dans l'ordre de sortie, logos, noms traduits et toutes les cartes de chaque extension.
 */
const SITE = 'https://bananaintrouble.github.io/tcgmarket';

export function catalogBase(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const path = window.location.pathname;
    const i = path.indexOf('/app');
    return `${window.location.origin}${i >= 0 ? path.slice(0, i) : ''}/catalog`;
  }
  return `${SITE}/catalog`;
}

const DAY = 24 * 3600 * 1000;

/** Logos publiés avec le catalogue (« logos/pokemon-ja/M6.png ») : chemin relatif au catalogue. */
export const assetUrl = (u?: string) => (u && !/^https?:/.test(u) ? `${catalogBase()}/${u}` : u);

/**
 * Grande image d'une carte selon sa source : Limitless (_SM → _LG), TCGdex (low → high),
 * pokemontcg.io (.png → _hires.png) ; les images officielles japonaises n'ont qu'une taille.
 */
export function largeImage(u?: string): string | undefined {
  if (!u) return u;
  if (/_SM\.(png|jpg|webp)$/.test(u)) return u.replace(/_SM\.(png|jpg|webp)$/, '_LG.$1');
  if (u.endsWith('/low.webp')) return u.replace(/\/low\.webp$/, '/high.webp');
  if (/images\.pokemontcg\.io\/.+\/[^/_]+\.png$/.test(u)) return u.replace(/\.png$/, '_hires.png');
  return u;
}

export interface StaticSet {
  id: string;
  code: string;
  name: string;
  nameFr?: string;
  /** Nom dans la langue des cartes (ex. japonais), affiché en second. */
  nameLocal?: string;
  releaseDate?: string;
  logo?: string;
  /** Petit symbole d'extension (pastille du code). */
  symbol?: string;
  count?: number;
}

export interface StaticBloc {
  id: string;
  name: string;
  nameFr?: string;
  sets: StaticSet[];
}

export interface StaticCard {
  id: string;
  localId: string;
  number: string;
  name: string;
  nameEn?: string;
  nameFr?: string;
  image?: string;
  rarity?: string;
  price?: { value: number; currency: string; source: string };
  facets?: Record<string, string[]>;
  attrs?: Partial<Record<AttributeKey, string>>;
  tcgplayer?: number;
  /** Prix Cardmarket (EUR) et n° produit, publiés chaque jour avec le catalogue. */
  cm?: { id?: number; avg7?: number; avg1?: number; avg30?: number; avg?: number; trend?: number; low?: number };
  /** Chemin exact de la fiche Cardmarket (« Mega-Evolution/Bulbasaur-V1-MEG001 »). */
  cmPath?: string;
}

export async function staticBlocs(game: GameId, lang: CardLang): Promise<StaticBloc[] | null> {
  const r = await getJson<{ blocs: StaticBloc[] }>(`${catalogBase()}/sets/${game}-${lang}.json`, DAY).catch(() => null);
  return r?.blocs?.length ? r.blocs : null;
}

export async function staticSetCards(game: GameId, lang: CardLang, setId: string): Promise<StaticCard[] | null> {
  const r = await getJson<StaticCard[]>(`${catalogBase()}/cards/${game}-${lang}/${encodeURIComponent(setId)}.json`, DAY).catch(() => null);
  return r?.length ? r : null;
}

/** Blocs du catalogue au format de l'app (noms en français si demandé et connus). */
export function toBlocs(blocs: StaticBloc[], appLang: 'fr' | 'en' = 'fr'): Bloc[] {
  return blocs.map((b) => ({
    id: b.id,
    name: (appLang === 'fr' && b.nameFr) || b.name,
    sets: b.sets.map((x) => ({
      id: x.id,
      code: x.code,
      name: (appLang === 'fr' && x.nameFr) || x.name,
      logo: assetUrl(x.logo),
      symbol: assetUrl(x.symbol),
      count: x.count,
      blocId: b.id,
    })),
  }));
}

export interface StaticRow {
  id: string;
  setId: string;
  localId: string;
  number: string;
  name: string;
  nameEn: string;
  nameFr: string;
  rarity: string;
  image: string;
  priceUsd: number;
  facets?: Record<string, string[]>;
  attrs?: Partial<Record<AttributeKey, string>>;
  tcgplayer?: number;
  /** Prix Cardmarket de référence (EUR) et n° produit. */
  eur?: number;
  cardmarket?: number;
  cmPath?: string;
}

/** Toutes les cartes d'un jeu et d'une langue (fichier compact), pour chercher par nom traduit. */
export async function staticSearchRows(game: GameId, lang: CardLang): Promise<StaticRow[] | null> {
  const r = await getJson<{ columns: string[]; rows: unknown[][] }>(`${catalogBase()}/search/${game}-${lang}.json`, DAY).catch(() => null);
  if (!r?.rows?.length) return null;
  return r.rows.map(([id, setId, localId, number, name, nameEn, nameFr, rarity, image, priceUsd, facets, attrs, tcgplayer, eur, cardmarket, cmPath]) => ({
    id, setId, localId, number, name, nameEn, nameFr, rarity, image, priceUsd,
    facets: facets || undefined, attrs: attrs || undefined, tcgplayer: tcgplayer || undefined,
    eur: eur || undefined, cardmarket: cardmarket || undefined, cmPath: cmPath || undefined,
  }) as StaticRow);
}

/** Rareté affichée et filtrable pour les cartes dont la source n'en donne pas. */
export const NO_RARITY = 'None';
const rarityOf = (r?: string) => (r && r.trim() ? r : NO_RARITY);

/** Facettes affichées comme attributs (couleur One Piece, domaine Riftbound…). */
const FACET_ATTR: Record<string, AttributeKey> = { color: 'color', category: 'category', domain: 'domain', type: 'category' };

/** Attributs d'une carte du catalogue : illustrateur, date de sortie, rareté, puis ceux propres au jeu. */
export function staticAttributes(c: StaticCard | StaticRow, releaseDate?: string): CardAttribute[] {
  const out: CardAttribute[] = [];
  const add = (key: AttributeKey, value?: string) => {
    if (value && !out.some((a) => a.key === key)) out.push({ key, value });
  };
  const attrs = c.attrs ?? {};
  add('illustrator', attrs.illustrator);
  add('release', releaseDate);
  add('rarity', rarityOf(c.rarity));
  for (const [k, v] of Object.entries(attrs)) if (k !== 'illustrator') add(k as AttributeKey, v);
  for (const [k, v] of Object.entries(c.facets ?? {})) if (FACET_ATTR[k] && v.length) add(FACET_ATTR[k], v.join(' / '));
  return out;
}

/** Prix du catalogue, toujours Cardmarket : moyenne des ventes sur 7 jours, sinon 30 jours, sinon toutes les ventes. */
function staticPrices(c: StaticCard | StaticRow): Price[] {
  const main = 'cm' in c && c.cm ? cardmarketPrice(c.cm) : 'eur' in c && c.eur ? cardmarketPrice({ avg7: c.eur }) : undefined;
  return main ? [main] : [];
}

/** Carte du catalogue au format de l'app. Les images Limitless existent en petit (_SM) et grand (_LG). */
export function staticToCard(
  game: GameId,
  lang: CardLang,
  c: StaticCard | StaticRow,
  set?: { id: string; name?: string; releaseDate?: string },
): Card {
  const image = c.image || undefined;
  const price = 'price' in c ? (c as { price?: { value: number; currency: string; source: string } }).price : undefined;
  const usd = 'priceUsd' in c && c.priceUsd ? c.priceUsd : price?.value;
  const cm = 'cm' in c ? c.cm : undefined;
  const cmId = cm?.id ?? ('cardmarket' in c ? c.cardmarket : undefined);
  const tpId = c.tcgplayer;
  const cmPath = c.cmPath;
  return {
    game,
    id: c.id,
    lang,
    name: c.name,
    nameEn: c.nameEn || undefined,
    nameFr: c.nameFr || undefined,
    number: c.number,
    setId: set?.id ?? ('setId' in c ? c.setId : undefined),
    setName: set?.name,
    rarity: rarityOf(c.rarity),
    imageSmall: image,
    imageLarge: largeImage(image),
    prices: staticPrices(c),
    facets: (c as { facets?: Record<string, string[]> }).facets,
    attributes: staticAttributes(c, set?.releaseDate),
    marketIds: cmId || tpId || cmPath ? { cardmarket: cmId || undefined, cardmarketPath: cmPath || undefined, tcgplayer: tpId || undefined } : undefined,
  };
}

const setNames = (blocs: StaticBloc[]) => new Map(blocs.flatMap((b) => b.sets.map((x) => [x.id, x.name] as const)));

/** Cartes d'une extension depuis le catalogue (null si absente). */
export async function staticSetCardsAsApp(game: GameId, lang: CardLang, setId: string): Promise<{ set: SetInfo | null; cards: Card[] } | null> {
  const [blocs, cards] = await Promise.all([staticBlocs(game, lang), staticSetCards(game, lang, setId)]);
  if (!cards) return null;
  const st = blocs?.flatMap((b) => b.sets.map((x) => ({ ...x, blocId: b.id }))).find((x) => x.id === setId);
  const set: SetInfo | null = st ? { id: st.id, code: st.code, name: st.name, logo: assetUrl(st.logo), count: st.count, blocId: st.blocId } : null;
  return { set, cards: cards.map((c) => staticToCard(game, lang, c, { id: setId, name: st?.name })) };
}

/** « M6 110 », « SV4a-123 », « OP05-119 » → extension + numéro. */
export function parseCode(text: string): { setCode: string; localId: string } | null {
  const m = text.trim().match(/^([A-Za-z]{1,5}\d{0,3}(?:\.\d)?[A-Za-z]?)[\s-]+(\d{1,3})(?:\s*\/\s*\d+)?$/);
  return m ? { setCode: m[1], localId: m[2] } : null;
}

/**
 * Recherche dans le catalogue : nom d'origine, anglais ou français, numéro, ou code « M6 110 » ;
 * filtres bloc, extension, rareté (`rarityKey` convertit la rareté en clé de filtre, ex. abréviation) et facettes.
 */
export async function staticSearch(
  game: GameId,
  lang: CardLang,
  f: SearchFilters,
  rarityKey: (r: string) => string = (r) => r,
): Promise<Card[] | null> {
  const [rows, blocs] = await Promise.all([staticSearchRows(game, lang), staticBlocs(game, lang)]);
  if (!rows || !blocs) return null;
  const names = setNames(blocs);
  const blocSets = f.blocId ? new Set(blocs.find((b) => b.id === f.blocId)?.sets.map((x) => x.id)) : null;
  const code = parseCode(f.text);
  const q = normalize(f.text).trim();
  const words = q.split(/\s+/).filter(Boolean);
  const hit = rows.filter((r) => {
    if (f.setId && r.setId !== f.setId) return false;
    if (blocSets && !blocSets.has(r.setId)) return false;
    if (f.facets.rarity && rarityKey(rarityOf(r.rarity)) !== f.facets.rarity) return false;
    for (const [k, v] of Object.entries(f.facets)) {
      if (!v || k === 'rarity') continue;
      if (r.facets?.[k] && !r.facets[k].includes(v)) return false;
    }
    if (!q) return true;
    if (code && r.setId.toLowerCase() === code.setCode.toLowerCase() && Number(r.localId) === Number(code.localId)) return true;
    const hay = normalize(`${r.name} ${r.nameEn} ${r.nameFr} ${r.number}`);
    return words.every((w) => hay.includes(w));
  });
  // Code exact (« M6 110 ») : la carte seule.
  const exact = code ? hit.filter((r) => r.setId.toLowerCase() === code.setCode.toLowerCase() && Number(r.localId) === Number(code.localId)) : [];
  const cards = (exact.length ? exact : hit).map((r) => staticToCard(game, lang, r, { id: r.setId, name: names.get(r.setId) }));
  return sortCards(cards, f.sort, f.text);
}

export async function staticGetCard(game: GameId, lang: CardLang, id: string): Promise<Card | null> {
  const [rows, blocs] = await Promise.all([staticSearchRows(game, lang), staticBlocs(game, lang)]);
  const r = rows?.find((x) => x.id === id);
  if (!r) return null;
  const set = blocs?.flatMap((b) => b.sets).find((x) => x.id === r.setId);
  return staticToCard(game, lang, r, { id: r.setId, name: set?.name, releaseDate: set?.releaseDate });
}

/** Options de filtre depuis le catalogue (raretés et facettes présentes). */
export async function staticFilterOptions(game: GameId, lang: CardLang, facetKeys: string[]): Promise<FilterOptions | null> {
  const [rows, blocs] = await Promise.all([staticSearchRows(game, lang), staticBlocs(game, lang)]);
  if (!blocs) return null;
  const app = toBlocs(blocs);
  const values = (k: string) => distinct((rows ?? []).flatMap((r) => r.facets?.[k] ?? []));
  return {
    blocs: app,
    sets: app.flatMap((b) => b.sets.map((x) => ({ id: x.id, name: `${x.code} · ${x.name}` }))),
    facets: [
      { key: 'rarity', label: 'rarity', values: distinct((rows ?? []).map((r) => rarityOf(r.rarity))) },
      ...facetKeys.map((k) => ({ key: k, label: k, values: values(k) })),
    ],
    sorts: game === 'pokemon' && lang !== 'ja' ? ['relevance', 'name', 'number'] : ['relevance', 'name', 'number', 'price-desc', 'price-asc'],
  };
}
