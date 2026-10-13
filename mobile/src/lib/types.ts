export type GameId = 'pokemon' | 'onepiece' | 'riftbound';

/** Codes de langue des cartes (pas de l'interface). */
export type CardLang =
  | 'en' | 'fr' | 'de' | 'es' | 'it' | 'pt'
  | 'ja' | 'ko' | 'zh-tw' | 'zh-cn' | 'id' | 'th';

export interface Price {
  source: 'cardmarket' | 'tcgplayer' | 'cardtrader' | 'ebay';
  /** Libellé court : "Tendance", "Moyenne", "Market"... */
  label: string;
  value: number;
  currency: 'EUR' | 'USD' | 'JPY';
}

export interface Card {
  game: GameId;
  /** Identifiant unique côté fournisseur de données. */
  id: string;
  lang: CardLang;
  name: string;
  /** Numéro imprimé : "136/189", "OP05-119", "OGN-042/298". */
  number: string;
  setId?: string;
  setName?: string;
  rarity?: string;
  imageSmall?: string;
  imageLarge?: string;
  prices: Price[];
  /** Valeurs filtrables propres au jeu (type, couleur, domaine…), par clé de facette. */
  facets?: Record<string, string[]>;
}

export type SortKey = 'relevance' | 'name' | 'number' | 'price-desc' | 'price-asc';

export interface SearchFilters {
  text: string;
  setId?: string;
  /** Valeur choisie par facette (clé → valeur). */
  facets: Record<string, string>;
  sort: SortKey;
}

export interface Facet {
  key: string;
  label: string;
  values: string[];
}

export interface FilterOptions {
  sets: { id: string; name: string }[];
  facets: Facet[];
  sorts: SortKey[];
}

/** Ce que l'OCR a reconnu sur la carte, avant interrogation du catalogue. */
export interface ScanHint {
  game: GameId;
  /** Code complet tel que lu : "OP05-119", "OGN-042", "136/189". */
  code: string;
  setCode?: string;
  localId?: string;
  setTotal?: number;
  /** Texte brut, utile pour départager plusieurs candidats par le nom. */
  text: string;
  lang?: CardLang;
}

export interface GameProvider {
  id: GameId;
  label: string;
  langs: CardLang[];
  search(filters: SearchFilters, lang: CardLang): Promise<Card[]>;
  filterOptions(lang: CardLang): Promise<FilterOptions>;
  getCard(id: string, lang: CardLang): Promise<Card | null>;
  /** Résout un code lu par le scanner en cartes candidates (meilleure en premier). */
  resolveScan(hint: ScanHint, lang: CardLang): Promise<Card[]>;
}
