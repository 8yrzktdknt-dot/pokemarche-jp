import { DIM, MODEL, decodeIndex, mergeIndexes, normalizeVec, topMatches, type IndexFile, type IndexItem, type Match, type VisualIndex } from './visualIndex';

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

let manifest: Promise<Manifest['indexes']> | null = null;
const files = new Map<string, Promise<VisualIndex | null>>();
const merged = new Map<string, Promise<VisualIndex | null>>();
let model: Promise<{ T: any; proc: any; net: any }> | null = null;

function loadManifest(): Promise<Manifest['indexes']> {
  manifest ??= (async () => {
    try {
      const r = await fetch(`${siteRoot()}/catalog/index.json`);
      if (r.ok) return ((await r.json()) as Manifest).indexes ?? [];
    } catch {
      // pas de liste
    }
    return [];
  })();
  return manifest;
}

function loadFile(url: string): Promise<VisualIndex | null> {
  if (!files.has(url)) {
    const p = fetchIndex(url);
    files.set(url, p);
    p.then((ix) => { if (!ix) files.delete(url); });
  }
  return files.get(url)!;
}

/**
 * Index visuels publiés (catalog/index.json liste un fichier par jeu et langue, construit par GitHub Actions).
 * `pokemonLang` : langue des cartes Pokémon choisie avec le drapeau ; seul cet index Pokémon est téléchargé
 * (tous en mode automatique). Sans liste : l'index Pokémon japonais, puis celui de la première version de l'app.
 */
function loadIndex(pokemonLang = 'auto'): Promise<VisualIndex | null> {
  if (!merged.has(pokemonLang)) {
    const p = (async () => {
      const root = `${siteRoot()}/catalog`;
      let list = await loadManifest();
      if (!list.length) list = [{ game: 'pokemon', lang: 'ja', file: 'pokemon-ja.json' }];
      const wanted = list.filter((x) => pokemonLang === 'auto' || x.game !== 'pokemon' || x.lang === pokemonLang);
      const parts = (
        await Promise.all(wanted.map(async (x) => ({ ...x, index: await loadFile(`${root}/${x.file}`) })))
      ).filter((q): q is typeof q & { index: VisualIndex } => !!q.index?.items.length);
      if (!parts.some((q) => q.game === 'pokemon') && (pokemonLang === 'auto' || pokemonLang === 'ja')) {
        const old = await loadFile(`${siteRoot()}/card-index.json`);
        if (old) parts.push({ game: 'pokemon', lang: 'ja', file: '', index: old });
      }
      return parts.length ? mergeIndexes(parts) : null;
    })();
    merged.set(pokemonLang, p);
    p.then((ix) => { if (!ix) merged.delete(pokemonLang); });
  }
  return merged.get(pokemonLang)!;
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
export async function prepareVisual(onStatus?: (percent: number) => void, pokemonLang?: string): Promise<number> {
  const [ix] = await Promise.all([loadIndex(pokemonLang), loadModel(onStatus)]);
  return ix?.items.length ?? 0;
}

/** `cardImage` : image carrée 224×224 de la carte entière (voir ScanCamera.web). */
export async function matchVisual(
  cardImage: string,
  accept?: (item: IndexItem) => boolean,
  pokemonLang?: string,
): Promise<Match[] | null> {
  const [ix, m] = await Promise.all([loadIndex(pokemonLang), loadModel()]);
  if (!ix) return null;
  const raw = await m.T.RawImage.fromURL(cardImage);
  const out = await m.net(await m.proc(raw));
  const v = normalizeVec(Float32Array.from(out.image_embeds.data as ArrayLike<number>).slice(0, DIM));
  return topMatches(v, ix, 5, accept);
}
