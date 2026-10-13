// Index visuels (empreintes CLIP) construits à partir du catalogue : un fichier par jeu et langue,
// listés dans catalog/index.json pour le scanner. Incrémental : une carte déjà calculée avec la même image est gardée.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { AutoProcessor, CLIPVisionModelWithProjection, RawImage } from '@xenova/transformers';
import { DIM, MODEL, decodeIndex, encodeIndex, normalizeVec } from '../../mobile/src/lib/scan/visualIndex.ts';
import { CATALOG, ROOT, getBuffer, pool, writeJson } from './lib.mjs';

/** Catalogues indexés. `since` : extensions sorties depuis cette date seulement (taille du fichier à télécharger). */
export const TARGETS = [
  { game: 'pokemon', lang: 'ja', since: process.env.VISUAL_SINCE_POKEMON_JA || '2019-01-01', seed: 'card-index.json' },
  { game: 'pokemon', lang: 'fr', since: process.env.VISUAL_SINCE_POKEMON_INTL || '2019-01-01' },
  { game: 'pokemon', lang: 'en', since: process.env.VISUAL_SINCE_POKEMON_INTL || '2019-01-01' },
  { game: 'onepiece', lang: 'en' },
  { game: 'riftbound', lang: 'en' },
];

const readJson = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null);

// Même mise en forme que la photo du scanner : carte entière dans un carré 224×224 sur fond gris.
async function squareImage(buf) {
  const { data, info } = await sharp(buf)
    .resize(224, 224, { fit: 'contain', background: { r: 128, g: 128, b: 128, alpha: 1 } })
    .flatten({ background: { r: 128, g: 128, b: 128 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return new RawImage(new Uint8ClampedArray(data), info.width, info.height, 4);
}

let model = null;
async function embedder() {
  model ??= (async () => ({
    proc: await AutoProcessor.from_pretrained(MODEL),
    net: await CLIPVisionModelWithProjection.from_pretrained(MODEL),
  }))();
  return model;
}

async function buildTarget({ game, lang, since, seed }) {
  const sets = readJson(join(CATALOG, 'sets', `${game}-${lang}.json`));
  if (!sets) { console.warn(`${game}-${lang} : pas de catalogue, index ignoré`); return null; }
  const cards = [];
  for (const b of sets.blocs) {
    for (const s of b.sets) {
      if (since && s.releaseDate && s.releaseDate < since) continue;
      for (const c of readJson(join(CATALOG, 'cards', `${game}-${lang}`, `${s.id}.json`)) ?? []) {
        if (c.image) cards.push({ id: c.id, name: c.nameEn ?? c.name, localId: c.localId, image: c.image });
      }
    }
  }

  // Empreintes déjà calculées (même carte, même image), plus l'index de la première version pour les cartes japonaises.
  const previous = new Map();
  const file = `${game}-${lang}.json`;
  for (const f of [seed && join(ROOT, seed), join(CATALOG, file)].filter(Boolean)) {
    const ix = existsSync(f) ? decodeIndex(readJson(f)) : null;
    ix?.items.forEach((it, i) => previous.set(it.id, { item: it, vec: ix.vecs.slice(i * DIM, (i + 1) * DIM) }));
  }
  const reuse = (c) => { const p = previous.get(c.id); return p && (!p.item.image || p.item.image === c.image) ? p : null; };
  const todo = cards.filter((c) => !reuse(c));
  console.log(`${file} : ${cards.length} cartes, ${todo.length} empreintes à calculer`);

  const fresh = new Map();
  if (todo.length) {
    const { proc, net } = await embedder();
    let failed = 0;
    for (let i = 0; i < todo.length; i += 16) {
      const batch = todo.slice(i, i + 16);
      const bufs = await pool(batch, 8, (c) => getBuffer(c.image));
      for (let k = 0; k < batch.length; k++) {
        try {
          if (!bufs[k]) throw new Error('image');
          const out = await net(await proc(await squareImage(bufs[k])));
          fresh.set(batch[k].id, normalizeVec(Float32Array.from(out.image_embeds.data).slice(0, DIM)));
        } catch {
          failed++;
        }
      }
      if ((i / 16) % 25 === 0) console.log(`  ${Math.min(i + 16, todo.length)}/${todo.length} (${failed} échecs)`);
    }
  }

  const items = [];
  const vecs = [];
  for (const c of cards) {
    const v = fresh.get(c.id) ?? reuse(c)?.vec;
    if (v) { items.push(c); vecs.push(v); }
  }
  const flat = new Float32Array(items.length * DIM);
  vecs.forEach((v, i) => flat.set(v, i * DIM));
  writeJson(file, encodeIndex(items, flat, new Date().toISOString()));
  console.log(`${file} : ${items.length} cartes indexées`);
  return { game, lang, file, count: items.length };
}

const only = (process.env.VISUAL_TARGETS || '').split(',').map((x) => x.trim()).filter(Boolean);

export async function buildVisual(targets = only.length ? TARGETS.filter((t) => only.includes(`${t.game}-${t.lang}`)) : TARGETS) {
  const done = [];
  for (const t of targets) {
    const r = await buildTarget(t);
    if (r) done.push(r);
  }
  // Garde dans la liste les index existants qui n'ont pas été reconstruits cette fois.
  const old = readJson(join(CATALOG, 'index.json'))?.indexes ?? [];
  const merged = [...done, ...old.filter((o) => !done.some((d) => d.file === o.file) && existsSync(join(CATALOG, o.file)))];
  writeJson('index.json', { model: MODEL, built: new Date().toISOString(), indexes: merged });
}
