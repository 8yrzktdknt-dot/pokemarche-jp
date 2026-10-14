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
  'futuristic rare': 'FUR', 'mega hyper rare': 'MUR', 'méga hyper rare': 'MUR', 'hyper rare méga': 'MUR',
  'rare illustration spéciale': 'SAR', 'rare illustration': 'AR',
  'double rare ': 'RR', 'rare double': 'RR', 'triple rare ': 'RRR', 'character rare': 'CHR', 'character super rare': 'CSR', promo: 'PR',
  'full art trainer': 'SR', 'classic collection': 'CC', 'crown': 'UR', 'one diamond': '◇', none: 'None', '': 'None', 'sans rareté': 'None', 'no rarity': 'None', 'keine seltenheit': 'None',
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

type RarityNames = Record<'fr' | 'en' | 'ja' | 'zh-tw' | 'zh-cn' | 'es' | 'it' | 'de' | 'nl' | 'pt' | 'ru' | 'th' | 'ko', string>;
const R = (fr: string, en: string, ja: string, zhTw: string, zhCn: string, es: string, it: string, de: string, nl: string, pt: string, ru: string, th: string, ko: string): RarityNames =>
  ({ fr, en, ja, 'zh-tw': zhTw, 'zh-cn': zhCn, es, it, de, nl, pt, ru, th, ko });

/** Raretés Pokémon dans l'ordre d'affichage voulu (les autres suivent, par ordre alphabétique), nommées dans chaque langue. */
export const RARITY_ORDER: { abbr: string; names: RarityNames }[] = [
  { abbr: 'C', names: R('Commune', 'Common', 'コモン', '普通', '普通', 'Común', 'Comune', 'Häufig', 'Algemeen', 'Comum', 'Обычная', 'คอมมอน', '커먼') },
  { abbr: 'U', names: R('Peu commune', 'Uncommon', 'アンコモン', '非普通', '非普通', 'Infrecuente', 'Non comune', 'Nicht so häufig', 'Ongewoon', 'Incomum', 'Необычная', 'อันคอมมอน', '언커먼') },
  { abbr: 'R', names: R('Rare', 'Rare', 'レア', '稀有', '稀有', 'Rara', 'Rara', 'Selten', 'Zeldzaam', 'Rara', 'Редкая', 'แรร์', '레어') },
  { abbr: 'RR', names: R('Double Rare', 'Double Rare', 'ダブルレア', '雙重稀有', '双重稀有', 'Rara Doble', 'Rara Doppia', 'Doppelselten', 'Dubbel Zeldzaam', 'Rara Dupla', 'Двойная редкая', 'ดับเบิลแรร์', '더블 레어') },
  { abbr: 'RRR', names: R('Triple Rare', 'Triple Rare', 'トリプルレア', '三重稀有', '三重稀有', 'Rara Triple', 'Rara Tripla', 'Dreifachselten', 'Drievoudig Zeldzaam', 'Rara Tripla', 'Тройная редкая', 'ทริปเปิลแรร์', '트리플 레어') },
  { abbr: 'AR', names: R('Illustration Rare', 'Illustration Rare', 'アートレア', '插畫稀有', '插画稀有', 'Rara Ilustración', 'Rara Illustrazione', 'Illustration Selten', 'Illustratie Zeldzaam', 'Rara Ilustrada', 'Редкая иллюстрация', 'อาร์ตแรร์', '아트 레어') },
  { abbr: 'UR', names: R('Hyper Rare', 'Hyper Rare', 'ウルトラレア', '極致稀有', '极致稀有', 'Hiper Rara', 'Iper Rara', 'Hyperselten', 'Hyper Zeldzaam', 'Hiper-Rara', 'Гиперредкая', 'อัลตร้าแรร์', '울트라 레어') },
  { abbr: 'SR', names: R('Ultra Rare', 'Ultra Rare', 'スーパーレア', '超級稀有', '超级稀有', 'Ultra Rara', 'Ultra Rara', 'Ultraselten', 'Ultra Zeldzaam', 'Ultra Rara', 'Ультраредкая', 'ซูเปอร์แรร์', '슈퍼 레어') },
  { abbr: 'SAR', names: R('Illustration Spéciale Rare', 'Special Illustration Rare', 'スペシャルアートレア', '特別插畫稀有', '特别插画稀有', 'Rara Ilustración Especial', 'Rara Illustrazione Speciale', 'Besondere Illustration Selten', 'Speciale Illustratie Zeldzaam', 'Rara Ilustrada Especial', 'Особая редкая иллюстрация', 'สเปเชียลอาร์ตแรร์', '스페셜 아트 레어') },
  { abbr: 'MUR', names: R('Méga Hyper Rare', 'Mega Hyper Rare', 'メガウルトラレア', '超級進化極致稀有', '超级进化极致稀有', 'Mega Hiper Rara', 'Mega Iper Rara', 'Mega-Hyperselten', 'Mega Hyper Zeldzaam', 'Mega Hiper-Rara', 'Мега гиперредкая', 'เมกะอัลตร้าแรร์', '메가 울트라 레어') },
  { abbr: 'FUR', names: R('Futuristic Rare', 'Futuristic Rare', 'フューチャーレア', '未來稀有', '未来稀有', 'Rara Futurista', 'Rara Futuristica', 'Futuristisch Selten', 'Futuristisch Zeldzaam', 'Rara Futurista', 'Футуристическая редкая', 'ฟิวเจอร์แรร์', '퓨처 레어') },
  { abbr: 'ACE', names: R('High-tech Rare', 'ACE SPEC Rare', 'エーススペック', 'ACE SPEC 稀有', 'ACE SPEC 稀有', 'Rara AS', 'Rara ACE SPEC', 'ACE SPEC Selten', 'ACE SPEC Zeldzaam', 'Rara ACE SPEC', 'Редкая ACE SPEC', 'เอซสเปค', '에이스 스펙') },
  { abbr: 'S', names: R('Chromatique Rare', 'Shiny Rare', '色違い', '異色稀有', '异色稀有', 'Rara Variocolor', 'Rara Cromatica', 'Schillernd Selten', 'Shiny Zeldzaam', 'Rara Brilhante', 'Редкая сияющая', 'ชายนี่แรร์', '색이 다른 레어') },
  { abbr: 'SSR', names: R('Chromatique Ultra Rare', 'Shiny Ultra Rare', '色違いスーパーレア', '異色超級稀有', '异色超级稀有', 'Ultra Rara Variocolor', 'Ultra Rara Cromatica', 'Schillernd Ultraselten', 'Shiny Ultra Zeldzaam', 'Ultra Rara Brilhante', 'Ультраредкая сияющая', 'ชายนี่ซูเปอร์แรร์', '색이 다른 슈퍼 레어') },
  { abbr: 'PR', names: R('Promo', 'Promo', 'プロモ', '特典卡', '特典卡', 'Promo', 'Promo', 'Promo', 'Promo', 'Promo', 'Промо', 'โปรโม', '프로모') },
];

