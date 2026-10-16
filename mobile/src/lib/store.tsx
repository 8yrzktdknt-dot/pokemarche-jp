import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { FALLBACK_RATES, convert, fetchRates, formatMoney, type Currency, type Rates } from './currency';
import { mergeCollections } from './cloud/merge';
import { loadRemote, loadUsername, onLocalSignOut, saveRemote, supabase } from './cloud/supabase';
import { GAMES } from './games';
import { APP_LOCALE, deviceLang, langLabel, translate, type AppLang, type T } from './i18n';
import { refreshCollectionPrices } from './refreshPrices';
import type { Card, CardLang, GameId } from './types';
import { collectionKey } from './variants';
import { loadSpeciesNames } from './cardNames';
import { catalogBase } from './catalog/static';
import { setOpFeatures } from './attrValues';
import { getJson } from './http';

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
  /** Langue de l'interface et des noms traduits ; « auto » : celle de l'appareil. */
  appLang: AppLang | 'auto';
  currency: Currency;
  /** Langue des cartes à scanner (« auto » = toutes). */
  scanLang?: CardLang | 'auto';
  /** Scanner en continu sans appuyer sur le déclencheur. */
  scanAuto?: boolean;
  /** Extensions favorites (« pokemon:fr:sv10 »), en tête de l'onglet Extensions. */
  favoriteSets?: string[];
  /** Cartes ajoutées par « Marquer le Master Set comme possédé », par extension : décocher les retire. */
  masterMarks?: Record<string, string[]>;
}

interface Store {
  ready: boolean;
  settings: Settings;
  setSettings(s: Partial<Settings>): void;
  collection: CollectionEntry[];
  add(card: Card): void;
  remove(card: Card): void;
  /** Plusieurs cartes d'un coup : un exemplaire de plus chacune, ou seulement celles qui manquent (`missingOnly`). */
  addMany(cards: Card[], missingOnly?: boolean): void;
  /** Un exemplaire de moins pour chaque carte. */
  removeMany(cards: Card[]): void;
  clear(): void;
  t: T;
  /** Langue de l'interface effective (réglage « auto » résolu avec la langue de l'appareil). */
  appLang: AppLang;
  /** Code de langue pour les nombres et les dates (« fr-FR »…). */
  locale: string;
  /** Libellé d'une langue de cartes dans la langue de l'app. */
  langLabel(l: CardLang): string;
  /** Prix converti dans la devise choisie, formaté. */
  money(value: number, from: string): string;
  /** Prix converti dans la devise choisie (nombre). */
  toCurrency(value: number, from: string): number;
  /** Compte connecté (null : collection sur cet appareil seulement). */
  user: { id: string; email?: string; provider?: string } | null;
  /** Session lue sur l'appareil (avant : on ne sait pas encore s'il faut afficher l'écran de connexion). */
  authReady: boolean;
  /** Pseudo du compte : undefined en cours de lecture, '' à choisir, null si la base ne gère pas les pseudos. */
  username: string | null | undefined;
  setUsername(name: string): void;
  /** État de la sauvegarde en ligne. */
  sync: 'off' | 'syncing' | 'ok' | 'error';
  /** Arrivée par le lien « mot de passe oublié » : choisir un nouveau mot de passe. */
  recovery: boolean;
  endRecovery(): void;
}

