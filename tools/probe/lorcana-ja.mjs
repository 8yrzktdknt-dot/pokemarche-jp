// Sondage : API de la recherche de cartes Lorcana japonaise (Takara Tomy).
const UA = { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', 'accept-language': 'ja' };
const ROOT = 'https://www.takaratomy.co.jp';
const get = async (u) => { try { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(60000) }); return { status: r.status, type: r.headers.get('content-type'), text: await r.text() }; } catch (e) { return { err: e.message }; } };
for (const f of ['/products/disneylorcana/common/components/js/env.js', '/products/disneylorcana/common/components/composable/useSearch.js', '/products/disneylorcana/common/components/composable/useForm.js']) {
  const g = await get(ROOT + f);
  console.log('\n== FILE', f, g.status, g.text?.length);
  console.log((g.text ?? '').slice(0, 9000));
}
