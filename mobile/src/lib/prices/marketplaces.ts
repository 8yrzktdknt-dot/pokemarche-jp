import type { Card, CardLang, GameId } from '../types.ts';

export type MarketplaceId = 'cardmarket' | 'tcgplayer' | 'cardtrader' | 'ebay';

export interface MarketLink {
  id: MarketplaceId;
  label: string;
  url: string;
}

/** Chemins des jeux sur chaque site. */
const CARDMARKET_GAME: Record<GameId, string> = {
  pokemon: 'Pokemon',
  onepiece: 'OnePiece',
  riftbound: 'Riftbound',
};

const TCGPLAYER_GAME: Record<GameId, string> = {
  pokemon: 'pokemon',
  onepiece: 'one-piece-card-game',
  riftbound: 'riftbound-league-of-legends-trading-card-game',
};

const EBAY_GAME: Record<GameId, string> = {
  pokemon: 'pokemon',
  onepiece: 'one piece card',
  riftbound: 'riftbound',
};

/** Langue du site Cardmarket selon la langue de l'utilisateur. */
const CARDMARKET_SITE_LANGS = ['en', 'fr', 'de', 'es', 'it'];

const EBAY_DOMAIN: Record<string, string> = {
  fr: 'www.ebay.fr', de: 'www.ebay.de', es: 'www.ebay.es', it: 'www.ebay.it',
  en: 'www.ebay.com', 'en-GB': 'www.ebay.co.uk', ja: 'www.ebay.com',
};

const LANG_WORD: Partial<Record<CardLang, string>> = {
  ja: 'japanese', ko: 'korean', 'zh-tw': 'chinese', 'zh-cn': 'chinese', fr: 'french',
  de: 'german', es: 'spanish', it: 'italian', pt: 'portuguese', th: 'thai', id: 'indonesian',
};

const q = encodeURIComponent;

/** Requête de recherche : nom + numéro, sans le total (« 136/189 » → « 136 »). */
function searchTerms(card: Card): string {
  const num = card.game === 'pokemon' ? card.number.split('/')[0] : card.number;
  return `${card.name} ${num}`.trim();
}

/**
 * Liens de recherche vers les places de marché.
 * Ce sont des liens profonds (pas d'API) : ils marchent sans clé et peuvent porter un identifiant d'affiliation.
 */
export function marketLinks(card: Card, userLang = 'fr'): MarketLink[] {
  const terms = searchTerms(card);
  const siteLang = CARDMARKET_SITE_LANGS.includes(userLang) ? userLang : 'en';
  // TCGplayer sépare les cartes Pokémon japonaises dans une catégorie dédiée.
  const tcgGame = card.game === 'pokemon' && card.lang === 'ja' ? 'pokemon-japan' : TCGPLAYER_GAME[card.game];
  const langWord = card.lang !== 'en' ? LANG_WORD[card.lang] : undefined;
  const ebayQuery = [EBAY_GAME[card.game], card.name, card.number, langWord].filter(Boolean).join(' ');

  return [
    {
      id: 'cardmarket',
      label: 'Cardmarket',
      url: `https://www.cardmarket.com/${siteLang}/${CARDMARKET_GAME[card.game]}/Products/Search?searchString=${q(terms)}`,
    },
    {
      id: 'tcgplayer',
      label: 'TCGplayer',
      url: `https://www.tcgplayer.com/search/${tcgGame}/product?q=${q(terms)}&view=grid`,
    },
    {
      id: 'cardtrader',
      label: 'CardTrader',
      url: `https://www.cardtrader.com/${siteLang}/search?q=${q(terms)}`,
    },
    {
      id: 'ebay',
      label: 'eBay',
      url: `https://${EBAY_DOMAIN[userLang] ?? 'www.ebay.com'}/sch/i.html?_nkw=${q(ebayQuery)}`,
    },
  ];
}

export function formatPrice(value: number, currency: string, locale = 'fr-FR'): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}
