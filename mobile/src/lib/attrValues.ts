import type { AttributeKey } from './types.ts';

/**
 * Valeurs d'attributs Pokémon (type, stade, catégorie) et One Piece (couleur, catégorie, attribut) dans la langue de l'app.
 * Les sources mélangent les langues (catalogue en français, Limitless et TCGdex en anglais, TCGdex dans la langue
 * des cartes) : chaque valeur connue est ramenée à une notion, puis affichée dans la langue choisie.
 * Une valeur inconnue est affichée telle quelle.
 */
type Lang = 'fr' | 'en' | 'ja' | 'zh-tw' | 'zh-cn' | 'es' | 'it' | 'de' | 'nl' | 'pt' | 'ru' | 'th' | 'ko';
type Labels = Record<Lang, string>;
const L = (fr: string, en: string, ja: string, zhTw: string, zhCn: string, es: string, it: string, de: string, nl: string, pt: string, ru: string, th: string, ko: string): Labels =>
  ({ fr, en, ja, 'zh-tw': zhTw, 'zh-cn': zhCn, es, it, de, nl, pt, ru, th, ko });

const TYPES: Record<string, Labels> = {
  grass: L('Plante', 'Grass', '草', '草', '草', 'Planta', 'Erba', 'Pflanze', 'Gras', 'Planta', 'Трава', 'หญ้า', '풀'),
  fire: L('Feu', 'Fire', '炎', '火', '火', 'Fuego', 'Fuoco', 'Feuer', 'Vuur', 'Fogo', 'Огонь', 'ไฟ', '불꽃'),
  water: L('Eau', 'Water', '水', '水', '水', 'Agua', 'Acqua', 'Wasser', 'Water', 'Água', 'Вода', 'น้ำ', '물'),
  lightning: L('Électrique', 'Lightning', '雷', '雷', '雷', 'Rayo', 'Lampo', 'Elektro', 'Bliksem', 'Elétrico', 'Молния', 'สายฟ้า', '번개'),
  psychic: L('Psy', 'Psychic', '超', '超', '超', 'Psíquico', 'Psico', 'Psycho', 'Psychisch', 'Psíquico', 'Психика', 'พลังจิต', '초'),
  fighting: L('Combat', 'Fighting', '闘', '鬥', '斗', 'Lucha', 'Lotta', 'Kampf', 'Vechten', 'Luta', 'Борьба', 'ต่อสู้', '격투'),
  darkness: L('Obscurité', 'Darkness', '悪', '惡', '恶', 'Oscura', 'Oscurità', 'Finsternis', 'Duisternis', 'Escuridão', 'Тьма', 'ความมืด', '악'),
  metal: L('Métal', 'Metal', '鋼', '鋼', '钢', 'Metálica', 'Metallo', 'Metall', 'Metaal', 'Metal', 'Металл', 'โลหะ', '강철'),
  dragon: L('Dragon', 'Dragon', 'ドラゴン', '龍', '龙', 'Dragón', 'Drago', 'Drache', 'Draak', 'Dragão', 'Дракон', 'มังกร', '드래곤'),
  colorless: L('Incolore', 'Colorless', '無色', '無色', '无色', 'Incolora', 'Incolore', 'Farblos', 'Kleurloos', 'Incolor', 'Бесцветный', 'ไร้สี', '무색'),
  fairy: L('Fée', 'Fairy', 'フェアリー', '妖精', '妖精', 'Hada', 'Folletto', 'Fee', 'Fee', 'Fada', 'Фея', 'แฟรี่', '페어리'),
  // Énergies : « Normal » (de base) et « Special » côté anglais.
  basicEnergy: L('De base', 'Basic', '基本', '基本', '基本', 'Básica', 'Base', 'Basis', 'Basis', 'Básica', 'Базовая', 'พื้นฐาน', '기본'),
  specialEnergy: L('Spéciale', 'Special', '特殊', '特殊', '特殊', 'Especial', 'Speciale', 'Spezial', 'Speciaal', 'Especial', 'Особая', 'พิเศษ', '특수'),
};

