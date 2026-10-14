// Ouvre des liens Cardmarket dans un vrai navigateur et affiche la page d'arrivée.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled'] });
  const ctx = await b.newContext({ locale: 'fr-FR', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36', viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  for (const u of [
    'https://www.cardmarket.com/fr/Pokemon/Products?idProduct=794611&language=2',
    'https://www.cardmarket.com/fr/Pokemon/Products?idProduct=895792',
    'https://www.cardmarket.com/fr/Pokemon/Products/Singles?idProduct=794611',
    'https://www.cardmarket.com/fr/Pokemon/Products/Search?searchString=Pikachu+ex+238%2F191',
    'https://www.cardmarket.com/fr/Pokemon/Products/Singles/Surging-Sparks/Pikachu-ex-V3-SSP238',
  ]) {
    try {
      await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await p.waitForTimeout(8000);
      console.log('URL :', u, '\n  =>', p.url(), '\n  titre :', await p.title(), '\n  h1 :', (await p.locator('h1').first().textContent().catch(() => ''))?.trim().slice(0, 120));
    } catch (e) { console.log('ERR', u, e.message.slice(0, 200)); }
  }
  await b.close();
})();
