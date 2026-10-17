// Sondage : source des cartes Lorcana japonaises (Takara Tomy).
const UA = { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', 'accept-language': 'ja' };
const get = async (u) => { try { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(60000) }); return { status: r.status, url: r.url, type: r.headers.get('content-type'), text: await r.text() }; } catch (e) { return { err: e.message }; } };
const seen = new Set();
const show = async (u, depth = 0) => {
  if (seen.has(u) || seen.size > 25) return;
  seen.add(u);
  const r = await get(u);
  console.log('\n==', u, r.status, r.url, r.type, r.text?.length ?? r.err);
  if (!r.text) return;
  const links = [...new Set([...r.text.matchAll(/(?:href|src|data-src)="([^"]+)"/g)].map((m) => m[1]))];
  const interesting = links.filter((l) => /card|list|search|api|json|\.js|img|set|pack|series|product/i.test(l));
  console.log(interesting.slice(0, 80).join('\n'));
  const apis = [...new Set([...r.text.matchAll(/["'`](https?:\/\/[^"'`]*(?:api|json|card)[^"'`]*)["'`]/gi)].map((m) => m[1]))];
  if (apis.length) console.log('APIS', apis.slice(0, 30).join('\n'));
  if (depth < 1) for (const l of interesting.filter((l) => /card|list|search/i.test(l)).slice(0, 8)) {
    try { await show(new URL(l, r.url).href, depth + 1); } catch {}
  }
};
for (const u of [
  'https://www.takaratomy.co.jp/products/disneylorcana/',
  'https://www.takaratomy.co.jp/products/disneylorcana/cardlist/',
  'https://www.takaratomy.co.jp/products/disneylorcana/card/',
  'https://www.disneylorcana.com/ja-JP/',
  'https://lorcana.takaratomy.co.jp/',
]) await show(u);
// Visuels officiels Ravensburger : existe-t-il un dossier japonais ?
for (const u of ['https://api.lorcana.ravensburger.com/images/ja/set1/', 'https://lorcanajson.org/', 'https://lorcanajson.org/files/current/ja/allCards.json', 'https://lorcanajson.org/files/current/jp/allCards.json'])
  console.log('head', u, JSON.stringify(await get(u).then((r) => ({ s: r.status, t: r.type, l: r.text?.length, lang: r.text?.match(/allCards[^"<]*/g)?.slice(0, 10) }))));
