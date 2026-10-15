// One Piece Cardmarket : langue des extensions d'après les produits scellés (« … Booster Box (Japanese) »).
const get = async (u) => { try { const r = await fetch(u); return r.ok ? r.json() : null; } catch { return null; } };
const sealed = await get('https://downloads.s3.cardmarket.com/productCatalog/productList/products_nonsingles_18.json');
const singles = await get('https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_18.json');
console.log('scellés', sealed && Object.keys(sealed), sealed?.products?.length, JSON.stringify(sealed?.products?.slice(0, 3)));
const byExp = new Map();
for (const p of sealed?.products ?? []) {
  if (!byExp.has(p.idExpansion)) byExp.set(p.idExpansion, []);
  byExp.get(p.idExpansion).push(p.name);
}
const singleExp = new Map();
for (const p of singles?.products ?? []) {
  const e = singleExp.get(p.idExpansion) ?? { n: 0, first: p.dateAdded, codes: new Map() };
  e.n++;
  if (p.dateAdded < e.first) e.first = p.dateAdded;
  const code = p.name.match(/\(([A-Z]{1,4}\d{0,2})-\d{3}\)/)?.[1];
  if (code) e.codes.set(code, (e.codes.get(code) ?? 0) + 1);
  singleExp.set(p.idExpansion, e);
}
for (const [id, e] of [...singleExp].sort((a, b) => a[0] - b[0])) {
  const top = [...e.codes].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, n]) => `${c}:${n}`).join(' ');
  const names = (byExp.get(id) ?? []).slice(0, 3).join(' | ');
  console.log(`${id} ${e.n} ${e.first.slice(0, 10)} [${top}] ${names}`);
}
