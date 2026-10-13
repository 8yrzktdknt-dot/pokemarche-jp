import { DIM, MODEL, decodeIndex, normalizeVec, topMatches, type IndexFile, type Match, type VisualIndex } from './visualIndex';

export const visualSupported = true;

/** Les fichiers de catalogue sont publiés à côté de l'app : /<dépôt>/catalog/… */
function siteRoot(): string {
  const path = window.location.pathname;
  const i = path.indexOf('/app');
  return window.location.origin + (i >= 0 ? path.slice(0, i) : '');
}
/** Catalogue construit par GitHub Actions, sinon l'index de la première version de l'app. */
const INDEX_URLS = () => [`${siteRoot()}/catalog/pokemon-ja.json`, `${siteRoot()}/card-index.json`];

// Import dynamique depuis le CDN, hors du bundle (le modèle et son moteur pèsent plusieurs Mo).
const cdnImport = new Function('u', 'return import(u)') as (u: string) => Promise<any>;

let index: Promise<VisualIndex | null> | null = null;
let model: Promise<{ T: any; proc: any; net: any }> | null = null;

function loadIndex(): Promise<VisualIndex | null> {
  index ??= (async () => {
    for (const url of INDEX_URLS()) {
      try {
        const r = await fetch(url);
        if (!r.ok) continue;
        const ix = decodeIndex((await r.json()) as IndexFile);
        if (ix?.items.length) return ix;
      } catch {
        // essai suivant
      }
    }
    return null;
  })();
  index.then((ix) => { if (!ix) index = null; });
  return index;
}

function loadModel(onStatus?: (msg: string) => void) {
  model ??= (async () => {
    const T = await cdnImport('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
    T.env.allowLocalModels = false;
    const progress = (p: { status?: string; progress?: number; total?: number }) => {
      if (onStatus && p?.status === 'progress' && (p.total ?? 0) > 5e6) {
        onStatus(`Téléchargement de l'IA de reconnaissance… ${Math.round(p.progress ?? 0)} %`);
      }
    };
    const proc = await T.AutoProcessor.from_pretrained(MODEL);
    const net = await T.CLIPVisionModelWithProjection.from_pretrained(MODEL, { progress_callback: progress });
    return { T, proc, net };
  })();
  model.catch(() => { model = null; });
  return model;
}

/** Charge l'index et le modèle ; renvoie le nombre de cartes reconnaissables. */
export async function prepareVisual(onStatus?: (msg: string) => void): Promise<number> {
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
