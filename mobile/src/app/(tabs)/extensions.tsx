import { Image } from 'expo-image';
import { Link } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Dropdown } from '../../components/Dropdown';
import { GamePicker, colors, fonts, s } from '../../components/ui';
import { localName } from '../../lib/catalog/static';
import { GAMES, langFor } from '../../lib/games';
import { useStore } from '../../lib/store';
import type { Bloc, GameId } from '../../lib/types';

export default function Extensions() {
  const { settings, setSettings, t, langLabel, appLang } = useStore();
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

      {shown?.map((b) => (
        <View key={b.id} style={{ gap: 10, marginTop: 8 }}>
          <Text style={s.h2}>{localName(b, appLang)}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {b.sets.map((x) => (
              <Link key={x.id} href={{ pathname: '/set/[game]/[id]', params: { game, id: x.id, lang } }} asChild>
                <Pressable style={StyleSheet.flatten([st.tile, { width: tile }])} accessibilityLabel={`${localName(x, appLang)} (${x.code})`}>
                  <View style={[st.logoBox, { height: tile * 0.62 }]}>
                    {x.logo ? (
                      <Image source={x.logo} style={st.logo} contentFit="contain" />
                    ) : (
                      <Text style={st.code}>{x.code}</Text>
                    )}
                    {x.symbol && x.symbol !== x.logo && <Image source={x.symbol} style={st.symbol} contentFit="contain" />}
                  </View>
                  <Text style={st.name} numberOfLines={2}>{localName(x, appLang)}</Text>
                  <Text style={st.meta}>{x.code}{x.count ? ` · ${x.count}` : ''}</Text>
                </Pressable>
              </Link>
            ))}
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
});
