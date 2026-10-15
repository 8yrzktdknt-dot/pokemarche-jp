// Mise à jour rapide des prix (lancée toutes les heures) : quand Cardmarket publie un nouveau guide des prix
// (environ une fois par jour), les prix de toutes les cartes Pokémon et de leurs variantes sont recalculés
// (moyenne des ventes sur 7 jours, sinon 30 jours, toutes les ventes, offres), sans refaire le reste du catalogue.
// Rien n'est réécrit quand le guide n'a pas changé depuis le dernier passage.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PRICES } from './cardmarket-japanese.mjs';
import { CATALOG, getJson, writeJson } from './lib.mjs';
import { applyCardmarketPrices } from './variants.mjs';

const STATE = 'prices-state.json';

/** Date du guide des prix (champ « createdAt » de Cardmarket, sinon une empreinte de son contenu). */
export function guideStamp(g) {
  if (g?.createdAt) return String(g.createdAt);
  let sum = 0;
  for (const x of g?.priceGuides ?? []) sum = (sum * 31 + Math.round((x.avg7 ?? 0) * 100) + x.idProduct) % 2147483647;
  return `${g?.priceGuides?.length ?? 0}:${sum}`;
}

/** Prix de toutes les cartes Pokémon depuis un guide ; renvoie le nombre de fichiers modifiés. */
export function applyGuide(guide, catalog = CATALOG) {
  const files = { prices: new Map((guide.priceGuides ?? []).map((x) => [x.idProduct, x])) };
  let changed = 0;
  const cardsDir = join(catalog, 'cards');
  for (const dir of readdirSync(cardsDir).filter((d) => d.startsWith('pokemon-'))) {
    for (const f of readdirSync(join(cardsDir, dir)).filter((x) => x.endsWith('.json'))) {
      const text = readFileSync(join(cardsDir, dir, f), 'utf8');
      const cards = JSON.parse(text);
      applyCardmarketPrices(cards, files);
      if (JSON.stringify(cards) !== text) { writeJson(`cards/${dir}/${f}`, cards); changed++; }
    }
  }
  return changed;
}

/** false quand le guide n'a pas changé (le passage s'arrête là). */
export async function buildPrices() {
  const guide = await getJson(PRICES);
  if (!guide?.priceGuides?.length) throw new Error('Guide des prix Cardmarket indisponible');
  const stamp = guideStamp(guide);
  const old = existsSync(join(CATALOG, STATE)) ? JSON.parse(readFileSync(join(CATALOG, STATE), 'utf8')) : null;
  if (old?.guide === stamp && !process.env.FORCE_PRICES) {
    console.log(`Guide des prix Cardmarket inchangé (${stamp}) : rien à faire.`);
    return false;
  }
  const n = applyGuide(guide);
  writeJson(STATE, { guide: stamp, applied: new Date().toISOString() });
  console.log(`Nouveau guide des prix Cardmarket (${stamp}) : ${n} fichiers de cartes mis à jour.`);
  return true;
}