const STAGES: Record<string, Labels> = {
  basic: L('De base', 'Basic', 'たね', '基礎', '基础', 'Básico', 'Base', 'Basis', 'Basis', 'Básico', 'Базовый', 'พื้นฐาน', '기본'),
  stage1: L('Niveau 1', 'Stage 1', '1進化', '1階進化', '1阶进化', 'Fase 1', 'Fase 1', 'Phase 1', 'Fase 1', 'Estágio 1', 'Стадия 1', 'ระดับ 1', '1진화'),
  stage2: L('Niveau 2', 'Stage 2', '2進化', '2階進化', '2阶进化', 'Fase 2', 'Fase 2', 'Phase 2', 'Fase 2', 'Estágio 2', 'Стадия 2', 'ระดับ 2', '2진화'),
  mega: L('Méga', 'Mega Evolution', 'メガシンカ', '超級進化', '超级进化', 'Megaevolución', 'Megaevoluzione', 'Mega-Entwicklung', 'Mega-evolutie', 'Megaevolução', 'Мегаэволюция', 'เมกะวิวัฒนาการ', '메가진화'),
  levelx: L('Niveau X', 'Level-Up', 'レベルアップ', '等級提升', '等级提升', 'Nivel X', 'Livello X', 'Level X', 'Level X', 'Nível X', 'Уровень X', 'เลเวล X', '레벨업'),
  legend: L('LÉGENDE', 'LEGEND', 'レジェンド', '傳說', '传说', 'LEYENDA', 'LEGGENDA', 'LEGENDE', 'LEGENDE', 'LENDA', 'ЛЕГЕНДА', 'ตำนาน', '레전드'),
  break: L('TURBO', 'BREAK', 'BREAK進化', 'BREAK進化', 'BREAK进化', 'TURBO', 'TURBO', 'TURBO', 'BREAK', 'TURBO', 'BREAK', 'BREAK', 'BREAK'),
  restored: L('Restauré', 'Restored', '復元', '復原', '复原', 'Restaurado', 'Ripristinato', 'Wiederbelebt', 'Hersteld', 'Restaurado', 'Восстановленный', 'ฟื้นคืน', '복원'),
  baby: L('Bébé', 'Baby', 'ベイビィ', '寶寶', '宝宝', 'Bebé', 'Baby', 'Baby', 'Baby', 'Bebê', 'Малыш', 'เบบี้', '베이비'),
};

const CATEGORIES: Record<string, Labels> = {
  pokemon: L('Pokémon', 'Pokémon', 'ポケモン', '寶可夢', '宝可梦', 'Pokémon', 'Pokémon', 'Pokémon', 'Pokémon', 'Pokémon', 'Покемон', 'โปเกมอน', '포켓몬'),
  trainer: L('Dresseur', 'Trainer', 'トレーナーズ', '訓練家', '训练家', 'Entrenador', 'Allenatore', 'Trainer', 'Trainer', 'Treinador', 'Тренер', 'เทรนเนอร์', '트레이너스'),
  energy: L('Énergie', 'Energy', 'エネルギー', '能量', '能量', 'Energía', 'Energia', 'Energie', 'Energie', 'Energia', 'Энергия', 'พลังงาน', '에너지'),
  item: L('Objet', 'Item', 'グッズ', '物品', '物品', 'Objeto', 'Strumento', 'Item', 'Voorwerp', 'Item', 'Предмет', 'ไอเท็ม', '아이템'),
  supporter: L('Supporter', 'Supporter', 'サポート', '支援者', '支援者', 'Partidario', 'Aiuto', 'Unterstützer', 'Supporter', 'Apoiador', 'Помощник', 'ซัพพอร์ต', '서포트'),
  stadium: L('Stade', 'Stadium', 'スタジアム', '競技場', '竞技场', 'Estadio', 'Stadio', 'Stadion', 'Stadion', 'Estádio', 'Стадион', 'สเตเดียม', '스타디움'),
  tool: L('Outil Pokémon', 'Pokémon Tool', 'ポケモンのどうぐ', '寶可夢道具', '宝可梦道具', 'Herramienta Pokémon', 'Oggetto Pokémon', 'Pokémon-Ausrüstung', 'Pokémon-uitrusting', 'Ferramenta Pokémon', 'Инструмент покемона', 'เครื่องมือโปเกมอน', '포켓몬의 도구'),
  tm: L('Machine Technique', 'Technical Machine', 'わざマシン', '招式學習器', '招式学习器', 'Máquina Técnica', 'Macchina Tecnica', 'Technische Maschine', 'Technische Machine', 'Máquina Técnica', 'Технический диск', 'เครื่องสอนท่า', '기술머신'),
  basicEnergy: L('Énergie de base', 'Basic Energy', '基本エネルギー', '基本能量', '基本能量', 'Energía Básica', 'Energia base', 'Basis-Energie', 'Basisenergie', 'Energia Básica', 'Базовая энергия', 'พลังงานพื้นฐาน', '기본 에너지'),
  specialEnergy: L('Énergie spéciale', 'Special Energy', '特殊エネルギー', '特殊能量', '特殊能量', 'Energía Especial', 'Energia speciale', 'Spezial-Energie', 'Speciale energie', 'Energia Especial', 'Особая энергия', 'พลังงานพิเศษ', '특수 에너지'),
};

