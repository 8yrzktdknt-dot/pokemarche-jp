// Pokémon en chinois :
//  - traditionnel (zh-tw) : site officiel asia.pokemon-card.com/tw (extensions, cartes, visuels, attributs). Les codes
//    d'extension sont ceux du japonais : chaque carte reprend les noms traduits, la rareté et la fiche Cardmarket
//    (extension japonaise, qui vend aussi le chinois traditionnel) de la carte japonaise de même code et numéro ;
//  - simplifié (zh-cn) : base communautaire tcg.mik.moe (codes chinois : CSV1C, CS4aC…), visuels et attributs ;
//    fiche Cardmarket de l'extension chinoise simplifiée quand Cardmarket en a une, sinon celle de la carte
//    internationale reprise (même illustration, numéro anglais donné par mik.moe).
// Les pages sources sont relues une fois par semaine (caches catalog/zh/*) ; chaque jour les prix sont recopiés.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadCardmarketFiles, matchProducts, pickExpansion, priceOf } from './cardmarket-japanese.mjs';
import { CATALOG, pool, sleep, sortByRelease, unescapeHtml, writeJson } from './lib.mjs';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const TW = 'https://asia.pokemon-card.com/tw';
const MIK = 'https://tcg.mik.moe';
const WEEK = 6 * 864e5;

const readJson = (rel, fallback) => {
  const f = join(CATALOG, rel);
  return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : fallback;
};

async function request(url, init = {}, tries = 3) {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url, { ...init, headers: { 'User-Agent': UA, ...(init.headers ?? {}) } });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r;
    } catch (e) {
      if (i >= tries) { console.warn(`échec ${url} : ${e.message}`); return null; }
      await sleep(1500 * 2 ** i);
    }
  }
}
const html = async (url) => (await request(url))?.text() ?? null;

// ——— Libellés → français (comme les cartes japonaises) ———

const ENERGY_FR = { Grass: 'Plante', Fire: 'Feu', Water: 'Eau', Lightning: 'Électrique', Psychic: 'Psy', Fighting: 'Combat', Darkness: 'Obscurité', Metal: 'Métal', Dragon: 'Dragon', Colorless: 'Incolore', Fairy: 'Fée' };
const ENERGY_LETTER = { G: 'Grass', R: 'Fire', W: 'Water', L: 'Lightning', P: 'Psychic', F: 'Fighting', D: 'Darkness', M: 'Metal', N: 'Dragon', C: 'Colorless', Y: 'Fairy' };
const TW_STAGES = { 基礎: 'De base', '1階進化': 'Niveau 1', '2階進化': 'Niveau 2', 'V進化': 'VMAX', VMAX: 'VMAX', VSTAR: 'VSTAR', 超級進化: 'Méga', 太晶: 'Téracristal' };
const EN_STAGES = { Basic: 'De base', 'Stage 1': 'Niveau 1', 'Stage 2': 'Niveau 2', VMAX: 'VMAX', VSTAR: 'VSTAR', 'V-UNION': 'V-UNION', BREAK: 'TURBO', Mega: 'Méga', 'Level-Up': 'Niveau X' };
const CN_CATEGORIES = { Pokemon: 'Pokémon', Item: 'Dresseur · Objet', Supporter: 'Dresseur · Supporter', Stadium: 'Dresseur · Stade', Tool: 'Dresseur · Outil Pokémon', Trainer: 'Dresseur', 'Basic Energy': 'Énergie · Énergie de base', 'Special Energy': 'Énergie · Énergie spéciale', Energy: 'Énergie' };

// ——— Chinois traditionnel : site officiel ———

/** Extensions de la page « card-search » : code, série, titre chinois, date de sortie (MM-DD-YYYY). */
export function parseTwExpansions(page) {
  const out = [];
  for (const m of page.matchAll(/<li class="expansion">([\s\S]*?)<\/li>/g)) {
    const b = m[1];
    const code = b.match(/expansionCodes=([A-Za-z0-9.-]+)/)?.[1];
    if (!code) continue;
    const d = b.match(/datetime="(\d{2})-(\d{2})-(\d{4})"/);
    out.push({
      code,
      series: unescapeHtml(b.match(/class="series">([^<]*)</)?.[1] ?? ''),
      title: unescapeHtml(b.match(/class="expansionTitle">([^<]*)</)?.[1] ?? '').replace(/\s+/g, ' '),
      date: d ? `${d[3]}-${d[1]}-${d[2]}` : undefined,
    });
  }
  return out;
}

