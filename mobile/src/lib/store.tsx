import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { FALLBACK_RATES, convert, fetchRates, formatMoney, type Currency, type Rates } from './currency';
import { LANG_LABELS, translate, type AppLang, type T } from './i18n';
import type { Card, CardLang, GameId } from './types';

export interface CollectionEntry {
  card: Card;
  quantity: number;
  addedAt: number;
}

export interface Settings {
  game: GameId | 'auto';
  lang: CardLang;
  /** Pseudo affiché sur la page Compte (en attendant les vrais comptes). */
  profileName?: string;
  /** Langue de l'interface et des noms de cartes traduits. */
  appLang: AppLang;
  currency: Currency;
}

interface Store {
  ready: boolean;
  settings: Settings;
  setSettings(s: Partial<Settings>): void;
  collection: CollectionEntry[];
  add(card: Card): void;
  remove(card: Card): void;
  clear(): void;
  t: T;
  /** Libellé d'une langue de cartes dans la langue de l'app. */
  langLabel(l: CardLang): string;
  /** Prix converti dans la devise choisie, formaté. */
  money(value: number, from: string): string;
  /** Prix converti dans la devise choisie (nombre). */
  toCurrency(value: number, from: string): number;
}

const KEY_COLLECTION = 'collection.v1';
const KEY_SETTINGS = 'settings.v1';
const keyOf = (c: Card) => `${c.game}:${c.lang}:${c.id}`;

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [collection, setCollection] = useState<CollectionEntry[]>([]);
  const [settings, setSettingsState] = useState<Settings>({ game: 'auto', lang: 'fr', appLang: 'fr', currency: 'EUR' });
  const [rates, setRates] = useState<Rates>(FALLBACK_RATES);

  useEffect(() => {
    fetchRates().then(setRates, () => {});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [c, s] = await Promise.all([AsyncStorage.getItem(KEY_COLLECTION), AsyncStorage.getItem(KEY_SETTINGS)]);
        if (c) setCollection(JSON.parse(c));
        if (s) setSettingsState((prev) => ({ ...prev, ...JSON.parse(s) }));
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(KEY_COLLECTION, JSON.stringify(collection)).catch(() => {});
  }, [collection, ready]);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(KEY_SETTINGS, JSON.stringify(settings)).catch(() => {});
  }, [settings, ready]);

  const add = useCallback((card: Card) => {
    setCollection((prev) => {
      const i = prev.findIndex((e) => keyOf(e.card) === keyOf(card));
      if (i < 0) return [{ card, quantity: 1, addedAt: Date.now() }, ...prev];
      const next = [...prev];
      next[i] = { ...next[i], card, quantity: next[i].quantity + 1 };
      return next;
    });
  }, []);

  const remove = useCallback((card: Card) => {
    setCollection((prev) =>
      prev
        .map((e) => (keyOf(e.card) === keyOf(card) ? { ...e, quantity: e.quantity - 1 } : e))
        .filter((e) => e.quantity > 0),
    );
  }, []);

  const clear = useCallback(() => setCollection([]), []);

  const setSettings = useCallback((s: Partial<Settings>) => setSettingsState((prev) => ({ ...prev, ...s })), []);

  // Fonctions stables tant que la langue / la devise ne changent pas (évite de relancer les effets des écrans).
  const helpers = useMemo(() => {
    const locale = settings.appLang === 'en' ? 'en-US' : 'fr-FR';
    const toCurrency = (v: number, from: string) => convert(v, from, settings.currency, rates);
    return {
      t: ((key, vars) => translate(settings.appLang, key, vars)) as T,
      langLabel: (l: CardLang) => LANG_LABELS[settings.appLang][l],
      toCurrency,
      money: (v: number, from: string) => formatMoney(toCurrency(v, from), settings.currency, locale),
    };
  }, [settings.appLang, settings.currency, rates]);

  const value = useMemo(
    () => ({ ready, settings, setSettings, collection, add, remove, clear, ...helpers }),
    [ready, settings, setSettings, collection, add, remove, clear, helpers],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore hors de StoreProvider');
  return s;
}
