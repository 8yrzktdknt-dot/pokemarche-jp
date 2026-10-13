import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { setBrowseList } from '../lib/browse';
import { GAME_LIST } from '../lib/games';
import { useStore } from '../lib/store';
import type { Card, GameId } from '../lib/types';

/** Palette « Rayquaza » (voir la direction artistique PokéMarket). */
export const colors = {
  bg: '#0A1F17',
  card: '#133325',
  line: '#2E6B4D',
  text: '#ECF5EF',
  muted: '#8FB3A0',
  primary: '#1A7D4C',
  accent: '#F5C542',
  good: '#3CCB7F',
  danger: '#E5484D',
};

export const fonts = {
  body: 'Manrope_400Regular',
  bold: 'Manrope_700Bold',
  heavy: 'Manrope_800ExtraBold',
  display: 'Unbounded_800ExtraBold',
};

export function Wordmark({ size = 20 }: { size?: number }) {
  return (
    <Text style={{ fontFamily: fonts.display, fontSize: size, color: colors.text }}>
      Poké<Text style={{ color: colors.accent }}>Market</Text>
    </Text>
  );
}

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

/** Nom affiché selon la langue de l'app (traduction quand elle est connue). */
export function displayName(card: Card, appLang: 'fr' | 'en'): string {
  return appLang === 'fr' ? card.nameFr ?? card.nameEn ?? card.name : card.nameEn ?? card.name;
}

/** Meilleur prix connu, converti dans la devise choisie. */
export function useBestPrice(): (card: Card) => string | null {
  const { money } = useStore();
  return (card) => {
    const p = card.prices[0];
    return p ? money(p.value, p.currency) : null;
  };
}

/** `list` : cartes affichées autour (extension, collection, recherche) pour passer de l'une à l'autre sur la fiche. */
export function CardRow({ card, right, list }: { card: Card; right?: string; list?: Card[] }) {
  const { settings } = useStore();
  const price = useBestPrice()(card);
  const name = displayName(card, settings.appLang);
  return (
    <Link href={{ pathname: '/card/[game]/[id]', params: { game: card.game, id: card.id, lang: card.lang } }} asChild>
      <Pressable style={s.cardRow} onPressIn={() => setBrowseList(list ?? [card])}>
        <Image source={card.imageSmall} style={s.thumb} contentFit="contain" />
        <View style={{ flex: 1 }}>
          <Text style={s.name} numberOfLines={2}>{name}</Text>
          {name !== card.name && <Text style={s.meta} numberOfLines={1}>{card.name}</Text>}
          <Text style={s.meta}>{[card.number, card.setName, card.rarity].filter(Boolean).join(' · ')}</Text>
        </View>
        {(right ?? price) && <Text style={s.price}>{right ?? price}</Text>}
      </Pressable>
    </Link>
  );
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: 16, gap: 12 },
  row: { gap: 8, paddingVertical: 2 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.line },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontFamily: fonts.bold },
  chipTextOn: { color: '#fff', fontFamily: fonts.heavy },
  input: {
    backgroundColor: colors.card, color: colors.text, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 16, borderWidth: 1, borderColor: colors.line, fontFamily: fonts.body,
  },
  button: { backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 14, alignItems: 'center', minHeight: 44 },
  buttonText: { color: colors.bg, fontFamily: fonts.heavy, fontSize: 16 },
  ghost: { borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.line },
  ghostText: { color: colors.text, fontFamily: fonts.bold },
  cardRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10,
    backgroundColor: colors.card, borderRadius: 12,
  },
  thumb: { width: 52, height: 72, borderRadius: 4, backgroundColor: colors.bg },
  name: { color: colors.text, fontFamily: fonts.bold, fontSize: 15 },
  meta: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  price: { color: colors.accent, fontFamily: fonts.heavy },
  h2: { color: colors.text, fontSize: 18, fontFamily: fonts.display },
  muted: { color: colors.muted, fontFamily: fonts.body },
});
