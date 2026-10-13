import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { colors, displayName, s } from '../../../components/ui';
import { GAMES } from '../../../lib/games';
import { marketLinks } from '../../../lib/prices/marketplaces';
import { useStore } from '../../../lib/store';
import type { Card, CardLang, GameId } from '../../../lib/types';

const SOURCE_LABEL = { cardmarket: 'Cardmarket', tcgplayer: 'TCGplayer', cardtrader: 'CardTrader', ebay: 'eBay' };

export default function CardScreen() {
  const { game, id, lang } = useLocalSearchParams<{ game: GameId; id: string; lang: CardLang }>();
  const { add, remove, collection, settings, t, langLabel, money } = useStore();
  const [card, setCard] = useState<Card | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    GAMES[game].getCard(id, lang).then(setCard, (e) => setError(String(e)));
  }, [game, id, lang]);

  if (error) return <View style={[s.screen, s.pad]}><Text style={{ color: colors.danger }}>{error}</Text></View>;
  if (!card) return <View style={[s.screen, s.pad]}><ActivityIndicator color={colors.accent} /></View>;

  const owned = collection.find((e) => e.card.game === card.game && e.card.id === card.id && e.card.lang === card.lang)?.quantity ?? 0;

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <Stack.Screen options={{ title: displayName(card, settings.appLang) }} />
      <Image source={card.imageLarge} style={{ width: '100%', aspectRatio: 63 / 88, borderRadius: 12 }} contentFit="contain" />
      <Text style={s.h2}>{displayName(card, settings.appLang)}</Text>
      {displayName(card, settings.appLang) !== card.name && <Text style={s.muted}>{card.name}</Text>}
      <Text style={s.muted}>
        {[GAMES[card.game].label, card.setName, card.number, card.rarity, langLabel(card.lang)].filter(Boolean).join(' · ')}
      </Text>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable style={[s.button, { flex: 1 }]} onPress={() => add(card)}>
          <Text style={s.buttonText}>＋ {t('card.add')}{owned ? ` (${owned})` : ''}</Text>
        </Pressable>
        {owned > 0 && (
          <Pressable style={[s.ghost, { paddingHorizontal: 18 }]} onPress={() => remove(card)}>
            <Text style={s.ghostText}>−</Text>
          </Pressable>
        )}
      </View>

      <Text style={s.h2}>{t('card.prices')}</Text>
      {card.prices.length === 0 && <Text style={s.muted}>{t('card.noPrice')}</Text>}
      {card.prices.map((p, i) => (
        <View key={i} style={[s.cardRow, { justifyContent: 'space-between' }]}>
          <Text style={s.name}>{SOURCE_LABEL[p.source]} — {p.label}</Text>
          <Text style={s.price}>{money(p.value, p.currency)}</Text>
        </View>
      ))}

      <Text style={s.h2}>{t('card.seeOn')}</Text>
      {marketLinks(card, settings.appLang).map((l) => (
        <Pressable key={l.id} style={s.ghost} onPress={() => Linking.openURL(l.url)}>
          <Text style={s.ghostText}>{l.label} ↗</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
