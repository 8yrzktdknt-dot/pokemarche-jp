import { FlatList, Text, View } from 'react-native';
import { CardRow, s } from '../components/ui';
import { formatMoney } from '../lib/currency';
import { collectionStats } from '../lib/stats';
import { useStore } from '../lib/store';

export default function Collection() {
  const { collection, settings, t, toCurrency } = useStore();
  const st = collectionStats(collection, toCurrency);
  const cards = collection.map((e) => e.card);
  const total = formatMoney(st.value, settings.currency, settings.appLang === 'en' ? 'en-US' : 'fr-FR');

  return (
    <View style={s.screen}>
      <View style={s.pad}>
        <Text style={s.h2}>{t('coll.count', { n: st.count })}</Text>
        {st.value > 0 && <Text style={s.muted}>{t('coll.value', { v: total })}</Text>}
      </View>
      <FlatList
        data={collection}
        keyExtractor={(e) => `${e.card.game}:${e.card.lang}:${e.card.id}`}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 8 }}
        ListEmptyComponent={<Text style={[s.muted, { textAlign: 'center' }]}>{t('coll.empty')}</Text>}
        renderItem={({ item }) => <CardRow card={item.card} list={cards} right={item.quantity > 1 ? `×${item.quantity}` : undefined} />}
      />
    </View>
  );
}
