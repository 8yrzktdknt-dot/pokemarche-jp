import type { CardLang, GameId, GameProvider } from '../types.ts';
import { onepiece } from './onepiece.ts';
import { pokemon } from './pokemon.ts';
import { riftbound } from './riftbound.ts';

export const GAMES: Record<GameId, GameProvider> = { pokemon, onepiece, riftbound };
export const GAME_LIST: GameProvider[] = [pokemon, onepiece, riftbound];

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
