/**
 * Noms anglais des extensions et blocs japonais (TCGdex ne fournit que le nom japonais).
 * Clé = id TCGdex en majuscules. Une extension absente garde son nom d'origine.
 */
export const JP_SET_EN: Record<string, string> = {
  // Méga-Évolution
  M1L: 'Mega Brave', M1S: 'Mega Symphonia', M2: 'Inferno X', M2A: 'MEGA Dream ex',
  // Écarlate et Violet
  SV1S: 'Scarlet ex', SV1V: 'Violet ex', SV1A: 'Triplet Beat', SV2P: 'Snow Hazard', SV2D: 'Clay Burst',
  SV2A: 'Pokémon Card 151', SV3: 'Ruler of the Black Flame', SV3A: 'Raging Surf', SV4K: 'Ancient Roar',
  SV4M: 'Future Flash', SV4A: 'Shiny Treasure ex', SV5K: 'Wild Force', SV5M: 'Cyber Judge', SV5A: 'Crimson Haze',
  SV6: 'Mask of Change', SV6A: 'Night Wanderer', SV7: 'Stellar Miracle', SV7A: 'Paradise Dragona',
  SV8: 'Super Electric Breaker', SV8A: 'Terastal Festival ex', SV9: 'Battle Partners', SV9A: 'Heat Wave Arena',
  SV10: 'The Glory of Team Rocket', SV11B: 'Black Bolt', SV11W: 'White Flare',
  // Épée et Bouclier
  S1W: 'Sword', S1H: 'Shield', S1A: 'VMAX Rising', S2: 'Rebellion Crash', S2A: 'Explosive Walker',
  S3: 'Infinity Zone', S3A: 'Legendary Heartbeat', S4: 'Amazing Volt Tackle', S4A: 'Shiny Star V',
  S5I: 'Single Strike Master', S5R: 'Rapid Strike Master', S5A: 'Peerless Fighters', S6H: 'Silver Lance',
  S6K: 'Jet-Black Spirit', S6A: 'Eevee Heroes', S7D: 'Skyscraping Perfection', S7R: 'Blue Sky Stream',
  S8: 'Fusion Arts', S8A: '25th Anniversary Collection', S8B: 'VMAX Climax', S9: 'Star Birth', S9A: 'Battle Region',
  S10D: 'Time Gazer', S10P: 'Space Juggler', S10A: 'Dark Phantasma', S10B: 'Pokémon GO', S11: 'Lost Abyss',
  S11A: 'Incandescent Arcana', S12: 'Paradigm Trigger', S12A: 'VSTAR Universe',
};

export const JP_SERIE_EN: Record<string, string> = {
  M: 'Mega Evolution', ME: 'Mega Evolution', SV: 'Scarlet & Violet', S: 'Sword & Shield', SWSH: 'Sword & Shield',
  SM: 'Sun & Moon', XY: 'XY', BW: 'Black & White', DP: 'Diamond & Pearl', PT: 'Platinum', ADV: 'ADV', PCG: 'PCG',
  L: 'LEGEND', E: 'e-Card', NEO: 'Neo', P: 'Promos',
};