/** Cartes sans rareté connue : toujours en fin de liste. */
const NONE_NAMES = R('Sans rareté', 'No rarity', 'レアリティなし', '無稀有度', '无稀有度', 'Sin rareza', 'Senza rarità', 'Ohne Seltenheit', 'Geen zeldzaamheid', 'Sem raridade', 'Без редкости', 'ไม่มีความหายาก', '레어도 없음');
const NONE_ABBR = 'None';
/** Raretés courantes, sans place réservée dans la liste de filtres (les autres sont celles de RARITY_ORDER). */
const LISTED = new Set(['C', 'U', 'R', 'RR', 'RRR', 'AR', 'UR', 'SR', 'SAR', 'MUR', 'FUR']);

/** Nom d'une rareté (abréviation) dans la langue de l'app ; undefined si inconnue. */
export function rarityName(abbr: string, lang: string): string | undefined {
  if (abbr === NONE_ABBR) return NONE_NAMES[lang as keyof RarityNames] ?? NONE_NAMES.en;
  const r = RARITY_ORDER.find((x) => x.abbr === abbr);
  return r ? r.names[lang as keyof RarityNames] ?? r.names.en : undefined;
}

/**
 * Options du filtre de rareté : les abréviations connues dans l'ordre ci-dessus, puis les autres valeurs.
 * `values` : raretés renvoyées par la source (dans la langue des cartes). La valeur d'une option est l'abréviation.
 */
export function rarityOptions(values: string[], lang: string): { value: string; label: string }[] {
  const known = RARITY_ORDER.filter((r) => LISTED.has(r.abbr)).map((r) => ({ value: r.abbr, label: `${r.abbr} - ${rarityName(r.abbr, lang)}` }));
  const knownAbbr = new Set(known.map((r) => r.value));
  const others = new Map<string, string>();
  for (const v of values) {
    const a = rarityAbbr(v);
    const name = rarityName(a, lang);
    if (!knownAbbr.has(a) && !others.has(a)) others.set(a, name ? `${a} - ${name}` : a === v ? v : `${a} - ${v}`);
  }
  const hasNone = others.delete(NONE_ABBR) || values.some((v) => !v);
  return [
    ...known,
    ...[...others].map(([value, label]) => ({ value, label })).sort((x, y) => x.label.localeCompare(y.label)),
    ...(hasNone ? [{ value: NONE_ABBR, label: `${NONE_ABBR} - ${rarityName(NONE_ABBR, lang)}` }] : []),
  ];
}

/** Valeurs de la source correspondant à une abréviation (ex. « SAR » → « Special illustration rare »). */
export function rarityValuesFor(abbr: string, values: string[]): string[] {
  return values.filter((v) => rarityAbbr(v) === abbr);
}
