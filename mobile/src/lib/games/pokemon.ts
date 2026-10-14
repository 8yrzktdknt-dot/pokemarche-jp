import { getJson } from '../http.ts';
import { nameScore } from '../scan/parse.ts';
import { applyFilters, sortCards } from '../search.ts';
import { ENGLISH_NAMED_LANGS, JP_SERIE_EN, JP_SET_EN, rarityAbbr, rarityValuesFor } from '../catalog/pokemonNames.ts';
import { cardmarketPrice } from '../prices/cardmarket.ts';
import { NO_RARITY, assetUrl, staticBlocs, staticFilterOptions, staticGetCard, staticSearch, staticSetCardsAsApp, toBlocs } from '../catalog/static';
import type { Bloc, Card, CardAttribute, CardLang, FilterOptions, GameProvider, Price, ScanHint, SearchFilters, SetInfo } from '../types.ts';

/**
 * Pokémon via l'API publique TCGdex (https://tcgdex.dev), sans clé.
 * Couvre l'international (EN/FR/DE/ES/IT/PT) et l'Asie (JA/KO/ZH/ID/TH),
 * avec des prix Cardmarket (EUR) et TCGplayer (USD) quand ils existent.
 */
const API = 'https://api.tcgdex.net/v2';
const DAY = 24 * 3600 * 1000;
const enc = encodeURIComponent;

const TCGDEX_LANG: Record<CardLang, string> = {
  en: 'en', fr: 'fr', de: 'de', es: 'es', it: 'it', pt: 'pt',
  ja: 'ja', ko: 'ko', 'zh-tw': 'zh-tw', 'zh-cn': 'zh-cn', id: 'id', th: 'th',
};

interface TcgdexBrief { id: string; localId: string; name: string; image?: string }
interface TcgdexSetBrief { id: string; name: string; cardCount: { total: number; official: number } }
interface TcgdexCard extends TcgdexBrief {
  rarity?: string;
  set: { id: string; name: string; cardCount?: { official: number } };
  illustrator?: string;
  dexId?: number[];
  hp?: number;
  types?: string[];
  stage?: string;
  category?: string;
  trainerType?: string;
  energyType?: string;
  regulationMark?: string;
  pricing?: {
    cardmarket?: { idProduct?: number; trend?: number; avg?: number; low?: number; avg1?: number; avg7?: number; avg30?: number; unit?: string } | null;
    tcgplayer?: Record<string, { marketPrice?: number; productId?: number } | string | undefined> | null;
  };
}

/**
 * Prix affiché, toujours Cardmarket : moyenne des ventes sur 7 jours (sinon 30 jours, sinon toutes les ventes ;
 * champs « -holo » pour les cartes uniquement holo). Aucun autre site.
 */
function prices(c: TcgdexCard): Price[] {
  const cm = c.pricing?.cardmarket as Record<string, number | null | undefined> | null | undefined;
  const pick = (k: string) => cm?.[k] || cm?.[`${k}-holo`] || undefined;
  const main = cardmarketPrice(cm ? { avg7: pick('avg7'), avg30: pick('avg30'), avg: pick('avg') } : null);
  return main ? [main] : [];
}

function marketIds(c: TcgdexCard): Card['marketIds'] {
  const tp = Object.values(c.pricing?.tcgplayer ?? {}).find((v) => v && typeof v === 'object' && v.productId);
  const ids = {
    cardmarket: c.pricing?.cardmarket?.idProduct || undefined,
    tcgplayer: (tp && typeof tp === 'object' ? tp.productId : undefined) || undefined,
  };
  return ids.cardmarket || ids.tcgplayer ? ids : undefined;
}

/** Attributs de la fiche TCGdex (la date de sortie vient de l'extension, ajoutée plus loin). */
function attributes(c: TcgdexCard): CardAttribute[] {
  const a: CardAttribute[] = [];
  const add = (key: CardAttribute['key'], v?: string | number) => {
    if (v !== undefined && v !== null && v !== '') a.push({ key, value: String(v) });
  };
  add('illustrator', c.illustrator);
  add('rarity', c.rarity || NO_RARITY);
  add('dex', c.dexId?.join(', '));
  add('type', c.types?.join(' / ') ?? c.energyType);
  add('hp', c.hp);
  add('stage', c.stage);
  add('category', c.trainerType ? `${c.category} · ${c.trainerType}` : c.category);
  add('regulation', c.regulationMark);
  return a;
}

