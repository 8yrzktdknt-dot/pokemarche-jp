// Variantes des cartes Pokémon (normale, holo, reverse, Poké Ball, Master Ball, tampons…) et leurs prix Cardmarket.
//  - internationales : fiche TCGdex « variants_detailed » (type, motif, tampon, n° produit Cardmarket de la variante) ;
//  - japonaises : produits PokemonWizard de même numéro (« Cynthia's Roserade (Poke Ball Pattern) ») ;
//  - prix : fichiers publics Cardmarket (guide des prix) : ventes sur 7 jours, sinon 30 jours, toutes les ventes, offres.
// Sur la carte : v = [{ k: 'normal', id: 851072, p: 0.06 }, { k: 'reverse', id: 851072, p: 0.17 }, …].

/** Motifs TCGdex → clé de variante (les autres motifs gardent leur nom : « reverse-cosmos »). */
const FOILS = { pokeball: 'pokeball', masterball: 'masterball' };
/** Motifs traduits par TCGdex (fiches françaises…) → nom anglais. */
const FOIL_NAMES = { energie: 'energy', energia: 'energy', ligue: 'league', liga: 'league', lega: 'league' };
const foilName = (f) => {
  const n = String(f).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  return FOIL_NAMES[n] ?? n;
};

/** Variantes d'une fiche TCGdex, dans l'ordre de la fiche, sans doublon (formats jumbo exclus). */
export function variantsOf(d) {
  const out = [];
  for (const v of d?.variants_detailed ?? []) {
    if (v.size && v.size.toLowerCase() !== 'standard') continue;
    const type = String(v.type ?? '').toLowerCase();
    if (!type) continue;
    const foil = v.foil ? foilName(v.foil) : '';
    let k = type === 'reverse' && foil ? FOILS[foil] ?? `reverse-${foil}` : type;
    const sub = v.subtype && v.subtype !== 'unlimited' ? String(v.subtype).toLowerCase() : '';
    const stamps = (v.stamp ?? []).map((s) => String(s).toLowerCase());
    k = [k, sub, ...stamps].filter(Boolean).join('|');
    if (out.some((x) => x.k === k)) continue;
    const id = Number(v.thirdParty?.cardmarket) || undefined;
    const tp = Number(v.thirdParty?.tcgplayer) || undefined;
    out.push({ k, ...(id ? { id } : {}), ...(tp ? { tp } : {}) });
  }
  return ownImages(out);
}

/**
 * Photo à part (fiche TCGplayer) seulement pour les variantes vendues sur une autre fiche que la carte de base
 * (Poké Ball, Master Ball…) ; le reverse vendu sur la même fiche garde le visuel de la carte.
 */
export function ownImages(list) {
  const baseTp = list[0]?.tp;
  return list.map((v, i) => {
    const { tp, ...rest } = v;
    return i > 0 && tp && tp !== baseTp ? { ...rest, tp } : rest;
  });
}

/** Motif d'un produit PokemonWizard japonais (« (Poke Ball Pattern) ») → clé ; undefined pour la carte de base. */
export function wizardVariantKey(name) {
  const m = name.match(/\(([^)]*(?:Pattern|Ball)[^)]*)\)\s*$/i);
  if (!m) return undefined;
  const slug = m[1].toLowerCase().replace(/pattern/g, '').replace(/[^a-z0-9]/g, '');
  // Motif « symbole d'énergie » : même clé que TCGdex (« reverse-energy »).
  return slug === 'energysymbol' || slug === 'energy' ? 'reverse-energy' : slug;
}

/** Variantes de TCGdex complétées par celles d'une autre source (PokemonWizard), sans doublon ; photo de l'autre source si besoin. */
export function mergeVariants(a = [], b = []) {
  const out = a.map((v) => ({ ...v }));
  for (const v of b) {
    const same = out.find((x) => x.k === v.k);
    if (!same) out.push({ ...v });
    else if (v.tp && !same.tp && same !== out[0]) same.tp = v.tp;
  }
  return out;
}

const BALL = /ball$/;
/**
 * Cartes japonaises : TCGdex note « reverse » (sans motif) la version à motif de Poké Ball (les cartes japonaises
 * récentes n'ont pas de reverse simple, seulement les motifs Énergie et Ball). Quand PokemonWizard donne un seul
 * motif Ball, ce « reverse » devient ce motif (avec la fiche Cardmarket de TCGdex et la photo de PokemonWizard).
 */