/** One Piece : couleurs et attributs (catégories : avec celles de Pokémon). */
const COLORS: Record<string, Labels> = {
  red: L('Rouge', 'Red', '赤', '紅', '红', 'Rojo', 'Rosso', 'Rot', 'Rood', 'Vermelho', 'Красный', 'แดง', '빨강'),
  green: L('Vert', 'Green', '緑', '綠', '绿', 'Verde', 'Verde', 'Grün', 'Groen', 'Verde', 'Зелёный', 'เขียว', '초록'),
  blue: L('Bleu', 'Blue', '青', '藍', '蓝', 'Azul', 'Blu', 'Blau', 'Blauw', 'Azul', 'Синий', 'น้ำเงิน', '파랑'),
  purple: L('Violet', 'Purple', '紫', '紫', '紫', 'Morado', 'Viola', 'Lila', 'Paars', 'Roxo', 'Фиолетовый', 'ม่วง', '보라'),
  black: L('Noir', 'Black', '黒', '黑', '黑', 'Negro', 'Nero', 'Schwarz', 'Zwart', 'Preto', 'Чёрный', 'ดำ', '검정'),
  yellow: L('Jaune', 'Yellow', '黄', '黃', '黄', 'Amarillo', 'Giallo', 'Gelb', 'Geel', 'Amarelo', 'Жёлтый', 'เหลือง', '노랑'),
};
const OP_ATTRS: Record<string, Labels> = {
  slash: L('Tranche', 'Slash', '斬', '斬', '斩', 'Corte', 'Taglio', 'Hieb', 'Houw', 'Corte', 'Рубящий', 'ฟัน', '참'),
  strike: L('Frappe', 'Strike', '打', '打', '打', 'Golpe', 'Colpo', 'Schlag', 'Slag', 'Golpe', 'Удар', 'ตี', '타'),
  ranged: L('Distance', 'Ranged', '射', '射', '射', 'A distancia', 'Distanza', 'Fernkampf', 'Afstand', 'À distância', 'Дальний бой', 'ระยะไกล', '사격'),
  special: L('Spécial', 'Special', '特', '特', '特', 'Especial', 'Speciale', 'Spezial', 'Speciaal', 'Especial', 'Особый', 'พิเศษ', '특수'),
  wisdom: L('Sagesse', 'Wisdom', '知', '知', '知', 'Sabiduría', 'Saggezza', 'Weisheit', 'Wijsheid', 'Sabedoria', 'Мудрость', 'ปัญญา', '지'),
};
Object.assign(CATEGORIES, {
  leader: L('Leader', 'Leader', 'リーダー', '領袖', '领袖', 'Líder', 'Leader', 'Leader', 'Leader', 'Líder', 'Лидер', 'ลีดเดอร์', '리더'),
  character: L('Personnage', 'Character', 'キャラクター', '角色', '角色', 'Personaje', 'Personaggio', 'Charakter', 'Personage', 'Personagem', 'Персонаж', 'ตัวละคร', '캐릭터'),
  event: L('Événement', 'Event', 'イベント', '事件', '事件', 'Evento', 'Evento', 'Ereignis', 'Gebeurtenis', 'Evento', 'Событие', 'อีเวนต์', '이벤트'),
  opStage: L('Lieu', 'Stage', 'ステージ', '場地', '场地', 'Escenario', 'Luogo', 'Ort', 'Locatie', 'Cenário', 'Сцена', 'สเตจ', '스테이지'),
});

