// Noms des blocs et des extensions dans chaque langue de l'app (champ « names » des fichiers sets/pokemon-*.json) :
//  - extensions internationales : nom de la même extension dans les catalogues anglais, français, allemand, espagnol,
//    italien, portugais (et néerlandais, russe quand TCGdex les a) ;
//  - extensions japonaises et chinoises traditionnelles (mêmes codes) : anglais, japonais, chinois traditionnel,
//    et chinois simplifié converti depuis le traditionnel (OpenCC) ;
//  - extensions chinoises simplifiées : chinois simplifié, et traditionnel converti.
// L'app affiche names[langue de l'app], sinon l'anglais, sinon le nom de la source.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as OpenCC from 'opencc-js';
import { CATALOG, getJson, writeJson } from './lib.mjs';
import { buildSpeciesNames, fillNamesFromSpecies } from './names.mjs';

const INTL = ['en', 'fr', 'de', 'es', 'it', 'pt'];
const EXTRA = ['nl', 'ru'];
const API = 'https://api.tcgdex.net/v2';

/** Noms des grandes séries dans les 13 langues de l'app (les noms officiels des catalogues passent devant). */
const SERIES = {
  mega: ['Méga-Évolution', 'Mega Evolution', 'メガシンカ', '超級進化', '超级进化', 'Megaevolución', 'Megaevoluzione', 'Mega-Entwicklung', 'Mega-evolutie', 'Megaevolução', 'Мегаэволюция', 'เมกะวิวัฒนาการ', '메가진화'],
  sv: ['Écarlate et Violet', 'Scarlet & Violet', 'スカーレット&バイオレット', '朱&紫', '朱&紫', 'Escarlata y Púrpura', 'Scarlatto e Violetto', 'Karmesin & Purpur', 'Scharlaken & Violet', 'Escarlate e Violeta', 'Алый и Фиолетовый', 'สการ์เล็ต & ไวโอเล็ต', '스칼렛&바이올렛'],
  swsh: ['Épée et Bouclier', 'Sword & Shield', 'ソード&シールド', '劍&盾', '剑&盾', 'Espada y Escudo', 'Spada e Scudo', 'Schwert & Schild', 'Zwaard & Schild', 'Espada e Escudo', 'Меч и Щит', 'ซอร์ด & ชีลด์', '소드&실드'],
  sm: ['Soleil et Lune', 'Sun & Moon', 'サン&ムーン', '太陽&月亮', '太阳&月亮', 'Sol y Luna', 'Sole e Luna', 'Sonne & Mond', 'Zon & Maan', 'Sol e Lua', 'Солнце и Луна', 'ซัน & มูน', '썬&문'],
  xy: ['XY', 'XY', 'XY', 'XY', 'XY', 'XY', 'XY', 'XY', 'XY', 'XY', 'XY', 'XY', 'XY'],
  bw: ['Noir et Blanc', 'Black & White', 'ブラック&ホワイト', '黑&白', '黑&白', 'Negro y Blanco', 'Nero e Bianco', 'Schwarz & Weiß', 'Zwart & Wit', 'Preto e Branco', 'Чёрное и Белое', 'แบล็ก & ไวท์', '블랙&화이트'],
  '30th': ['30e anniversaire', '30th Celebration', '30周年', '30週年', '30周年', '30.º aniversario', '30° anniversario', '30. Jubiläum', '30-jarig jubileum', '30.º aniversário', '30-летие', 'ครบรอบ 30 ปี', '30주년'],
};
const SERIES_LANGS = ['fr', 'en', 'ja', 'zh-tw', 'zh-cn', 'es', 'it', 'de', 'nl', 'pt', 'ru', 'th', 'ko'];
/** Identifiants de blocs (international, japonais, chinois) → série. */
const SERIES_OF = { me: 'mega', mega: 'mega', sv: 'sv', 'scarlet-violet': 'sv', swsh: 'swsh', 'sword-shield': 'swsh', sm: 'sm', 'sun-moon': 'sm', xy: 'xy', bw: 'bw', 'black-white': 'bw', '30th': '30th' };
const seriesNames = (id) => (SERIES[SERIES_OF[id]] ? Object.fromEntries(SERIES_LANGS.map((l, i) => [l, SERIES[SERIES_OF[id]][i]])) : undefined);

