// Sondage Riftbound n° 2 : noms, sous-titres, visuels et étiquettes selon la langue de la galerie.
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';
const find = (o, k) => { if (!o || typeof o !== 'object') return null; if (o[k]?.items) return o[k]; for (const v of Object.values(o)) { const x = find(v, k); if (x) return x; } return null; };
const ids = ['ogn-301-star-298', 'ogn-030-298', 'ogn-030a-298', 'ogn-251-298', 'unl-131-219', 'ven-r01', 'sfd-t01'];
const base = {};
for (const loc of ['en-us', 'fr-fr', 'de-de', 'es-es', 'it-it', 'ja-jp', 'ko-kr', 'zh-cn', 'zh-tw']) {
  const html = await (await fetch(`https://riftbound.leagueoflegends.com/${loc}/card-gallery/`, { headers: { 'user-agent': UA } })).text();
  const data = JSON.parse(html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)[1]);
  const cards = find(data, 'cards').items;
  const sets = find(data, 'sets').items;
  const byId = new Map(cards.map((c) => [c.id, c]));
  let sameImg = 0, sameName = 0;
  for (const c of cards) { const b = base[c.id]; if (b) { if (b.cardImage?.url === c.cardImage?.url) sameImg++; if (b.name === c.name) sameName++; } }
  if (loc === 'en-us') for (const c of cards) base[c.id] = c;
  console.log('==', loc, cards.length, 'sameImg', sameImg, 'sameName', sameName, 'sets', JSON.stringify(sets.map((s) => s.name)));
  for (const id of ids) { const c = byId.get(id); if (c) console.log(' ', id, JSON.stringify({ n: c.name, s: c.subtitle, r: c.rarity?.value, t: c.cardType?.type?.map((x) => x.id + ':' + x.label), st: c.cardType?.superType?.map((x) => x.id + ':' + x.label), d: c.domain?.values?.map((x) => x.id + ':' + x.label), tags: c.tags, flags: c.flags, img: c.cardImage?.url?.slice(-60) })); }
  const lab = (f) => { const m = new Map(); for (const c of cards) for (const v of f(c) ?? []) m.set(v.id, v.label); return Object.fromEntries(m); };
  console.log('  rarity', JSON.stringify(lab((c) => [c.rarity?.value])), 'type', JSON.stringify(lab((c) => c.cardType?.type)), 'super', JSON.stringify(lab((c) => c.cardType?.superType)), 'domain', JSON.stringify(lab((c) => c.domain?.values)));
  if (loc === 'en-us') {
    const fl = cards.filter((c) => c.flags).slice(0, 3).map((c) => [c.id, c.flags]);
    console.log('  flags', JSON.stringify(fl));
    console.log('  tags sample', JSON.stringify(cards.find((c) => c.tags)?.tags));
    const noSub = cards.filter((c) => c.cardType?.type?.some((t) => t.id === 'legend')).slice(0, 4).map((c) => [c.id, c.name, c.subtitle]);
    console.log('  legends', JSON.stringify(noSub));
  }
}
