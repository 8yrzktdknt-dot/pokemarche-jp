// Audit : complétude des fiches TCGdex (prix, attributs) par langue, liens Cardmarket, sources d'images.
import { readFileSync, existsSync } from 'node:fs';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const j = async (u) => { try { const r = await fetch(u, { headers: { 'User-Agent': UA } }); return r.ok ? r.json() : null; } catch { return null; } };
const head = async (u, redirect = 'manual') => { try { const r = await fetch(u, { headers: { 'User-Agent': UA }, redirect }); return `${r.status} ${r.headers.get('location') ?? ''} ${r.headers.get('content-type') ?? ''}`; } catch (e) { return 'ERR ' + e.message; } };

const mode = process.argv[2];
if (mode === 'tcgdex') {
  for (const lang of ['fr', 'en', 'ja']) {
    const sets = JSON.parse(readFileSync(`catalog/sets/pokemon-${lang}.json`, 'utf8')).blocs.flatMap((b) => b.sets);
    const stat = { n: 0, found: 0, avg7: 0, avg: 0, trend: 0, idProduct: 0, tcgp: 0, illustrator: 0, hp: 0, dex: 0, regulation: 0, rarity: 0 };
    const noPrice = [], notFound = [];
    for (const s of sets.slice(0, lang === 'ja' ? 80 : 120)) {
      const f = `catalog/cards/pokemon-${lang}/${s.id}.json`;
      if (!existsSync(f)) continue;
      const cards = JSON.parse(readFileSync(f, 'utf8'));
      for (const c of [cards[0], cards[Math.floor(cards.length / 2)]].filter(Boolean)) {
        stat.n++;
        const d = await j(`https://api.tcgdex.net/v2/${lang}/cards/${encodeURIComponent(c.id)}`);
        if (!d) { notFound.push(c.id); continue; }
        stat.found++;
        const cm = d.pricing?.cardmarket;
        if (cm?.avg7) stat.avg7++; if (cm?.avg) stat.avg++; if (cm?.trend) stat.trend++; if (cm?.idProduct) stat.idProduct++;
        if (d.pricing?.tcgplayer) stat.tcgp++;
        if (d.illustrator) stat.illustrator++; if (d.hp) stat.hp++; if (d.dexId) stat.dex++; if (d.regulationMark) stat.regulation++; if (d.rarity) stat.rarity++;
        if (!cm?.avg7) noPrice.push(`${c.id}${cm ? ` (avg=${cm.avg} trend=${cm.trend} avg30=${cm.avg30})` : ' (pas de pricing)'}`);
      }
    }
    console.log(`\n### ${lang}`, JSON.stringify(stat));
    console.log('introuvables:', notFound.slice(0, 40).join(' '));
    console.log('sans avg7:', noPrice.slice(0, 60).join(' | '));
  }
  // EN vs FR : même idProduct ?
  for (const id of ['me05-004', 'sv08-238', 'swsh7-215', 'sm1-1', 'base1-4']) {
    const [en, fr] = await Promise.all(['en', 'fr'].map((l) => j(`https://api.tcgdex.net/v2/${l}/cards/${id}`)));
    console.log(id, 'EN', JSON.stringify(en?.pricing?.cardmarket ?? null), '| FR', JSON.stringify(fr?.pricing?.cardmarket ?? null));
  }
  console.log('graphql', JSON.stringify(await (await fetch('https://api.tcgdex.net/v2/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: '{ cards(filters:{id:"me05-004"}) { id illustrator pricing { cardmarket { idProduct avg7 } } } }' }) }).catch(() => null))?.text?.() ?? 'ERR').slice(0, 400));
}
if (mode === 'cardmarket') {
  const urls = [
    'https://www.cardmarket.com/fr/Pokemon/Products?idProduct=794611&language=2',
    'https://www.cardmarket.com/en/Pokemon/Products?idProduct=794611',
    'https://www.cardmarket.com/en/Pokemon/Products/Singles?idProduct=794611',
    'https://www.cardmarket.com/en/Pokemon/Cards?idProduct=794611',
    'https://prices.pokemontcg.io/cardmarket/sv1-1',
    'https://prices.pokemontcg.io/cardmarket/me1-1',
    'https://prices.pokemontcg.io/cardmarket/base1-4',
  ];
  for (const u of urls) console.log(await head(u), '<-', u);
  const p = await j('https://api.pokemontcg.io/v2/cards/sv1-1');
  console.log('pokemontcg.io sv1-1 cardmarket.url =', p?.data?.cardmarket?.url, 'tcgplayer.url =', p?.data?.tcgplayer?.url);
}
if (mode === 'images') {
  for (const u of [
    'https://www.pokemon.com/fr/jcc-pokemon/cartes-pokemon/series/30th/12',
    'https://www.pokemon.com/fr/jcc-pokemon/cartes-pokemon?30th=on',
    'https://www.pokemon.com/fr/jcc-pokemon/cartes-pokemon/series/mep/1',
    'https://www.pokemon.com/fr/jcc-pokemon/cartes-pokemon/series/svp/1',
    'https://www.pokemon.com/us/pokemon-tcg/pokemon-cards/series/mep/1',
  ]) {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': UA } });
      const h = await r.text();
      console.log(r.status, u, [...new Set(h.match(/\/static-assets\/content-assets\/cms2[^"' ]*\/img\/cards\/[^"' ]+/g) ?? [])].slice(0, 6).join(' '));
      console.log('   liens séries:', [...new Set(h.match(/cartes-pokemon\?[a-z0-9]+=on/g) ?? [])].slice(0, 80).join(' '));
    } catch (e) { console.log('ERR', u, e.message); }
  }
  for (const u of ['https://images.scrydex.com/pokemon/mep-1/large', 'https://images.scrydex.com/pokemon/svp-1/large', 'https://images.scrydex.com/pokemon/me1-1/large', 'https://images.scrydex.com/pokemon/zz-1/large']) console.log(await head(u, 'follow'), u);
}