/** Fiche d'une carte : nom, numéro, PV, type, stade, illustrateur, marque de réglementation, n° Pokédex. */
export function parseTwDetail(page) {
  const h1 = page.match(/<h1 class="pageHeader cardDetail">([\s\S]*?)<\/h1>/)?.[1] ?? '';
  const stage = h1.match(/class="evolveMarker">([\s\S]*?)<\/span>/)?.[1]?.replace(/\s+/g, '');
  const name = unescapeHtml(h1.replace(/<span[\s\S]*?<\/span>/g, '').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
  const main = page.match(/<p class="mainInfomation">([\s\S]*?)<\/p>/)?.[1] ?? '';
  const types = [...main.matchAll(/energy\/(\w+)\.png/g)].map((m) => m[1]);
  const out = {
    n: name,
    no: page.match(/class="collectorNumber">\s*([^<]*?)\s*</)?.[1],
    hp: main.match(/class="number">\s*(\d+)/)?.[1],
    t: types.length ? types : undefined,
    st: stage || undefined,
    il: page.match(/illustratorName=[^"]*">([^<]+)</)?.[1]?.trim(),
    r: page.match(/class="alpha">\s*([A-Z])\s*</)?.[1],
    dex: page.match(/<h3>No\.(\d+)/)?.[1],
  };
  for (const k of Object.keys(out)) if (!out[k]) delete out[k];
  return out;
}

const twImage = (id) => `${TW}/card-img/tw${String(id).padStart(8, '0')}.png`;

/** Liste des extensions et des n° de fiches (relue une fois par semaine), fiches gardées en cache. */
async function twSources() {
  const idx = readJson('zh/tw-sets.json', null);
  const details = readJson('zh/tw-details.json', {});
  let sets = idx?.sets;
  if (!idx || Date.now() - Date.parse(idx.built) > WEEK) {
    const exps = [];
    for (let p = 1; p <= 30; p++) {
      const page = await html(`${TW}/card-search/?pageNo=${p}`);
      const found = page ? parseTwExpansions(page).filter((e) => !exps.some((x) => x.code === e.code)) : [];
      if (!found.length) break;
      exps.push(...found);
    }
    if (!exps.length) { console.warn('zh-tw : liste des extensions illisible, cache gardé'); }
    else {
      await pool(exps, 4, async (e) => {
        e.ids = [];
        for (let p = 1, pages = 1; p <= pages && p <= 60; p++) {
          const page = await html(`${TW}/card-search/list/?expansionCodes=${encodeURIComponent(e.code)}&pageNo=${p}`);
          if (!page) break;
          pages = Number(page.match(/共\s*(\d+)\s*頁/)?.[1] ?? 1);
          for (const m of page.matchAll(/detail\/(\d+)\//g)) if (!e.ids.includes(Number(m[1]))) e.ids.push(Number(m[1]));
        }
      });
      sets = exps;
      writeJson('zh/tw-sets.json', { built: new Date().toISOString(), sets });
    }
  }
  const todo = [...new Set((sets ?? []).flatMap((e) => e.ids))].filter((id) => !details[id]);
  let n = 0;
  await pool(todo.slice(0, Number(process.env.ZH_TW_MAX || 30000)), 6, async (id) => {
    await sleep(60);
    const page = await html(`${TW}/card-search/detail/${id}/`);
    if (!page) return;
    const d = parseTwDetail(page);
    if (d.n) { details[id] = d; n++; }
  });
  if (n) writeJson('zh/tw-details.json', details);
  console.log(`zh-tw : ${sets?.length ?? 0} extensions, ${Object.keys(details).length} fiches (${n} nouvelles)`);
  return { sets: sets ?? [], details };
}

const localOf = (no) => (no ?? '').split('/')[0].trim();
const sameNumber = (a, b) => a === b || (/^\d+$/.test(a) && /^\d+$/.test(b) && Number(a) === Number(b));

/** Carte zh-tw : données de la fiche officielle complétées par la carte japonaise de même code et numéro. */
export function twCard(code, id, d, jp) {
  const localId = jp?.localId || localOf(d.no) || String(id);
  const attrs = {};
  if (d.il) attrs.illustrator = d.il;
  if (d.dex) attrs.dex = d.dex;
  if (d.t) attrs.type = d.t.map((t) => ENERGY_FR[t] ?? t).join(' / ');
  if (d.hp) attrs.hp = d.hp;
  if (d.st) attrs.stage = TW_STAGES[d.st] ?? d.st;
  if (d.r) attrs.regulation = d.r;
  const card = {
    id: jp?.id ?? `${code}-${localId}`,
    localId,
    number: d.no ?? localId,
    name: d.n,
    nameEn: jp?.nameEn,
    nameFr: jp?.nameFr,
    rarity: jp?.rarity,
    image: twImage(id),
    attrs: { ...attrs, ...(jp?.attrs ?? {}) },
    // Fiche de l'extension japonaise (même produit pour le japonais et le chinois traditionnel).
    cm: jp?.cm,
    tcgplayer: undefined,
    tw: id,
  };
  if (attrs.type && !card.attrs.type) card.attrs.type = attrs.type;
  for (const k of Object.keys(card)) if (card[k] === undefined) delete card[k];
  if (!Object.keys(card.attrs).length) delete card.attrs;
  return card;
}

function buildTraditional({ sets, details }) {
  const ja = readJson('sets/pokemon-ja.json', { blocs: [] });
  const jaSets = new Map(ja.blocs.flatMap((b) => b.sets.map((s) => [s.id.toLowerCase(), { ...s, bloc: b }])));
  const blocs = new Map(ja.blocs.map((b) => [b.id, { id: b.id, name: b.name, nameFr: b.nameFr, sets: [] }]));
  let total = 0, linked = 0;
  for (const e of sets) {
    const js = jaSets.get(e.code.toLowerCase());
    const jpCards = js ? readJson(`cards/pokemon-ja/${js.id}.json`, []) : [];
    const cards = [];
    for (const id of e.ids) {
      const d = details[id];
      if (!d) continue;
      const no = localOf(d.no);
      const jp = jpCards.find((c) => sameNumber(c.localId, no));
      if (jp) linked++;
      cards.push(twCard(js?.id ?? e.code, id, d, jp));
    }
    if (!cards.length) continue;
    // Doublons de numéro (réimpressions dans le même produit) : le premier garde l'identifiant.
    const seen = new Set();
    for (const c of cards) { if (seen.has(c.id)) c.id = `${c.id}-tw${c.tw}`; seen.add(c.id); }
    total += cards.length;
    const id = js?.id ?? e.code;
    writeJson(`cards/pokemon-zh-tw/${id}.json`, cards);
    const set = {
      id, code: js?.code ?? e.code, name: js?.name ?? e.title, nameLocal: e.title,
      releaseDate: e.date ?? js?.releaseDate, logo: js?.logo, symbol: js?.symbol, count: cards.length,
    };
    const blocId = js?.bloc.id ?? `tw-${e.series || 'autres'}`;
    if (!blocs.has(blocId)) blocs.set(blocId, { id: blocId, name: e.series || 'Autres', sets: [] });
    blocs.get(blocId).sets.push(set);
  }
  const list = [...blocs.values()];
  sortByRelease(list);
  writeJson('sets/pokemon-zh-tw.json', { built: new Date().toISOString(), blocs: list });
  console.log(`zh-tw : ${list.reduce((n, b) => n + b.sets.length, 0)} extensions, ${total} cartes, ${linked} reliées à la carte japonaise`);
}

// ——— Chinois simplifié : tcg.mik.moe ———

async function mik(path, body) {
  const r = await request(`${MIK}/api/v3/${path}`, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', Referer: `${MIK}/` } });
  const j = r ? await r.json().catch(() => null) : null;
  return j?.code === 200 ? j.data : null;
}

/** Bloc d'une extension chinoise d'après le préfixe de son code (comme mik.moe). */
export function cnBloc(code) {
  if (/^MP|^CM/.test(code)) return { id: 'mega', name: 'Mega' };
  if (/^30th/i.test(code)) return { id: '30th', name: '30th Celebration' };
  if (/^CSM/.test(code)) return { id: 'sm', name: 'Sun & Moon' };
  if (/^(CSV|CBB|151C)/.test(code)) return { id: 'sv', name: 'Scarlet & Violet' };
  if (/^CS/.test(code)) return { id: 'swsh', name: 'Sword & Shield' };
  return { id: 'other', name: 'Other' };
}

async function cnSources() {
  const idx = readJson('zh/cn-sets.json', null);
  const details = readJson('zh/cn-details.json', {});
  let sets = idx?.sets;
  if (!idx || Date.now() - Date.parse(idx.built) > WEEK) {
    const params = await mik('card/card-advance-search-params', {});
    const exps = (params?.expansion ?? []).filter((e) => e.setCode && e.setCode !== 'PROMO');
    if (!exps.length) console.warn('zh-cn : liste des extensions illisible, cache gardé');
    else {
      await pool(exps, 2, async (e) => {
        e.cards = [];
        for (let page = 1; page <= 20; page++) {
          const d = await mik('card/card-advance-search', {
            type: 'advance', name: '', text: '', m: [], s: [], label: [], t: [], has: [], weak: [], rs: [], series: [], set: [e.setCode],
            artist: [], r: [], hp: null, rc: null, reg: [], mark: [], unique: false, page, pageSize: 100,
          });
          const list = d?.list ?? [];
          e.cards.push(...list.map((c) => ({ i: c.cardIndex, n: c.cardName, r: c.rarity, ty: c.cardType, is: c.is, en: c.nameEn, sen: c.setCodeEn, ien: c.cardIndexEn })));
          if (!list.length || e.cards.length >= Number(d.itemNum ?? 0)) break;
          await sleep(200);
        }
      });
      sets = exps.filter((e) => e.cards.length).map((e) => ({ code: e.setCode, name: e.setName, cards: e.cards }));
      writeJson('zh/cn-sets.json', { built: new Date().toISOString(), sets });
    }
  }
  const todo = (sets ?? []).flatMap((e) => e.cards.map((c) => [e.code, c.i])).filter(([s, i]) => !details[`${s}/${i}`]);
  let n = 0;
  await pool(todo.slice(0, Number(process.env.ZH_CN_MAX || 30000)), 3, async ([s, i]) => {
    await sleep(80);
    const d = await mik('card/card-detail', { setCode: s, cardIndex: i });
    if (!d) return;
    const a = d.pokemonAttr ?? {};
    details[`${s}/${i}`] = { hp: a.hp || undefined, e: a.energyType || undefined, st: a.stage || undefined, il: d.artist || undefined, rm: d.regulationMark || undefined, d: d.releaseDate?.slice(0, 10), m: d.mechanic || undefined };
    n++;
    if (n % 500 === 0) writeJson('zh/cn-details.json', details);
  });
  if (n) writeJson('zh/cn-details.json', details);
  console.log(`zh-cn : ${sets?.length ?? 0} extensions, ${Object.keys(details).length} fiches (${n} nouvelles)`);
  return { sets: sets ?? [], details };
}

/** Attributs d'une carte chinoise simplifiée (clés et libellés de l'app). */
export function cnAttrs(c, d = {}) {
  const out = {
    illustrator: d.il,
    type: d.e ? d.e.split('').map((x) => ENERGY_FR[ENERGY_LETTER[x]] ?? x).join(' / ') : undefined,
    hp: d.hp ? String(d.hp) : undefined,
    stage: d.st ? EN_STAGES[d.st] ?? d.st : undefined,
    category: CN_CATEGORIES[c.ty] ?? c.ty,
    regulation: d.rm,
  };
  for (const k of Object.keys(out)) if (!out[k]) delete out[k];
  return out;
}

/** Index des cartes internationales par « CODE/numéro » (code imprimé : OBF, SVI…), pour les réimpressions chinoises. */
function intlIndex() {
  const out = new Map();
  for (const lang of ['en', 'fr']) {
    const sets = readJson(`sets/pokemon-${lang}.json`, { blocs: [] }).blocs.flatMap((b) => b.sets);
    for (const s of sets) {
      if (!s.code) continue;
      for (const c of readJson(`cards/pokemon-${lang}/${s.id}.json`, [])) {
        const k = `${s.code.toUpperCase()}/${/^\d+$/.test(c.localId) ? Number(c.localId) : c.localId}`;
        const e = out.get(k) ?? {};
        if (lang === 'en') Object.assign(e, { nameEn: c.name, cm: c.cm, cmPath: c.cmPath, image: c.image });
        else e.nameFr = c.name;
        out.set(k, e);
      }
    }
  }
  return out;
}

async function buildSimplified({ sets, details }) {
  const intl = intlIndex();
  const files = await loadCardmarketFiles().catch(() => null);
  const expansions = new Map();
  const productsByExp = new Map();
  const expOf = new Map();
  for (const p of files?.products ?? []) {
    const e = expansions.get(p.idExpansion) ?? { count: 0, names: new Set(), first: p.dateAdded };
    e.count++;
    if (p.dateAdded && (!e.first || p.dateAdded < e.first)) e.first = p.dateAdded;
    e.names.add(p.name.split(' [')[0].toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, ''));
    expansions.set(p.idExpansion, e);
    productsByExp.set(p.idExpansion, [...(productsByExp.get(p.idExpansion) ?? []), p]);
    expOf.set(p.idProduct, p.idExpansion);
  }
  // Extensions déjà prises par les autres langues (anglaises, japonaises…).
  const used = new Set();
  for (const lang of ['en', 'fr', 'ja']) {
    const dir = join(CATALOG, 'cards', `pokemon-${lang}`);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) for (const c of JSON.parse(readFileSync(join(dir, f), 'utf8'))) if (c.cm?.id && expOf.has(c.cm.id)) used.add(expOf.get(c.cm.id));
  }
  const blocs = new Map();
  let total = 0, own = 0, intlLinked = 0;
  const report = [];
  for (const e of sets) {
    const cards = e.cards.map((c) => {
      const d = details[`${e.code}/${c.i}`];
      const ref = c.sen && c.ien ? intl.get(`${c.sen.toUpperCase()}/${/^\d+$/.test(c.ien) ? Number(c.ien) : c.ien}`) : undefined;
      const card = {
        id: `${e.code}-${c.i}`,
        localId: c.i,
        number: c.i,
        name: c.n,
        nameEn: c.en ?? ref?.nameEn,
        nameFr: ref?.nameFr,
        rarity: c.r && c.r !== '无标记' ? c.r : undefined,
        image: `${MIK}/static/img/${encodeURIComponent(e.code)}/${encodeURIComponent(c.i)}.png`,
        attrs: cnAttrs(c, d),
        ref,
        date: d?.d,
      };
      return card;
    });
    // Extension chinoise simplifiée chez Cardmarket (mêmes noms anglais, pas encore prise par une autre langue).
    const exp = files ? pickExpansion(cards, expansions, used) : undefined;
    const ids = exp ? matchProducts(cards, productsByExp.get(exp) ?? []) : new Map();
    if (exp) used.add(exp);
    let n = 0;
    for (const c of cards) {
      const pid = ids.get(c.id);
      if (pid) { c.cm = { ...(priceOf(files.prices.get(pid)) ?? { id: pid }), f: 1 }; n++; own++; }
      else if (c.ref?.cm || c.ref?.cmPath) {
        // Pas de fiche chinoise : celle de la carte internationale reprise.
        if (c.ref.cm) c.cm = { ...c.ref.cm, intl: 1 };
        if (c.ref.cmPath) c.cmPath = c.ref.cmPath;
        intlLinked++;
      }
      if (!c.image && c.ref?.image) c.image = c.ref.image;
    }
    report.push(`${e.code}${exp ? `→${exp}:${n}` : ''}`);
    const date = cards.map((c) => c.date).filter(Boolean).sort()[0];
    for (const c of cards) {
      delete c.ref; delete c.date;
      if (!Object.keys(c.attrs).length) delete c.attrs;
      for (const k of Object.keys(c)) if (c[k] === undefined) delete c[k];
    }
    total += cards.length;
    writeJson(`cards/pokemon-zh-cn/${e.code}.json`, cards);
    const b = cnBloc(e.code);
    if (!blocs.has(b.id)) blocs.set(b.id, { ...b, sets: [] });
    blocs.get(b.id).sets.push({
      id: e.code, code: e.code, name: e.name, nameLocal: e.name, releaseDate: date,
      logo: `${MIK}/static/setCode/${encodeURIComponent(e.code)}.png`, symbol: `${MIK}/static/setCode/${encodeURIComponent(e.code)}.png`, count: cards.length,
    });
  }
  const list = [...blocs.values()];
  sortByRelease(list);
  writeJson('sets/pokemon-zh-cn.json', { built: new Date().toISOString(), blocs: list });
  console.log(`zh-cn : ${total} cartes ; fiches Cardmarket chinoises : ${own}, internationales : ${intlLinked} ; ${report.join(' ')}`);
}

export async function buildPokemonZh() {
  const [tw, cn] = await Promise.all([twSources().catch((e) => { console.warn('zh-tw :', e); return null; }), cnSources().catch((e) => { console.warn('zh-cn :', e); return null; })]);
  if (tw) buildTraditional(tw);
  if (cn) await buildSimplified(cn);
}
