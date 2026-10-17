import { FlatList, Text, View } from 'react-native';
import { CardRow, s } from '../components/ui';
import { GainText } from '../components/CardExtras';
import { gainOf } from '../lib/wishlist';
import { conditionFactor, conditionLabel, unitValue } from '../lib/condition';
import { formatMoney } from '../lib/currency';
import { dayChange } from '../lib/priceHistory';
import { collectionStats } from '../lib/stats';
import { usePriceHistory } from '../lib/usePriceHistory';
import { useStore } from '../lib/store';

export default function Collection() {
  const { collection, settings, t, toCurrency, locale } = useStore();
  const st = collectionStats(collection, toCurrency);
  const cards = collection.map((e) => e.card);
  const points = usePriceHistory(cards);
  const total = formatMoney(st.value, settings.currency, locale);
  const gain = gainOf(collection, toCurrency);

  return (
    <View style={s.screen}>
      <View style={s.pad}>
        <Text style={s.h2}>{t('coll.count', { n: st.count })}</Text>
        {st.value > 0 && <Text style={s.muted}>{t('coll.value', { v: total })}</Text>}
        {gain && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={s.muted}>{t(gain.delta >= 0 ? 'paid.gain' : 'paid.loss')} :</Text>
            <GainText delta={gain.delta} pct={gain.pct} size={14} />
          </View>
        )}
      </View>
      <FlatList
        data={collection}
        keyExtractor={(e) => `${e.card.game}:${e.card.lang}:${e.card.id}:${e.card.variant ?? ''}`}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 8 }}
        ListEmptyComponent={<Text style={[s.muted, { textAlign: 'center' }]}>{t('coll.empty')}</Text>}
        renderItem={({ item }) => (
          <CardRow
            card={item.card} list={cards} change={dayChange(points(item.card))}
            right={(() => {
              // État ou gradation, valeur retenue (selon l'état) et nombre d'exemplaires.
              const unit = unitValue(item, toCurrency);
              const parts = [conditionLabel(item), unit !== undefined && (item.quantity > 1 || conditionFactor(item) !== 1 || item.value !== undefined || !!item.copies) ? formatMoney(unit, settings.currency, locale) : undefined, item.quantity > 1 ? `×${item.quantity}` : undefined].filter(Boolean);
              return parts.length ? parts.join(' · ') : undefined;
            })()}
          />
        )}
      />
    </View>
  );
}