/** One Piece : raretés (abréviation imprimée → nom). */
const OP_RARITIES: Record<string, Labels> = {
  L: L('Leader', 'Leader', 'リーダー', '領袖', '领袖', 'Líder', 'Leader', 'Leader', 'Leader', 'Líder', 'Лидер', 'ลีดเดอร์', '리더'),
  C: L('Commune', 'Common', 'コモン', '普通', '普通', 'Común', 'Comune', 'Gewöhnlich', 'Gewoon', 'Comum', 'Обычная', 'คอมมอน', '커먼'),
  UC: L('Peu commune', 'Uncommon', 'アンコモン', '非普通', '非普通', 'Infrecuente', 'Non comune', 'Ungewöhnlich', 'Ongewoon', 'Incomum', 'Необычная', 'อันคอมมอน', '언커먼'),
  R: L('Rare', 'Rare', 'レア', '稀有', '稀有', 'Rara', 'Rara', 'Selten', 'Zeldzaam', 'Rara', 'Редкая', 'แรร์', '레어'),
  SR: L('Super rare', 'Super Rare', 'スーパーレア', '超稀有', '超稀有', 'Súper rara', 'Super rara', 'Super selten', 'Super zeldzaam', 'Super rara', 'Суперредкая', 'ซูเปอร์แรร์', '슈퍼 레어'),
  SEC: L('Secrète', 'Secret Rare', 'シークレットレア', '秘密稀有', '秘密稀有', 'Secreta', 'Segreta', 'Geheim', 'Geheim', 'Secreta', 'Секретная', 'ซีเคร็ทแรร์', '시크릿 레어'),
  SP: L('Carte SP', 'SP Card', 'SPカード', 'SP卡', 'SP卡', 'Carta SP', 'Carta SP', 'SP-Karte', 'SP-kaart', 'Carta SP', 'SP-карта', 'การ์ด SP', 'SP 카드'),
  TR: L('Trésor rare', 'Treasure Rare', 'トレジャーレア', '寶藏稀有', '宝藏稀有', 'Tesoro rara', 'Tesoro rara', 'Schatz-Rare', 'Schat zeldzaam', 'Tesouro rara', 'Сокровище', 'เทรเชอร์แรร์', '트레저 레어'),
  P: L('Promo', 'Promo', 'プロモ', '宣傳卡', '宣传卡', 'Promo', 'Promo', 'Promo', 'Promo', 'Promo', 'Промо', 'โปรโม', '프로모'),
};

/** Rareté One Piece affichée : « SR · Super rare » (abréviation imprimée et nom dans la langue de l'app). */
export function opRarity(value: string, lang: string): string {
  const v = value.trim().toUpperCase();
  const abbr = /^SP/.test(v) ? 'SP' : v;
  const name = OP_RARITIES[abbr]?.[(OP_RARITIES.C[lang as Lang] ? lang : 'en') as Lang];
  return name ? (abbr === 'SP' ? name : `${value} · ${name}`) : value;
}

