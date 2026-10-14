import { cardmarketPrice } from './prices/cardmarket.ts';
import type { Card, CardVariant } from './types.ts';

/**
 * Variantes imprimées des cartes (normale, holo, reverse, Poké Ball, Master Ball, tampons…) : libellés dans la langue
 * de l'app, et carte « vue dans une variante » (prix et fiche Cardmarket de la variante).
 * Clés : tools/catalog/variants.mjs (« normal », « reverse », « pokeball », « holo|shadowless|1st-edition »…).
 */
type Lang = 'fr' | 'en' | 'ja' | 'zh-tw' | 'zh-cn' | 'es' | 'it' | 'de' | 'nl' | 'pt' | 'ru' | 'th' | 'ko';
type Labels = Record<Lang, string>;
const L = (fr: string, en: string, ja: string, zhTw: string, zhCn: string, es: string, it: string, de: string, nl: string, pt: string, ru: string, th: string, ko: string): Labels =>
  ({ fr, en, ja, 'zh-tw': zhTw, 'zh-cn': zhCn, es, it, de, nl, pt, ru, th, ko });

const PARTS: Record<string, Labels> = {
  normal: L('Normale', 'Normal', 'ノーマル', '普通', '普通', 'Normal', 'Normale', 'Normal', 'Normaal', 'Normal', 'Обычная', 'ธรรมดา', '노멀'),
  holo: L('Holo', 'Holo', 'ホロ', '閃卡', '闪卡', 'Holo', 'Holo', 'Holo', 'Holo', 'Holo', 'Голо', 'โฮโล', '홀로'),
  reverse: L('Reverse Holo', 'Reverse Holo', 'ミラー', '鏡面閃', '镜面闪', 'Reverse Holo', 'Reverse Holo', 'Reverse Holo', 'Reverse Holo', 'Reverse Holo', 'Реверс-голо', 'รีเวิร์สโฮโล', '리버스 홀로'),
  pokeball: L('Poké Ball Holo', 'Poké Ball Holo', 'モンスターボール柄', '精靈球紋', '精灵球纹', 'Holo Poké Ball', 'Holo Poké Ball', 'Pokéball-Holo', 'Poké Ball-holo', 'Holo Poké Bola', 'Голо Покебол', 'โฮโลโปเกบอล', '몬스터볼 홀로'),
  masterball: L('Master Ball Holo', 'Master Ball Holo', 'マスターボール柄', '大師球紋', '大师球纹', 'Holo Master Ball', 'Holo Master Ball', 'Meisterball-Holo', 'Master Ball-holo', 'Holo Bola Mestra', 'Голо Мастербол', 'โฮโลมาสเตอร์บอล', '마스터볼 홀로'),
  quickball: L('Rapide Ball Holo', 'Quick Ball Holo', 'クイックボール柄', '先機球紋', '先机球纹', 'Holo Veloz Ball', 'Holo Velox Ball', 'Flottball-Holo', 'Quick Ball-holo', 'Holo Bola Veloz', 'Голо Квик-бол', 'โฮโลควิกบอล', '퀵볼 홀로'),
  friendball: L('Copain Ball Holo', 'Friend Ball Holo', 'フレンドボール柄', '友友球紋', '友友球纹', 'Holo Amigo Ball', 'Holo Friend Ball', 'Freundesball-Holo', 'Friend Ball-holo', 'Holo Bola Amigo', 'Голо Френд-бол', 'โฮโลเฟรนด์บอล', '프렌드볼 홀로'),
  greatball: L('Super Ball Holo', 'Great Ball Holo', 'スーパーボール柄', '超級球紋', '超级球纹', 'Holo Superball', 'Holo Mega Ball', 'Superball-Holo', 'Super Ball-holo', 'Holo Grande Bola', 'Голо Грейт-бол', 'โฮโลซูเปอร์บอล', '슈퍼볼 홀로'),
  ultraball: L('Hyper Ball Holo', 'Ultra Ball Holo', 'ハイパーボール柄', '高級球紋', '高级球纹', 'Holo Ultra Ball', 'Holo Ultra Ball', 'Hyperball-Holo', 'Ultra Ball-holo', 'Holo Ultra Bola', 'Голо Ультра-бол', 'โฮโลไฮเปอร์บอล', '하이퍼볼 홀로'),
  '1st-edition': L('1re édition', '1st Edition', '初版', '初版', '初版', '1.ª edición', '1ª edizione', '1. Edition', '1e editie', '1ª edição', '1-е издание', 'พิมพ์ครั้งแรก', '초판'),
  shadowless: L('Sans ombre', 'Shadowless', 'シャドウレス', '無陰影', '无阴影', 'Sin sombra', 'Senza ombra', 'Ohne Schatten', 'Zonder schaduw', 'Sem sombra', 'Без тени', 'ไม่มีเงา', '섀도리스'),
  stamp: L('tampon', 'stamp', 'スタンプ', '印章', '印章', 'sello', 'timbro', 'Stempel', 'stempel', 'carimbo', 'штамп', 'ตราประทับ', '스탬프'),
};

