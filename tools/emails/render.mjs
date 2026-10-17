// Images des e-mails (en-têtes et boutons) aux couleurs et polices de l'appli, publiées dans /email du site.
// Les textes importants sont en image : le mode sombre de Gmail (iOS) inverse les couleurs du HTML, pas des images.
// Usage : node tools/emails/render.mjs (Playwright requis).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT ?? '/opt/node-tools/node_modules/playwright');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const font = (f) => readFileSync(path.join(root, 'mobile/node_modules/@expo-google-fonts', f)).toString('base64');
const logo = readFileSync(path.join(root, 'mobile/assets/logo.svg')).toString('base64');

const CSS = `
@font-face { font-family: Unbounded; src: url(data:font/ttf;base64,${font('unbounded/800ExtraBold/Unbounded_800ExtraBold.ttf')}); }
@font-face { font-family: Manrope; font-weight: 800; src: url(data:font/ttf;base64,${font('manrope/800ExtraBold/Manrope_800ExtraBold.ttf')}); }
body { margin: 0; background: #133325; }
.hero { width: 424px; padding: 8px 0 4px; text-align: center; background: #133325; }
.brand { display: inline-flex; align-items: center; gap: 12px; }
.brand img { width: 52px; height: 52px; }
.word { font-family: Unbounded; font-size: 27px; color: #ECF5EF; letter-spacing: 0.3px; }
.word span { color: #F5C542; }
h1 { font-family: Manrope; font-weight: 800; font-size: 27px; color: #ECF5EF; margin: 24px 0 0; line-height: 1.25; }
.btn { display: inline-block; background: #F5C542; color: #0A1F17; font-family: Manrope; font-weight: 800; font-size: 17px; padding: 15px 30px; border-radius: 14px; }
.wrap { display: inline-block; padding: 0; background: transparent; }`;

const IMAGES = {
  'hero-confirmation': 'Bienvenue sur TCGMarket&nbsp;!',
  'hero-mot-de-passe': 'Nouveau mot de passe',
  'hero-changement-email': 'Nouvelle adresse e-mail',
  'btn-confirmation': ['Confirmer mon adresse'],
  'btn-mot-de-passe': ['Choisir un nouveau mot de passe'],
  'btn-changement-email': ['Confirmer la nouvelle adresse'],
};

const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const p = await b.newPage({ deviceScaleFactor: 2 });
for (const [name, v] of Object.entries(IMAGES)) {
  const html = Array.isArray(v)
    ? `<div class="wrap" id="x"><span class="btn">${v[0]}</span></div>`
    : `<div class="hero" id="x"><div class="brand"><img src="data:image/svg+xml;base64,${logo}"><span class="word">TCG<span>Market</span></span></div><h1>${v}</h1></div>`;
  await p.setContent(`<style>${CSS}${Array.isArray(v) ? 'body{background:transparent}' : ''}</style>${html}`);
  await p.evaluate(() => document.fonts.ready);
  await p.locator('#x').screenshot({ path: path.join(root, 'email', `${name}.png`), omitBackground: Array.isArray(v) });
  const box = await p.locator('#x').boundingBox();
  console.log(name, Math.round(box.width), Math.round(box.height));
}
await b.close();