/** Variantes des sources qui ne sont le libellé d'aucune langue. */
const EXTRA: Record<'type' | 'stage' | 'category' | 'color' | 'attribute', Record<string, string>> = {
  color: {},
  attribute: {},
  type: { normal: 'basicEnergy', 'spécial': 'specialEnergy', special: 'specialEnergy', 'électrique': 'lightning' },
  stage: {
    base: 'basic', stage1: 'stage1', stage2: 'stage2', 'mega evolution': 'mega', 'méga': 'mega', mega: 'mega', 'niveau sup': 'levelx', 'level up': 'levelx',
    'level-up': 'levelx', 'break evolution': 'break', 'v-union': 'vunion', vmax: 'vmax', vstar: 'vstar', 'bébé': 'baby',
  },
  category: {
    pokemon: 'pokemon', outil: 'tool', tool: 'tool', 'machine technique': 'tm', 'technical machine': 'tm',
    'basic energy': 'basicEnergy', 'special energy': 'specialEnergy', 'énergie de base': 'basicEnergy', 'énergie spéciale': 'specialEnergy',
    // One Piece (site français : « ÉVÉNEMENTS »).
    'événements': 'event',
  },
};

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

function index(table: Record<string, Labels>, extra: Record<string, string>) {
  const out = new Map<string, string>();
  for (const [concept, labels] of Object.entries(table)) for (const v of Object.values(labels)) if (!out.has(norm(v))) out.set(norm(v), concept);
  for (const [v, concept] of Object.entries(extra)) out.set(norm(v), concept);
  return out;
}
const IDX = {
  type: index(TYPES, EXTRA.type), stage: index(STAGES, EXTRA.stage), category: index(CATEGORIES, EXTRA.category),
  color: index(COLORS, EXTRA.color), attribute: index(OP_ATTRS, EXTRA.attribute),
};
const TABLE = { type: TYPES, stage: STAGES, category: CATEGORIES, color: COLORS, attribute: OP_ATTRS };

/** Mots gardés tels quels (VMAX, VSTAR, V-UNION…). */
const KEEP: Record<string, string> = { vmax: 'VMAX', vstar: 'VSTAR', vunion: 'V-UNION' };

function one(kind: keyof typeof IDX, v: string, lang: string): string {
  const concept = IDX[kind].get(norm(v));
  if (!concept) return v;
  if (KEEP[concept]) return KEEP[concept];
  return TABLE[kind][concept]?.[lang as Lang] ?? v;
}

/** Types One Piece (équipages…) : [anglais, français, japonais], publiés avec le catalogue (names/onepiece-features.json). */
let FEATURES: Map<string, string[]> | null = null;
export function setOpFeatures(rows: string[][] | null): void {
  FEATURES = new Map();
  for (const r of rows ?? []) for (const v of r) if (v && !FEATURES.has(norm(v))) FEATURES.set(norm(v), r);
}
const FEATURE_LANG: Record<string, number> = { en: 0, fr: 1, ja: 2 };
/** « Straw Hat Crew/Supernovas » dans la langue de l'app (français, japonais, sinon anglais). */
export function opFeature(value: string, lang: string): string {
  if (!FEATURES) return value;
  const i = FEATURE_LANG[lang] ?? 0;
  return value.split('/').map((v) => { const r = FEATURES!.get(norm(v)); return (r && (r[i] || r[0])) || v.trim(); }).join(' / ');
}

/** Valeur d'un attribut dans la langue de l'app (types « A / B », catégories « Dresseur · Objet »). */
export function localizeAttr(key: AttributeKey, value: string, lang: string): string {
  if (key === 'type') return value.split(' / ').map((v) => one('type', v, lang)).join(' / ');
  if (key === 'stage') return one('stage', value, lang);
  // One Piece : « Red / Green », « Slash/Wisdom ».
  if (key === 'color' || key === 'attribute') return value.split(/\s*\/\s*/).map((v) => one(key, v, lang)).join(' / ');
  if (key === 'category') {
    const parts = value.split(' · ').map((v) => one('category', v, lang));
    // « Énergie · Énergie de base » → « Énergie de base » (pas de répétition).
    return parts.filter((p, i) => !(parts[i + 1] && parts[i + 1].toLowerCase().includes(p.toLowerCase()))).join(' · ');
  }
  return value;
}

