// Sondage Riftbound : fichiers Cardmarket (jeu 22), galerie officielle (langues, champs), visuels (taille, redimensionnement).
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';
const get = async (u, o = {}) => { const t = Date.now(); const r = await fetch(u, { headers: { 'user-agent': UA }, ...o }); const b = Buffer.from(await r.arrayBuffer()); return { r, b, ms: Date.now() - t }; };
const S3 = 'https://downloads.s3.cardmarket.com/productCatalog';
for (const g of [22]) {
  const singles = JSON.parse((await get(`${S3}/productList/products_singles_${g}.json`)).b);
  const sealed = JSON.parse((await get(`${S3}/productList/products_nonsingles_${g}.json`)).b);
  const guide = JSON.parse((await get(`${S3}/priceGuide/price_guide_${g}.json`)).b);
  console.log('== singles', singles.products?.length, Object.keys(singles), JSON.stringify(singles.products?.[0]));
  const exps = new Map();
  for (const p of singles.products) { const e = exps.get(p.idExpansion) ?? { n: 0, ex: [] }; e.n++; if (e.ex.length < 4) e.ex.push(p.name); exps.set(p.idExpansion, e); }
  for (const [id, e] of exps) console.log('exp', id, e.n, JSON.stringify(e.ex));
  const sexp = new Map();
  for (const p of sealed.products) { const e = sexp.get(p.idExpansion) ?? []; if (e.length < 5) e.push(p.name); sexp.set(p.idExpansion, e); }
  for (const [id, e] of sexp) console.log('sealed', id, JSON.stringify(e));
  console.log('== names with ( )');
  const paren = new Map();
  for (const p of singles.products) { const m = p.name.match(/\(([^)]*)\)/g); for (const x of m ?? []) paren.set(x, (paren.get(x) ?? 0) + 1); }
  console.log(JSON.stringify([...paren].sort((a, b) => b[1] - a[1]).slice(0, 60)));
  for (const p of singles.products.filter((p) => /^(Jinx|Ahri|Kai'Sa)/.test(p.name)).slice(0, 40)) console.log(JSON.stringify(p));
  console.log('== guide', guide.priceGuides?.length, Object.keys(guide), JSON.stringify(guide.priceGuides?.[0]));
  const withHolo = guide.priceGuides.filter((x) => x['avg7-holo']).length;
  console.log('avg7-holo', withHolo, 'avg7', guide.priceGuides.filter((x) => x.avg7).length);
  const byId = new Map(guide.priceGuides.map((x) => [x.idProduct, x]));
  for (const p of singles.products.filter((p) => /^Jinx/.test(p.name)).slice(0, 8)) console.log(p.name, JSON.stringify(byId.get(p.idProduct)));
}
for (const loc of ['en-us', 'fr-fr', 'de-de', 'es-es', 'it-it', 'pt-br', 'ja-jp', 'ko-kr', 'zh-cn', 'zh-tw', 'es-mx', 'pl-pl', 'th-th']) {
  const { r, b } = await get(`https://riftbound.leagueoflegends.com/${loc}/card-gallery/`).catch(() => ({ r: { status: 'ERR' }, b: Buffer.from('') }));
  const html = b.toString();
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  let n = 0, first = '';
  if (m) { const s = m[1]; n = (s.match(/"collectorNumber"/g) ?? []).length; const i = s.indexOf('"collectorNumber"'); first = s.slice(Math.max(0, i - 200), i + 100); }
  console.log('gallery', loc, r.status, html.length, 'cards', n, first.replace(/\s+/g, ' ').slice(0, 300));
  if (loc === 'en-us' && m) {
    const data = JSON.parse(m[1]);
    const find = (o, k) => { if (!o || typeof o !== 'object') return null; if (o[k]?.items) return o[k]; for (const v of Object.values(o)) { const x = find(v, k); if (x) return x; } return null; };
    const cards = find(data, 'cards');
    console.log('CARD0', JSON.stringify(cards.items[0]).slice(0, 4000));
    const alt = cards.items.find((c) => /a$/.test(String(c.collectorNumber)) || /a\//.test(c.publicCode ?? ''));
    console.log('ALT', JSON.stringify(alt).slice(0, 2500));
    const sets = find(data, 'sets');
    console.log('SETS', JSON.stringify(sets).slice(0, 3000));
    const keys = new Map(); for (const c of cards.items) for (const k of Object.keys(c)) keys.set(k, (keys.get(k) ?? 0) + 1);
    console.log('KEYS', JSON.stringify([...keys]));
  }
}
const img = 'https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/15ed971e4029a92b362a81ccadf309fb81e40b81-744x1039.png';
for (const u of [img + '?accountingTag=RB', img + '?accountingTag=RB&w=360&fm=webp', img + '?w=360&fm=webp&q=80', img + '?accountingTag=RB&w=360&auto=format', img + '?accountingTag=RB&w=900&fm=webp']) {
  const { r, b, ms } = await get(u, { headers: { 'user-agent': UA, accept: 'image/webp,image/*' } });
  console.log('IMG', r.status, r.headers.get('content-type'), b.length, ms + 'ms', r.headers.get('cache-control'), r.headers.get('cross-origin-resource-policy'), u.slice(-50));
}