const KEY_COLLECTION = 'collection.v1';
const KEY_SETTINGS = 'settings.v1';
const keyOf = collectionKey;

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [collection, setCollection] = useState<CollectionEntry[]>([]);
  const [settings, setSettingsState] = useState<Settings>({ game: 'auto', lang: 'fr', appLang: 'auto', currency: 'EUR' });
  const [rates, setRates] = useState<Rates>(FALLBACK_RATES);
  // Noms des Pokémon dans toutes les langues (nom des cartes dans la langue de l'app).
  const [namesReady, setNamesReady] = useState(false);
  useEffect(() => {
    // Noms des Pokémon et types One Piece (équipages…) dans toutes les langues.
    Promise.all([
      loadSpeciesNames(catalogBase()),
      getJson<{ features: string[][] }>(`${catalogBase()}/names/onepiece-features.json`).then((r) => setOpFeatures(r?.features ?? null), () => {}),
    ]).then(([ok]) => setNamesReady(ok), () => {});
  }, []);
  const [user, setUser] = useState<Store['user']>(null);
  const [authReady, setAuthReady] = useState(!supabase());
  const [username, setUsernameState] = useState<string | null | undefined>(undefined);
  const setUsername = useCallback((name: string) => setUsernameState(name), []);
  const [sync, setSync] = useState<Store['sync']>('off');
  const [recovery, setRecovery] = useState(false);
  const endRecovery = useCallback(() => setRecovery(false), []);
  // Compte dont la collection a été fusionnée avec celle de l'appareil (les envois ne partent qu'après).
  const [merged, setMerged] = useState<string | null>(null);

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

  // Prix à jour pour les cartes de la collection (au lancement puis toutes les heures) : la valeur de la collection
  // et des extensions suit l'évolution des cotes Cardmarket.
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    const run = () => {
      setCollection((current) => {
        refreshCollectionPrices(current, async (game, setId, lang) => (await GAMES[game].setCards(setId, lang)).cards).then((next) => {
          if (!alive || !next) return;
          // Par clé d'origine : une ancienne carte One Piece (une version = une carte) devient une carte et sa variante.
          const fresh = new Map(next.map((e, i) => [keyOf(current[i].card), e.card]));
          // Fusion avec l'état le plus récent (des cartes ont pu être ajoutées pendant le chargement).
          setCollection((now) => now.map((e) => {
            const f = fresh.get(keyOf(e.card));
            return f && f !== e.card
              ? { ...e, card: { ...e.card, id: f.id, variant: f.variant, imageSmall: f.imageSmall, imageLarge: f.imageLarge, prices: f.prices, marketIds: f.marketIds, variants: f.variants } }
              : e;
          }));
        });
        return current;
      });
    };
    run();
    const timer = setInterval(run, 3600 * 1000);
    return () => { alive = false; clearInterval(timer); };
  }, [ready]);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(KEY_COLLECTION, JSON.stringify(collection)).catch(() => {});
  }, [collection, ready]);

  // Compte : session gardée sur l'appareil, suivie en direct (connexion, déconnexion, retour de Google).
  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    const apply = (u: { id: string; email?: string; app_metadata?: { provider?: string } } | null | undefined) =>
      setUser(u ? { id: u.id, email: u.email, provider: u.app_metadata?.provider } : null);
    sb.auth.getSession().then(({ data }) => apply(data.session?.user)).finally(() => setAuthReady(true));
    const { data } = sb.auth.onAuthStateChange((event, session) => {
      apply(session?.user);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
    });
    const off = onLocalSignOut(() => setUser(null));
    return () => { data.subscription.unsubscribe(); off(); };
  }, []);

  // Pseudo du compte connecté.
  useEffect(() => {
    setUsernameState(undefined);
    if (!user) return;
    let alive = true;
    loadUsername(user.id).then((u) => alive && setUsernameState(u), () => alive && setUsernameState(null));
    return () => { alive = false; };
  }, [user?.id]);

  // À la connexion : collection du compte fusionnée avec celle de l'appareil, réglages du compte repris.
  useEffect(() => {
    if (!ready || !user) { if (!user) { setMerged(null); setSync('off'); } return; }
    if (merged === user.id) return;
    let alive = true;
    setSync('syncing');
    loadRemote(user.id).then((remote) => {
      if (!alive || !remote) return;
      setCollection((local) => mergeCollections(local, remote.entries as CollectionEntry[]));
      if (remote.settings) setSettingsState((prev) => ({ ...prev, ...(remote.settings as Partial<Settings>) }));
      setMerged(user.id);
    }).catch(() => alive && setSync('error'));
    return () => { alive = false; };
  }, [ready, user, merged]);

  // Ensuite, chaque changement de la collection ou des réglages est enregistré sur le compte (regroupés sur 2 s).
  useEffect(() => {
    if (!user || merged !== user.id) return;
    setSync('syncing');
    const timer = setTimeout(() => {
      saveRemote(user.id, collection, settings as unknown as Record<string, unknown>).then(() => setSync('ok'), () => setSync('error'));
    }, 2000);
    return () => clearTimeout(timer);
  }, [user, merged, collection, settings]);

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

  const addMany = useCallback((cards: Card[], missingOnly = false) => {
    setCollection((prev) => {
      const index = new Map(prev.map((e, i) => [keyOf(e.card), i]));
      const next = [...prev];
      const now = Date.now();
      let added = 0;
      for (const card of cards) {
        const i = index.get(keyOf(card));
        if (i === undefined) {
          index.set(keyOf(card), next.length);
          next.push({ card, quantity: 1, addedAt: now });
          added++;
        } else if (!missingOnly) {
          next[i] = { ...next[i], card, quantity: next[i].quantity + 1 };
          added++;
        }
      }
      return added ? next : prev;
    });
  }, []);

  const removeMany = useCallback((cards: Card[]) => {
    const keys = new Set(cards.map(keyOf));
    setCollection((prev) => prev.map((e) => (keys.has(keyOf(e.card)) ? { ...e, quantity: e.quantity - 1 } : e)).filter((e) => e.quantity > 0));
  }, []);

  const clear = useCallback(() => setCollection([]), []);

  const setSettings = useCallback((s: Partial<Settings>) => setSettingsState((prev) => ({ ...prev, ...s })), []);

  // Fonctions stables tant que la langue / la devise ne changent pas (évite de relancer les effets des écrans).
  const helpers = useMemo(() => {
    const appLang: AppLang = settings.appLang === 'auto' || !settings.appLang ? deviceLang() : settings.appLang;
    const locale = APP_LOCALE[appLang] ?? 'en-US';
    const toCurrency = (v: number, from: string) => convert(v, from, settings.currency, rates);
    return {
      appLang,
      locale,
      t: ((key, vars) => translate(appLang, key, vars)) as T,
      langLabel: (l: CardLang) => langLabel(appLang, l),
      toCurrency,
      money: (v: number, from: string) => formatMoney(toCurrency(v, from), settings.currency, locale),
    };
  }, [settings.appLang, settings.currency, rates, namesReady]);

  const value = useMemo(
    () => ({ ready, settings, setSettings, collection, add, remove, addMany, removeMany, clear, user, authReady, username, setUsername, sync, recovery, endRecovery, ...helpers }),
    [ready, settings, setSettings, collection, add, remove, addMany, removeMany, clear, user, authReady, username, setUsername, sync, recovery, endRecovery, helpers],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore hors de StoreProvider');
  return s;
}
