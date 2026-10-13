import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LANG_LABEL } from '../lib/games';
import { SORT_LABEL, normalize } from '../lib/search';
import type { CardLang, FilterOptions, SearchFilters } from '../lib/types';
import { Chip, colors, fonts, s } from './ui';

interface Props {
  visible: boolean;
  onClose(): void;
  options: FilterOptions | null;
  optionsError: string | null;
  filters: SearchFilters;
  onChange(f: SearchFilters): void;
  langs: CardLang[];
  lang: CardLang;
  onLang(l: CardLang): void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={st.section}>{title}</Text>
      {children}
    </View>
  );
}

const Wrap = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
);

export function FilterSheet({ visible, onClose, options, optionsError, filters, onChange, langs, lang, onLang }: Props) {
  const [pickingSet, setPickingSet] = useState(false);
  const [setQuery, setSetQuery] = useState('');
  const setName = options?.sets.find((x) => x.id === filters.setId)?.name;
  const sets = useMemo(() => {
    const q = normalize(setQuery);
    return (options?.sets ?? []).filter((x) => !q || normalize(`${x.id} ${x.name}`).includes(q));
  }, [options, setQuery]);

  const setFacet = (key: string, value: string) =>
    onChange({ ...filters, facets: { ...filters.facets, [key]: filters.facets[key] === value ? '' : value } });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
        <View style={st.header}>
          {pickingSet ? (
            <Pressable onPress={() => setPickingSet(false)} style={st.headerBtn}><Text style={s.ghostText}>‹ Filtres</Text></Pressable>
          ) : (
            <Pressable onPress={() => onChange({ ...filters, setId: undefined, facets: {}, sort: 'relevance' })} style={st.headerBtn}>
              <Text style={[s.ghostText, { color: colors.muted }]}>Réinitialiser</Text>
            </Pressable>
          )}
          <Text style={s.h2}>{pickingSet ? 'Extension' : 'Filtres'}</Text>
          <Pressable onPress={onClose} style={st.headerBtn}><Text style={[s.ghostText, { color: colors.accent }]}>OK</Text></Pressable>
        </View>

        {pickingSet ? (
          <View style={{ flex: 1, paddingHorizontal: 16, gap: 12 }}>
            <TextInput
              style={s.input}
              placeholder="Chercher une extension"
              placeholderTextColor={colors.muted}
              value={setQuery}
              onChangeText={setSetQuery}
              autoCorrect={false}
            />
            <FlatList
              data={[{ id: '', name: 'Toutes les extensions' }, ...sets]}
              keyExtractor={(x) => x.id || 'all'}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const on = (filters.setId ?? '') === item.id;
                return (
                  <Pressable
                    style={[st.setRow, on && { borderColor: colors.good }]}
                    onPress={() => { onChange({ ...filters, setId: item.id || undefined }); setPickingSet(false); }}
                  >
                    <Text style={[s.name, on && { color: colors.good }]} numberOfLines={1}>{item.name}</Text>
                  </Pressable>
                );
              }}
              contentContainerStyle={{ gap: 6, paddingBottom: 24 }}
            />
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, gap: 24 }}>
            <Section title="Langue des cartes">
              <Wrap>{langs.map((l) => <Chip key={l} label={LANG_LABEL[l]} active={l === lang} onPress={() => onLang(l)} />)}</Wrap>
            </Section>

            {!options && !optionsError && <ActivityIndicator color={colors.accent} />}
            {optionsError && <Text style={{ color: colors.danger, fontFamily: fonts.body }}>Filtres indisponibles : {optionsError}</Text>}

            {options && (
              <>
                <Section title="Extension">
                  <Pressable style={st.setRow} onPress={() => setPickingSet(true)}>
                    <Text style={[s.name, { flex: 1 }]} numberOfLines={1}>{setName ?? 'Toutes les extensions'}</Text>
                    <Text style={s.muted}>›</Text>
                  </Pressable>
                </Section>
                {options.facets.filter((f) => f.values.length).map((facet) => (
                  <Section key={facet.key} title={facet.label}>
                    <Wrap>
                      {facet.values.map((v) => (
                        <Chip key={v} label={v} active={filters.facets[facet.key] === v} onPress={() => setFacet(facet.key, v)} />
                      ))}
                    </Wrap>
                  </Section>
                ))}
                <Section title="Trier par">
                  <Wrap>
                    {options.sorts.map((k) => (
                      <Chip key={k} label={SORT_LABEL[k]} active={filters.sort === k} onPress={() => onChange({ ...filters, sort: k })} />
                    ))}
                  </Wrap>
                </Section>
              </>
            )}
          </ScrollView>
        )}

        {!pickingSet && (
          <View style={{ padding: 16 }}>
            <Pressable style={s.button} onPress={onClose}><Text style={s.buttonText}>Voir les résultats</Text></Pressable>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 8 },
  headerBtn: { minWidth: 96, minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  section: { color: colors.muted, fontFamily: fonts.heavy, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  setRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, minHeight: 48,
    backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.card,
  },
});