function fromBrief(b: TcgdexBrief, lang: CardLang): Card {
  return {
    game: 'pokemon', id: b.id, lang, name: b.name, number: b.localId,
    imageSmall: b.image ? `${b.image}/low.webp` : undefined,
    imageLarge: b.image ? `${b.image}/high.webp` : undefined,
    prices: [],
  };
}

function fromFull(c: TcgdexCard, lang: CardLang): Card {
  const official = c.set.cardCount?.official;
  return {
    ...fromBrief(c, lang),
    number: official ? `${c.localId}/${String(official).padStart(3, '0')}` : c.localId,
    setId: c.set.id,
    setName: c.set.name,
    rarity: c.rarity || NO_RARITY,
    prices: prices(c),
    attributes: attributes(c),
    marketIds: marketIds(c),
  };
}

async function getCard(id: string, lang: CardLang): Promise<Card | null> {
  const c = await getJson<TcgdexCard>(`${API}/${TCGDEX_LANG[lang]}/cards/${encodeURIComponent(id)}`);
  return c ? fromFull(c, lang) : null;
}

const setsOf = async (l: string) => (await getJson<TcgdexSetBrief[]>(`${API}/${l}/sets`, DAY)) ?? [];

interface TcgdexSerieBrief { id: string; name: string }
interface TcgdexSetFull extends TcgdexSetBrief {
  logo?: string;
  symbol?: string;
  serie?: { id: string; name: string };
  cards: TcgdexBrief[];
}

const asset = (u?: string) => (u ? `${u}.webp` : undefined);

function displaySetName(id: string, name: string, lang: CardLang): string {
  return ENGLISH_NAMED_LANGS.includes(lang) && lang !== 'en' ? JP_SET_EN[id.toUpperCase()] ?? name : name;
}

function toSetInfo(x: { id: string; name: string; logo?: string; symbol?: string; cardCount?: { official: number; total: number } }, lang: CardLang, blocId?: string): SetInfo {
  return {
    id: x.id,
    code: x.id.toUpperCase(),
    name: displaySetName(x.id, x.name, lang),
    logo: asset(x.logo),
    symbol: asset(x.symbol),
    count: x.cardCount?.total,
    blocId,
  };
}

/** Blocs (séries TCGdex) et leurs extensions, les plus récents d'abord. */
async function blocs(lang: CardLang): Promise<Bloc[]> {
  const l = TCGDEX_LANG[lang];
  const series = (await getJson<TcgdexSerieBrief[]>(`${API}/${l}/series`, DAY)) ?? [];
  const full = await Promise.all(
    series.map((x) =>
      getJson<{ id: string; name: string; sets: TcgdexSetFull[] }>(`${API}/${l}/series/${enc(x.id)}`, DAY).catch(() => null),
    ),
  );
  return full
    .filter((x): x is NonNullable<typeof x> => !!x && x.sets?.length > 0)
    .map((x) => ({
      id: x.id,
      name: ENGLISH_NAMED_LANGS.includes(lang) && lang !== 'en' ? JP_SERIE_EN[x.id.toUpperCase()] ?? x.name : x.name,
      sets: [...x.sets].reverse().map((st) => toSetInfo(st, lang, x.id)),
    }))
    .reverse();
}

async function setCards(setId: string, lang: CardLang): Promise<{ set: SetInfo | null; cards: Card[] }> {
  const l = TCGDEX_LANG[lang];
  const st = await getJson<TcgdexSetFull>(`${API}/${l}/sets/${enc(setId)}`, DAY);
  if (!st) return { set: null, cards: [] };
  const set = toSetInfo(st, lang, st.serie?.id);
  const official = st.cardCount?.official;
  const cards = (st.cards ?? []).map((b) => ({
    ...fromBrief(b, lang),
    number: official ? `${b.localId}/${String(official).padStart(3, '0')}` : b.localId,
    setId: st.id,
    setName: set.name,
  }));
  return { set, cards };
}

async function filterOptions(lang: CardLang): Promise<FilterOptions> {
  const l = TCGDEX_LANG[lang];
  const [bl, rarities, types] = await Promise.all([
    blocs(lang),
    getJson<string[]>(`${API}/${l}/rarities`, DAY).catch(() => null),
    getJson<string[]>(`${API}/${l}/types`, DAY).catch(() => null),
  ]);
  return {
    blocs: bl,
    sets: bl.flatMap((b) => b.sets.map((x) => ({ id: x.id, name: `${x.code} · ${x.name}` }))),
    facets: [
      { key: 'rarity', label: 'Rareté', values: rarities ?? [] },
      { key: 'type', label: 'Type', values: types ?? [] },
    ],
    sorts: ['relevance', 'name', 'number'],
  };
}

