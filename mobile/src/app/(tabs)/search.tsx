import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { Dropdown, type Option } from '../../components/Dropdown';
import { CardRow, GamePicker, colors, fonts, s } from '../../components/ui';
import { rarityAbbr } from '../../lib/catalog/pokemonNames';
import { GAMES, LANG_LABEL, langFor } from '../../lib/games';
import { SORT_LABEL, hasCriteria } from '../../lib/search';
import { useStore } from '../../lib/store';
import type { Card, FilterOptions, GameId, SearchFilters } from '../../lib/types';

const PAGE = 40;
/** Deux menus déroulants par ligne. */
const half = { flexGrow: 1, flexBasis: '45%' } as const;
const EMPTY: SearchFilters = { text: '', facets: {}, sort: 'relevance' };

export default function Search() {
  const { settings, setSettings } = useStore();
  const game: GameId = settings.game === 'auto' ? 'pokemon' : settings.game;
  const lang = langFor(game, settings.lang);

  const [filters, setFilters] = useState<SearchFilters>(EMPTY);
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [results, setResults] = useState<Card[]>([]);
  const [shown, setShown] = useState(PAGE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Nouveau jeu ou nouvelle langue : les blocs, extensions et raretés changent.
  useEffect(() => setFilters((f) => ({ ...EMPTY, text: f.text })), [game, lang]);

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

  useEffect(() => {
    if (!hasCriteria(filters) && !filters.blocId) {
      setResults([]);
      setError(null);
      return;
    }
    let alive = true;
    const t = setTimeout(async () => {
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
    return () => { alive = false; clearTimeout(t); };
  }, [filters, game, lang]);

  const blocOptions: Option[] = useMemo(() => (options?.blocs ?? []).map((b) => ({ value: b.id, label: b.name })), [options]);
  const setOptions_: Option[] = useMemo(() => {
    const blocs = (options?.blocs ?? []).filter((b) => !filters.blocId || b.id === filters.blocId);
    return blocs.flatMap((b) => b.sets.map((x) => ({ value: x.id, label: `${x.code} · ${x.name}` })));
  }, [options, filters.blocId]);
  const rarity = options?.facets.find((f) => f.key === 'rarity');
  const rarityOptions: Option[] = (rarity?.values ?? []).map((v) => {
    const abbr = rarityAbbr(v);
    return { value: v, label: abbr !== v ? `${abbr} — ${v}` : v };
  });
  // Pokémon : uniquement Blocs / Extensions / Raretés. Les autres jeux gardent leurs filtres propres.
  const extraFacets = game === 'pokemon' ? [] : (options?.facets ?? []).filter((f) => f.key !== 'rarity' && f.values.length);

  const header = (
    <View style={s.pad}>
      <GamePicker value={game} onChange={(g) => setSettings({ game: g })} />
      <TextInput
        style={s.input}
        placeholder={game === 'pokemon' ? 'Nom ou code (ex. Pikachu, M6 110)' : game === 'onepiece' ? 'Nom ou code (ex. OP05-119)' : 'Nom de la carte'}
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
          label="Langue"
          value={lang}
          options={GAMES[game].langs.map((l) => ({ value: l, label: LANG_LABEL[l] }))}
          onChange={(l) => l && setSettings({ lang: l as typeof lang })}
        />
        <Dropdown
          style={half}
          label="Bloc"
          value={filters.blocId}
          options={blocOptions}
          allLabel="Tous les blocs"
          disabled={!options}
          onChange={(blocId) => setFilters({ ...filters, blocId, setId: undefined })}
        />
        <Dropdown
          style={half}
          label="Extension"
          value={filters.setId}
          options={setOptions_}
          allLabel="Toutes les extensions"
          disabled={!options}
          onChange={(setId) => setFilters({ ...filters, setId })}
        />
        <Dropdown
          style={half}
          label="Rareté"
          value={filters.facets.rarity}
          options={rarityOptions}
          allLabel="Toutes les raretés"
          disabled={!options}
          onChange={(v) => setFilters({ ...filters, facets: { ...filters.facets, rarity: v ?? '' } })}
        />
        {extraFacets.map((f) => (
          <Dropdown
          style={half}
            key={f.key}
            label={f.label}
            value={filters.facets[f.key]}
            options={f.values.map((v) => ({ value: v, label: v }))}
            allLabel="Tous"
            onChange={(v) => setFilters({ ...filters, facets: { ...filters.facets, [f.key]: v ?? '' } })}
          />
        ))}
        <Dropdown
          style={half}
          label="Trier par"
          value={filters.sort}
          options={(options?.sorts ?? ['relevance']).map((k) => ({ value: k, label: SORT_LABEL[k] }))}
          onChange={(v) => setFilters({ ...filters, sort: (v ?? 'relevance') as SearchFilters['sort'] })}
        />
      </View>

      {optionsError && <Text style={{ color: colors.danger, fontFamily: fonts.body }}>Filtres indisponibles : {optionsError}</Text>}
      {loading && <ActivityIndicator color={colors.accent} />}
      {error && <Text style={{ color: colors.danger, fontFamily: fonts.body }}>{error}</Text>}
      {!loading && !error && (hasCriteria(filters) || filters.blocId) && (
        <Text style={s.muted}>{results.length ? `${results.length} carte${results.length > 1 ? 's' : ''}` : 'Aucune carte trouvée'}</Text>
      )}
      {!hasCriteria(filters) && !filters.blocId && (
        <Text style={s.muted}>Tape un nom ou un code, ou choisis un bloc, une extension ou une rareté.</Text>
      )}
    </View>
  );

  return (
    <View style={s.screen}>
      <FlatList
        data={results.slice(0, shown)}
        keyExtractor={(c) => `${c.id}-${c.number}`}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}><CardRow card={item} /></View>}
        ListFooterComponent={
          shown < results.length ? (
            <Pressable style={[s.ghost, { marginHorizontal: 16 }]} onPress={() => setShown((n) => n + PAGE)}>
              <Text style={s.ghostText}>Afficher plus ({results.length - shown} restantes)</Text>
            </Pressable>
          ) : null
        }
      />
    </View>
  );
}
