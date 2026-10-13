import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, displayName, fonts, s } from '../../../components/ui';
import { neighbors } from '../../../lib/browse';
import { rarityAbbr } from '../../../lib/catalog/pokemonNames';
import { GAMES } from '../../../lib/games';
import type { TKey } from '../../../lib/i18n';
import { marketLinks, type MarketplaceId } from '../../../lib/prices/marketplaces';
import { useStore } from '../../../lib/store';
import type { AttributeKey, Card, CardAttribute, CardLang, GameId, Price } from '../../../lib/types';

const SOURCE_LABEL = { cardmarket: 'Cardmarket', tcgplayer: 'TCGplayer', cardtrader: 'CardTrader', ebay: 'eBay' };
const SITE_DOMAIN: Record<MarketplaceId, string> = {
  cardmarket: 'cardmarket.com', tcgplayer: 'tcgplayer.com', cardtrader: 'cardtrader.com', ebay: 'ebay.com',
};
/** Petit logo de chaque site (icône officielle du site). */
const siteLogo = (id: MarketplaceId) => `https://www.google.com/s2/favicons?domain=${SITE_DOMAIN[id]}&sz=64`;

const ICON: Record<AttributeKey, keyof typeof Ionicons.glyphMap> = {
  illustrator: 'brush-outline', release: 'calendar-outline', rarity: 'diamond-outline', dex: 'paw-outline',
  type: 'flash-outline', hp: 'heart-outline', stage: 'git-branch-outline', category: 'pricetags-outline',
  regulation: 'shield-checkmark-outline', cost: 'water-outline', life: 'heart-outline', power: 'barbell-outline',
  counter: 'shield-half-outline', attribute: 'flame-outline', feature: 'people-outline', block: 'cube-outline',
  color: 'color-palette-outline', domain: 'planet-outline', energy: 'flash-outline', might: 'fitness-outline',
};

/** Couleurs des types d'énergie Pokémon (français, anglais, japonais). */
const TYPE_COLOR: [RegExp, string][] = [
  [/feu|fire|炎/i, '#E8603C'], [/eau|water|水/i, '#3D8BE0'], [/plante|grass|草/i, '#4CAF50'],
  [/électrique|electrique|lightning|雷/i, '#F5C542'], [/psy|psychic|超/i, '#A65EC9'], [/combat|fighting|闘/i, '#C0703A'],
  [/obscurité|obscurite|darkness|悪/i, '#3A4A5C'], [/métal|metal|鋼/i, '#9AA7B4'], [/dragon|竜/i, '#B8962E'],
  [/fée|fee|fairy|フェアリー/i, '#E57BB0'], [/incolore|colorless|無/i, '#D9D9D9'],
];
const typeColor = (v: string) => TYPE_COLOR.find(([re]) => re.test(v))?.[1];