export function fixJapaneseBall(list) {
  const plain = list.find((v) => v.k === 'reverse');
  const balls = list.filter((v) => BALL.test(v.k));
  if (!plain || balls.length !== 1 || !list.some((v) => v.k === 'reverse-energy')) return list;
  const ball = balls[0];
  return list.filter((v) => v !== plain).map((v) => (v === ball ? { ...v, ...(plain.id ? { id: plain.id } : {}) } : v));
}

/** Carte japonaise de base : holo à partir de « R » (les communes et peu communes ne le sont pas). */
export const japaneseBase = (rarity) => (!rarity || /^(C|U|Common|Uncommon|Commune|Peu commune)$/i.test(rarity) ? 'normal' : 'holo');

const FOIL_KEYS = /^(reverse|pokeball|masterball|quickball|friendball|greatball|ultraball|loveball|duskball)/;

/** Prix affichés, dans l'ordre : moyenne des ventes sur 7 jours, 30 jours, toutes les ventes, puis prix des offres. */
export const TIERS = ['avg7', 'avg30', 'avg', 'trend'];

/**
 * Valeur d'une période pour une variante. Les variantes brillantes vendues sur la fiche de la carte normale
 * (reverse) ont leur propre champ « -holo » ; une fiche à part (Poké Ball…) n'a souvent que celui-là.
 */
function tierValue(g, k, shared, t) {
  if (FOIL_KEYS.test(k)) return (shared ? g[`${t}-holo`] : g[`${t}-holo`] || g[t]) || undefined;
  // Carte normale : son propre champ ; carte holo (sans version normale) : l'un ou l'autre.
  return (k.startsWith('normal') ? g[t] : g[t] || g[`${t}-holo`]) || undefined;
}

/** Prix d'une variante : la première période qui a une valeur ({ p, t } ; t absent pour 7 jours). */
export function variantPrice(g, k, shared) {
  if (!g) return undefined;
  for (const t of TIERS) {
    const p = tierValue(g, k, shared, t);
    if (p) return t === 'avg7' ? { p } : { p, t };
  }
  return undefined;
}

/**
 * Prix Cardmarket de toutes les cartes d'une extension depuis les fichiers Cardmarket (aucun prix de TCGdex) :
 * carte (cm : 7 jours, 30 jours, toutes ventes, offres) et chaque variante (p, et t quand ce n'est pas 7 jours).
 * `files.prices` : n° produit → prix.
 */
export function applyCardmarketPrices(cards, files) {
  let n = 0;
  for (const c of cards) {
    const base = c.v?.[0];
    const id = c.cm?.id ?? base?.id;
    if (id) {
      const g = files.prices.get(id);
      const pick = (t) => (g ? (base ? tierValue(g, base.k, false, t) : g[t] || g[`${t}-holo`] || undefined) : undefined);
      // Prix de la carte = celui de sa variante de base (une carte normale ne prend pas le prix du reverse).
      const cm = { id, avg7: pick('avg7'), avg30: pick('avg30'), avg: pick('avg'), trend: pick('trend') };
      for (const k of Object.keys(cm)) if (cm[k] === undefined) delete cm[k];
      c.cm = c.cm?.f ? { ...cm, f: 1 } : cm;
      if (cm.avg7 || cm.avg30 || cm.avg || cm.trend) n++;
    }
    for (const v of c.v ?? []) {
      // Variantes japonaises sans fiche propre (reverse) : celle de la carte.
      const vid = v.id ?? (v.k === 'reverse' || v === base ? c.cm?.id : undefined);
      const r = vid ? variantPrice(files.prices.get(vid), v.k, vid === (base?.id ?? c.cm?.id) && v !== base) : undefined;
      delete v.p;
      delete v.t;
      if (r) Object.assign(v, r);
    }
  }
  return n;
}

/** Extensions des 30 ans (toutes langues) : toutes les cartes sont holo. */
export const ALL_HOLO = new Set(['30th', '30th-c', 'M6a', 'MF', '30thC', '30thDC']);

/**
 * Cartes toutes holo : la variante de base « normale » (TCGdex) devient « holo », avec sa fiche et son prix ;
 * une carte sans liste de variantes reçoit la variante holo (fiche et prix de la carte).
 */
export function forceHolo(cards) {
  for (const c of cards) {
    if (!c.v?.length) {
      const tier = TIERS.find((t) => c.cm?.[t]);
      c.v = [{ k: 'holo', ...(c.cm?.id ? { id: c.cm.id } : {}), ...(tier ? { p: c.cm[tier], ...(tier !== 'avg7' ? { t: tier } : {}) } : {}) }];
      continue;
    }
    if (c.v[0].k === 'normal') c.v[0] = { ...c.v[0], k: 'holo' };
  }
  return cards;
}