/** « M6 110 », « SV4a-123 », « sv08 132/191 » → extension + numéro. */
export function parseCodeQuery(text: string): { setCode: string; localId: string } | null {
  const m = text.trim().match(/^([A-Za-z]{1,5}\d{0,3}(?:\.\d)?[A-Za-z]?)[\s-]+(\d{1,3})(?:\s*\/\s*\d+)?$/);
  return m ? { setCode: m[1], localId: m[2] } : null;
}

/**
 * Recherche par code (« M6 110 »), sinon par nom/numéro, rareté et type via l'API TCGdex.
 * L'extension et le bloc se déduisent de l'id de la carte (« sv08-132 » → « sv08 »).
 */
async function search(f: SearchFilters, lang: CardLang): Promise<Card[]> {
  const l = TCGDEX_LANG[lang];
  const text = f.text.trim();
  const { rarity, type } = f.facets;
  const bl = await blocs(lang).catch(() => [] as Bloc[]);
  const setInfo = new Map(bl.flatMap((b) => b.sets.map((x) => [x.id, x] as const)));

  const code = parseCodeQuery(text);
  if (code) {
    const set = [...setInfo.values()].find((x) => x.id.toLowerCase() === code.setCode.toLowerCase());
    if (set) {
      const ids = [...new Set([code.localId, code.localId.padStart(3, '0'), code.localId.replace(/^0+(?=\d)/, '')])];
      const found = await Promise.all(
        ids.map((id) => getJson<TcgdexCard>(`${API}/${l}/sets/${enc(set.id)}/${enc(id)}`).catch(() => null)),
      );
      const hit = found.find(Boolean);
      if (hit) return [{ ...fromFull(hit, lang), setName: set.name }];
    }
  }

  let briefs: TcgdexBrief[];
  if (!text && !rarity && !type && f.setId) {
    return (await setCards(f.setId, lang)).cards;
  } else if (!text && !rarity && !type && f.blocId) {
    // Bloc seul : toutes les cartes de ses extensions.
    const sets = bl.find((b) => b.id === f.blocId)?.sets ?? [];
    const all = await Promise.all(sets.map((x) => setCards(x.id, lang).catch(() => ({ cards: [] as Card[] }))));
    return sortCards(all.flatMap((x) => x.cards), f.sort, text);
  } else {
    const params = ['pagination:itemsPerPage=500'];
    if (/^\d{1,3}(\/\d+)?$/.test(text)) params.push(`localId=eq:${enc(text.split('/')[0])}`);
    else if (text) params.push(`name=${enc(text)}`);
    if (type) params.push(`types=${enc(type)}`);
    // Le filtre de rareté porte sur une abréviation (« SAR ») : une requête par libellé TCGdex correspondant.
    let rarities: (string | null)[] = [null];
    if (rarity) {
      const all = (await getJson<string[]>(`${API}/${l}/rarities`, DAY).catch(() => null)) ?? [];
      const vals = rarityValuesFor(rarity, all);
      rarities = vals.length ? vals : [rarity];
    }
    const lists = await Promise.all(
      rarities.map((r) =>
        getJson<TcgdexBrief[]>(`${API}/${l}/cards?${[...params, ...(r ? [`rarity=eq:${enc(r)}`] : [])].join('&')}`),
      ),
    );
    const seen = new Set<string>();
    briefs = lists.flatMap((x) => x ?? []).filter((b) => !seen.has(b.id) && !!seen.add(b.id));
  }
  const blocSets = f.blocId ? new Set(bl.find((b) => b.id === f.blocId)?.sets.map((x) => x.id)) : null;
  const cards = briefs
    .map((b) => {
      const setId = b.id.slice(0, b.id.lastIndexOf('-'));
      return { ...fromBrief(b, lang), setId, setName: setInfo.get(setId)?.name };
    })
    .filter((c) => !blocSets || blocSets.has(c.setId));
  return sortCards(applyFilters(cards, { ...f, text: '', facets: {} }), f.sort, text);
}

