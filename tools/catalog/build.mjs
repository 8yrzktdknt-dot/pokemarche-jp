// Robot du catalogue (GitHub Actions, workflow « Catalogue de cartes »).
//   STEPS=pokemon-ja,pokemon-intl,onepiece,riftbound,visual npm run build
import { buildOnePiece } from './build-onepiece.mjs';
import { buildPokemonIntl } from './build-pokemon-intl.mjs';
import { buildPokemonJa } from './build-pokemon-ja.mjs';
import { buildRiftbound } from './build-riftbound.mjs';
import { buildSearch } from './build-search.mjs';
import { buildVisual } from './build-visual.mjs';

const STEPS = { 'pokemon-ja': buildPokemonJa, 'pokemon-intl': () => buildPokemonIntl(), onepiece: buildOnePiece, riftbound: buildRiftbound, visual: () => buildVisual(), search: buildSearch };
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
