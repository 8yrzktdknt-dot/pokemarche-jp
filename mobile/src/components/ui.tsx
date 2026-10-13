import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GAME_LIST, LANG_LABEL } from '../lib/games';
import { formatPrice } from '../lib/prices/marketplaces';
import type { Card, CardLang, GameId } from '../lib/types';

export const colors = {
  bg: '#0f1420',
  card: '#1a2233',
  line: '#2a3550',
  text: '#f2f4f8',
  muted: '#93a0b8',
  accent: '#ffcb05',
  good: '#22c55e',
};

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress(): void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && s.chipOn]} accessibilityState={{ selected: active }}>
      <Text style={[s.chipText, active && s.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

export function GamePicker({
  value, onChange, allowAuto,
}: { value: GameId | 'auto'; onChange(g: GameId | 'auto'): void; allowAuto?: boolean }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
      {allowAuto && <Chip label="Auto" active={value === 'auto'} onPress={() => onChange('auto')} />}
      {GAME_LIST.map((g) => (
        <Chip key={g.id} label={g.label} active={value === g.id} onPress={() => onChange(g.id)} />
      ))}
    </ScrollView>
  );
}

export function LangPicker({ langs, value, onChange }: { langs: CardLang[]; value: CardLang; onChange(l: CardLang): void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
      {langs.map((l) => (
        <Chip key={l} label={LANG_LABEL[l]} active={value === l} onPress={() => onChange(l)} />
      ))}
    </ScrollView>
  );
}

export function bestPrice(card: Card): string | null {
  const p = card.prices[0];
  return p ? formatPrice(p.value, p.currency) : null;
}

export function CardRow({ card, right }: { card: Card; right?: string }) {
  return (
    <Link href={{ pathname: '/card/[game]/[id]', params: { game: card.game, id: card.id, lang: card.lang } }} asChild>
      <Pressable style={s.cardRow}>
        <Image source={card.imageSmall} style={s.thumb} contentFit="contain" />
        <View style={{ flex: 1 }}>
          <Text style={s.name} numberOfLines={2}>{card.name}</Text>
          <Text style={s.meta}>{[card.number, card.setName, card.rarity].filter(Boolean).join(' · ')}</Text>
        </View>
        {(right ?? bestPrice(card)) && <Text style={s.price}>{right ?? bestPrice(card)}</Text>}
      </Pressable>
    </Link>
  );
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: 16, gap: 12 },
  row: { gap: 8, paddingVertical: 2 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.line },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontWeight: '600' },
  chipTextOn: { color: '#111' },
  input: {
    backgroundColor: colors.card, color: colors.text, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 16, borderWidth: 1, borderColor: colors.line,
  },
  button: { backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: '#111', fontWeight: '800', fontSize: 16 },
  ghost: { borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.line },
  ghostText: { color: colors.text, fontWeight: '700' },
  cardRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10,
    backgroundColor: colors.card, borderRadius: 12,
  },
  thumb: { width: 52, height: 72, borderRadius: 4, backgroundColor: '#0b0f18' },
  name: { color: colors.text, fontWeight: '700', fontSize: 15 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  price: { color: colors.accent, fontWeight: '800' },
  h2: { color: colors.text, fontSize: 18, fontWeight: '800' },
  muted: { color: colors.muted },
});
