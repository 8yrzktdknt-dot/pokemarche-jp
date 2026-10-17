// Sondage : sources de visuels pour les cartes Pokémon sans image (kits du dresseur, Collection Classique…).
const PT = 'https://api.pokemontcg.io/v2';
const j = async (u) => { try { const r = await fetch(u, { signal: AbortSignal.timeout(60000) }); return r.ok ? r.json() : { status: r.status }; } catch (e) { return { err: e.message }; } };
const sets = await j(`${PT}/sets?pageSize=250&select=id,name,total`);
console.log('ptcg sets', sets.data?.length, sets.err ?? '');
for (const s of sets.data ?? []) if (/kit|classic|best|unseen|promo|creator|first|alternate|celebrat|skyridge|aquapolis|black star|futsal|mcdonald/i.test(s.name)) console.log('  ', s.id, s.name, s.total);
for (const id of ['cel25c', 'ecard2', 'ecard3', 'hsp', 'ex10', 'bp', 'xyp', 'pop5', 'np']) {
  const r = await j(`${PT}/cards?q=set.id:${id}&select=number,name,images&pageSize=250`);
  const nums = (r.data ?? []).map((c) => c.number);
  console.log('ptcg', id, nums.length, JSON.stringify(nums.slice(0, 40)), r.data?.[0]?.images?.small ?? '');
}
const UA = { 'user-agent': 'Mozilla/5.0' };
const head = async (u) => { try { const r = await fetch(u, { headers: UA }); const b = await r.arrayBuffer(); return `${r.status} ${r.headers.get('content-type')} ${b.byteLength}`; } catch (e) { return 'ERR'; } };
for (const u of ['https://images.scrydex.com/pokemon/tk-xy-sy-1/large', 'https://images.scrydex.com/pokemon/tk5a-1/large', 'https://images.scrydex.com/pokemon/cel25c-2_A/large', 'https://images.scrydex.com/pokemon/zz-inconnu-1/large', 'https://images.scrydex.com/pokemon/mfb-1/large', 'https://images.scrydex.com/pokemon/ru1-1/large'])
  console.log('scrydex', u, await head(u));
for (const l of ['de', 'it', 'es', 'pt', 'ja', 'fr', 'en']) {
  for (const s of ['tk-xy-sy', 'cel25cc', 'mfb', 'tk-dp-m', 'bog', 'exu']) {
    const r = await j(`https://api.tcgdex.net/v2/${l}/sets/${s}`);
    const cards = r.cards ?? [];
    console.log('tcgdex', l, s, cards.length, cards.filter((c) => c.image).length, cards.find((c) => c.image)?.image ?? '');
  }
}
