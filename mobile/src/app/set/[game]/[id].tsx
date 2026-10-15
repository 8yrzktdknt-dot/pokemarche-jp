import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { setBrowseList } from '../../../lib/browse';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { ReverseSheen } from '../../../components/ReverseSheen';
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
import { collectionKey, needsSheen, variantLabel, variantOwnership } from '../../../lib/variants';
import { PriceChange } from '../../../components/PriceChange';
import { dayChange } from '../../../lib/priceHistory';
import { usePriceHistory } from '../../../lib/usePriceHistory';
import { Menu, MenuButton } from '../../../components/Menu';
import { catalogBase } from '../../../lib/catalog/static';
import { favoriteKey, missingMaster, setCsv } from '../../../lib/setActions';
import { askConfirm, saveTextFile, shareLink } from '../../../lib/share';

const NONE: Card[] = [];

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
  const { collection, t, toCurrency, appLang, money, settings, setSettings, addMany, removeMany } = useStore();
  // Menu « ⋮ » (favori, partage, export, Master Set, sélection) et sélection de cartes.
  const [menu, setMenu] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const say = (m: string) => {
    setNotice(m);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 2600);
  };
  const [view, setViewState] = useState<SetViewOptions>({ ...lastView, query: '' });
  const [sheet, setSheet] = useState<'sort' | 'state' | null>(null);
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
  const variantOwned = useMemo(() => variantOwnership(collection), [collection]);
  const stats = useMemo(() => (cards ? setStats(cards, (c) => owned.has(c.id), toCurrency, variantOwned) : null), [cards, owned, toCurrency, variantOwned]);
  // Exemplaires possédés par carte et par variante.
  const quantities = useMemo(() => new Map(collection.map((e) => [collectionKey(e.card), e.quantity])), [collection]);
  const tiles = useMemo(
    () => (cards ? setView(cards, view, (c) => quantities.get(collectionKey(c)) ?? 0, (c) => displayName(c, appLang)) : []),
    [cards, view, quantities, appLang],
  );

  // Variation de chaque carte depuis la veille (historique des prix de l'extension).
  const points = usePriceHistory(cards ?? NONE);

  if (error) return <View style={[s.screen, s.pad]}><Text style={{ color: colors.danger }}>{error}</Text></View>;
  if (!cards) return <View style={[s.screen, s.pad]}><ActivityIndicator color={colors.accent} /></View>;

  const setName = set ? localName(set, appLang) : id;
  const favKey = favoriteKey(game, lang, id);
  const favorite = !!settings.favoriteSets?.includes(favKey);
  const toggleFavorite = () => {
    const list = settings.favoriteSets ?? [];
    setSettings({ favoriteSets: favorite ? list.filter((k) => k !== favKey) : [...list, favKey] });
    say(t(favorite ? 'set.fav.removed' : 'set.fav.added'));
  };
  const share = async () => {
    const url = Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.location.href
      : `${catalogBase().replace(/\/catalog$/, '')}/app/set/${game}/${encodeURIComponent(id)}?lang=${lang}`;
    const r = await shareLink(t('set.shareTitle', { name: setName }), url);
    if (r === 'copied') say(t('set.copied'));
  };
  const exportCsv = () => {
    const csv = setCsv(cards, {
      lang: appLang,
      labels: { number: t('csv.number'), name: t('csv.name'), rarity: t('csv.rarity'), variant: t('csv.variant'), quantity: t('csv.quantity'), price: t('csv.price'), currency: settings.currency },
      quantity: (c) => quantities.get(collectionKey(c)) ?? 0,
      price: (c) => (c.prices[0] ? toCurrency(c.prices[0].value, c.prices[0].currency) : undefined),
      name: (c) => displayName(c, appLang),
    });
    saveTextFile(`${game}-${lang}-${id}.csv`.replace(/[^\w.-]+/g, '_'), csv).catch(() => {});
  };
  const markMaster = async () => {
    const missing = missingMaster(cards, (k) => quantities.has(k));
    if (!missing.length) { say(t('set.masterAlready')); return; }
    if (!(await askConfirm(t('set.markMasterConfirm', { n: missing.length }), t('set.markMasterOk'), t('common.cancel')))) return;
    addMany(missing, true);
    say(t('set.added', { n: missing.length }));
  };
  const selectedCards = tiles.filter((x) => selected.has(x.key)).map((x) => x.card);
  const toggle = (key: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const stopSelecting = () => { setSelecting(false); setSelected(new Set()); };

  return (
    <View style={s.screen}>
      <Stack.Screen options={{ title: setName, headerRight: () => <MenuButton onPress={() => setMenu(true)} label={t('set.menu')} /> }} />
      <Menu
        open={menu}
        onClose={() => setMenu(false)}
        items={[
          { icon: favorite ? 'heart' : 'heart-outline', active: favorite, label: t(favorite ? 'set.fav.remove' : 'set.fav.add'), onPress: toggleFavorite },
          { icon: 'share-outline', label: t('set.share'), onPress: share },
          { icon: 'document-text-outline', label: t('set.csv'), onPress: exportCsv },
          { icon: 'star-outline', label: t('set.markMaster'), onPress: markMaster },
          { icon: 'checkmark-done-outline', label: t('set.select'), onPress: () => { setSelecting(true); setSelected(new Set()); } },
        ]}
      />
      <FlatList
        data={tiles}
        key={cols}
        numColumns={cols}
        keyExtractor={(x) => x.key}
        contentContainerStyle={{ padding: 16, gap: 8, maxWidth: 900, width: '100%', alignSelf: 'center' }}
        columnWrapperStyle={{ gap: 8 }}
        keyboardShouldPersistTaps="handled"
        extraData={[view, selecting, selected]}
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
              {/* Empiler / Séparer : un appui bascule le mode (pas de feuille de choix). */}
              <Chip
                icon={view.split ? 'grid-outline' : 'copy-outline'} label={t(view.split ? 'set.split' : 'set.stack')} on={view.split}
                toggle onPress={() => update({ split: !view.split })}
              />
              <Chip icon={view.desc ? 'arrow-down' : 'arrow-up'} label={`${t('set.sort')} · ${t(`set.sort.${view.sort}` as TKey)}`} onPress={() => setSheet('sort')} />
              <Chip
                icon={STATES.find((x) => x.key === view.state)!.icon} label={view.state === 'all' ? t('set.state') : t(`set.state.${view.state}` as TKey)}
                on={view.state !== 'all'} onPress={() => setSheet('state')}
              />
            </ScrollView>
          </View>
        }
        ListEmptyComponent={<Text style={[s.muted, { textAlign: 'center', marginTop: 24 }]}>{t('set.empty')}</Text>}
        renderItem={({ item: { card: item, quantity, variantKey, key: tileKey } }) => (
            <Pressable
              style={{ width: w }}
              accessibilityLabel={`${item.name} ${item.number}`}
              accessibilityState={selecting ? { selected: selected.has(tileKey) } : undefined}
              onPress={() => {
                if (selecting) { toggle(tileKey); return; }
                setBrowseList(tiles.map((x) => x.browse));
                router.push({ pathname: '/card/[game]/[id]', params: { game: item.game, id: item.id, lang: item.lang, ...(view.split && item.variant ? { variant: item.variant } : {}) } });
              }}
            >
              <View>
                <Image source={item.imageSmall} style={[st.img, { width: w, height: w * 88 / 63 }]} contentFit="cover" transition={150} />
                {view.split && needsSheen(item, variantKey) && <ReverseSheen />}
                {quantity > 0 && <View style={st.badge}><Text style={st.badgeText}>{quantity > 1 ? `×${quantity}` : '✓'}</Text></View>}
                {view.split && !!variantKey && (
                  <View style={st.pill}><Text style={st.pillText} numberOfLines={1}>{variantLabel(variantKey, appLang)}</Text></View>
                )}
              </View>
              <Text style={st.num} numberOfLines={1}>{item.number}</Text>
              <Text style={st.name} numberOfLines={1}>{displayName(item, appLang)}</Text>
              {!!item.prices[0] && <Text style={st.price}>{money(item.prices[0].value, item.prices[0].currency)}</Text>}
              <PriceChange change={dayChange(points(item))} currency={item.prices[0]?.currency} size={10} />
              {selecting && (
                <View style={[st.selectRing, selected.has(tileKey) && st.selectRingOn, { width: w, height: w * 88 / 63 }]} pointerEvents="none">
                  <Ionicons name={selected.has(tileKey) ? 'checkmark-circle' : 'ellipse-outline'} size={28} color={selected.has(tileKey) ? colors.accent : '#fff'} />
                </View>
              )}
            </Pressable>
        )}
      />
      {selecting && (
        <View style={st.selectBar}>
          <Text style={st.selectCount}>{t('set.selected', { n: selected.size })}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={st.barBtn} onPress={() => setSelected(selected.size === tiles.length ? new Set() : new Set(tiles.map((x) => x.key)))}>
              <Text style={st.barText}>{t(selected.size === tiles.length ? 'set.selectNone' : 'set.selectAll')}</Text>
            </Pressable>
            <Pressable style={[st.barBtn, st.barMain, !selected.size && st.barOff]} disabled={!selected.size} onPress={() => { addMany(selectedCards); say(t('set.added', { n: selectedCards.length })); stopSelecting(); }}>
              <Text style={[st.barText, { color: colors.bg }]}>＋ {t('set.addSelected')}</Text>
            </Pressable>
            <Pressable style={[st.barBtn, !selected.size && st.barOff]} disabled={!selected.size} onPress={() => { removeMany(selectedCards); say(t('set.removed', { n: selectedCards.length })); stopSelecting(); }}>
              <Text style={st.barText}>− {t('set.removeSelected')}</Text>
            </Pressable>
            <Pressable style={st.barIcon} onPress={stopSelecting} accessibilityLabel={t('common.cancel')}>
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>
      )}
      {notice && <View style={[st.notice, selecting && { bottom: 96 }]} pointerEvents="none"><Text style={st.noticeText}>{notice}</Text></View>}
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
function Chip({ icon, label, on, toggle, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; on?: boolean; toggle?: boolean; onPress(): void }) {
  return (
    <Pressable
      style={[st.chip, on && st.chipOn]} onPress={onPress} accessibilityRole={toggle ? 'switch' : 'button'}
      accessibilityState={toggle ? { checked: !!on } : undefined}>
      <Ionicons name={icon} size={18} color={on ? colors.accent : colors.text} />
      <Text style={st.chipText}>{label}</Text>
      {!toggle && <Ionicons name="chevron-down" size={16} color={colors.muted} />}
    </Pressable>
  );
}

const st = StyleSheet.create({
  selectRing: {
    position: 'absolute', top: 0, left: 0, borderRadius: 6, borderWidth: 2, borderColor: 'transparent',
    backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'flex-end', padding: 4,
  },
  selectRingOn: { borderColor: colors.accent, backgroundColor: 'rgba(245,197,66,0.12)' },
  selectBar: {
    position: 'absolute', left: 12, right: 12, bottom: 16, backgroundColor: colors.card, borderRadius: 18, borderWidth: 1,
    borderColor: colors.line, padding: 12, gap: 10, maxWidth: 876, alignSelf: 'center',
  },
  selectCount: { color: colors.text, fontFamily: fonts.heavy, fontSize: 15 },
  barBtn: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.line },
  barMain: { backgroundColor: colors.accent, borderColor: colors.accent },
  barOff: { opacity: 0.4 },
  barIcon: { width: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.line },
  barText: { color: colors.text, fontFamily: fonts.bold, fontSize: 13 },
  notice: { position: 'absolute', bottom: 24, alignSelf: 'center', backgroundColor: colors.text, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10 },
  noticeText: { color: colors.bg, fontFamily: fonts.bold, fontSize: 14 },
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
