import { getJson } from './http.ts';
import type { Card } from './types.ts';

/**
 * Nom d'une carte dans la langue de l'app : son nom imprimé si la carte est dans cette langue ; sinon le nom
 * officiel connu dans cette langue (relevé par le robot, ou nom de l'espèce pour les cartes Pokémon) ;
 * sinon l'anglais ; sinon le nom d'origine. Les liens Cardmarket n'utilisent jamais ce nom.
 */
type Species = { langs: string[]; names: Record<string, string[]> };
let species: Species | null = null;

/** Table des noms d'espèces (catalog/names/species.json), chargée une fois au démarrage. */
export async function loadSpeciesNames(base: string): Promise<boolean> {
  if (species) return true;
  species = await getJson<Species>(`${base}/names/species.json`).catch(() => null);
  return !!species;
}
/** Pour les tests. */
export function setSpeciesNames(s: Species | null): void {
  species = s;
}

const MEGA: Record<string, string> = {
  fr: 'Méga-%', de: 'Mega-%', es: 'Mega-%', it: 'Mega %', ja: 'メガ%', ko: '메가%', 'zh-tw': '超級%', 'zh-cn': '超级%',
};
const REGIONS: Record<string, Record<string, string>> = {
  Alolan: { fr: "% d'Alola", de: 'Alola-%', es: '% de Alola', it: '% di Alola', ja: 'アローラ%', ko: '알로라 %', 'zh-tw': '阿羅拉%', 'zh-cn': '阿罗拉%' },
  Galarian: { fr: '% de Galar', de: 'Galar-%', es: '% de Galar', it: '% di Galar', ja: 'ガラル%', ko: '가라르 %', 'zh-tw': '伽勒爾%', 'zh-cn': '伽勒尔%' },
  Hisuian: { fr: '% de Hisui', de: 'Hisui-%', es: '% de Hisui', it: '% di Hisui', ja: 'ヒスイ%', ko: '히스이 %', 'zh-tw': '洗翠%', 'zh-cn': '洗翠%' },
  Paldean: { fr: '% de Paldea', de: 'Paldea-%', es: '% de Paldea', it: '% di Paldea', ja: 'パルデア%', ko: '팔데아 %', 'zh-tw': '帕底亞%', 'zh-cn': '帕底亚%' },
};
/** Langues où le suffixe (ex, V, GX…) est collé au nom, comme sur les cartes imprimées. */
const GLUED = new Set(['ja', 'ko', 'zh-tw', 'zh-cn']);

/**
 * Nom d'une carte Pokémon dans une langue, d'après son nom anglais : espèce seule, avec Méga, forme régionale,
 * X/Y et suffixe (« Mega Charizard X ex » → « メガリザードンXex »). undefined si le nom contient autre chose
 * (dresseur, objet…) : mieux vaut l'anglais qu'un nom à moitié traduit.
 */
export function speciesName(en: string, lang: string): string | undefined {
  const i = species?.langs.indexOf(lang) ?? -1;
  if (!species || i < 0) return undefined;
  const m = en.trim().match(/^(Mega |M )?(Alolan |Galarian |Hisuian |Paldean )?(.+?)( [XY])?(?: (ex|EX|GX|V|VMAX|VSTAR|V-UNION|BREAK))?$/);
  if (!m) return undefined;
  const local = species.names[m[3]]?.[i];
  if (!local) return undefined;
  let name = local;
  if (m[2]) name = REGIONS[m[2].trim()][lang]?.replace('%', name) ?? '';
  if (m[1]) name = MEGA[lang]?.replace('%', name) ?? '';
  if (!name) return undefined;
  if (m[4]) name += GLUED.has(lang) ? m[4].trim() : m[4];
  if (m[5]) name += GLUED.has(lang) ? m[5] : lang === 'fr' || lang === 'de' ? `-${m[5]}` : ` ${m[5]}`;
  return name;
}

export function cardName(card: Card, appLang: string): string {
  if (appLang === card.lang) return card.name;
  const own = card.names?.[appLang];
  if (own) return own;
  if (appLang === 'fr' && card.nameFr) return card.nameFr;
  const en = card.nameEn ?? card.names?.en ?? (card.lang === 'en' ? card.name : undefined);
  if (appLang === 'en') return en ?? card.name;
  return (en && speciesName(en, appLang)) ?? en ?? card.name;
}
