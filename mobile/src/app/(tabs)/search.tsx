import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { Dropdown, type Option } from '../../components/Dropdown';
import { CardRow, GamePicker, colors, fonts, s } from '../../components/ui';
import { rarityOptions } from '../../lib/catalog/pokemonNames';
import { GAMES, langFor } from '../../lib/games';
import type { TKey } from '../../lib/i18n';
import { hasCriteria } from '../../lib/search';
import { useStore } from '../../lib/store';
import type { Card, CardLang, FilterOptions, GameId, SearchFilters, SortKey } from '../../lib/types';

const PAGE = 40;
/** Deux menus déroulants par ligne. */
const half = { flexGrow: 1, flexBasis: '45%' } as const;
const EMPTY: SearchFilters = { text: '', facets: {}, sort: 'relevance' };

interface GameState {
  lang: CardLang;
  filters: SearchFilters;
  results: Card[];
  shown: number;
}

/** Recherche de chaque jeu gardée à part : changer de jeu n'emporte ni le texte ni les résultats. */
const memory = new Map<GameId, GameState>();

export default function Search() {
  const { settings, setSettings } = useStore();
  const game: GameId = settings.game === 'auto' ? 'pokemon' : settings.game;
  return (
    <View style={s.screen}>
      <GameSearch key={game} game={game} picker={<GamePicker value={game} onChange={(g) => setSettings({ game: g })} />} />
    </View>
  );
}

function GameSearch({ game, picker }: { game: GameId; picker: React.ReactNode }) {
  const { settings, setSettings, t, langLabel } = useStore();
  const lang = langFor(game, settings.lang);
  const saved = memory.get(game);
  const [filters, setFilters] = useState<SearchFilters>(saved && saved.lang === lang ? saved.filters : EMPTY);
  const [results, setResults] = useState<Card[]>(saved && saved.lang === lang ? saved.results : []);
  const [shown, setShown] = useState(saved?.shown ?? PAGE);
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    memory.set(game, { lang, filters, results, shown });
  }, [game, lang, filters, results, shown]);

  // Nouvelle langue : les blocs, extensions et raretés changent.
  const [prevLang, setPrevLang] = useState(lang);
  if (prevLang !== lang) {
    setPrevLang(lang);
    setFilters({ ...EMPTY, text: filters.text });
  }

  useEffect(() => {
    let alive = true;
    setOptions(null);
    setOptionsError(null);
    GAMES[game].filterOptions(lang).then(
      (o) => alive && setOptions(o),
      (e) => alive && setOptionsError(String(e)),
    );
    return () => { alive = false; };
  }, [game, lang]);

  const active = hasCriteria(filters) || !!filters.blocId;
  useEffect(() => {
    if (!active) {
      setResults([]);
      setError(null);
      return;
    }
    let alive = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await GAMES[game].search(filters, lang);
        if (alive) { setResults(r); setShown(PAGE); }
      } catch (e) {
        if (alive) setError(String(e));
      } finally {
        if (alive) setLoading(false);
      }
    }, 350);
    return () => { alive = false; clearTimeout(timer); };
  }, [filters, game, lang, active]);

  const blocOptions: Option[] = useMemo(() => (options?.blocs ?? []).map((b) => ({ value: b.id, label: b.name })), [options]);
  const setOpts: Option[] = useMemo(() => {
    const blocs = (options?.blocs ?? []).filter((b) => !filters.blocId || b.id === filters.blocId);
    return blocs.flatMap((b) => b.sets.map((x) => ({ value: x.id, label: `${x.code} · ${x.name}` })));
  }, [options, filters.blocId]);
  const rarityValues = options?.facets.find((f) => f.key === 'rarity')?.values ?? [];
  const rarityOpts: Option[] =
    game === 'pokemon' ? rarityOptions(rarityValues, settings.appLang) : rarityValues.map((v) => ({ value: v, label: v }));
  // Pokémon : Blocs / Extensions / Raretés. Les autres jeux gardent leurs filtres propres.
  const extraFacets = game === 'pokemon' ? [] : (options?.facets ?? []).filter((f) => f.key !== 'rarity' && f.values.length);
  const setFacet = (key: string, v?: string) => setFilters({ ...filters, facets: { ...filters.facets, [key]: v ?? '' } });

  const header = (
    <View style={s.pad}>
      {picker}
      <TextInput
        style={s.input}
        placeholder={t(`search.placeholder.${game}` as TKey)}
        placeholderTextColor={colors.muted}
        value={filters.text}
        onChangeText={(text) => setFilters({ ...filters, text })}
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Dropdown
          style={half}
          label={t('lang.cards')}
          value={lang}
          options={GAMES[game].langs.map((l) => ({ value: l, label: langLabel(l) }))}
          onChange={(l) => l && setSettings({ lang: l as CardLang })}
        />
        <Dropdown
          style={half}
          label={t('search.bloc')}
          value={filters.blocId}
          options={blocOptions}
          allLabel={t('search.allBlocs')}
          disabled={!options}
          onChange={(blocId) => setFilters({ ...filters, blocId, setId: undefined })}
        />
        <Dropdown
          style={half}
          label={t('search.set')}
          value={filters.setId}
          options={setOpts}
          allLabel={t('search.allSets')}
          disabled={!options}
          onChange={(setId) => setFilters({ ...filters, setId })}
        />
        <Dropdown
          style={half}
          label={t('search.rarity')}
          value={filters.facets.rarity}
          options={rarityOpts}
          allLabel={t('search.allRarities')}
          disabled={!options}
          onChange={(v) => setFacet('rarity', v)}
        />
        {extraFacets.map((f) => (
          <Dropdown
            key={f.key}
            style={half}
            label={t(`facet.${f.key}` as TKey)}
            value={filters.facets[f.key]}
            options={f.values.map((v) => ({ value: v, label: v }))}
            allLabel={t('common.all')}
            onChange={(v) => setFacet(f.key, v)}
          />
        ))}
        <Dropdown
          style={half}
          label={t('search.sort')}
          value={filters.sort}
          options={(options?.sorts ?? ['relevance']).map((k) => ({ value: k, label: t(`sort.${k}` as TKey) }))}
          onChange={(v) => setFilters({ ...filters, sort: (v ?? 'relevance') as SortKey })}
        />
      </View>

      {optionsError && <Text style={{ color: colors.danger, fontFamily: fonts.body }}>{t('common.unavailable', { e: optionsError })}</Text>}
      {loading && <ActivityIndicator color={colors.accent} />}
      {error && <Text style={{ color: colors.danger, fontFamily: fonts.body }}>{error}</Text>}
      {!loading && !error && active && (
        <Text style={s.muted}>{results.length ? t('common.cards', { n: results.length }) : t('common.noResult')}</Text>
      )}
      {!active && <Text style={s.muted}>{t('search.hint')}</Text>}
    </View>
  );

  return (
    <FlatList
      data={active ? results.slice(0, shown) : []}
      keyExtractor={(c) => `${c.id}-${c.number}`}
      ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 40 }}
      renderItem={({ item }) => <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}><CardRow card={item} list={results} /></View>}
      ListFooterComponent={
        active && shown < results.length ? (
          <Pressable style={[s.ghost, { marginHorizontal: 16 }]} onPress={() => setShown((n) => n + PAGE)}>
            <Text style={s.ghostText}>{t('common.showMore', { n: results.length - shown })}</Text>
          </Pressable>
        ) : null
      }
    />
  );
}