/** Abréviations usuelles des raretés (noms TCGdex dans plusieurs langues, en minuscules). */
const RARITY_ABBR: Record<string, string> = {
  common: 'C', commune: 'C', 'häufig': 'C', 'común': 'C', comune: 'C',
  uncommon: 'U', 'peu commune': 'U', 'nicht so häufig': 'U', 'poco común': 'U', 'non comune': 'U',
  rare: 'R', selten: 'R', rara: 'R',
  'rare holo': 'R', 'holo rare': 'R', 'rare holo v': 'RR', 'rare holo vmax': 'RRR', 'rare holo vstar': 'RRR',
  'double rare': 'RR', 'triple rare': 'RRR',
  'illustration rare': 'AR', 'illustration rare spéciale': 'SAR', 'illustration spéciale rare': 'SAR',
  'special illustration rare': 'SAR', 'ultra rare': 'SR', 'hyper rare': 'UR', 'secret rare': 'UR',
  'ace spec rare': 'ACE', 'shiny rare': 'S', 'chromatique rare': 'S', 'shiny ultra rare': 'SSR',
  'chromatique ultra rare': 'SSR', 'amazing rare': 'A', 'radiant rare': 'K', 'black white rare': 'BWR',
  // Noms utilisés par Limitless pour les cartes japonaises
  'art rare': 'AR', 'special art rare': 'SAR', 'character holo rare': 'CHR',
  'mega hyper rare': 'MUR', 'méga hyper rare': 'MUR', 'hyper rare méga': 'MUR',
  'rare illustration spéciale': 'SAR', 'rare illustration': 'AR',
  'double rare ': 'RR', 'rare double': 'RR', 'triple rare ': 'RRR', 'character rare': 'CHR', 'character super rare': 'CSR', promo: 'PR',
  'full art trainer': 'SR', 'classic collection': 'CC', 'crown': 'UR', 'one diamond': '◇', none: '—',
};

export function rarityAbbr(name: string): string {
  const k = name.trim().toLowerCase();
  if (RARITY_ABBR[k]) return RARITY_ABBR[k];
  // Déjà une abréviation (cartes japonaises : « SAR », « AR »…).
  if (/^[A-Z◇☆★]{1,4}$/.test(name.trim())) return name.trim();
  return name;
}

/** Les cartes japonaises et chinoises s'affichent avec le nom anglais de l'extension. */
export const ENGLISH_NAMED_LANGS = ['en', 'ja', 'zh-tw', 'zh-cn'];

/** Raretés Pokémon dans l'ordre d'affichage voulu (les autres suivent, par ordre alphabétique). */
export const RARITY_ORDER: { abbr: string; fr: string; en: string }[] = [
  { abbr: 'C', fr: 'Commune', en: 'Common' },
  { abbr: 'U', fr: 'Peu commune', en: 'Uncommon' },
  { abbr: 'R', fr: 'Rare', en: 'Rare' },
  { abbr: 'RR', fr: 'Double Rare', en: 'Double Rare' },
  { abbr: 'RRR', fr: 'Triple Rare', en: 'Triple Rare' },
  { abbr: 'AR', fr: 'Illustration Rare', en: 'Illustration Rare' },
  { abbr: 'UR', fr: 'Hyper Rare', en: 'Hyper Rare' },
  { abbr: 'SR', fr: 'Ultra Rare', en: 'Ultra Rare' },
  { abbr: 'SAR', fr: 'Illustration Spéciale Rare', en: 'Special Illustration Rare' },
  { abbr: 'MUR', fr: 'Méga Hyper Rare', en: 'Mega Hyper Rare' },
];

/**
 * Options du filtre de rareté : les abréviations connues dans l'ordre ci-dessus, puis les autres valeurs.
 * `values` : raretés renvoyées par la source (dans la langue des cartes). La valeur d'une option est l'abréviation.
 */
export function rarityOptions(values: string[], appLang: 'fr' | 'en'): { value: string; label: string }[] {
  const known = RARITY_ORDER.map((r) => ({ value: r.abbr, label: `${r.abbr} - ${r[appLang]}` }));
  const knownAbbr = new Set(RARITY_ORDER.map((r) => r.abbr));
  const others = new Map<string, string>();
  for (const v of values) {
    const a = rarityAbbr(v);
    if (!knownAbbr.has(a) && !others.has(a)) others.set(a, a === v ? v : `${a} - ${v}`);
  }
  return [...known, ...[...others].map(([value, label]) => ({ value, label })).sort((x, y) => x.label.localeCompare(y.label))];
}

/** Valeurs de la source correspondant à une abréviation (ex. « SAR » → « Special illustration rare »). */
export function rarityValuesFor(abbr: string, values: string[]): string[] {
  return values.filter((v) => rarityAbbr(v) === abbr);
}