/** Motifs de reverse (« reverse-energy ») : nom du motif. */
const MOTIFS: Record<string, Labels> = {
  energy: L('Énergie', 'Energy', 'エネルギー', '能量', '能量', 'Energía', 'Energia', 'Energie', 'Energie', 'Energia', 'Энергия', 'พลังงาน', '에너지'),
  league: L('Ligue', 'League', 'リーグ', '聯盟', '联盟', 'Liga', 'Lega', 'Liga', 'League', 'Liga', 'Лига', 'ลีก', '리그'),
  cosmos: L('Cosmos', 'Cosmos', 'コスモ', '宇宙', '宇宙', 'Cosmos', 'Cosmo', 'Kosmos', 'Kosmos', 'Cosmos', 'Космос', 'คอสมอส', '코스모'),
};

const human = (s: string) => s.replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

/** Libellé d'une variante : « Reverse Holo », « Holo · Sans ombre · 1re édition », « Reverse Holo · tampon 30th Pokeday ». */
export function variantLabel(key: string, lang: string): string {
  const l = (PARTS.normal[lang as Lang] ? lang : 'en') as Lang;
  return key.split('|').map((part, i) => {
    const known = PARTS[part]?.[l];
    if (known) return known;
    // Motif sans libellé (« reverse-cosmos ») : reverse + nom du motif ; tampon (« 30th-pokeday ») : « tampon 30th Pokeday ».
    if (i === 0 && part.startsWith('reverse-')) {
      const motif = part.slice(8);
      if (PARTS[motif]) return PARTS[motif][l];
      if (motif.endsWith('ball')) return `${human(motif.slice(0, -4))} Ball Holo`;
      return `${PARTS.reverse[l]} ${MOTIFS[motif]?.[l] ?? human(motif)}`;
    }
    if (i === 0 && part.endsWith('ball')) return `${human(part.slice(0, -4))} Ball Holo`;
    return i === 0 ? human(part) : `${PARTS.stamp[l]} ${human(part)}`;
  }).join(' · ');
}

/** Icône de la variante (Ionicons). */
export function variantIcon(key: string): 'ellipse-outline' | 'sparkles' | 'sparkles-outline' | 'radio-button-on' | 'ribbon-outline' {
  const k = key.split('|')[0];
  if (k === 'normal') return key.includes('|') ? 'ribbon-outline' : 'ellipse-outline';
  if (k === 'holo') return key.includes('|') ? 'ribbon-outline' : 'sparkles';
  if (k.endsWith('ball')) return 'radio-button-on';
  return 'sparkles-outline';
}

/** Variante d'une carte (la choisie, sinon la première). */
export function currentVariant(card: Card): CardVariant | undefined {
  return card.variants?.find((v) => v.key === card.variant) ?? card.variants?.[0];
}

/**
 * La carte vue dans une variante : prix (moyenne Cardmarket sur 7 jours de la variante) et fiche Cardmarket
 * de la variante quand elle est à part (Poké Ball, Master Ball…). Sans variantes : la carte telle quelle.
 */
export function withVariant(card: Card, key?: string): Card {
  const v = card.variants?.find((x) => x.key === key) ?? card.variants?.[0];
  if (!v) return card;
  const price = cardmarketPrice({ avg7: v.price });
  const own = v.cardmarket && v.cardmarket !== card.marketIds?.cardmarket;
  return {
    ...card,
    variant: v.key,
    prices: price ? [price] : [],
    marketIds: own ? { ...card.marketIds, cardmarket: v.cardmarket, cardmarketPath: undefined } : card.marketIds,
  };
}

/** Clé d'une carte de la collection : une entrée par carte et par variante (sans variante choisie : la première). */
export function collectionKey(c: Card): string {
  const v = c.variant ?? c.variants?.[0]?.key;
  return `${c.game}:${c.lang}:${c.id}${v ? `#${v}` : ''}`;
}
