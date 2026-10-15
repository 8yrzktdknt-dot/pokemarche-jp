import { FlatList, Text, View } from 'react-native';
import { CardRow, s } from '../components/ui';
import { formatMoney } from '../lib/currency';
import { dayChange } from '../lib/priceHistory';
import { collectionStats } from '../lib/stats';
import { usePriceHistory } from '../lib/usePriceHistory';
import { useStore } from '../lib/store';

export default function Collection() {
  const { collection, settings, t, toCurrency, locale, money } = useStore();
  const st = collectionStats(collection, toCurrency);
  const cards = collection.map((e) => e.card);
  const points = usePriceHistory(cards);
  const total = formatMoney(st.value, settings.currency, locale);

  return (
    <View style={s.screen}>
      <View style={s.pad}>
        <Text style={s.h2}>{t('coll.count', { n: st.count })}</Text>
        {st.value > 0 && <Text style={s.muted}>{t('coll.value', { v: total })}</Text>}
      </View>
      <FlatList
        data={collection}
        keyExtractor={(e) => `${e.card.game}:${e.card.lang}:${e.card.id}:${e.card.variant ?? ''}`}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 8 }}
        ListEmptyComponent={<Text style={[s.muted, { textAlign: 'center' }]}>{t('coll.empty')}</Text>}
        renderItem={({ item }) => (
          <CardRow
            card={item.card} list={cards} change={dayChange(points(item.card))}
            right={item.quantity > 1 && item.card.prices[0] ? `${money(item.card.prices[0].value, item.card.prices[0].currency)} ×${item.quantity}` : item.quantity > 1 ? `×${item.quantity}` : undefined}
          />
        )}
      />
    </View>
  );
}