function formatDate(iso: string, appLang: string) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(appLang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function AttrIcon({ a }: { a: CardAttribute }) {
  if (a.key === 'dex') {
    const n = Number(a.value.split(',')[0]);
    if (n > 0) {
      return (
        <Image
          source={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${n}.png`}
          style={{ width: 40, height: 40 }}
          contentFit="contain"
        />
      );
    }
  }
  if (a.key === 'regulation') {
    return (
      <View style={st.regBox}>
        <Text style={st.regText}>{a.value}</Text>
      </View>
    );
  }
  const tint = a.key === 'type' ? typeColor(a.value) : undefined;
  if (tint) return <View style={[st.typeDot, { backgroundColor: tint }]} />;
  return <Ionicons name={ICON[a.key]} size={24} color={colors.text} />;
}

function AttributeRow({ a, game, appLang, label }: { a: CardAttribute; game: GameId; appLang: string; label: string }) {
  let value = a.value;
  if (a.key === 'release') value = formatDate(a.value, appLang);
  if (a.key === 'rarity' && game === 'pokemon') {
    const abbr = rarityAbbr(a.value);
    value = abbr !== a.value ? `${abbr} · ${a.value}` : a.value;
  }
  return (
    <View style={st.attr}>
      <View style={st.attrIcon}><AttrIcon a={a} /></View>
      <View style={{ flex: 1 }}>
        <Text style={st.attrLabel}>{label}</Text>
        <Text style={st.attrValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function CardScreen() {
  const { game, id, lang } = useLocalSearchParams<{ game: GameId; id: string; lang: CardLang }>();
  const { add, remove, collection, settings, t, langLabel, money } = useStore();
  const [card, setCard] = useState<Card | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nav = neighbors({ game, id, lang });
  const go = (c?: Card) => {
    if (c) router.replace({ pathname: '/card/[game]/[id]', params: { game: c.game, id: c.id, lang: c.lang } });
  };

  useEffect(() => {
    let alive = true;
    setCard(null);
    setError(null);
    GAMES[game].getCard(id, lang).then((c) => alive && setCard(c), (e) => alive && setError(String(e)));
    return () => { alive = false; };
  }, [game, id, lang]);

  // Flèches du clavier (ordinateur) pour passer d'une carte à l'autre.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(nav.prev);
      if (e.key === 'ArrowRight') go(nav.next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (error) return <View style={[s.screen, s.pad]}><Text style={{ color: colors.danger }}>{error}</Text></View>;
  if (!card) return <View style={[s.screen, s.pad]}><ActivityIndicator color={colors.accent} /></View>;

  const owned = collection.find((e) => e.card.game === card.game && e.card.id === card.id && e.card.lang === card.lang)?.quantity ?? 0;
  const priceLabel = (p: Price) => {
    const k = `price.${p.label}` as TKey;
    const tr = t(k);
    return tr === k ? p.label : tr;
  };
  const [main, ...others] = card.prices;
  const hasCmSales = card.prices.some((p) => p.label.startsWith('cm.avg'));

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { maxWidth: 700, width: '100%', alignSelf: 'center' }]}>
      <Stack.Screen options={{ title: displayName(card, settings.appLang) }} />
      <Image source={card.imageLarge ?? card.imageSmall} style={{ width: '100%', aspectRatio: 63 / 88, borderRadius: 12 }} contentFit="contain" />
      {nav.total > 1 && (
        <View style={st.nav}>
          <Pressable style={[st.navBtn, !nav.prev && st.navOff]} disabled={!nav.prev} onPress={() => go(nav.prev)} accessibilityLabel={t('card.prev')}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={st.navCount}>{nav.index + 1} / {nav.total}</Text>
          <Pressable style={[st.navBtn, !nav.next && st.navOff]} disabled={!nav.next} onPress={() => go(nav.next)} accessibilityLabel={t('card.next')}>
            <Ionicons name="chevron-forward" size={22} color={colors.text} />
          </Pressable>
        </View>
      )}
      <Text style={s.h2}>{displayName(card, settings.appLang)}</Text>
      {displayName(card, settings.appLang) !== card.name && <Text style={s.muted}>{card.name}</Text>}
      <Text style={s.muted}>
        {[GAMES[card.game].label, card.setName, card.number, langLabel(card.lang)].filter(Boolean).join(' · ')}
      </Text>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable style={[s.button, { flex: 1 }]} onPress={() => add(card)}>
          <Text style={s.buttonText}>＋ {t('card.add')}{owned ? ` (${owned})` : ''}</Text>
        </Pressable>
        {owned > 0 && (
          <Pressable style={[s.ghost, { paddingHorizontal: 18 }]} onPress={() => remove(card)}>
            <Text style={s.ghostText}>−</Text>
          </Pressable>
        )}
      </View>

      <Text style={s.h2}>{t('card.prices')}</Text>
      {!main && <Text style={s.muted}>{t('card.noPrice')}</Text>}
      {main && (
        <View style={st.mainPrice}>
          <Text style={st.attrLabel}>{SOURCE_LABEL[main.source]} · {priceLabel(main)}</Text>
          <Text style={st.mainValue}>{money(main.value, main.currency)}</Text>
        </View>
      )}
      {others.map((p, i) => (
        <View key={i} style={st.priceRow}>
          <Text style={[s.name, { flex: 1 }]}>{SOURCE_LABEL[p.source]} · {priceLabel(p)}</Text>
          <Text style={s.price}>{money(p.value, p.currency)}</Text>
        </View>
      ))}
      {hasCmSales && <Text style={[s.muted, { fontSize: 12 }]}>{t('card.salesNote')}</Text>}

      {!!card.attributes?.length && (
        <>
          <Text style={s.h2}>{t('card.attributes')}</Text>
          {card.attributes.map((a) => (
            <AttributeRow key={a.key} a={a} game={card.game} appLang={settings.appLang} label={t(`attr.${a.key}` as TKey)} />
          ))}
        </>
      )}

      <Text style={s.h2}>{t('card.seeOn')}</Text>
      {marketLinks(card, settings.appLang).map((l) => (
        <Pressable key={l.id} style={st.link} onPress={() => Linking.openURL(l.url)}>
          <Image source={siteLogo(l.id)} style={st.linkLogo} contentFit="contain" />
          <Text style={[s.ghostText, { flex: 1 }]}>{l.label}</Text>
          <Ionicons name="open-outline" size={18} color={colors.muted} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  attr: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card,
    borderRadius: 16, borderWidth: 1, borderColor: colors.line, paddingVertical: 12, paddingHorizontal: 14,
  },
  attrIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  attrLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 13 },
  attrValue: { color: colors.text, fontFamily: fonts.heavy, fontSize: 18, marginTop: 2 },
  regBox: { width: 30, height: 30, borderRadius: 6, borderWidth: 2, borderColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  regText: { color: colors.text, fontFamily: fonts.heavy, fontSize: 16 },
  typeDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: 'rgba(255,255,255,0.25)' },
  mainPrice: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.accent, padding: 16, gap: 4 },
  mainValue: { color: colors.accent, fontFamily: fonts.heavy, fontSize: 30 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  link: {
    flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.line,
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14,
  },
  linkLogo: { width: 20, height: 20, borderRadius: 4 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: {
    width: 52, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line,
  },
  navOff: { opacity: 0.3 },
  navCount: { color: colors.muted, fontFamily: fonts.bold },
});
