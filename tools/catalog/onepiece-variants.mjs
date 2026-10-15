// One Piece : versions d'une même carte regroupées en variantes, et prix Cardmarket de chaque version.
//  - Le site officiel liste chaque version à part : « OP01-120 » (normale), « OP01-120_p1 », « _p2 »… (parallèles :
//    illustration alternative, manga, SP…) et « _r1 » (réimpression, dans les Premium Boosters). Elles deviennent une
//    seule carte avec ses variantes (clé, n° officiel, visuel) : v = [{ k: 'normal', o: 'OP01-120', img }, { k: 'parallel', … }].
//  - Cardmarket (jeu n° 18) a une fiche par version : « Shanks (OP01-120) » ×3 dans l'extension Romance Dawn, dans le
//    même ordre que le site officiel (n° produit croissants). L'extension Cardmarket d'une extension du catalogue est
//    celle qui contient le plus de ses numéros, parmi celles de la région des cartes : Cardmarket sépare les éditions
//    internationales (anglais, français) des éditions asiatiques (japonais), aux prix bien différents.

/** Clé de variante d'une version officielle : '' → normal, _p1 → parallel, _p2 → parallel-2, _r1 → reprint. */
export function variantKey(officialId) {
  const m = String(officialId).match(/_([pr])(\d+)$/);
  if (!m) return 'normal';
  const base = m[1] === 'p' ? 'parallel' : 'reprint';
  return m[2] === '1' ? base : `${base}-${m[2]}`;
}

/** Rang d'une version dans l'ordre Cardmarket : normale, réimpressions, puis parallèles (par numéro). */
const rank = (id) => {
  const m = String(id).match(/_([pr])(\d+)$/);
  return m ? (m[1] === 'r' ? 100 : 200) + Number(m[2]) : 0;
};

/**
 * Versions d'une extension (ordre du site officiel) → cartes avec variantes. La carte garde l'id de sa première
 * version (« OP01-120 », ou « OP01-006_r1 » pour une réimpression seule dans un Premium Booster : ids uniques).
 */
export function groupVersions(entries) {
  const groups = new Map();
  for (const e of entries) {
    const k = e.number;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(e);
  }
  const out = [];
  for (const list of groups.values()) {
    list.sort((a, b) => rank(a.id) - rank(b.id));
    const [first] = list;
    const { id, image, ...rest } = first;
    out.push({
      ...rest,
      id,
      image,
      v: list.map((e) => ({ k: variantKey(e.id), o: e.id, ...(e.image ? { img: e.image } : {}) })),
    });
  }
  return out;
}

/** Code officiel d'un produit Cardmarket : « Shanks (OP01-120) » → OP01-120 ; undefined sans code. */
export const productCode = (name) => name.match(/\(([A-Z]{1,4}\d{0,2}-\d{3})\)\s*$/)?.[1];

/** Produits Cardmarket One Piece par extension : idExpansion → code → n° produits croissants. */
export function indexProducts(products) {
  const byExp = new Map();
  for (const p of products) {
    const code = productCode(p.name ?? '');
    if (!code) continue;
    if (!byExp.has(p.idExpansion)) byExp.set(p.idExpansion, new Map());
    const m = byExp.get(p.idExpansion);
    if (!m.has(code)) m.set(code, []);
    m.get(code).push(p.idProduct);
  }
  for (const m of byExp.values()) for (const ids of m.values()) ids.sort((a, b) => a - b);
  return byExp;
}

/**
 * Région des extensions Cardmarket d'après leurs produits scellés : « asia » (« … Booster Box (Non-English) »,
 * « (Japanese) », « (Asia Region Legal) ») ou « intl » (anglais, cartes européennes) ; sans produit scellé : inconnue.
 */
export function expansionRegions(sealed) {
  const out = new Map();
  for (const p of sealed) {
    const asia = /\((Non-English|Japanese|Asia Region Lega)/i.test(p.name ?? '');
    if (asia) out.set(p.idExpansion, 'asia');
    else if (!out.has(p.idExpansion)) out.set(p.idExpansion, 'intl');
  }
  return out;
}

/**
 * Extension Cardmarket d'une extension du catalogue : celle qui couvre le plus de ses numéros (au moins 60 %),
 * à égalité celle dont le nombre de fiches est le plus proche du nombre de versions. `taken` : déjà attribuées ;
 * `allowed(exp)` : extensions possibles (région de la langue des cartes).
 */
export function pickExpansion(cards, byExp, taken = new Set(), allowed = () => true) {
  const codes = new Set(cards.map((c) => c.number));
  const versions = cards.reduce((n, c) => n + (c.v?.length ?? 1), 0);
  let best;
  for (const [exp, m] of byExp) {
    if (taken.has(exp) || !allowed(exp)) continue;
    let hit = 0, count = 0;
    for (const code of codes) if (m.has(code)) { hit++; count += m.get(code).length; }
    if (hit / codes.size < 0.6) continue;
    const cand = { exp, hit, diff: Math.abs(count - versions) };
    if (!best || cand.hit > best.hit || (cand.hit === best.hit && cand.diff < best.diff)) best = cand;
  }
  return best?.exp;
}

/**
 * N° produit Cardmarket de chaque version : dans l'extension choisie, les fiches d'un numéro dans l'ordre des
 * n° produit, attribuées aux versions dans l'ordre normale → réimpressions → parallèles. Renvoie id officiel → n° produit.
 */
export function matchVersions(cards, codes) {
  const out = new Map();
  for (const c of cards) {
    const ids = codes.get(c.number);
    if (!ids) continue;
    (c.v ?? [{ o: c.id }]).forEach((v, i) => { if (ids[i]) out.set(v.o, ids[i]); });
  }
  return out;
}

/** N° produits posés sur les cartes : variante (id) et carte (cm.id = celui de sa première version). */
export function applyProductIds(cards, ids) {
  let n = 0;
  for (const c of cards) {
    for (const v of c.v ?? []) {
      const id = ids.get(v.o);
      if (id) { v.id = id; n++; } else delete v.id;
    }
    const first = c.v?.[0]?.id;
    if (first) c.cm = { ...(c.cm ?? {}), id: first };
    else delete c.cm;
  }
  return n;
}

/**
 * Ordre d'une extension : ses propres cartes d'abord (« OP17-… » dans OP17), puis celles d'autres extensions
 * qu'elle contient (cartes spéciales EB04, réimpressions, promos), chacune dans l'ordre officiel.
 */
export function ownCardsFirst(cards, setId) {
  const own = (c) => c.number.split('-')[0].replace('-', '') === setId;
  return [...cards.filter(own), ...cards.filter((c) => !own(c))];
}
