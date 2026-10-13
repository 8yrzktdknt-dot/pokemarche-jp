/**
 * Index visuel des cartes : une empreinte (vecteur CLIP de 512 nombres) par carte,
 * stockée en entiers 8 bits + un facteur d'échelle par carte (format « v1 » de la première version de l'app).
 */
export const MODEL = 'Xenova/clip-vit-base-patch32';
export const DIM = 512;

export interface IndexItem {
  id: string;
  name: string;
  localId: string;
  image: string;
  /** Jeu et langue de l'index d'origine (renseignés au chargement). */
  game?: string;
  lang?: string;
}

export interface VisualIndex {
  items: IndexItem[];
  /** Vecteurs normalisés, à la suite (items.length × DIM). */
  vecs: Float32Array;
  built?: string;
}

export interface IndexFile {
  v: 1;
  model: string;
  dim: number;
  built?: string;
  items: [string, string, string, string][];
  scales: number[];
  data: string;
}

function int8FromB64(b64: string): Int8Array {
  const bin = atob(b64);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return new Int8Array(u.buffer);
}

function b64FromInt8(a: Int8Array): string {
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < a.length; i += chunk) {
    s += String.fromCharCode(...new Uint8Array(a.buffer, a.byteOffset + i, Math.min(chunk, a.length - i)));
  }
  return btoa(s);
}

export function normalizeVec(v: Float32Array): Float32Array {
  let n = 0;
  for (let i = 0; i < v.length; i++) n += v[i] * v[i];
  n = Math.sqrt(n) || 1;
  for (let i = 0; i < v.length; i++) v[i] /= n;
  return v;
}

export function decodeIndex(o: IndexFile): VisualIndex | null {
  if (!o || o.v !== 1 || o.model !== MODEL || o.dim !== DIM || !o.data || !Array.isArray(o.items)) return null;
  const q = int8FromB64(o.data);
  const n = o.items.length;
  const vecs = new Float32Array(n * DIM);
  for (let i = 0; i < n; i++) {
    const row = vecs.subarray(i * DIM, (i + 1) * DIM);
    for (let j = 0; j < DIM; j++) row[j] = q[i * DIM + j] * o.scales[i];
    normalizeVec(row);
  }
  return { items: o.items.map(([id, name, localId, image]) => ({ id, name, localId, image })), vecs, built: o.built };
}

export function encodeIndex(items: IndexItem[], vecs: Float32Array, built: string): IndexFile {
  const n = items.length;
  const q = new Int8Array(n * DIM);
  const scales: number[] = [];
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (let j = 0; j < DIM; j++) m = Math.max(m, Math.abs(vecs[i * DIM + j]));
    const sc = (m || 1) / 127;
    scales.push(+sc.toPrecision(6));
    for (let j = 0; j < DIM; j++) q[i * DIM + j] = Math.round(vecs[i * DIM + j] / sc);
  }
  return { v: 1, model: MODEL, dim: DIM, built, items: items.map((c) => [c.id, c.name, c.localId, c.image]), scales, data: b64FromInt8(q) };
}

export interface Match {
  item: IndexItem;
  score: number;
}

/** Les k cartes les plus proches (similarité cosinus, vecteurs déjà normalisés). */
export function topMatches(q: Float32Array, ix: VisualIndex, k = 5, accept?: (item: IndexItem) => boolean): Match[] {
  const n = ix.items.length;
  const best: Match[] = [];
  for (let i = 0; i < n; i++) {
    if (accept && !accept(ix.items[i])) continue;
    let s = 0;
    const o = i * DIM;
    for (let j = 0; j < DIM; j++) s += q[j] * ix.vecs[o + j];
    if (best.length < k || s > best[best.length - 1].score) {
      best.push({ item: ix.items[i], score: s });
      best.sort((a, b) => b.score - a.score);
      if (best.length > k) best.pop();
    }
  }
  return best;
}

/** Seuils de la première version : très proche, et nettement devant la deuxième carte. */
export const isConfident = (top: Match[]) =>
  top.length > 0 && top[0].score >= 0.92 && top[0].score - (top[1]?.score ?? 0) >= 0.04;

/** Assemble plusieurs index (un par jeu et langue) en un seul pour la recherche. */
export function mergeIndexes(parts: { index: VisualIndex; game: string; lang: string }[]): VisualIndex {
  const n = parts.reduce((k, p) => k + p.index.items.length, 0);
  const vecs = new Float32Array(n * DIM);
  const items: IndexItem[] = [];
  let o = 0;
  for (const p of parts) {
    vecs.set(p.index.vecs, o * DIM);
    for (const it of p.index.items) items.push({ ...it, game: p.game, lang: p.lang });
    o += p.index.items.length;
  }
  return { items, vecs };
}

/** Même carte en tête plusieurs fois de suite, même sans certitude absolue : on la propose. */
export const isLikely = (history: Match[][]) =>
  history.length >= 3 &&
  history.slice(-3).every((m) => m[0] && m[0].item.id === history[history.length - 1][0]?.item.id && m[0].score >= 0.85);
