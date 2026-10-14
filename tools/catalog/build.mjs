// Robot du catalogue (GitHub Actions, workflow « Catalogue de cartes »).
//   STEPS=pokemon-ja,pokemon-intl,pokemon-cards,pokemon-details,pokemon-zh,onepiece,riftbound,visual,assets npm run build
//   VISUAL_TARGETS=pokemon-fr (index visuels à refaire, tous par défaut)
import { buildAssets } from './build-assets.mjs';
import { buildOnePiece } from './build-onepiece.mjs';
import { buildPokemonCards } from './build-pokemon-cards.mjs';
import { buildPokemonDetails } from './build-pokemon-details.mjs';
import { buildPokemonIntl } from './build-pokemon-intl.mjs';
import { buildPokemonJa } from './build-pokemon-ja.mjs';
import { buildPokemonZh } from './build-pokemon-zh.mjs';
import { buildRiftbound } from './build-riftbound.mjs';
import { buildSearch } from './build-search.mjs';
import { buildVisual } from './build-visual.mjs';

/** Télécharge des images dans catalog/_grab pour les examiner (étape « grab », URL dans GRAB_URLS). */
async function grab() {
  const { getBuffer, writeJson } = await import('./lib.mjs');
  const { writeFileSync, mkdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { CATALOG } = await import('./lib.mjs');
  mkdirSync(join(CATALOG, '_grab'), { recursive: true });
  const urls = (process.env.GRAB_URLS || '').split(',').map((u) => u.trim()).filter(Boolean);
  for (const [i, u] of urls.entries()) {
    const buf = await getBuffer(u);
    if (buf) writeFileSync(join(CATALOG, '_grab', `${String(i).padStart(2, '0')}-${u.split('/').pop().split('?')[0]}`), buf);
  }
  writeJson('_grab/urls.json', urls);
}

const STEPS = {
  grab, 'pokemon-ja': buildPokemonJa, 'pokemon-intl': () => buildPokemonIntl(), 'pokemon-cards': () => buildPokemonCards(), 'pokemon-details': () => buildPokemonDetails(), 'pokemon-zh': buildPokemonZh, onepiece: buildOnePiece, riftbound: buildRiftbound, visual: () => buildVisual(), assets: buildAssets, search: buildSearch };
const wanted = (process.env.STEPS || Object.keys(STEPS).join(',')).split(',').map((s) => s.trim()).filter(Boolean);
// Les fichiers de recherche suivent toujours les catalogues reconstruits.
if (!wanted.includes('search')) wanted.push('search');

let failed = 0;
for (const name of wanted) {
  const step = STEPS[name];
  if (!step) { console.warn(`Étape inconnue : ${name}`); continue; }
  console.log(`\n=== ${name}`);
  const t = Date.now();
  try {
    await step();
  } catch (e) {
    failed++;
    console.error(`Étape ${name} en échec :`, e);
  }
  console.log(`=== ${name} : ${Math.round((Date.now() - t) / 1000)} s`);
}
// Une étape en échec n'empêche pas d'enregistrer les autres ; le workflow le signale quand même.
process.exitCode = failed ? 1 : 0;