/** Notion d'un type (pour sa couleur) : « Plante », « Grass », « 草 »… → « grass ». */
export const typeConcept = (value: string) => IDX.type.get(norm(value.split(' / ')[0]));

/** Riftbound : raretés, types (et surtypes) et domaines ; le catalogue donne leurs identifiants anglais (« common »). */
const RB_RARITIES: Record<string, Labels> = {
  common: L('Commun', 'Common', 'コモン', '普通', '普通', 'Común', 'Comune', 'Gewöhnlich', 'Gewoon', 'Comum', 'Обычная', 'ทั่วไป', '일반'),
  uncommon: L('Peu commun', 'Uncommon', 'アンコモン', '非普通', '非普通', 'Poco común', 'Non comune', 'Ungewöhnlich', 'Ongewoon', 'Incomum', 'Необычная', 'ไม่ธรรมดา', '특별'),
  rare: L('Rare', 'Rare', 'レア', '稀有', '稀有', 'Rara', 'Rara', 'Selten', 'Zeldzaam', 'Rara', 'Редкая', 'หายาก', '희귀'),
  epic: L('Épique', 'Epic', 'エピック', '史詩', '史诗', 'Épica', 'Epica', 'Episch', 'Episch', 'Épica', 'Эпическая', 'มหากาพย์', '서사'),
  showcase: L('Showcase', 'Showcase', 'ショーケース', 'Showcase', 'Showcase', 'Showcase', 'Showcase', 'Showcase', 'Showcase', 'Showcase', 'Showcase', 'Showcase', 'Showcase'),
};
const RB_TYPES: Record<string, Labels> = {
  unit: L('Unité', 'Unit', 'ユニット', '單位', '单位', 'Unidad', 'Unità', 'Einheit', 'Eenheid', 'Unidade', 'Юнит', 'ยูนิต', '유닛'),
  spell: L('Sort', 'Spell', 'スペル', '法術', '法术', 'Hechizo', 'Incantesimo', 'Zauber', 'Spreuk', 'Feitiço', 'Заклинание', 'คาถา', '주문'),
  gear: L('Équipement', 'Gear', 'ギア', '裝備', '装备', 'Equipo', 'Equipaggiamento', 'Ausrüstung', 'Uitrusting', 'Equipamento', 'Снаряжение', 'อุปกรณ์', '장비'),
  rune: L('Rune', 'Rune', 'ルーン', '符文', '符文', 'Runa', 'Runa', 'Rune', 'Rune', 'Runa', 'Руна', 'รูน', '룬'),
  legend: L('Légende', 'Legend', 'レジェンド', '傳奇', '传奇', 'Leyenda', 'Leggenda', 'Legende', 'Legende', 'Lenda', 'Легенда', 'ตำนาน', '전설'),
  battlefield: L('Champ de bataille', 'Battlefield', 'バトルフィールド', '戰場', '战场', 'Campo de batalla', 'Campo di battaglia', 'Schlachtfeld', 'Slagveld', 'Campo de batalha', 'Поле боя', 'สนามรบ', '전장'),
  champion: L('Champion', 'Champion', 'チャンピオン', '英雄', '英雄', 'Campeón', 'Campione', 'Champion', 'Kampioen', 'Campeão', 'Чемпион', 'แชมเปียน', '챔피언'),
  signature: L('Signature', 'Signature', 'シグネチャー', '招牌', '招牌', 'Distintiva', 'Distintiva', 'Signatur', 'Kenmerkend', 'Assinatura', 'Фирменная', 'ซิกเนเจอร์', '시그니처'),
  token: L('Jeton', 'Token', 'トークン', '衍生物', '衍生物', 'Ficha', 'Segnalino', 'Spielmarke', 'Token', 'Ficha', 'Жетон', 'โทเคน', '토큰'),
  basic: L('De base', 'Basic', '基本', '基本', '基本', 'Básica', 'Base', 'Standard', 'Basis', 'Básica', 'Базовая', 'พื้นฐาน', '기본'),
};
const RB_DOMAINS: Record<string, Labels> = {
  fury: L('Fureur', 'Fury', '憤怒', '熾烈', '炽烈', 'Furia', 'Furia', 'Zorn', 'Woede', 'Fúria', 'Ярость', 'ความเดือดดาล', '분노'),
  calm: L('Calme', 'Calm', '平静', '平靜', '平静', 'Calma', 'Calma', 'Ruhe', 'Kalmte', 'Calma', 'Спокойствие', 'ความสงบ', '평정'),
  mind: L('Esprit', 'Mind', '精神', '心靈', '心灵', 'Mente', 'Mente', 'Geist', 'Geest', 'Mente', 'Разум', 'จิตใจ', '정신'),
  body: L('Corps', 'Body', '肉体', '體魄', '体魄', 'Cuerpo', 'Corpo', 'Körper', 'Lichaam', 'Corpo', 'Тело', 'ร่างกาย', '육체'),
  chaos: L('Chaos', 'Chaos', '混沌', '混沌', '混沌', 'Caos', 'Caos', 'Chaos', 'Chaos', 'Caos', 'Хаос', 'ความโกลาหล', '혼돈'),
  order: L('Ordre', 'Order', '秩序', '秩序', '秩序', 'Orden', 'Ordine', 'Ordnung', 'Orde', 'Ordem', 'Порядок', 'ระเบียบ', '질서'),
  colorless: L('Incolore', 'Colorless', '無色', '無色', '无色', 'Sin color', 'Incolore', 'Farblos', 'Kleurloos', 'Incolor', 'Бесцветный', 'ไร้สี', '무색'),
};
/** Ordre des raretés Riftbound (filtres, statistiques). */
export const RB_RARITY_ORDER = Object.keys(RB_RARITIES);