async function resolveScan(hint: ScanHint, lang: CardLang): Promise<Card[]> {
  if (!hint.localId) return [];
  const l = TCGDEX_LANG[lang];
  const sets = await setsOf(l);

  // 1) Code d'extension imprimé (« SV4a » sur les cartes japonaises = id TCGdex).
  let candidates = hint.setCode
    ? sets.filter((s) => s.id.toLowerCase() === hint.setCode!.toLowerCase())
    : [];
  // 2) Sinon : extensions dont le nombre officiel de cartes correspond au total imprimé, les plus récentes d'abord.
  if (!candidates.length && hint.setTotal) {
    candidates = sets.filter((s) => s.cardCount.official === hint.setTotal).reverse().slice(0, 8);
  }

  const ids = [...new Set([hint.localId, hint.localId.replace(/^0+(?=\d)/, '')])];
  const found = await Promise.all(
    candidates.flatMap((s) =>
      ids.map((id) =>
        getJson<TcgdexCard>(`${API}/${l}/sets/${encodeURIComponent(s.id)}/${encodeURIComponent(id)}`).catch(() => null),
      ),
    ),
  );
  const unique = new Map<string, Card>();
  for (const c of found) if (c) unique.set(c.id, fromFull(c, lang));
  return [...unique.values()].sort((a, b) => nameScore(b.name, hint.text) - nameScore(a.name, hint.text));
}

/**
 * Catalogue publié avec l'app d'abord (extensions par date de sortie, logos ; pour le japonais :
 * toutes les cartes Limitless avec noms traduits), puis TCGdex en direct pour le reste et pour les prix.
 */
/** Langues dont toutes les cartes sont publiées avec le catalogue (images complétées, noms traduits). */
const STATIC_LANGS: CardLang[] = ['ja', 'fr', 'en', 'zh-tw', 'zh-cn'];

async function blocsAll(lang: CardLang): Promise<Bloc[]> {
  const st = await staticBlocs('pokemon', lang);
  return st ? toBlocs(st) : blocs(lang);
}

/** Cartes absentes de TCGdex (Mew RGB de 30th Celebration), reprises du catalogue anglais dans les autres langues. */
const INTL_EXTRA: Record<string, string[]> = { '30th': ['30th-R', '30th-G', '30th-B'] };
const INTL_LANGS: CardLang[] = ['de', 'es', 'it', 'pt'];

/**
 * Langues internationales servies par TCGdex en direct : prix Cardmarket du catalogue anglais quand TCGdex n'en a pas
 * (même fiche Cardmarket pour toutes ces langues, ex. 30th Celebration) et cartes ajoutées hors TCGdex.
 */
async function withIntlCatalog(setId: string, lang: CardLang, cards: Card[], setName?: string): Promise<Card[]> {
  if (!INTL_LANGS.includes(lang)) return cards;
  const en = await staticSetCardsAsApp('pokemon', 'en', setId).catch(() => null);
  if (!en) return cards;
  const byId = new Map(en.cards.map((c) => [c.id, c]));
  const out = cards.map((c) => {
    const e = byId.get(c.id);
    return e && !c.prices.length && e.prices.length
      ? { ...c, prices: e.prices, marketIds: { ...e.marketIds, ...Object.fromEntries(Object.entries(c.marketIds ?? {}).filter(([, v]) => v)) } }
      : c;
  });
  const have = new Set(out.map((c) => c.id));
  for (const id of INTL_EXTRA[setId] ?? []) {
    const e = byId.get(id);
    if (e && !have.has(id)) out.push({ ...e, lang, setName: setName ?? e.setName });
  }
  return out;
}

async function setCardsAll(setId: string, lang: CardLang) {
  if (STATIC_LANGS.includes(lang)) {
    const st = await staticSetCardsAsApp('pokemon', lang, setId);
    if (st) return st;
  }
  const live = await setCards(setId, lang);
  // Infos d'extension (logo, nom) du catalogue quand TCGdex ne les a pas.
  const info = (await staticBlocs('pokemon', lang))?.flatMap((b) => b.sets).find((x) => x.id === setId);
  const set = info && live.set ? { ...live.set, name: info.name, logo: assetUrl(info.logo) ?? live.set.logo } : live.set;
  return { set, cards: await withIntlCatalog(setId, lang, live.cards, set?.name) };
}

async function searchAll(f: SearchFilters, lang: CardLang): Promise<Card[]> {
  if (STATIC_LANGS.includes(lang)) {
    const st = await staticSearch('pokemon', lang, f, rarityAbbr);
    if (st) return st;
  }
  return search(f, lang);
}

