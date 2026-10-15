import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { setBrowseList } from '../../lib/browse';
import { localName } from '../../lib/catalog/static';
import { GAMES, langFor } from '../../lib/games';
import { useStore } from '../../lib/store';
import type { Card, CardLang, GameId, SetInfo } from '../../lib/types';
import { GamePicker, colors, displayName, fonts, s } from '../ui';
import { Page, d } from './common';

/** Sorties récentes du jeu et de la langue choisis (onglet Extensions) : la dernière extension et ses cartes phares. */
export function NewsPage() {
  const { settings, setSettings, t, appLang, money, locale, langLabel } = useStore();
  const game: GameId = settings.game === 'auto' ? 'pokemon' : settings.game;
  const lang: CardLang = langFor(game, settings.lang);
  const [sets, setSets] = useState<SetInfo[] | null>(null);
  const [top, setTop] = useState<Card[] | null>(null);
  const { width } = useWindowDimensions();
  const cell = (Math.min(width, 900) - 32 - 2 * 10) / 3;

  useEffect(() => {
    let alive = true;
    setSets(null);
    setTop(null);
    GAMES[game].blocs(lang).then(async (blocs) => {
      // Ordre du catalogue (le plus récent d'abord), corrigé par la date de sortie quand elle est connue.
      const all = blocs.flatMap((b) => b.sets).map((x, i) => ({ x, i }));
      all.sort((a, b) => (b.x.releaseDate && a.x.releaseDate && b.x.releaseDate !== a.x.releaseDate ? b.x.releaseDate.localeCompare(a.x.releaseDate) : a.i - b.i));
      const list = all.map((a) => a.x).slice(0, 10);
      if (!alive) return;
      setSets(list);
      if (!list[0]) return setTop([]);
      const r = await GAMES[game].setCards(list[0].id, lang).catch(() => null);
      if (!alive) return;
      const priced = (r?.cards ?? []).filter((c) => c.prices[0]).sort((a, b) => b.prices[0].value - a.prices[0].value);
      setTop(priced.slice(0, 6));
    }, () => alive && setSets([]));
    return () => { alive = false; };
  }, [game, lang]);

  const date = (x?: string) => (x ? new Date(`${x}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) : undefined);
  const openSet = (x: SetInfo) => router.push({ pathname: '/set/[game]/[id]', params: { game, id: x.id, lang } });
  const latest = sets?.[0];

  return (
    <Page>
      <GamePicker value={game} onChange={(g) => g !== 'auto' && setSettings({ game: g })} />
      {!sets && <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />}
      {sets?.length === 0 && <Text style={s.muted}>{t('ext.none')}</Text>}

      {latest && (
        <Pressable style={d.hero} onPress={() => openSet(latest)} accessibilityRole="button">
          <Text style={d.kicker}>{t('dash.latest')} · {langLabel(lang)}</Text>
          <View style={st.logoBox}>
            {latest.logo ? <Image source={latest.logo} style={StyleSheet.absoluteFill} contentFit="contain" /> : <Text style={st.code}>{latest.code}</Text>}
          </View>
          <Text style={st.setName}>{localName(latest, appLang)}</Text>
          <Text style={d.caption}>{[date(latest.releaseDate), latest.count ? t('common.cards', { n: latest.count }) : undefined].filter(Boolean).join(' · ')}</Text>
          <View style={s.button}><Text style={s.buttonText}>{t('dash.openSet')}</Text></View>
        </Pressable>
      )}

      {latest && top === null && <ActivityIndicator color={colors.accent} />}
      {!!top?.length && (
        <View style={{ gap: 10 }}>
          <Text style={st.title}>{t('dash.latestTop')}</Text>
          <View style={st.grid}>
            {top.map((c) => (
              <Pressable
                key={c.id}
                style={{ width: cell, gap: 4 }}
                onPress={() => { setBrowseList(top); router.push({ pathname: '/card/[game]/[id]', params: { game, id: c.id, lang } }); }}
                accessibilityLabel={displayName(c, appLang)}
              >
                <Image source={c.imageSmall} style={{ width: cell, height: cell * 1.4, borderRadius: 6, backgroundColor: colors.card }} contentFit="cover" />
                <Text style={st.cardName} numberOfLines={1}>{displayName(c, appLang)}</Text>
                <Text style={st.price}>{money(c.prices[0].value, c.prices[0].currency)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {sets && sets.length > 1 && (
        <View style={{ gap: 10 }}>
          <Text style={st.title}>{t('dash.recentSets')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {sets.slice(1).map((x) => (
              <Pressable key={x.id} style={st.tile} onPress={() => openSet(x)} accessibilityLabel={localName(x, appLang)}>
                <View style={st.tileLogo}>
                  {x.logo ? <Image source={x.logo} style={StyleSheet.absoluteFill} contentFit="contain" /> : <Text style={st.code}>{x.code}</Text>}
                </View>
                <Text style={st.tileName} numberOfLines={2}>{localName(x, appLang)}</Text>
                {x.releaseDate && <Text style={st.tileMeta}>{new Date(`${x.releaseDate}T12:00:00`).toLocaleDateString(locale, { month: 'short', year: 'numeric' })}</Text>}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </Page>
  );
}

const st = StyleSheet.create({
  logoBox: { height: 96, borderRadius: 14, backgroundColor: '#0E2A1D', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 10 },
  code: { color: colors.accent, fontFamily: fonts.display, fontSize: 18 },
  setName: { color: colors.text, fontFamily: fonts.display, fontSize: 20 },
  title: { color: colors.muted, fontFamily: fonts.heavy, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cardName: { color: colors.text, fontFamily: fonts.bold, fontSize: 12 },
  price: { color: colors.accent, fontFamily: fonts.heavy, fontSize: 13 },
  tile: { width: 132, backgroundColor: colors.card, borderRadius: 14, padding: 8, gap: 4 },
  tileLogo: { height: 64, borderRadius: 10, backgroundColor: '#0E2A1D', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tileName: { color: colors.text, fontFamily: fonts.bold, fontSize: 12, lineHeight: 15 },
  tileMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 11 },
});
