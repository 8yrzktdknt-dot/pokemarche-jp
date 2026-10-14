// Attributs des cartes japonaises absentes de TCGdex, lus sur leur page Limitless
// (« タマタマ - Grass - 60 HP », « Pokémon - Basic », « Illustrated by Nelnal », « J Regulation Mark »).
// Gardés dans catalog/limitless/ja-details.json (une page par carte, une seule fois).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOG, getText, pool, sleep, unescapeHtml, writeJson } from './lib.mjs';

const CACHE = join(CATALOG, 'limitless', 'ja-details.json');

const TYPES = { Grass: 'Plante', Fire: 'Feu', Water: 'Eau', Lightning: 'Électrique', Psychic: 'Psy', Fighting: 'Combat', Darkness: 'Obscurité', Metal: 'Métal', Dragon: 'Dragon', Colorless: 'Incolore', Fairy: 'Fée' };
const STAGES = { Basic: 'De base', 'Stage 1': 'Niveau 1', 'Stage 2': 'Niveau 2', VMAX: 'VMAX', VSTAR: 'VSTAR', 'MEGA': 'Méga', BREAK: 'TURBO', 'Level-Up': 'Niveau X' };
const KINDS = { Pokémon: 'Pokémon', Trainer: 'Dresseur', Energy: 'Énergie' };
const TRAINERS = { Item: 'Objet', Supporter: 'Supporter', Stadium: 'Stade', 'Pokémon Tool': 'Outil Pokémon', Tool: 'Outil Pokémon', Technical_Machine: 'Machine Technique' };
const text = (s) => unescapeHtml((s ?? '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

/** Attributs (clés de l'app, libellés en français) d'une page de carte Limitless. */
export function parseLimitlessDetails(html) {
  const out = {};
  const title = text(html.match(/<p class="card-text-title">([\s\S]*?)<\/p>/)?.[1]);
  const tm = title.match(/ - ([A-Za-z]+) - (\d+) HP$/);
  if (tm) { out.type = TYPES[tm[1]] ?? tm[1]; out.hp = tm[2]; }
  const kind = text(html.match(/<p class="card-text-type">([\s\S]*?)<\/p>/)?.[1]).split(' - ').map((x) => x.trim());
  if (kind[0] && KINDS[kind[0]]) {
    if (kind[0] === 'Pokémon') {
      out.category = 'Pokémon';
      if (kind[1]) out.stage = STAGES[kind[1]] ?? kind[1];
    } else {
      out.category = kind[1] ? `${KINDS[kind[0]]} · ${TRAINERS[kind[1]] ?? kind[1]}` : KINDS[kind[0]];
    }
  }
  const artist = text(html.match(/Illustrated by\s*<a[^>]*>([\s\S]*?)<\/a>/)?.[1]);
  if (artist) out.illustrator = artist;
  const reg = html.match(/>\s*([A-Z])\s+Regulation Mark/)?.[1];
  if (reg) out.regulation = reg;
  return out;
}

/** Complète le cache pour les cartes { key, url } et renvoie clé → attributs. */
export async function limitlessJapaneseDetails(cards, max = Number(process.env.JA_DETAILS_MAX || 25000)) {
  const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};
  const todo = cards.filter((c) => !cache[c.key]).slice(0, max);
  await pool(todo, 6, async (c) => {
    await sleep(80);
    const html = await getText(c.url);
    if (html) cache[c.key] = parseLimitlessDetails(html);
  });
  if (todo.length) writeJson('limitless/ja-details.json', cache);
  console.log(`Limitless (attributs japonais) : ${todo.length} pages lues, ${Object.keys(cache).length} en cache`);
  return new Map(Object.entries(cache));
}
