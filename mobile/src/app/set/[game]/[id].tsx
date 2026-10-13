import { Image } from 'expo-image';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { setBrowseList } from '../../../lib/browse';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors, displayName, fonts, s } from '../../../components/ui';
import { GAMES } from '../../../lib/games';
import { useStore } from '../../../lib/store';
import type { Card, CardLang, GameId, SetInfo } from '../../../lib/types';

export default function SetScreen() {
  const { game, id, lang } = useLocalSearchParams<{ game: GameId; id: string; lang: CardLang }>();
  const { collection, t, settings } = useStore();
  const [set, setSet] = useState<SetInfo | null>(null);
  const [cards, setCards] = useState<Card[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const cols = Math.max(3, Math.floor(Math.min(width, 900) / 140));
  const w = (Math.min(width, 900) - 32 - (cols - 1) * 8) / cols;

  useEffect(() => {
    GAMES[game].setCards(id, lang).then(
      (r) => { setSet(r.set); setCards(r.cards); },
      (e) => setError(String(e)),
    );
  }, [game, id, lang]);

  const owned = useMemo(
    () => new Set(collection.filter((e) => e.card.game === game).map((e) => e.card.id)),
    [collection, game],
  );
  const ownedCount = cards?.filter((c) => owned.has(c.id)).length ?? 0;

  if (error) return <View style={[s.screen, s.pad]}><Text style={{ color: colors.danger }}>{error}</Text></View>;
  if (!cards) return <View style={[s.screen, s.pad]}><ActivityIndicator color={colors.accent} /></View>;

  return (
    <View style={s.screen}>
      <Stack.Screen options={{ title: set?.name ?? id }} />
      <FlatList
        data={cards}
        key={cols}
        numColumns={cols}
        keyExtractor={(c) => `${c.id}-${c.number}`}
        contentContainerStyle={{ padding: 16, gap: 8, maxWidth: 900, width: '100%', alignSelf: 'center' }}
        columnWrapperStyle={{ gap: 8 }}
        ListHeaderComponent={
          <View style={{ gap: 8, marginBottom: 8, alignItems: 'center' }}>
            {set?.logo && <Image source={set.logo} style={{ width: '70%', height: 90 }} contentFit="contain" />}
            <Text style={[s.h2, { textAlign: 'center' }]}>{set?.name ?? id}</Text>
            <Text style={s.muted}>{t('set.summary', { code: set?.code ?? id, n: cards.length, owned: ownedCount })}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Link href={{ pathname: '/card/[game]/[id]', params: { game: item.game, id: item.id, lang: item.lang } }} asChild>
            <Pressable style={{ width: w }} accessibilityLabel={`${item.name} ${item.number}`} onPressIn={() => setBrowseList(cards)}>
              <View>
                <Image source={item.imageSmall} style={[st.img, { width: w, height: w * 88 / 63 }]} contentFit="cover" transition={150} />
                {owned.has(item.id) && <View style={st.badge}><Text style={st.badgeText}>✓</Text></View>}
              </View>
              <Text style={st.num} numberOfLines={1}>{item.number}</Text>
              <Text style={st.name} numberOfLines={1}>{displayName(item, settings.appLang)}</Text>
            </Pressable>
          </Link>
        )}
      />
    </View>
  );
}

const st = StyleSheet.create({
  img: { borderRadius: 6, backgroundColor: colors.card },
  num: { color: colors.muted, fontFamily: fonts.bold, fontSize: 11, marginTop: 4 },
  name: { color: colors.text, fontFamily: fonts.bold, fontSize: 12 },
  badge: {
    position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.good, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: colors.bg, fontFamily: fonts.heavy, fontSize: 12 },
});
