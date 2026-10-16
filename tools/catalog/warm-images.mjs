/**
 * Préchauffe le relais d'images wsrv.nl : les visuels One Piece (et chinois traditionnels) ne peuvent pas être
 * affichés directement depuis le site officiel ; wsrv.nl va les chercher au Japon/à Taïwan à la première demande
 * (≈ 2 s par image), puis les garde un an. En les demandant tous ici, en petite (360 px) et grande taille (900 px),
 * l'utilisateur les reçoit tout de suite depuis le cache, comme les visuels Pokémon servis par des CDN rapides.
 *
 * Les adresses déjà préchauffées sont mémorisées dans WARM_STATE (conservé par le cache des Actions) :
 * seules les nouvelles cartes sont demandées aux passages suivants.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../../catalog/', import.meta.url).pathname;
const STATE = process.env.WARM_STATE || join(ROOT, '..', '.warm-images');
const CONCURRENCY = Number(process.env.WARM_CONCURRENCY || 24);
const LIMIT_MS = Number(process.env.WARM_MINUTES || 300) * 60_000;

export const large = (u) => u.replace(/([?&]w=)\d+/, '$1900');

/** Toutes les adresses wsrv.nl citées par le catalogue publié, en petite et grande taille. */
export function collectUrls(text, into = new Set()) {
  for (const m of text.matchAll(/https:\/\/wsrv\.nl\/\?url=[^"\s]+/g)) {
    const u = m[0].replace(/\\u0026/g, '&');
    into.add(u);
    into.add(large(u));
  }
  return into;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.json')) out.push(p);
  }
  return out;
}

const key = (u) => createHash('sha1').update(u).digest('base64url').slice(0, 12);

async function warm(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      await res.arrayBuffer();
      if (res.ok) return true;
      if (res.status === 404 || res.status === 400) return false;
    } catch {}
    await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
  }
  return false;
}

async function main() {
  const urls = new Set();
  for (const f of walk(join(ROOT, 'search')).concat(walk(join(ROOT, 'cards')))) collectUrls(readFileSync(f, 'utf8'), urls);
  const done = new Set(existsSync(STATE) ? readFileSync(STATE, 'utf8').split('\n').filter(Boolean) : []);
  const todo = [...urls].filter((u) => !done.has(key(u)));
  console.log(`${urls.size} visuels relayés, ${todo.length} à préchauffer.`);

  const start = Date.now();
  let ok = 0, failed = 0, next = 0;
  const save = () => writeFileSync(STATE, [...done].join('\n') + '\n');
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (next < todo.length && Date.now() - start < LIMIT_MS) {
      const u = todo[next++];
      if (await warm(u)) { done.add(key(u)); ok++; } else failed++;
      if ((ok + failed) % 1000 === 0) {
        console.log(`${ok + failed}/${todo.length} (${Math.round((Date.now() - start) / 1000)} s)`);
        save();
      }
    }
  }));
  save();
  console.log(`Préchauffés : ${ok}, échecs : ${failed}, restants : ${todo.length - ok - failed}.`);

  // Contrôle : temps de réponse d'images déjà préchauffées.
  for (const u of [...urls].slice(0, 5)) {
    const t = Date.now();
    const res = await fetch(u);
    await res.arrayBuffer();
    console.log(`${res.status} ${Date.now() - t} ms ${res.headers.get('cf-cache-status') || ''} ${u.slice(0, 90)}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
