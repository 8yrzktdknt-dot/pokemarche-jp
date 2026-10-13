import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
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
}

interface Store {
  ready: boolean;
  settings: Settings;
  setSettings(s: Partial<Settings>): void;
  collection: CollectionEntry[];
  add(card: Card): void;
  remove(card: Card): void;
  clear(): void;
}

const KEY_COLLECTION = 'collection.v1';
const KEY_SETTINGS = 'settings.v1';
const keyOf = (c: Card) => `${c.game}:${c.lang}:${c.id}`;

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [collection, setCollection] = useState<CollectionEntry[]>([]);
  const [settings, setSettingsState] = useState<Settings>({ game: 'auto', lang: 'fr' });

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

  const value = useMemo(
    () => ({ ready, settings, setSettings, collection, add, remove, clear }),
    [ready, settings, setSettings, collection, add, remove, clear],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore hors de StoreProvider');
  return s;
}
