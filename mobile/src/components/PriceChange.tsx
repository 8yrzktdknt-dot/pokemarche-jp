import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import type { Change } from '../lib/priceHistory';
import { useStore } from '../lib/store';
import { colors, fonts } from './theme';

/**
 * Variation depuis la veille : flèche de tendance verte vers le haut (hausse) ou rouge vers le bas (baisse),
 * montant dans la devise choisie et pourcentage. `currency` : devise du prix d'origine (converti par l'app).
 */
export function PriceChange({ change, currency = 'EUR', size = 13, pct = true, suffix }: {
  change: Change | null | undefined; currency?: string; size?: number; pct?: boolean; suffix?: string;
}) {
  const { money, locale } = useStore();
  if (!change) return null;
  const up = change.delta > 0, down = change.delta < 0;
  const color = up ? colors.good : down ? colors.danger : colors.muted;
  const sign = up ? '+' : down ? '−' : '';
  const amount = `${sign}${money(Math.abs(change.delta), currency)}`;
  const percent = `${sign}${Math.abs(change.pct).toLocaleString(locale, { maximumFractionDigits: 1 })} %`;
  return (
    <View style={st.row}>
      <Ionicons name={up ? 'trending-up' : down ? 'trending-down' : 'remove'} size={size + 3} color={color} />
      <Text style={[st.text, { color, fontSize: size }]} numberOfLines={1}>
        {amount}{pct ? ` (${percent})` : ''}
        {suffix ? <Text style={st.suffix}>  {suffix}</Text> : null}
      </Text>
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  text: { fontFamily: fonts.heavy, flexShrink: 1 },
  suffix: { color: colors.muted, fontFamily: fonts.bold },
});
