import { StyleSheet, Text, View } from 'react-native';
import { formatPrice } from '../lib/prices/marketplaces';
import type { Money } from '../lib/stats';
import { colors, fonts } from './ui';

export function moneyText(m: Money): string {
  const parts = (['EUR', 'USD', 'JPY'] as const).filter((c) => m[c]).map((c) => formatPrice(m[c]!, c));
  return parts.length ? parts.join(' + ') : '—';
}

/** Chiffre clé : grand nombre, libellé dessous. */
export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View style={st.tile}>
      <Text style={st.value} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={st.label}>{label}</Text>
      {hint ? <Text style={st.hint}>{hint}</Text> : null}
    </View>
  );
}

/** Liste de barres horizontales (une seule teinte : on compare des quantités, pas des catégories). */
export function BarList({ rows }: { rows: { label: string; value: number; detail?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <View style={{ gap: 10 }}>
      {rows.map((r) => (
        <View key={r.label} style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Text style={st.rowLabel} numberOfLines={1}>{r.label}</Text>
            <Text style={st.rowValue}>{r.value}{r.detail ? ` · ${r.detail}` : ''}</Text>
          </View>
          <View style={st.track}>
            <View style={[st.bar, { width: `${(r.value / max) * 100}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={st.panel}>
      <Text style={st.panelTitle}>{title}</Text>
      {children}
    </View>
  );
}

const st = StyleSheet.create({
  tile: { flexGrow: 1, flexBasis: '30%', backgroundColor: colors.card, borderRadius: 16, padding: 14, gap: 2 },
  value: { color: colors.text, fontFamily: fonts.display, fontSize: 22 },
  label: { color: colors.muted, fontFamily: fonts.bold, fontSize: 12 },
  hint: { color: colors.muted, fontFamily: fonts.body, fontSize: 11 },
  panel: { backgroundColor: colors.card, borderRadius: 16, padding: 16, gap: 12 },
  panelTitle: { color: colors.muted, fontFamily: fonts.heavy, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  rowLabel: { color: colors.text, fontFamily: fonts.bold, fontSize: 14, flexShrink: 1 },
  rowValue: { color: colors.text, fontFamily: fonts.bold, fontSize: 14 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.bg, overflow: 'hidden' },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.good },
});