const RB_TABLE = { rarity: RB_RARITIES, category: RB_TYPES, domain: RB_DOMAINS };
// Identifiants et libellés de toutes les langues (anciens catalogues : « Unité (Unit) », « Sans couleur »).
const RB_IDX = Object.fromEntries(Object.entries(RB_TABLE).map(([k, table]) => {
  const extra = Object.fromEntries(Object.keys(table).map((id) => [id, id]));
  if (k === 'domain') Object.assign(extra, { 'sans couleur': 'colorless', 'sin colores': 'colorless', 'senza colore': 'colorless' });
  return [k, index(table, extra)];
})) as Record<keyof typeof RB_TABLE, Map<string, string>>;

/** Identifiant Riftbound d'une valeur (« Unité (Unit) » → « unit ») ; undefined si inconnue. */
export function rbConcept(kind: keyof typeof RB_TABLE, value: string): string | undefined {
  return RB_IDX[kind].get(norm(value.replace(/\s*\([^)]*\)\s*$/, '')));
}

/** Valeur Riftbound dans la langue de l'app : « common » → « Commun », « champion / unit » → « Champion / Unité ». */
export function rbLabel(kind: keyof typeof RB_TABLE, value: string, lang: string): string {
  const l = (RB_RARITIES.common[lang as Lang] ? lang : 'en') as Lang;
  return value.split(/\s*\/\s*/).map((v) => { const c = rbConcept(kind, v); return c ? RB_TABLE[kind][c][l] : v; }).join(' / ');
}

/** Valeur d'un filtre ou d'un attribut, quel que soit le jeu, dans la langue de l'app. */
export function facetValueLabel(game: string, key: string, value: string, lang: string): string {
  if (game === 'riftbound') {
    if (key === 'rarity') return rbLabel('rarity', value, lang);
    if (key === 'type' || key === 'category') return rbLabel('category', value, lang);
    if (key === 'domain') return rbLabel('domain', value, lang);
    return value;
  }
  if (game === 'onepiece') {
    if (key === 'rarity') return opRarity(value, lang);
    if (key === 'feature') return opFeature(value, lang);
    if (key === 'color' || key === 'category' || key === 'attribute') return localizeAttr(key, value, lang);
  }
  return value;
}
