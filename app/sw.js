// Cache de l'app (service worker) : ce qui a déjà été vu s'affiche tout de suite, même sans réseau.
//  - images (cartes, logos, sprites) : gardées sur le téléphone, réseau seulement la première fois ;
//  - fichiers de l'app (noms avec empreinte) : gardés jusqu'à la version suivante ;
//  - catalogue : réseau d'abord (toujours à jour), copie locale sans réseau ;
//  - prix et taux de change : réseau d'abord, cache si le réseau est lent ou absent.
const VERSION = '1791979113297';
const BASE = '/pokemarche-jp/app';
const APP = `app-${VERSION}`;
const IMAGES = 'images-v1';
const DATA = 'data-v1';
const LIVE = 'live-v1';
const MAX_IMAGES = 6000;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(APP).then((c) => c.addAll([`${BASE}/`, `${BASE}/manifest.json`])).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('app-') && k !== APP) await caches.delete(k);
    await self.clients.claim();
  })());
});

const isImage = (req, url) => req.destination === 'image' || /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(url.pathname);
const LIVE_HOSTS = ['api.tcgdex.net', 'optcgapi.com', 'api.riftcodex.com', 'api.frankfurter.app'];

let trimming = false;
async function trimImages() {
  if (trimming) return;
  trimming = true;
  try {
    const c = await caches.open(IMAGES);
    const keys = await c.keys();
    // Les plus anciennes d'abord (ordre d'ajout).
    for (const k of keys.slice(0, Math.max(0, keys.length - MAX_IMAGES))) await c.delete(k);
  } finally {
    trimming = false;
  }
}

async function cacheFirst(req, name, onStore) {
  const c = await caches.open(name);
  const hit = await c.match(req);
  // Une image gardée pour une balise <img> (réponse opaque) ne sert pas à une lecture en CORS (scanner).
  if (hit && (hit.type !== 'opaque' || req.mode === 'no-cors')) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') {
    c.put(req, res.clone()).then(onStore, () => {});
  }
  return res;
}

async function networkFirst(req, name, timeoutMs) {
  const c = await caches.open(name);
  const net = fetch(req).then((res) => {
    if (res.ok) c.put(req, res.clone()).catch(() => {});
    return res;
  });
  const timer = new Promise((resolve) => setTimeout(resolve, timeoutMs));
  const first = await Promise.race([net.catch(() => null), timer]);
  if (first) return first;
  const hit = await c.match(req);
  if (hit) return hit;
  return net;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
  const same = url.origin === self.location.origin;

  // Pages de l'app : réseau d'abord (nouvelle version), page en cache sans réseau.
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, APP, 4000).catch(async () => (await caches.match(`${BASE}/`)) ?? Response.error()));
    return;
  }
  if (same && (url.pathname.startsWith(`${BASE}/_expo/`) || url.pathname.startsWith(`${BASE}/assets/`))) {
    event.respondWith(cacheFirst(req, APP));
    return;
  }
  if (isImage(req, url)) {
    event.respondWith(cacheFirst(req, IMAGES, trimImages));
    return;
  }
  // Catalogue (prix du jour, liens) : réseau d'abord pour être toujours à jour ; copie locale sans réseau.
  if (same && url.pathname.includes('/catalog/')) {
    event.respondWith(networkFirst(req, DATA, 4000));
    return;
  }
  if (LIVE_HOSTS.includes(url.hostname)) {
    event.respondWith(networkFirst(req, LIVE, 5000));
    return;
  }
  // Bibliothèque et modèle du scanner : identiques d'une fois à l'autre.
  if (url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'huggingface.co' || url.hostname.endsWith('.hf.co')) {
    event.respondWith(cacheFirst(req, DATA));
  }
});
