// Mise à jour rapide des prix (lancée toutes les heures) : quand Cardmarket publie un nouveau guide des prix
// (environ une fois par jour), les prix de toutes les cartes Pokémon, One Piece et Riftbound et de leurs variantes sont recalculés
// (moyenne des ventes sur 7 jours, sinon 30 jours, toutes les ventes, offres), sans refaire le reste du catalogue.
// Rien n'est réécrit quand le guide n'a pas changé depuis le dernier passage.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PRICES } from './cardmarket-japanese.mjs';
import { CM_PRICES } from './build-onepiece.mjs';
import { CM_PRICES as RB_PRICES, foilAsHolo } from './build-riftbound.mjs';
import { CATALOG, getJson, writeJson } from './lib.mjs';
import { applyCardmarketPrices } from './variants.mjs';

const STATE = 'prices-state.json';
/** Jeux suivis : dossiers de cartes et guide des prix Cardmarket. */
const GAMES = [{ game: 'pokemon', url: PRICES }, { game: 'onepiece', url: CM_PRICES }, { game: 'riftbound', url: RB_PRICES }];

/** Date du guide des prix (champ « createdAt » de Cardmarket, sinon une empreinte de son contenu). */
export function guideStamp(g) {
  if (g?.createdAt) return String(g.createdAt);
  let sum = 0;
  for (const x of g?.priceGuides ?? []) sum = (sum * 31 + Math.round((x.avg7 ?? 0) * 100) + x.idProduct) % 2147483647;
  return `${g?.priceGuides?.length ?? 0}:${sum}`;
}

/** Prix de toutes les cartes d'un jeu depuis son guide ; renvoie le nombre de fichiers modifiés. */
export function applyGuide(guide, game = 'pokemon', catalog = CATALOG) {
  // Riftbound : prix foil dans les champs « -foil » (« -holo » pour les autres jeux).
  const files = { prices: new Map((guide.priceGuides ?? []).map((x) => [x.idProduct, foilAsHolo(x)])) };
  let changed = 0;
  const cardsDir = join(catalog, 'cards');
  for (const dir of readdirSync(cardsDir).filter((d) => d.startsWith(`${game}-`))) {
    for (const f of readdirSync(join(cardsDir, dir)).filter((x) => x.endsWith('.json'))) {
      const text = readFileSync(join(cardsDir, dir, f), 'utf8');
      const cards = JSON.parse(text);
      applyCardmarketPrices(cards, files);
      if (JSON.stringify(cards) !== text) { writeJson(`cards/${dir}/${f}`, cards); changed++; }
    }
  }
  return changed;
}

/** false quand aucun guide n'a changé (le passage s'arrête là). */
export async function buildPrices() {
  const old = existsSync(join(CATALOG, STATE)) ? JSON.parse(readFileSync(join(CATALOG, STATE), 'utf8')) : {};
  // Ancien format : un seul guide (Pokémon).
  const state = old.guide ? { pokemon: old.guide } : { ...old };
  let changed = false;
  for (const { game, url } of GAMES) {
    const guide = await getJson(url).catch(() => null);
    if (!guide?.priceGuides?.length) { console.warn(`Guide des prix Cardmarket ${game} indisponible`); continue; }
    const stamp = guideStamp(guide);
    if (state[game] === stamp && !process.env.FORCE_PRICES) {
      console.log(`Guide des prix Cardmarket ${game} inchangé (${stamp}).`);
      continue;
    }
    const n = applyGuide(guide, game);
    state[game] = stamp;
    changed = true;
    console.log(`Nouveau guide des prix Cardmarket ${game} (${stamp}) : ${n} fichiers de cartes mis à jour.`);
  }
  if (!changed) return false;
  writeJson(STATE, { ...state, applied: new Date().toISOString() });
  return true;
}
