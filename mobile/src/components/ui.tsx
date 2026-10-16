import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { setBrowseList } from '../lib/browse';
import { GAME_LIST } from '../lib/games';
import { useStore } from '../lib/store';
import { variantLabel } from '../lib/variants';
import { cardName } from '../lib/cardNames';
import type { Change } from '../lib/priceHistory';
import { PriceChange } from './PriceChange';
import { rarityAbbr, rarityName } from '../lib/catalog/pokemonNames';
import { facetValueLabel } from '../lib/attrValues';
import type { AppLang } from '../lib/i18n';
import type { Card, GameId } from '../lib/types';
import { colors, fonts } from './theme';

export { colors, fonts } from './theme';

export function Wordmark({ size = 20 }: { size?: number }) {
  return (
    <Text style={{ fontFamily: fonts.display, fontSize: size, color: colors.text }}>
      TCG<Text style={{ color: colors.accent }}>Market</Text>
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
  const { t } = useStore();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
      {allowAuto && <Chip label={t('lang.auto')} active={value === 'auto'} onPress={() => onChange('auto')} />}
      {GAME_LIST.map((g) => (
        <Chip key={g.id} label={g.label} active={value === g.id} onPress={() => onChange(g.id)} />
      ))}
    </ScrollView>
  );
}

/** Nom affiché selon la langue de l'app : sa langue, sinon l'anglais, sinon le nom d'origine (lib/cardNames). */
export function displayName(card: Card, appLang: AppLang): string {
  return cardName(card, appLang);
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
export function CardRow({ card, right, list, change }: { card: Card; right?: string; list?: Card[]; change?: Change | null }) {
  const { appLang } = useStore();
  const price = useBestPrice()(card);
  const name = displayName(card, appLang);
  return (
    <Link href={{ pathname: '/card/[game]/[id]', params: { game: card.game, id: card.id, lang: card.lang, ...(card.variant && (card.variants?.length ?? 0) > 1 ? { variant: card.variant } : {}) } }} asChild>
      <Pressable style={s.cardRow} onPressIn={() => setBrowseList(list ?? [card])}>
        <Image source={card.imageSmall} style={s.thumb} contentFit="contain" />
        <View style={{ flex: 1 }}>
          <Text style={s.name} numberOfLines={2}>{name}</Text>
          {name !== card.name && <Text style={s.meta} numberOfLines={1}>{card.name}</Text>}
          <Text style={s.meta}>{[card.number, card.setName, card.game === 'pokemon' && card.rarity ? rarityName(rarityAbbr(card.rarity), appLang) ?? card.rarity : card.rarity ? facetValueLabel(card.game, 'rarity', card.rarity, appLang) : card.rarity].filter(Boolean).join(' · ')}</Text>
          {!!card.variant && (card.variants?.length ?? 0) > 1 && <Text style={[s.meta, { color: colors.accent }]}>{variantLabel(card.variant, appLang)}</Text>}
        </View>
        {(right ?? price ?? change) && (
          <View style={{ alignItems: 'flex-end', gap: 3, maxWidth: '42%' }}>
            {(right ?? price) && <Text style={s.price}>{right ?? price}</Text>}
            <PriceChange change={change} currency={card.prices[0]?.currency} size={11} />
          </View>
        )}
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
