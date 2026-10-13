import { DIM, MODEL, decodeIndex, mergeIndexes, normalizeVec, topMatches, type IndexFile, type Match, type VisualIndex } from './visualIndex';

export const visualSupported = true;

/** Les fichiers de catalogue sont publiés à côté de l'app : /<dépôt>/catalog/… */
function siteRoot(): string {
  const path = window.location.pathname;
  const i = path.indexOf('/app');
  return window.location.origin + (i >= 0 ? path.slice(0, i) : '');
}
interface Manifest { indexes: { game: string; lang: string; file: string }[] }

async function fetchIndex(url: string): Promise<VisualIndex | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return decodeIndex((await r.json()) as IndexFile);
  } catch {
    return null;
  }
}

// Import dynamique depuis le CDN, hors du bundle (le modèle et son moteur pèsent plusieurs Mo).
const cdnImport = new Function('u', 'return import(u)') as (u: string) => Promise<any>;

let index: Promise<VisualIndex | null> | null = null;
let model: Promise<{ T: any; proc: any; net: any }> | null = null;

/**
 * Tous les index visuels publiés (catalog/index.json liste un fichier par jeu et langue, construit par GitHub Actions).
 * Sans liste : l'index Pokémon japonais, puis celui de la première version de l'app.
 */
function loadIndex(): Promise<VisualIndex | null> {
  index ??= (async () => {
    const root = `${siteRoot()}/catalog`;
    let list: Manifest['indexes'] = [];
    try {
      const r = await fetch(`${root}/index.json`);
      if (r.ok) list = ((await r.json()) as Manifest).indexes ?? [];
    } catch {
      // pas de liste
    }
    if (!list.length) list = [{ game: 'pokemon', lang: 'ja', file: 'pokemon-ja.json' }];
    const parts = (
      await Promise.all(list.map(async (x) => ({ ...x, index: await fetchIndex(`${root}/${x.file}`) })))
    ).filter((p): p is typeof p & { index: VisualIndex } => !!p.index?.items.length);
    if (!parts.length) {
      const old = await fetchIndex(`${siteRoot()}/card-index.json`);
      if (old) parts.push({ game: 'pokemon', lang: 'ja', file: '', index: old });
    }
    return parts.length ? mergeIndexes(parts) : null;
  })();
  index.then((ix) => { if (!ix) index = null; });
  return index;
}

function loadModel(onStatus?: (percent: number) => void) {
  model ??= (async () => {
    const T = await cdnImport('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
    T.env.allowLocalModels = false;
    const progress = (p: { status?: string; progress?: number; total?: number }) => {
      if (onStatus && p?.status === 'progress' && (p.total ?? 0) > 5e6) onStatus(Math.round(p.progress ?? 0));
    };
    const proc = await T.AutoProcessor.from_pretrained(MODEL);
    const net = await T.CLIPVisionModelWithProjection.from_pretrained(MODEL, { progress_callback: progress });
    return { T, proc, net };
  })();
  model.catch(() => { model = null; });
  return model;
}

/** Charge l'index et le modèle ; renvoie le nombre de cartes reconnaissables. */
export async function prepareVisual(onStatus?: (percent: number) => void): Promise<number> {
  const [ix] = await Promise.all([loadIndex(), loadModel(onStatus)]);
  return ix?.items.length ?? 0;
}

/** `cardImage` : image carrée 224×224 de la carte entière (voir ScanCamera.web). */
export async function matchVisual(cardImage: string): Promise<Match[] | null> {
  const [ix, m] = await Promise.all([loadIndex(), loadModel()]);
  if (!ix) return null;
  const raw = await m.T.RawImage.fromURL(cardImage);
  const out = await m.net(await m.proc(raw));
  const v = normalizeVec(Float32Array.from(out.image_embeds.data as ArrayLike<number>).slice(0, DIM));
  return topMatches(v, ix, 5);
}
