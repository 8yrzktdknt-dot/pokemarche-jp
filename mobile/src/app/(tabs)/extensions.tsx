import { Image } from 'expo-image';
import { Link } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Dropdown } from '../../components/Dropdown';
import { Ring } from '../../components/SetOverview';
import { GamePicker, colors, fonts, s } from '../../components/ui';
import { localName } from '../../lib/catalog/static';
import { GAMES, langFor } from '../../lib/games';
import { useStore } from '../../lib/store';
import { percent, setStats, type Progress } from '../../lib/setStats';
import { variantOwnership } from '../../lib/variants';
import type { Bloc, Card, GameId, SetInfo } from '../../lib/types';

export default function Extensions() {
  const { settings, setSettings, t, langLabel, appLang, collection } = useStore();
  const game: GameId = settings.game === 'auto' ? 'pokemon' : settings.game;
  const lang = langFor(game, settings.lang);
  const [blocs, setBlocs] = useState<Bloc[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const { width } = useWindowDimensions();
  // Trois carrés par ligne sur téléphone, plus sur grand écran.
  const cols = Math.max(3, Math.floor(Math.min(width, 900) / 130));
  const tile = (Math.min(width, 900) - 32 - (cols - 1) * 10) / cols;

  useEffect(() => {
    let alive = true;
    setBlocs(null);
    setError(null);
    GAMES[game].blocs(lang).then((b) => alive && setBlocs(b), (e) => alive && setError(String(e)));
    return () => { alive = false; };
  }, [game, lang]);

  // Recherche : nom de l'extension dans toutes les langues connues, code ou identifiant, nom du bloc.
  const shown = useMemo(() => {
    const q = fold(query);
    if (!blocs || !q) return blocs;
    return blocs
      .map((b) => {
        const inBloc = [b.name, ...Object.values(b.names ?? {})].some((n) => fold(n).includes(q));
        return { ...b, sets: inBloc ? b.sets : b.sets.filter((x) => [x.name, x.code, x.id, ...Object.values(x.names ?? {})].some((n) => fold(n).includes(q))) };
      })
      .filter((b) => b.sets.length);
  }, [blocs, query]);

  // Progression par extension, calculée comme sur la page de l'extension (Master Set : toutes les cartes dans toutes
  // leurs variantes) : seulement pour les extensions dont on possède des cartes, leurs cartes chargées une fois.
  const ownedBySet = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const e of collection) {
      const c = e.card;
      if (c.game !== game || c.lang !== lang || !c.setId || e.quantity < 1) continue;
      const ids = m.get(c.setId) ?? new Set<string>();
      ids.add(c.id);
      m.set(c.setId, ids);
    }
    return m;
  }, [collection, game, lang]);
  const setCards = useRef(new Map<string, Promise<Card[] | null>>());
  const [master, setMaster] = useState<Map<string, Progress>>(new Map());
  useEffect(() => {
    let alive = true;
    const variantOwned = variantOwnership(collection);
    const ids = [...ownedBySet.keys()];
    (async () => {
      const out = new Map<string, Progress>();
      for (let i = 0; i < ids.length; i += 4) {
        await Promise.all(ids.slice(i, i + 4).map(async (id) => {
          const k = `${game}:${lang}:${id}`;
          let p = setCards.current.get(k);
          if (!p) { p = GAMES[game].setCards(id, lang).then((r) => r.cards, () => null); setCards.current.set(k, p); }
          const cards = await p;
          const owned = ownedBySet.get(id)!;
          if (cards?.length) out.set(id, setStats(cards, (c) => owned.has(c.id), undefined, variantOwned).master);
        }));
        if (alive) setMaster(new Map(out));
      }
    })();
    return () => { alive = false; };
  }, [ownedBySet, collection, game, lang]);

  // Extensions favorites (menu « ⋮ » d'une extension) de ce jeu et de cette langue, en tête de liste.
  const favIds = new Set((settings.favoriteSets ?? []).filter((k) => k.startsWith(`${game}:${lang}:`)).map((k) => k.split(':').slice(2).join(':')));
  const favorites = !query && blocs ? blocs.flatMap((b) => b.sets).filter((x) => favIds.has(x.id)) : [];
  const tileOf = (x: SetInfo) => {
    const m = master.get(x.id);
    const pct = m?.total && m.owned ? Math.min(1, m.owned / m.total) : 0;
    const done = pct >= 1;
    return (
      <Link key={x.id} href={{ pathname: '/set/[game]/[id]', params: { game, id: x.id, lang } }} asChild>
        <Pressable style={StyleSheet.flatten([st.tile, { width: tile }])} accessibilityLabel={`${localName(x, appLang)} (${x.code})${pct ? ` · ${m!.owned}/${m!.total}` : ''}`}>
          <View style={[st.logoBox, { height: tile * 0.62 }]}>
            {x.logo ? (
              <Image source={x.logo} style={st.logo} contentFit="contain" />
            ) : (
              <Text style={st.code}>{x.code}</Text>
            )}
            {x.symbol && x.symbol !== x.logo && <Image source={x.symbol} style={st.symbol} contentFit="contain" />}
            {/* Progression : petite roue en haut à droite (cartes différentes possédées sur le nombre de cartes). */}
            {pct > 0 && (
              <View style={st.ring}>
                <Ring value={pct} size={26} width={2.5} color={done ? colors.good : colors.accent}>
                  <Text style={[st.ringText, done && { color: colors.good, fontSize: 6.5 }]}>{percent(m!)}%</Text>
                </Ring>
              </View>
            )}
          </View>
          <Text style={st.name} numberOfLines={2}>{localName(x, appLang)}</Text>
          <Text style={st.meta}>{x.code}{pct ? ` · ${m!.owned}/${m!.total}` : x.count ? ` · ${x.count}` : ''}</Text>
        </Pressable>
      </Link>
    );
  };

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled" style={s.screen} contentContainerStyle={[s.pad, { maxWidth: 900, width: '100%', alignSelf: 'center' }]}>
      <GamePicker value={game} onChange={(g) => setSettings({ game: g })} />
      <Dropdown
        label={t('lang.sets')}
        value={lang}
        options={GAMES[game].langs.map((l) => ({ value: l, label: langLabel(l) }))}
        onChange={(l) => l && setSettings({ lang: l as typeof lang })}
      />
      <View style={st.search}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={query} onChangeText={setQuery} style={st.searchInput}
          placeholder={t('ext.search')} placeholderTextColor={colors.muted} autoCorrect={false} returnKeyType="search"
        />
        {!!query && (
          <Pressable onPress={() => setQuery('')} accessibilityLabel={t('common.close')}>
            <Ionicons name="close-circle" size={20} color={colors.muted} />
          </Pressable>
        )}
      </View>
      {!blocs && !error && <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />}
      {error && <Text style={{ color: colors.danger, fontFamily: fonts.body }}>{t('common.unavailable', { e: error })}</Text>}
      {blocs?.length === 0 && <Text style={s.muted}>{t('ext.none')}</Text>}
      {!!blocs?.length && shown?.length === 0 && <Text style={[s.muted, { textAlign: 'center', marginTop: 16 }]}>{t('ext.noMatch')}</Text>}

      {favorites.length > 0 && (
        <View style={{ gap: 10, marginTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="heart" size={20} color={colors.accent} />
            <Text style={s.h2}>{t('ext.favorites')}</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{favorites.map(tileOf)}</View>
        </View>
      )}
      {shown?.map((b) => (
        <View key={b.id} style={{ gap: 10, marginTop: 8 }}>
          <Text style={s.h2}>{localName(b, appLang)}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {b.sets.map(tileOf)}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

/** Texte comparable : minuscules, sans accents ni espaces superflus. */
const fold = (x: string) => x.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim();

const st = StyleSheet.create({
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card,
    borderRadius: 14, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14,
  },
  searchInput: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 16, paddingVertical: 12, outlineWidth: 0 },
  tile: { backgroundColor: colors.card, borderRadius: 14, padding: 8, gap: 4 },
  logoBox: { borderRadius: 10, backgroundColor: '#0E2A1D', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 6 },
  logo: { position: 'absolute', top: 18, left: 8, right: 8, bottom: 8 },
  symbol: { position: 'absolute', top: 6, left: 6, width: 28, height: 14 },
  code: { color: colors.accent, fontFamily: fonts.display, fontSize: 16 },
  name: { color: colors.text, fontFamily: fonts.bold, fontSize: 12, lineHeight: 15 },
  meta: { color: colors.muted, fontFamily: fonts.body, fontSize: 11 },
  ring: { position: 'absolute', top: 4, right: 4, borderRadius: 13, backgroundColor: 'rgba(10,31,23,0.85)' },
  ringText: { color: colors.text, fontFamily: fonts.heavy, fontSize: 7.5, letterSpacing: -0.3 },
});
