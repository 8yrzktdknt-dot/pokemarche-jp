import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { setBrowseList } from '../../../lib/browse';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SetOverview } from '../../../components/SetOverview';
import { Sheet, SheetLabel, SheetOption } from '../../../components/Sheet';
import { colors, displayName, fonts, s } from '../../../components/ui';
import { localName } from '../../../lib/catalog/static';
import { setStats } from '../../../lib/setStats';
import { GAMES } from '../../../lib/games';
import { DEFAULT_SET_VIEW, setView, type SetSort, type SetState, type SetViewOptions } from '../../../lib/setView';
import { useStore } from '../../../lib/store';
import type { TKey } from '../../../lib/i18n';
import type { Card, CardLang, GameId, SetInfo } from '../../../lib/types';
import { collectionKey, variantLabel } from '../../../lib/variants';

/** Affichage choisi (empiler, tri, état), gardé d'une extension à l'autre pendant la session. */
let lastView: SetViewOptions = DEFAULT_SET_VIEW;

const SORTS: { key: SetSort; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'number', icon: 'list-outline' }, { key: 'name', icon: 'text-outline' }, { key: 'illustrator', icon: 'brush-outline' },
  { key: 'price', icon: 'pricetag-outline' }, { key: 'quantity', icon: 'albums-outline' },
];
const STATES: { key: SetState; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', icon: 'checkmark-circle-outline' }, { key: 'owned', icon: 'checkmark-circle' }, { key: 'missing', icon: 'ellipse-outline' },
];

export default function SetScreen() {
  const { game, id, lang } = useLocalSearchParams<{ game: GameId; id: string; lang: CardLang }>();
  const { collection, t, toCurrency, appLang, money } = useStore();
  const [view, setViewState] = useState<SetViewOptions>({ ...lastView, query: '' });
  const [sheet, setSheet] = useState<'view' | 'sort' | 'state' | null>(null);
  const update = (o: Partial<SetViewOptions>) => setViewState((v) => {
    const next = { ...v, ...o };
    lastView = { ...next, query: '' };
    return next;
  });
  const [set, setSet] = useState<SetInfo | null>(null);
  const [cards, setCards] = useState<Card[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const cols = Math.max(3, Math.floor(Math.min(width, 900) / 140));
  const w = (Math.min(width, 900) - 32 - (cols - 1) * 8) / cols;

  useEffect(() => {
    GAMES[game].setCards(id, lang).then(
      (r) => { setSet(r.set); setCards(r.cards); },
      (e) => setError(String(e)),
    );
  }, [game, id, lang]);

  // Même carte, même langue : une carte japonaise ne compte pas pour l'extension chinoise de même code.
  const owned = useMemo(
    () => new Set(collection.filter((e) => e.card.game === game && e.card.lang === lang).map((e) => e.card.id)),
    [collection, game, lang],
  );
  const ownedCount = cards?.filter((c) => owned.has(c.id)).length ?? 0;
  const stats = useMemo(() => (cards ? setStats(cards, (c) => owned.has(c.id), toCurrency) : null), [cards, owned, toCurrency]);
  // Exemplaires possédés par carte et par variante.
  const quantities = useMemo(() => new Map(collection.map((e) => [collectionKey(e.card), e.quantity])), [collection]);
  const tiles = useMemo(
    () => (cards ? setView(cards, view, (c) => quantities.get(collectionKey(c)) ?? 0, (c) => displayName(c, appLang)) : []),
    [cards, view, quantities, appLang],
  );
  const hasVariants = !!cards?.some((c) => (c.variants?.length ?? 0) > 1);

  if (error) return <View style={[s.screen, s.pad]}><Text style={{ color: colors.danger }}>{error}</Text></View>;
  if (!cards) return <View style={[s.screen, s.pad]}><ActivityIndicator color={colors.accent} /></View>;

  return (
    <View style={s.screen}>
      <Stack.Screen options={{ title: set ? localName(set, appLang) : id }} />
      <FlatList
        data={tiles}
        key={cols}
        numColumns={cols}
        keyExtractor={(x) => x.key}
        contentContainerStyle={{ padding: 16, gap: 8, maxWidth: 900, width: '100%', alignSelf: 'center' }}
        columnWrapperStyle={{ gap: 8 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ gap: 8, marginBottom: 8, alignItems: 'center' }}>
            {set?.logo && <Image source={set.logo} style={{ width: '70%', height: 90 }} contentFit="contain" />}
            <Text style={[s.h2, { textAlign: 'center' }]}>{set ? localName(set, appLang) : id}</Text>
            <Text style={s.muted}>{t('set.summary', { code: set?.code ?? id, n: cards.length, owned: ownedCount })}</Text>
            {stats && <View style={{ width: '100%', marginTop: 8 }}><SetOverview stats={stats} game={game} id={id} lang={lang} /></View>}
            <View style={st.search}>
              <Ionicons name="search" size={20} color={colors.muted} />
              <TextInput
                style={st.searchInput} value={view.query} onChangeText={(query) => update({ query })}
                placeholder={t('set.search')} placeholderTextColor={colors.muted} autoCorrect={false} returnKeyType="search"
              />
              {!!view.query && (
                <Pressable onPress={() => update({ query: '' })} accessibilityLabel={t('common.close')}>
                  <Ionicons name="close-circle" size={20} color={colors.muted} />
                </Pressable>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ alignSelf: 'stretch' }} contentContainerStyle={{ gap: 8 }}>
              {hasVariants && (
                <Chip icon={view.split ? 'grid-outline' : 'copy-outline'} label={t(view.split ? 'set.split' : 'set.stack')} onPress={() => setSheet('view')} />
              )}
              <Chip icon={view.desc ? 'arrow-down' : 'arrow-up'} label={`${t('set.sort')} · ${t(`set.sort.${view.sort}` as TKey)}`} onPress={() => setSheet('sort')} />
              <Chip
                icon={STATES.find((x) => x.key === view.state)!.icon} label={view.state === 'all' ? t('set.state') : t(`set.state.${view.state}` as TKey)}
                on={view.state !== 'all'} onPress={() => setSheet('state')}
              />
            </ScrollView>
          </View>
        }
        ListEmptyComponent={<Text style={[s.muted, { textAlign: 'center', marginTop: 24 }]}>{t('set.empty')}</Text>}
        renderItem={({ item: { card: item, quantity } }) => (
          <Link href={{ pathname: '/card/[game]/[id]', params: { game: item.game, id: item.id, lang: item.lang, ...(view.split && item.variant ? { variant: item.variant } : {}) } }} asChild>
            <Pressable style={{ width: w }} accessibilityLabel={`${item.name} ${item.number}`} onPressIn={() => setBrowseList(cards)}>
              <View>
                <Image source={item.imageSmall} style={[st.img, { width: w, height: w * 88 / 63 }]} contentFit="cover" transition={150} />
                {quantity > 0 && <View style={st.badge}><Text style={st.badgeText}>{quantity > 1 ? `×${quantity}` : '✓'}</Text></View>}
                {view.split && item.variant && (
                  <View style={st.pill}><Text style={st.pillText} numberOfLines={1}>{variantLabel(item.variant, appLang)}</Text></View>
                )}
              </View>
              <Text style={st.num} numberOfLines={1}>{item.number}</Text>
              <Text style={st.name} numberOfLines={1}>{displayName(item, appLang)}</Text>
              {view.sort === 'price' && !!item.prices[0] && <Text style={st.price}>{money(item.prices[0].value, item.prices[0].currency)}</Text>}
            </Pressable>
          </Link>
        )}
      />
      <Sheet title={t('set.view')} open={sheet === 'view'} onClose={() => setSheet(null)}>
        <SheetOption icon="copy-outline" label={t('set.stack')} detail={t('set.stackHint')} on={!view.split} onPress={() => { update({ split: false }); setSheet(null); }} />
        <SheetOption icon="grid-outline" label={t('set.split')} detail={t('set.splitHint')} on={view.split} onPress={() => { update({ split: true }); setSheet(null); }} />
      </Sheet>
      <Sheet title={t('set.sort')} open={sheet === 'sort'} onClose={() => setSheet(null)}>
        <SheetLabel>{t('set.order')}</SheetLabel>
        <View style={st.segment}>
          {([false, true] as const).map((desc) => (
            <Pressable key={String(desc)} style={[st.segBtn, view.desc === desc && st.segOn]} onPress={() => update({ desc })} accessibilityState={{ selected: view.desc === desc }}>
              <Ionicons name={desc ? 'arrow-down' : 'arrow-up'} size={18} color={view.desc === desc ? colors.bg : colors.text} />
              <Text style={[st.segText, view.desc === desc && { color: colors.bg }]}>{t(desc ? 'set.desc' : 'set.asc')}</Text>
            </Pressable>
          ))}
        </View>
        <SheetLabel>{t('set.by')}</SheetLabel>
        {SORTS.map((x) => (
          <SheetOption key={x.key} icon={x.icon} label={t(`set.sort.${x.key}` as TKey)} on={view.sort === x.key} onPress={() => { update({ sort: x.key }); setSheet(null); }} />
        ))}
      </Sheet>
      <Sheet title={t('set.state')} open={sheet === 'state'} onClose={() => setSheet(null)}>
        {STATES.map((x) => (
          <SheetOption key={x.key} icon={x.icon} label={t(`set.state.${x.key}` as TKey)} on={view.state === x.key} onPress={() => { update({ state: x.key }); setSheet(null); }} />
        ))}
      </Sheet>
    </View>
  );
}

