// Sondage : API officielle japonaise (Takara Tomy) — jeton CSRF, puis résultats de recherche.
const ROOT = 'https://www.takaratomy.co.jp';
const UA = { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', 'accept-language': 'ja', referer: `${ROOT}/products/disneylorcana/cardlist/` };
let cookie = '';
const post = async (path, body, token) => {
  const headers = { ...UA, 'content-type': 'application/x-www-form-urlencoded', 'x-requested-with': 'XMLHttpRequest', ...(cookie ? { cookie } : {}), ...(token ? { 'x-csrf-token': token } : {}) };
  const r = await fetch(ROOT + path, { method: 'POST', headers, body, signal: AbortSignal.timeout(60000) });
  const set = r.headers.getSetCookie?.() ?? [];
  if (set.length) cookie = set.map((c) => c.split(';')[0]).join('; ');
  const text = await r.text();
  return { status: r.status, type: r.headers.get('content-type'), text };
};
const env = await (await fetch(ROOT + '/products/disneylorcana/common/components/js/env.js', { headers: UA })).text();
console.log('ENV', env.slice(0, 3500));
const tok = await post('/products/disneylorcana/api1.0/card-search/token.json', '');
console.log('TOKEN', tok.status, tok.type, tok.text.slice(0, 300), 'cookie', cookie.slice(0, 120));
const csrf = JSON.parse(tok.text || '{}').csrf;
const form = await post('/products/disneylorcana/api1.0/card-search/form.json', '');
console.log('FORM', form.status, form.text.slice(0, 2500));
const params = new URLSearchParams({ posts_per_page: '100', page: '1', sort: 'card_number' });
const res = await post('/products/disneylorcana/api1.0/card-search/result', params.toString(), csrf);
console.log('RESULT', res.status, res.type, res.text.length);
try {
  const j = JSON.parse(res.text);
  console.log('count', j.count, 'page', j.page, 'cards', j.cards?.length);
  console.log('KEYS', Object.keys(j.cards?.[0] ?? {}).join(','));
  console.log('CARD0', JSON.stringify(j.cards?.[0]).slice(0, 2500));
  console.log('CARD50', JSON.stringify(j.cards?.[50]).slice(0, 1200));
} catch { console.log(res.text.slice(0, 1500)); }
