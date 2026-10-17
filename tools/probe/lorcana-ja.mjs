// Sondage : données de la recherche de cartes Lorcana japonaise (Takara Tomy, appli Vue + axios).
const UA = { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', 'accept-language': 'ja' };
const BASE = 'https://www.takaratomy.co.jp/products/disneylorcana/cardlist/';
const get = async (u) => { try { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(60000) }); return { status: r.status, type: r.headers.get('content-type'), text: await r.text() }; } catch (e) { return { err: e.message }; } };
const page = await get(BASE);
const html = page.text ?? '';
const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
for (const [, attrs, body] of scripts) {
  if (/googletagmanager|gtag|dataLayer/.test(body + attrs)) continue;
  console.log('SCRIPT', attrs.trim(), '|', body.trim().slice(0, 4000).replace(/\s+/g, ' '));
}
const refs = [...new Set([...html.matchAll(/["'`]([^"'`\s]+\.(?:vue|js|json|php)(?:\?[^"'`\s]*)?)["'`]/g)].map((m) => m[1]))];
console.log('REFS', refs.join(' | '));
for (const r of refs.filter((x) => !/vendor|unpkg|jsdelivr|googletag|cssua/.test(x)).slice(0, 12)) {
  const u = new URL(r, BASE).href;
  const g = await get(u);
  console.log('\n== FILE', u, g.status, g.type, g.text?.length);
  const t = g.text ?? '';
  const apis = [...new Set([...t.matchAll(/(?:axios\.(?:get|post)|fetch|url|endpoint|baseURL|api)[^\n]{0,200}/gi)].map((m) => m[0]))];
  console.log(apis.slice(0, 40).join('\n'));
  console.log('HEAD', t.slice(0, 1500).replace(/\s+/g, ' '));
}
