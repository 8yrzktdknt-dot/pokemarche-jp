import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { colors, s } from '../../../components/ui';
import { GAMES, LANG_LABEL } from '../../../lib/games';
import { formatPrice, marketLinks } from '../../../lib/prices/marketplaces';
import { useStore } from '../../../lib/store';
import type { Card, CardLang, GameId } from '../../../lib/types';

const SOURCE_LABEL = { cardmarket: 'Cardmarket', tcgplayer: 'TCGplayer', cardtrader: 'CardTrader', ebay: 'eBay' };

export default function CardScreen() {
  const { game, id, lang } = useLocalSearchParams<{ game: GameId; id: string; lang: CardLang }>();
  const { add, remove, collection, settings } = useStore();
  const [card, setCard] = useState<Card | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    GAMES[game].getCard(id, lang).then(setCard, (e) => setError(String(e)));
  }, [game, id, lang]);

  if (error) return <View style={[s.screen, s.pad]}><Text style={{ color: '#f87171' }}>{error}</Text></View>;
  if (!card) return <View style={[s.screen, s.pad]}><ActivityIndicator color={colors.accent} /></View>;

  const owned = collection.find((e) => e.card.game === card.game && e.card.id === card.id && e.card.lang === card.lang)?.quantity ?? 0;

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <Stack.Screen options={{ title: card.name }} />
      <Image source={card.imageLarge} style={{ width: '100%', aspectRatio: 63 / 88, borderRadius: 12 }} contentFit="contain" />
      <Text style={s.h2}>{card.name}</Text>
      <Text style={s.muted}>
        {[GAMES[card.game].label, card.setName, card.number, card.rarity, LANG_LABEL[card.lang]].filter(Boolean).join(' · ')}
      </Text>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable style={[s.button, { flex: 1 }]} onPress={() => add(card)}>
          <Text style={s.buttonText}>＋ Ajouter{owned ? ` (${owned})` : ''}</Text>
        </Pressable>
        {owned > 0 && (
          <Pressable style={[s.ghost, { paddingHorizontal: 18 }]} onPress={() => remove(card)}>
            <Text style={s.ghostText}>−</Text>
          </Pressable>
        )}
      </View>

      <Text style={s.h2}>Prix</Text>
      {card.prices.length === 0 && <Text style={s.muted}>Pas de prix automatique pour cette carte : consulte les sites ci-dessous.</Text>}
      {card.prices.map((p, i) => (
        <View key={i} style={[s.cardRow, { justifyContent: 'space-between' }]}>
          <Text style={s.name}>{SOURCE_LABEL[p.source]} — {p.label}</Text>
          <Text style={s.price}>{formatPrice(p.value, p.currency)}</Text>
        </View>
      ))}

      <Text style={s.h2}>Voir sur</Text>
      {marketLinks(card, settings.lang).map((l) => (
        <Pressable key={l.id} style={s.ghost} onPress={() => Linking.openURL(l.url)}>
          <Text style={s.ghostText}>{l.label} ↗</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
