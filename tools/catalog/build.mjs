// Construit catalog/pokemon-<langue>.json : une empreinte visuelle (CLIP) par carte Pokémon, pour le scanner.
// Lancé par GitHub Actions (.github/workflows/build-catalog.yml). Incrémental : les cartes déjà présentes
// dans le fichier ne sont pas recalculées.
//
//   CARD_LANG=ja SETS=SV8,SV8a npm run build
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { AutoProcessor, CLIPVisionModelWithProjection, RawImage } from '@xenova/transformers';
import { DIM, MODEL, decodeIndex, encodeIndex, normalizeVec } from '../../mobile/src/lib/scan/visualIndex.ts';

const LANG = process.env.CARD_LANG || 'ja';
const ONLY = (process.env.SETS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const API = 'https://api.tcgdex.net/v2';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = join(root, 'catalog', `pokemon-${LANG}.json`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(url, tries = 4) {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url);
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      if (i >= tries) throw new Error(`${url} : ${e.message}`);
      await sleep(1000 * 2 ** i);
    }
  }
}
async function getBuffer(url, tries = 3) {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url);
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return Buffer.from(await r.arrayBuffer());
    } catch (e) {
      if (i >= tries) return null;
      await sleep(1000 * 2 ** i);
    }
  }
}

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

// Index existants : on garde leurs empreintes. card-index.json (première version de l'app) contient des
// extensions récentes dont TCGdex n'a pas encore les images : elles restent dans le catalogue.
const previous = new Map();
const sources = [out];
if (LANG === 'ja') sources.unshift(join(root, 'card-index.json'));
for (const file of sources) {
  if (!existsSync(file)) continue;
  const ix = decodeIndex(JSON.parse(readFileSync(file, 'utf8')));
  ix?.items.forEach((it, i) => previous.set(it.id, { item: it, vec: ix.vecs.slice(i * DIM, (i + 1) * DIM) }));
  console.log(`${file} : ${ix?.items.length ?? 0} cartes`);
}

const sets = (await getJson(`${API}/${LANG}/sets`)) ?? [];
const wanted = sets.filter((s) => !ONLY.length || ONLY.includes(s.id.toLowerCase()));
console.log(`${wanted.length} extensions (${LANG})`);

const cards = [];
for (const s of wanted) {
  const full = await getJson(`${API}/${LANG}/sets/${encodeURIComponent(s.id)}`);
  for (const c of full?.cards ?? []) if (c.image) cards.push({ id: c.id, name: c.name, localId: c.localId, image: c.image });
}
console.log(`${cards.length} cartes avec image`);

const todo = cards.filter((c) => !previous.has(c.id));
console.log(`${todo.length} nouvelles empreintes à calculer`);

const items = [];
const vecs = [];
for (const c of cards) {
  const p = previous.get(c.id);
  if (p) { items.push({ ...p.item, name: c.name, image: c.image }); vecs.push(p.vec); }
}

if (todo.length) {
  const proc = await AutoProcessor.from_pretrained(MODEL);
  const net = await CLIPVisionModelWithProjection.from_pretrained(MODEL);
  let done = 0;
  let failed = 0;
  // Téléchargements en parallèle par petits lots, calcul des empreintes à la suite.
  for (let i = 0; i < todo.length; i += 8) {
    const batch = todo.slice(i, i + 8);
    const bufs = await Promise.all(batch.map((c) => getBuffer(`${c.image}/low.webp`)));
    for (let k = 0; k < batch.length; k++) {
      if (!bufs[k]) { failed++; continue; }
      try {
        const outp = await net(await proc(await squareImage(bufs[k])));
        vecs.push(normalizeVec(Float32Array.from(outp.image_embeds.data).slice(0, DIM)));
        items.push(batch[k]);
      } catch {
        failed++;
      }
    }
    done += batch.length;
    if (done % 200 < 8) console.log(`${done}/${todo.length} (${failed} échecs)`);
  }
  console.log(`Terminé : ${todo.length - failed} ajoutées, ${failed} échecs`);
}

// Cartes connues sans image TCGdex : conservées telles quelles.
const seen = new Set(items.map((it) => it.id));
let kept = 0;
for (const [id, p] of previous) {
  if (!seen.has(id)) { items.push(p.item); vecs.push(p.vec); kept++; }
}
if (kept) console.log(`${kept} cartes conservées des index précédents`);

const flat = new Float32Array(items.length * DIM);
vecs.forEach((v, i) => flat.set(v, i * DIM));
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(encodeIndex(items, flat, new Date().toISOString())));
console.log(`${out} : ${items.length} cartes`);
