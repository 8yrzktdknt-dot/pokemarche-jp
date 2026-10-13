import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { FilterSheet } from '../components/FilterSheet';
import { CardRow, Chip, GamePicker, colors, fonts, s } from '../components/ui';
import { GAMES, LANG_LABEL, langFor } from '../lib/games';
import { SORT_LABEL, hasCriteria } from '../lib/search';
import { useStore } from '../lib/store';
import type { Card, FilterOptions, GameId, SearchFilters } from '../lib/types';

const PAGE = 40;
const EMPTY: SearchFilters = { text: '', facets: {}, sort: 'relevance' };

export default function Home() {
  const { settings, setSettings, collection } = useStore();
  const game: GameId = settings.game === 'auto' ? 'pokemon' : settings.game;
  const lang = langFor(game, settings.lang);

  const [filters, setFilters] = useState<SearchFilters>(EMPTY);
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [results, setResults] = useState<Card[]>([]);
  const [shown, setShown] = useState(PAGE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Nouveau jeu : on repart de zéro (les extensions et raretés n'ont rien en commun).
  useEffect(() => setFilters(EMPTY), [game]);

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
    if (!hasCriteria(filters)) {
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

  // Filtres actifs, affichés en pastilles : un appui les retire.
  const active = useMemo(() => {
    const out: { label: string; clear(): void }[] = [];
    if (filters.setId) {
      const name = options?.sets.find((x) => x.id === filters.setId)?.name ?? filters.setId;
      out.push({ label: name, clear: () => setFilters({ ...filters, setId: undefined }) });
    }
    for (const [key, value] of Object.entries(filters.facets)) {
      if (value) out.push({ label: value, clear: () => setFilters({ ...filters, facets: { ...filters.facets, [key]: '' } }) });
    }
    if (filters.sort !== 'relevance') {
      out.push({ label: SORT_LABEL[filters.sort], clear: () => setFilters({ ...filters, sort: 'relevance' }) });
    }
    return out;
  }, [filters, options]);

  const header = (
    <View style={s.pad}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {/* Sur le web, Link asChild passe le style tel quel au DOM : il doit être un objet, pas un tableau. */}
        <Link href="/scan" asChild>
          <Pressable style={StyleSheet.flatten([s.button, { flex: 1 }])}><Text style={s.buttonText}>Scanner</Text></Pressable>
        </Link>
        <Link href="/collection" asChild>
          <Pressable style={StyleSheet.flatten([s.ghost, { flex: 1, justifyContent: 'center' }])}>
            <Text style={s.ghostText}>Collection ({collection.reduce((n, e) => n + e.quantity, 0)})</Text>
          </Pressable>
        </Link>
      </View>

      <GamePicker value={game} onChange={(g) => setSettings({ game: g })} />

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          style={[s.input, { flex: 1 }]}
          placeholder={game === 'onepiece' ? 'Nom ou code (OP05-119)' : game === 'pokemon' ? 'Nom ou numéro (136)' : 'Nom de la carte'}
          placeholderTextColor={colors.muted}
          value={filters.text}
          onChangeText={(text) => setFilters({ ...filters, text })}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        <Pressable style={st.filterBtn} onPress={() => setSheet(true)} accessibilityLabel="Filtres">
          <Text style={s.ghostText}>Filtres{active.length ? ` (${active.length})` : ''}</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip label={LANG_LABEL[lang]} onPress={() => setSheet(true)} />
        {active.map((a) => <Chip key={a.label} label={`${a.label}  ✕`} active onPress={a.clear} />)}
      </View>

      {loading && <ActivityIndicator color={colors.accent} />}
      {error && <Text style={{ color: colors.danger, fontFamily: fonts.body }}>{error}</Text>}
      {!loading && hasCriteria(filters) && !error && (
        <Text style={s.muted}>{results.length ? `${results.length} carte${results.length > 1 ? 's' : ''}` : 'Aucune carte trouvée'}</Text>
      )}
      {!hasCriteria(filters) && (
        <Text style={s.muted}>Tape un nom, ou choisis une extension, une rareté ou un type dans les filtres.</Text>
      )}
    </View>
  );

  return (
    <View style={s.screen}>
      <FlatList
        data={results.slice(0, shown)}
        keyExtractor={(c) => c.id}
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
      <FilterSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        options={options}
        optionsError={optionsError}
        filters={filters}
        onChange={setFilters}
        langs={GAMES[game].langs}
        lang={lang}
        onLang={(l) => setSettings({ lang: l })}
      />
    </View>
  );
}

const st = StyleSheet.create({
  filterBtn: {
    borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center', minHeight: 44,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card,
  },
});
