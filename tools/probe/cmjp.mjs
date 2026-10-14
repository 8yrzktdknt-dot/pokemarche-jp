// Analyse : extensions Cardmarket des cartes japonaises (fichier public des produits).
import { readFileSync, readdirSync } from 'node:fs';
const prods = JSON.parse(readFileSync('/tmp/p.json', 'utf8')).products;
const byId = new Map(prods.map((p) => [p.idProduct, p]));
const exp = new Map();
for (const p of prods) { const e = exp.get(p.idExpansion) ?? { n: 0, names: new Set(), first: p.dateAdded }; e.n++; e.names.add(p.name.split(' [')[0]); if (p.dateAdded < e.first) e.first = p.dateAdded; exp.set(p.idExpansion, e); }
const expOf = (lang) => {
  const out = new Map();
  for (const f of readdirSync(`catalog/cards/pokemon-${lang}`)) for (const c of JSON.parse(readFileSync(`catalog/cards/pokemon-${lang}/${f}`, 'utf8'))) {
    const p = c.cm?.id && byId.get(c.cm.id); if (!p) continue;
    const k = f.replace('.json', ''); const m = out.get(k) ?? new Map(); m.set(p.idExpansion, (m.get(p.idExpansion) ?? 0) + 1); out.set(k, m);
  }
  return out;
};
const en = expOf('en');
const enExp = new Set([...en.values()].flatMap((m) => [...m.keys()]));
const ja = expOf('ja');
console.log('EN expansions', enExp.size);
let shown = 0;
for (const [set, m] of ja) {
  if (shown++ > 40) break;
  console.log('JA', set, JSON.stringify([...m].map(([e, n]) => `${e}:${n}${enExp.has(e) ? '(EN)' : ''}/${exp.get(e)?.n}`)));
}
for (const set of ['M6a', 'MF', 'M6', 'M5', 'SV2a']) {
  const cards = JSON.parse(readFileSync(`catalog/cards/pokemon-ja/${set}.json`, 'utf8'));
  const names = new Set(cards.map((c) => c.nameEn).filter(Boolean));
  const cand = [...exp].map(([e, x]) => [e, x.n, [...names].filter((n) => x.names.has(n)).length, x.first, enExp.has(e)]).filter((r) => r[2] >= names.size * 0.5).sort((a, b) => b[2] - a[2]).slice(0, 8);
  console.log('CAND', set, cards.length, names.size, JSON.stringify(cand));
}
