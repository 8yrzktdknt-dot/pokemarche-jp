// Sondage : chemin des visuels japonais et extensions (sets_order) de l'API Takara Tomy.
const ROOT = 'https://www.takaratomy.co.jp';
const UA = { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', 'accept-language': 'ja', referer: `${ROOT}/products/disneylorcana/cardlist/` };
const env = await (await fetch(ROOT + '/products/disneylorcana/common/components/js/env.js', { headers: UA })).text();
console.log('ENVHEAD', env.split('\n').filter((l) => /Path|path|Dir|img|url|card/i.test(l)).slice(0, 30).join('\n'));
const app = await (await fetch(ROOT + '/products/disneylorcana/cardlist/js/cardlist.js', { headers: UA })).text();
console.log('CARDDIR', [...app.matchAll(/[^\n]{0,120}(cardDir|card_file|imagesCache)[^\n]{0,160}/g)].map((m) => m[0].trim()).slice(0, 20).join('\n'));
let cookie = '';
const post = async (path, body, token) => {
  const r = await fetch(ROOT + path, { method: 'POST', headers: { ...UA, 'content-type': 'application/x-www-form-urlencoded', ...(cookie ? { cookie } : {}), ...(token ? { 'x-csrf-token': token } : {}) }, body });
  const set = r.headers.getSetCookie?.() ?? [];
  if (set.length) cookie = set.map((c) => c.split(';')[0]).join('; ');
  return r.json();
};
const { csrf } = await post('/products/disneylorcana/api1.0/card-search/token.json', '');
const sets = new Map();
let page = 1, total = 0, sample = null;
for (; page <= 40; page++) {
  const j = await post('/products/disneylorcana/api1.0/card-search/result', new URLSearchParams({ posts_per_page: '100', page: String(page) }).toString(), csrf);
  const cards = j.cards ?? [];
  total += cards.length;
  for (const c of cards) {
    const k = `${c.sets_order}|${c.sets}`;
    const s = sets.get(k) ?? { n: 0, max: 0, rar: {} };
    s.n++; s.max = Math.max(s.max, c.collector_number); s.rar[c.rarity] = (s.rar[c.rarity] ?? 0) + 1;
    sets.set(k, s);
    if (!sample && /エンチャンテッド|Enchanted/.test(c.rarity)) sample = c;
  }
  if (cards.length < 100) break;
}
console.log('TOTAL', total, 'pages', page);
for (const [k, s] of [...sets].sort()) console.log('SET', k, s.n, 'max', s.max, JSON.stringify(s.rar));
console.log('ENCH', JSON.stringify(sample).slice(0, 800));
for (const ext of ['png', 'jpg', 'webp']) for (const dir of ['/products/disneylorcana/common/img/card/', '/products/disneylorcana/cardlist/img/card/', '/products/disneylorcana/img/card/']) {
  const u = `${ROOT}${dir}001_DLCS14_FruFru_VIPGuest_JA.${ext}`;
  const r = await fetch(u, { headers: UA }).catch(() => null);
  console.log('IMG', u, r?.status, r?.headers.get('content-type'));
}
