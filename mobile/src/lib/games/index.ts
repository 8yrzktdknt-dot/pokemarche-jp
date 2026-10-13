import type { CardLang, GameId, GameProvider } from '../types.ts';
import { onepiece } from './onepiece.ts';
import { pokemon } from './pokemon.ts';
import { riftbound } from './riftbound.ts';

/**
 * Langues proposées pour l'instant. Les autres (allemand, espagnol, italien, portugais, coréen, indonésien, thaï)
 * restent prises en charge par les connecteurs et seront rouvertes plus tard : il suffit de les ajouter ici.
 */
export const VISIBLE_LANGS: CardLang[] = ['fr', 'en', 'ja', 'zh-tw', 'zh-cn'];

const visible = (g: GameProvider): GameProvider => ({ ...g, langs: g.langs.filter((l) => VISIBLE_LANGS.includes(l)) });

export const GAMES: Record<GameId, GameProvider> = {
  pokemon: visible(pokemon),
  onepiece: visible(onepiece),
  riftbound: visible(riftbound),
};
export const GAME_LIST: GameProvider[] = [GAMES.pokemon, GAMES.onepiece, GAMES.riftbound];

export const LANG_LABEL: Record<CardLang, string> = {
  fr: 'Français', en: 'Anglais', ja: 'Japonais', de: 'Allemand', es: 'Espagnol',
  it: 'Italien', pt: 'Portugais', ko: 'Coréen', 'zh-tw': 'Chinois trad.',
  'zh-cn': 'Chinois simpl.', id: 'Indonésien', th: 'Thaï',
};

/** Langue de carte effective : celle demandée si le jeu la propose, sinon la première du jeu. */
export function langFor(game: GameId, wanted: CardLang): CardLang {
  const langs = GAMES[game].langs;
  return langs.includes(wanted) ? wanted : langs[0];
}
