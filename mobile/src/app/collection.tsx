import { FlatList, Text, View } from 'react-native';
import { CardRow, s } from '../components/ui';
import { formatPrice } from '../lib/prices/marketplaces';
import { useStore } from '../lib/store';

export default function Collection() {
  const { collection } = useStore();
  const totals = new Map<string, number>();
  for (const e of collection) {
    const p = e.card.prices[0];
    if (p) totals.set(p.currency, (totals.get(p.currency) ?? 0) + p.value * e.quantity);
  }
  const totalText = [...totals].map(([cur, v]) => formatPrice(v, cur)).join(' + ');

  return (
    <View style={s.screen}>
      <View style={s.pad}>
        <Text style={s.h2}>{collection.reduce((n, e) => n + e.quantity, 0)} cartes</Text>
        {totalText ? <Text style={s.muted}>Valeur estimée : {totalText}</Text> : null}
      </View>
      <FlatList
        data={collection}
        keyExtractor={(e) => `${e.card.game}:${e.card.lang}:${e.card.id}`}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 8 }}
        ListEmptyComponent={<Text style={[s.muted, { textAlign: 'center' }]}>Scanne ta première carte !</Text>}
        renderItem={({ item }) => <CardRow card={item.card} right={item.quantity > 1 ? `×${item.quantity}` : undefined} />}
      />
    </View>
  );
}
