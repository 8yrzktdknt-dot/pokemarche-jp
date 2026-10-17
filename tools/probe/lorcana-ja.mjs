// Sondage : liste officielle des cartes Lorcana japonaises (Takara Tomy).
const UA = { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', 'accept-language': 'ja' };
const get = async (u) => { try { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(60000) }); return { status: r.status, url: r.url, type: r.headers.get('content-type'), text: await r.text() }; } catch (e) { return { err: e.message }; } };
const page = async (u) => {
  const r = await get(u);
  console.log('\n==', u, r.status, r.url, r.type, r.text?.length ?? r.err);
  if (!r.text) return r;
  const links = [...new Set([...r.text.matchAll(/(?:href|src|data-src|action)="([^"]+)"/g)].map((m) => m[1]))].filter((l) => !/common\/20|fonts|syncsearch|\.css/.test(l));
  console.log('LINKS', links.slice(0, 120).join(' | '));
  const scripts = [...r.text.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1].trim()).filter((s) => s && /api|json|card|fetch|ajax|url/i.test(s));
  for (const s of scripts.slice(0, 6)) console.log('SCRIPT', s.slice(0, 1500).replace(/\s+/g, ' '));
  const text = r.text.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  console.log('TEXT', text.slice(0, 1500));
  return r;
};
await page('https://www.takaratomy.co.jp/products/disneylorcana/card/');
await page('https://www.takaratomy.co.jp/products/disneylorcana/card/list/');
await page('https://www.takaratomy.co.jp/products/disneylorcana/cardlist/');
await page('https://www.takaratomy.co.jp/products/disneylorcana/products/');
