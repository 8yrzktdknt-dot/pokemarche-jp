// Noms des blocs et des extensions dans chaque langue de l'app (champ « names » des fichiers sets/pokemon-*.json) :
//  - extensions internationales : nom de la même extension dans les catalogues anglais, français, allemand, espagnol,
//    italien, portugais (et néerlandais, russe quand TCGdex les a) ;
//  - extensions japonaises et chinoises traditionnelles (mêmes codes) : anglais, japonais, chinois traditionnel,
//    et chinois simplifié converti depuis le traditionnel (OpenCC) ;
//  - extensions chinoises simplifiées : chinois simplifié, et traditionnel converti.
// L'app affiche names[langue de l'app], sinon l'anglais, sinon le nom de la source.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as OpenCC from 'opencc-js';
import { CATALOG, getJson, writeJson } from './lib.mjs';

const INTL = ['en', 'fr', 'de', 'es', 'it', 'pt'];
const EXTRA = ['nl', 'ru'];
const API = 'https://api.tcgdex.net/v2';

const read = (lang) => {
  const f = join(CATALOG, 'sets', `pokemon-${lang}.json`);
  return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null;
};

/** Champs vides retirés ; undefined si rien. */
const clean = (o) => {
  const out = Object.fromEntries(Object.entries(o).filter(([, v]) => v && String(v).trim()));
  return Object.keys(out).length ? out : undefined;
};

export async function buildSetNames({ online = true } = {}) {
  const files = Object.fromEntries(['en', 'fr', 'de', 'es', 'it', 'pt', 'ja', 'zh-tw', 'zh-cn'].map((l) => [l, read(l)]));
  const t2s = OpenCC.Converter({ from: 'tw', to: 'cn' });
  const s2t = OpenCC.Converter({ from: 'cn', to: 'tw' });

  // Extensions et blocs internationaux : id → nom, par langue.
  const sets = {}, blocs = {};
  for (const l of INTL) {
    if (!files[l]) continue;
    sets[l] = new Map(files[l].blocs.flatMap((b) => b.sets.map((s) => [s.id, s.name])));
    blocs[l] = new Map(files[l].blocs.map((b) => [b.id, b.name]));
  }
  if (online) {
    for (const l of EXTRA) {
      const list = await getJson(`${API}/${l}/sets`).catch(() => null);
      const series = await getJson(`${API}/${l}/series`).catch(() => null);
      if (Array.isArray(list) && list.length) sets[l] = new Map(list.map((s) => [s.id, s.name]));
      if (Array.isArray(series) && series.length) blocs[l] = new Map(series.map((s) => [s.id, s.name]));
    }
  }
  const pick = (maps, id) => clean(Object.fromEntries(Object.entries(maps).map(([l, m]) => [l, m.get(id)])));

  for (const l of INTL) {
    if (!files[l]) continue;
    for (const b of files[l].blocs) {
      b.names = pick(blocs, b.id);
      for (const s of b.sets) s.names = pick(sets, s.id);
    }
  }

  // Japonais ↔ chinois traditionnel : mêmes codes d'extension.
  const ja = new Map((files.ja?.blocs ?? []).flatMap((b) => b.sets.map((s) => [s.id.toLowerCase(), s])));
  const tw = new Map((files['zh-tw']?.blocs ?? []).flatMap((b) => b.sets.map((s) => [s.id.toLowerCase(), s])));
  const asian = (id, en) => {
    const j = ja.get(id.toLowerCase());
    const t = tw.get(id.toLowerCase())?.nameLocal;
    return clean({ en: en ?? j?.name, ja: j?.nameLocal, 'zh-tw': t, 'zh-cn': t ? t2s(t) : undefined });
  };
  for (const b of files.ja?.blocs ?? []) for (const s of b.sets) s.names = asian(s.id, s.name);
  for (const b of files['zh-tw']?.blocs ?? []) {
    // Blocs propres au site taïwanais (« tw-超級進化 ») : nom chinois.
    if (b.id.startsWith('tw-')) b.names = clean({ 'zh-tw': b.name, 'zh-cn': t2s(b.name) });
    for (const s of b.sets) s.names = asian(s.id, s.name);
  }
  for (const b of files['zh-cn']?.blocs ?? []) for (const s of b.sets) s.names = clean({ 'zh-cn': s.name, 'zh-tw': s2t(s.name) });

  let n = 0;
  for (const [l, data] of Object.entries(files)) {
    if (!data) continue;
    writeJson(`sets/pokemon-${l}.json`, data);
    n += data.blocs.reduce((k, b) => k + b.sets.filter((s) => s.names).length, 0);
  }
  console.log(`Noms d'extensions traduits : ${n} extensions${Object.keys(sets).length ? ` (${Object.keys(sets).join(', ')})` : ''}`);
}
