// Sondage One Piece : jeu Cardmarket, noms des produits et variantes, guide des prix.
const get = async (u) => { try { const r = await fetch(u); return r.ok ? r.json() : null; } catch { return null; } };
for (let g = 1; g <= 30; g++) {
  const p = await get(`https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_${g}.json`);
  if (!p) continue;
  const list = p.products ?? [];
  console.log(`== jeu ${g} : ${list.length} produits ; ex. ${list.slice(0, 2).map((x) => JSON.stringify(x)).join(' ')}`);
  if (!list.some((x) => /OP01-0\d\d/.test(x.name) || /Roronoa|Monkey\.?D/i.test(x.name))) continue;
  console.log('   >>> ONE PIECE');
  const show = (re) => list.filter((x) => re.test(x.name)).slice(0, 14).forEach((x) => console.log('   ', JSON.stringify(x)));
  show(/Nami/); show(/Shanks/);
  const exp = {};
  for (const x of list) exp[x.idExpansion] = (exp[x.idExpansion] ?? 0) + 1;
  console.log('   extensions', Object.keys(exp).length, JSON.stringify(Object.entries(exp).slice(0, 80)));
  const cats = {};
  for (const x of list) cats[x.categoryName] = (cats[x.categoryName] ?? 0) + 1;
  console.log('   catégories', JSON.stringify(cats));
  const g2 = await get(`https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_${g}.json`);
  console.log('   guide', g2 && Object.keys(g2), g2?.createdAt, g2?.priceGuides?.length, JSON.stringify(g2?.priceGuides?.slice(0, 2)));
  const ids = new Set(list.filter((x) => /Nami|Shanks/.test(x.name)).slice(0, 10).map((x) => x.idProduct));
  for (const x of g2?.priceGuides ?? []) if (ids.has(x.idProduct)) console.log('   prix', JSON.stringify(x));
}
