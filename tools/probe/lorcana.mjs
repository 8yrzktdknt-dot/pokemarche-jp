// Sondage : sources de données Disney Lorcana (cartes, langues, visuels, prix Cardmarket).
const UA = { 'user-agent': 'Mozilla/5.0 (TCGMarket catalogue)' };
const get = async (u, t = 'json') => {
  try {
    const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(90000) });
    if (!r.ok) return { status: r.status };
    return t === 'json' ? r.json() : { status: r.status, type: r.headers.get('content-type'), size: (await r.arrayBuffer()).byteLength };
  } catch (e) { return { err: e.message }; }
};
const short = (o, n = 1500) => JSON.stringify(o).slice(0, n);

// 1) LorcanaJSON : fichiers par langue.
for (const l of ['en', 'fr', 'de', 'it', 'ja', 'es', 'zh']) {
  const r = await get(`https://lorcanajson.org/files/current/${l}/allCards.json`);
  if (!r.cards) { console.log('lorcanajson', l, short(r, 200)); continue; }
  const sets = r.sets ?? {};
  console.log('lorcanajson', l, 'cards', r.cards.length, 'sets', Object.keys(sets).length, 'meta', short(r.metadata, 300));
  for (const [k, s] of Object.entries(sets)) console.log('   set', k, short(s, 300));
  const rar = {};
  for (const c of r.cards) rar[c.rarity] = (rar[c.rarity] ?? 0) + 1;
  console.log('   rarities', short(rar, 500));
  if (l === 'en' || l === 'fr' || l === 'ja') {
    console.log('   keys', Object.keys(r.cards[0]).join(','));
    console.log('   sample', short(r.cards[0], 2500));
    const ench = r.cards.find((c) => /enchanted/i.test(c.rarity));
    console.log('   sample enchanted', short(ench, 1500));
    const promo = r.cards.find((c) => c.promoGrouping || /^P/.test(String(c.setCode)));
    console.log('   sample promo', short(promo, 1000));
    if (r.cards[0].images) for (const u of Object.values(r.cards[0].images).slice(0, 3)) console.log('   image', u, short(await get(u, 'head'), 200));
  }
}

// 2) Lorcast.
const ls = await get('https://api.lorcast.com/v0/sets');
console.log('lorcast sets', short(ls, 4000));
const first = ls.results?.[0];
if (first) {
  const cards = await get(`https://api.lorcast.com/v0/sets/${first.id}/cards`);
  console.log('lorcast cards', Array.isArray(cards) ? cards.length : short(cards, 300), short(Array.isArray(cards) ? cards[0] : cards, 2500));
}
for (const q of ['lang:fr', 'lang:de', 'lang:ja']) console.log('lorcast search', q, short(await get(`https://api.lorcast.com/v0/cards/search?q=${encodeURIComponent('elsa ' + q)}`), 600));

// 3) Cardmarket : quel numéro de jeu pour Lorcana ?
for (let g = 1; g <= 30; g++) {
  const r = await get(`https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_${g}.json`);
  const p = r.products ?? [];
  if (!p.length) { console.log('cm', g, short(r, 80)); continue; }
  const names = p.slice(0, 3).map((x) => x.name).join(' | ');
  const lorc = p.filter((x) => /Elsa|Mickey Mouse|Stitch|Maleficent/.test(x.name)).length;
  console.log('cm', g, p.length, 'lorcana-like', lorc, names, short(p[0], 300));
  if (lorc > 20) {
    const exps = {};
    for (const x of p) exps[x.idExpansion] = (exps[x.idExpansion] ?? 0) + 1;
    console.log('   expansions', short(exps, 1500));
    console.log('   samples', short(p.filter((x) => /Elsa/.test(x.name)).slice(0, 12), 2500));
    const pg = await get(`https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_${g}.json`);
    console.log('   priceguide', short(pg.priceGuides?.slice(0, 3) ?? pg, 1200), pg.priceGuides?.length);
  }
}
