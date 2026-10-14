// Construit la version web (PWA) et la place dans ../app, servie par GitHub Pages
// à l'adresse https://<compte>.github.io/tcgmarket/app/.
import { execSync } from 'node:child_process';
import { copyFileSync, cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist-web');
const target = join(root, '..', 'app');
const app = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8')).expo;
const base = app.experiments.baseUrl;

rmSync(dist, { recursive: true, force: true });
// Numéro de version (0.0.1, 0.0.2…), augmenté à chaque construction et affiché dans l'onglet Compte.
const versionFile = join(root, 'version.json');
const [major, minor, patch] = JSON.parse(readFileSync(versionFile, 'utf8')).version.split('.').map(Number);
const version = `${major}.${minor}.${patch + 1}`;
writeFileSync(versionFile, `${JSON.stringify({ version }, null, 2)}\n`);
execSync(`npx expo export --platform web --output-dir ${dist}`, { cwd: root, stdio: 'inherit', env: { ...process.env, EXPO_PUBLIC_VERSION: version } });

for (const f of ['apple-touch-icon.png', 'pwa-192.png', 'pwa-512.png']) copyFileSync(join(root, 'assets', f), join(dist, f));

writeFileSync(join(dist, 'manifest.json'), JSON.stringify({
  name: app.web.name,
  short_name: app.web.shortName,
  lang: 'fr',
  start_url: `${base}/`,
  scope: `${base}/`,
  display: 'standalone',
  orientation: 'portrait',
  background_color: app.web.backgroundColor,
  theme_color: app.web.themeColor,
  icons: [
    { src: `${base}/pwa-192.png`, sizes: '192x192', type: 'image/png' },
    { src: `${base}/pwa-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ],
}, null, 2));

// Cache de l'app (service worker), servi à la racine de l'app pour couvrir toutes ses pages.
writeFileSync(join(dist, 'sw.js'), readFileSync(join(root, 'scripts', 'sw.js'), 'utf8')
  .replace('__VERSION__', String(Date.now()))
  .replace('__BASE__', base));

// Balises pour l'ajout à l'écran d'accueil (iPhone et Android).
const head = [
  `<link rel="manifest" href="${base}/manifest.json">`,
  `<link rel="apple-touch-icon" href="${base}/apple-touch-icon.png">`,
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
  `<meta name="apple-mobile-web-app-title" content="${app.web.shortName}">`,
  `<style>html,body{background:${app.web.backgroundColor}}</style>`,
  `<script>if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('${base}/sw.js',{scope:'${base}/'}).catch(()=>{}))</script>`,
].join('');
const indexPath = join(dist, 'index.html');
let html = readFileSync(indexPath, 'utf8')
  .replace('</head>', `${head}</head>`)
  .replace(/<html[^>]*>/, '<html lang="fr">')
  .replace(/width=device-width, initial-scale=1(, shrink-to-fit=no)?/, 'width=device-width, initial-scale=1, viewport-fit=cover');
writeFileSync(indexPath, html);

rmSync(target, { recursive: true, force: true });
cpSync(dist, target, { recursive: true });
// GitHub Pages renvoie /404.html pour une adresse inconnue : on y sert l'app,
// pour qu'un rechargement sur /app/collection fonctionne.
writeFileSync(join(root, '..', '404.html'), html);
console.log(`Version web prête dans ${target}`);