async function filterOptionsAll(lang: CardLang): Promise<FilterOptions> {
  if (STATIC_LANGS.includes(lang)) {
    const st = await staticFilterOptions('pokemon', lang, []);
    if (st) return st;
  }
  const live = await filterOptions(lang);
  const st = await staticBlocs('pokemon', lang);
  return st ? { ...live, blocs: toBlocs(st) } : live;
}

/** Attributs TCGdex en direct, complétés par ceux du catalogue (clés absentes ou rareté « None »). */
function mergeAttributes(live: CardAttribute[] = [], st: CardAttribute[] = []): CardAttribute[] {
  // Rareté du catalogue en priorité (corrigée à la main pour certaines extensions, ex. M6a 136–165 sans rareté).
  const out = live.filter((a) => !(a.key === 'rarity' && st.some((b) => b.key === 'rarity')));
  for (const a of st) if (!out.some((b) => b.key === a.key)) out.push(a);
  return out;
}

/** Date de sortie de l'extension (catalogue publié), ajoutée aux attributs après l'illustrateur. */
async function withRelease(card: Card, lang: CardLang): Promise<Card> {
  const sets = (await staticBlocs('pokemon', lang).catch(() => null))?.flatMap((b) => b.sets) ?? [];
  const date = sets.find((x) => x.id === card.setId)?.releaseDate;
  const attrs = [...(card.attributes ?? [])];
  if (!attrs.some((a) => a.key === 'rarity') && card.rarity) attrs.push({ key: 'rarity', value: card.rarity });
  if (date && !attrs.some((a) => a.key === 'release')) attrs.splice(attrs[0]?.key === 'illustrator' ? 1 : 0, 0, { key: 'release', value: date });
  return { ...card, attributes: attrs };
}

async function getCardAll(id: string, lang: CardLang): Promise<Card | null> {
  const [live, st] = await Promise.all([
    getCard(id, lang).catch(() => null),
    STATIC_LANGS.includes(lang) ? staticGetCard('pokemon', lang, id) : Promise.resolve(null),
  ]);
  const card = !live ? st : !st ? live : {
    // Prix, rareté et attributs de TCGdex ; noms traduits et images du catalogue quand TCGdex n'en a pas.
    ...live,
    nameEn: st.nameEn, nameFr: st.nameFr, setName: st.setName ?? live.setName, rarity: st.rarity ?? live.rarity,
    imageSmall: live.imageSmall ?? st.imageSmall, imageLarge: live.imageLarge ?? st.imageLarge,
    // Prix et fiches Cardmarket du catalogue (vérifiés, mis à jour chaque jour) en priorité : TCGdex en direct
    // peut relier une carte japonaise à la fiche d'une autre langue (chinois simplifié pour M6a).
    prices: st.prices.length ? st.prices : live.prices,
    attributes: mergeAttributes(live.attributes, st.attributes),
    marketIds: { ...Object.fromEntries(Object.entries(live.marketIds ?? {}).filter(([, v]) => v)), ...Object.fromEntries(Object.entries(st.marketIds ?? {}).filter(([, v]) => v)) },
  };
  if (card && INTL_LANGS.includes(lang) && card.setId) {
    const [c] = await withIntlCatalog(card.setId, lang, [card]);
    return withRelease(c, lang);
  }
  // Carte ajoutée hors TCGdex (Mew RGB) dans une langue servie en direct : celle du catalogue anglais.
  const extra = !card && INTL_LANGS.includes(lang) ? Object.values(INTL_EXTRA).flat().includes(id) : false;
  if (extra) {
    const en = await staticGetCard('pokemon', 'en', id);
    const name = (await staticBlocs('pokemon', lang))?.flatMap((b) => b.sets).find((x) => x.id === en?.setId)?.name;
    return en ? withRelease({ ...en, lang, setName: name ?? en.setName }, lang) : null;
  }
  return card ? withRelease(card, lang) : null;
}

export const pokemon: GameProvider = {
  id: 'pokemon',
  label: 'Pokémon',
  langs: ['fr', 'en', 'ja', 'zh-tw', 'zh-cn', 'de', 'es', 'it', 'pt', 'ko', 'id', 'th'],
  search: searchAll,
  filterOptions: filterOptionsAll,
  blocs: blocsAll,
  setCards: setCardsAll,
  getCard: getCardAll,
  resolveScan,
};