const read = (lang) => {
  const f = join(CATALOG, 'sets', `pokemon-${lang}.json`);
  return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null;
};

/** Champs vides retirés ; undefined si rien. */
const clean = (o) => {
  const out = Object.fromEntries(Object.entries(o).filter(([, v]) => v && String(v).trim()));
  return Object.keys(out).length ? out : undefined;
};

const t2s = OpenCC.Converter({ from: 'tw', to: 'cn' });
const s2t = OpenCC.Converter({ from: 'cn', to: 'tw' });

export async function buildSetNames({ online = true } = {}) {
  if (online) await buildSpeciesNames(writeJson).catch((e) => console.warn('Noms d\'espèces :', e.message));
  // Cartes sans nom anglais (extensions propres à Taïwan, promos…) : traduites par l'espèce.
  const readJson = (rel) => (existsSync(join(CATALOG, rel)) ? JSON.parse(readFileSync(join(CATALOG, rel), 'utf8')) : null);
  const listFiles = (rel) => (existsSync(join(CATALOG, rel)) ? readdirSync(join(CATALOG, rel)).filter((f) => f.endsWith('.json')) : []);
  fillNamesFromSpecies(readJson, writeJson, listFiles, { 'zh-tw': { 'zh-cn': t2s }, 'zh-cn': { 'zh-tw': s2t } });
  const files = Object.fromEntries(['en', 'fr', 'de', 'es', 'it', 'pt', 'ja', 'zh-tw', 'zh-cn'].map((l) => [l, read(l)]));

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
  // Extension japonaise au même nom anglais qu'une extension internationale (« 30th Celebration » = 30th) :
  // ses noms officiels dans les autres langues (« 30ᵉ Anniversaire »…). Les autres gardent leur nom anglais officiel.
  const key = (n) => (n ?? '').toLowerCase().replace(/&/g, 'and').normalize('NFKD').replace(/[^a-z0-9]/g, '');
  const intlByName = new Map((files.en?.blocs ?? []).flatMap((b) => b.sets.map((s) => [key(s.name), s.names])));
  const asian = (id, en) => {
    const j = ja.get(id.toLowerCase());
    const t = tw.get(id.toLowerCase())?.nameLocal;
    const intl = intlByName.get(key(en ?? j?.name));
    return clean({ ...(intl ?? {}), en: en ?? j?.name, ja: j?.nameLocal, 'zh-tw': t, 'zh-cn': t ? t2s(t) : undefined });
  };
  for (const b of files.ja?.blocs ?? []) for (const s of b.sets) s.names = asian(s.id, s.name);
  for (const b of files['zh-tw']?.blocs ?? []) {
    // Blocs propres au site taïwanais (« tw-超級進化 ») : nom chinois.
    if (b.id.startsWith('tw-')) b.names = clean({ 'zh-tw': b.name, 'zh-cn': t2s(b.name) });
    for (const s of b.sets) s.names = asian(s.id, s.name);
  }
  for (const b of files['zh-cn']?.blocs ?? []) for (const s of b.sets) s.names = clean({ 'zh-cn': s.name, 'zh-tw': s2t(s.name) });

  // Blocs : noms de série dans toutes les langues, complétés par les noms officiels déjà relevés.
  for (const data of Object.values(files)) {
    for (const b of data?.blocs ?? []) {
      const series = seriesNames(b.id);
      if (series) b.names = { ...series, ...(b.names ?? {}) };
    }
  }

  let n = 0;
  for (const [l, data] of Object.entries(files)) {
    if (!data) continue;
    writeJson(`sets/pokemon-${l}.json`, data);
    n += data.blocs.reduce((k, b) => k + b.sets.filter((s) => s.names).length, 0);
  }
  console.log(`Noms d'extensions traduits : ${n} extensions${Object.keys(sets).length ? ` (${Object.keys(sets).join(', ')})` : ''}`);
}
