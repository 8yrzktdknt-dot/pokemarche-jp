import { Platform } from 'react-native';
import { getJson } from '../http';
import type { Bloc, CardLang, GameId } from '../types';

/**
 * Catalogue publié avec le site (construit chaque semaine par GitHub Actions, dossier catalog/ du dépôt) :
 * blocs et extensions dans l'ordre de sortie, logos, noms traduits et toutes les cartes de chaque extension.
 */
const SITE = 'https://bananaintrouble.github.io/pokemarche-jp';

export function catalogBase(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const path = window.location.pathname;
    const i = path.indexOf('/app');
    return `${window.location.origin}${i >= 0 ? path.slice(0, i) : ''}/catalog`;
  }
  return `${SITE}/catalog`;
}

const DAY = 24 * 3600 * 1000;

export interface StaticSet {
  id: string;
  code: string;
  name: string;
  nameFr?: string;
  /** Nom dans la langue des cartes (ex. japonais), affiché en second. */
  nameLocal?: string;
  releaseDate?: string;
  logo?: string;
  count?: number;
}

export interface StaticBloc {
  id: string;
  name: string;
  nameFr?: string;
  sets: StaticSet[];
}

export interface StaticCard {
  id: string;
  localId: string;
  number: string;
  name: string;
  nameEn?: string;
  nameFr?: string;
  image?: string;
  rarity?: string;
}

export async function staticBlocs(game: GameId, lang: CardLang): Promise<StaticBloc[] | null> {
  const r = await getJson<{ blocs: StaticBloc[] }>(`${catalogBase()}/sets/${game}-${lang}.json`, DAY).catch(() => null);
  return r?.blocs?.length ? r.blocs : null;
}

export async function staticSetCards(game: GameId, lang: CardLang, setId: string): Promise<StaticCard[] | null> {
  const r = await getJson<StaticCard[]>(`${catalogBase()}/cards/${game}-${lang}/${encodeURIComponent(setId)}.json`, DAY).catch(() => null);
  return r?.length ? r : null;
}

/** Blocs du catalogue au format de l'app (noms en français si demandé et connus). */
export function toBlocs(blocs: StaticBloc[], appLang: 'fr' | 'en' = 'fr'): Bloc[] {
  return blocs.map((b) => ({
    id: b.id,
    name: (appLang === 'fr' && b.nameFr) || b.name,
    sets: b.sets.map((x) => ({
      id: x.id,
      code: x.code,
      name: (appLang === 'fr' && x.nameFr) || x.name,
      logo: x.logo,
      count: x.count,
      blocId: b.id,
    })),
  }));
}