/** Bouton de la barre de filtres (ouvre sa feuille de choix). */
function Chip({ icon, label, on, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; on?: boolean; onPress(): void }) {
  return (
    <Pressable style={[st.chip, on && st.chipOn]} onPress={onPress} accessibilityRole="button">
      <Ionicons name={icon} size={18} color={on ? colors.accent : colors.text} />
      <Text style={st.chipText}>{label}</Text>
      <Ionicons name="chevron-down" size={16} color={colors.muted} />
    </Pressable>
  );
}

const st = StyleSheet.create({
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch', backgroundColor: colors.card,
    borderRadius: 14, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, marginTop: 8,
  },
  searchInput: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 16, paddingVertical: 12, outlineWidth: 0 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card, borderRadius: 999,
    borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 10,
  },
  chipOn: { borderColor: colors.accent },
  chipText: { color: colors.text, fontFamily: fonts.bold, fontSize: 14 },
  segment: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 14, padding: 4, gap: 4 },
  segBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10 },
  segOn: { backgroundColor: colors.accent },
  segText: { color: colors.text, fontFamily: fonts.bold, fontSize: 15 },
  pill: {
    position: 'absolute', left: 4, right: 4, bottom: 4, backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 999, paddingVertical: 3, paddingHorizontal: 6, alignItems: 'center',
  },
  pillText: { color: '#fff', fontFamily: fonts.bold, fontSize: 10 },
  price: { color: colors.accent, fontFamily: fonts.bold, fontSize: 11 },
  img: { borderRadius: 6, backgroundColor: colors.card },
  num: { color: colors.muted, fontFamily: fonts.bold, fontSize: 11, marginTop: 4 },
  name: { color: colors.text, fontFamily: fonts.bold, fontSize: 12 },
  badge: {
    position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.good, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: colors.bg, fontFamily: fonts.heavy, fontSize: 12 },
});
