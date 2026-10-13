import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Dropdown } from '../../components/Dropdown';
import { GamePicker, colors, fonts, s } from '../../components/ui';
import { GAMES, LANG_LABEL, langFor } from '../../lib/games';
import { useStore } from '../../lib/store';
import type { Bloc, GameId } from '../../lib/types';

export default function Extensions() {
  const { settings, setSettings } = useStore();
  const game: GameId = settings.game === 'auto' ? 'pokemon' : settings.game;
  const lang = langFor(game, settings.lang);
  const [blocs, setBlocs] = useState<Bloc[] | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { maxWidth: 900, width: '100%', alignSelf: 'center' }]}>
      <GamePicker value={game} onChange={(g) => setSettings({ game: g })} />
      <Dropdown
        label="Langue des extensions"
        value={lang}
        options={GAMES[game].langs.map((l) => ({ value: l, label: LANG_LABEL[l] }))}
        onChange={(l) => l && setSettings({ lang: l as typeof lang })}
      />
      {!blocs && !error && <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />}
      {error && <Text style={{ color: colors.danger, fontFamily: fonts.body }}>Extensions indisponibles : {error}</Text>}
      {blocs?.length === 0 && <Text style={s.muted}>Aucune extension dans cette langue pour le moment.</Text>}

      {blocs?.map((b) => (
        <View key={b.id} style={{ gap: 10, marginTop: 8 }}>
          <Text style={s.h2}>{b.name}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {b.sets.map((x) => (
              <Link key={x.id} href={{ pathname: '/set/[game]/[id]', params: { game, id: x.id, lang } }} asChild>
                <Pressable style={StyleSheet.flatten([st.tile, { width: tile }])} accessibilityLabel={`${x.name} (${x.code})`}>
                  <View style={[st.logoBox, { height: tile * 0.62 }]}>
                    {x.logo ? (
                      <Image source={x.logo} style={StyleSheet.absoluteFill} contentFit="contain" />
                    ) : (
                      <Text style={st.code}>{x.code}</Text>
                    )}
                  </View>
                  <Text style={st.name} numberOfLines={2}>{x.name}</Text>
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

const st = StyleSheet.create({
  tile: { backgroundColor: colors.card, borderRadius: 14, padding: 8, gap: 4 },
  logoBox: { borderRadius: 10, backgroundColor: '#0E2A1D', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 6 },
  code: { color: colors.accent, fontFamily: fonts.display, fontSize: 16 },
  name: { color: colors.text, fontFamily: fonts.bold, fontSize: 12, lineHeight: 15 },
  meta: { color: colors.muted, fontFamily: fonts.body, fontSize: 11 },
});
