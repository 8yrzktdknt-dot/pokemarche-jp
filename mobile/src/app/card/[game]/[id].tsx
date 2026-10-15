import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { colors, displayName, fonts, s } from '../../../components/ui';
import { ReverseSheen } from '../../../components/ReverseSheen';
import { ImageViewer } from '../../../components/ImageViewer';
import { VariantPicker } from '../../../components/VariantPicker';
import { browseCard, neighbors } from '../../../lib/browse';
import { rarityAbbr, rarityName } from '../../../lib/catalog/pokemonNames';
import { localizeAttr, opFeature, opRarity, typeConcept } from '../../../lib/attrValues';
import { assetUrl } from '../../../lib/catalog/static';
import { GAMES } from '../../../lib/games';
import type { TKey } from '../../../lib/i18n';
import { marketLinks, type MarketplaceId } from '../../../lib/prices/marketplaces';
import { PriceChange } from '../../../components/PriceChange';
import { PriceChart } from '../../../components/PriceChart';
import { addDays, dayChange } from '../../../lib/priceHistory';
import { usePriceHistory } from '../../../lib/usePriceHistory';
import { baseVariant } from '../../../lib/setView';
import { useStore } from '../../../lib/store';
import { collectionKey, needsSheen, withVariant } from '../../../lib/variants';
import type { AttributeKey, Card, CardAttribute, CardLang, GameId, Price } from '../../../lib/types';

/** Côté d'où arrive la prochaine fiche après un glissement (1 : depuis la droite, -1 : depuis la gauche, 0 : sans effet). */
let enterFrom: 0 | 1 | -1 = 0;

const SOURCE_LABEL = { cardmarket: 'Cardmarket', tcgplayer: 'TCGplayer', cardtrader: 'CardTrader', ebay: 'eBay' };
/** Petit logo de chaque site (icône officielle, hébergée avec le catalogue). */
const siteLogo = (id: MarketplaceId) => assetUrl(`sites/${id}.png`);

const ICON: Record<AttributeKey, keyof typeof Ionicons.glyphMap> = {
  illustrator: 'brush-outline', release: 'calendar-outline', rarity: 'diamond-outline', dex: 'paw-outline',
  type: 'flash-outline', hp: 'heart-outline', stage: 'git-branch-outline', category: 'pricetags-outline',
  regulation: 'shield-checkmark-outline', cost: 'water-outline', life: 'heart-outline', power: 'barbell-outline',
  counter: 'shield-half-outline', attribute: 'flame-outline', feature: 'people-outline', block: 'cube-outline',
  color: 'color-palette-outline', domain: 'planet-outline', energy: 'flash-outline', might: 'fitness-outline',
};

/** Couleurs des types d'énergie Pokémon (français, anglais, japonais). */
const TYPE_COLOR: Record<string, string> = {
  fire: '#E8603C', water: '#3D8BE0', grass: '#4CAF50', lightning: '#F5C542', psychic: '#A65EC9', fighting: '#C0703A',
  darkness: '#3A4A5C', metal: '#9AA7B4', dragon: '#B8962E', fairy: '#E57BB0', colorless: '#D9D9D9',
};
const typeColor = (v: string) => TYPE_COLOR[typeConcept(v) ?? ''];

/** Date de sortie dans la langue de l'app (`locale` : « fr-FR », « ja-JP »…). */
function formatDate(iso: string, locale: string) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

function AttrIcon({ a }: { a: CardAttribute }) {
  if (a.key === 'dex') {
    const n = Number(a.value.split(',')[0]);
    if (n > 0) {
      return (
        <Image
          source={assetUrl(`sprites/${n}.png`)}
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

function AttributeRow({ a, game, appLang, locale, label }: { a: CardAttribute; game: GameId; appLang: string; locale: string; label: string }) {
  let value = a.value;
  if (a.key === 'release') value = formatDate(a.value, locale);
  if (a.key === 'rarity' && game === 'pokemon') {
    const abbr = rarityAbbr(a.value);
    // Nom de la rareté dans la langue de l'app quand il est connu, sinon celui de la source.
    const name = rarityName(abbr, appLang) ?? a.value;
    value = abbr !== name ? `${abbr} · ${name}` : name;
  }
  if (a.key === 'rarity' && game === 'onepiece') value = opRarity(a.value, appLang);
  if (game === 'onepiece' && a.key === 'feature') value = opFeature(a.value, appLang);
  if (game === 'pokemon' || (game === 'onepiece' && a.key !== 'rarity')) value = localizeAttr(a.key, value, appLang);
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
  const { game, id, lang, variant } = useLocalSearchParams<{ game: GameId; id: string; lang: CardLang; variant?: string }>();
  const { add, remove, collection, settings, t, langLabel, money, appLang, locale } = useStore();
  const [card, setCard] = useState<Card | null>(null);
  // Variante affichée (prix, fiche Cardmarket, ajout à la collection) ; remise à zéro à chaque carte.
  const [variantKey, setVariantKey] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  const nav = neighbors({ game, id, lang, variant });
  const go = (c?: Card, from: 1 | -1 = 1) => {
    if (!c) return;
    // La carte suivante arrive en glissant du côté opposé au geste (voir l'effet d'entrée plus bas).
    enterFrom = from;
    // Variantes séparées : chaque variante est une étape du parcours (la fiche s'ouvre sur elle).
    router.replace({ pathname: '/card/[game]/[id]', params: { game: c.game, id: c.id, lang: c.lang, ...(c.variant ? { variant: c.variant } : {}) } });
  };

  // Glisser le doigt vers la gauche / la droite : carte suivante / précédente.
  const { width, height } = useWindowDimensions();
  // Visuel limité à ~45 % de la hauteur d'écran : le bouton « Ajouter » reste visible sans faire défiler.
  const imgH = Math.min(((Math.min(width, 700) - 32) * 88) / 63, height * 0.45);
  const shift = useRef(new Animated.Value(0)).current;
  // Glisser vers le bas (fiche tout en haut) : on quitte la fiche.
  const drop = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(0);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const navRef = useRef(nav);
  navRef.current = nav;
  const native = Platform.OS !== 'web';
  // Entrée de la carte : glisse depuis le côté d'où vient le geste (carte suivante : depuis la droite).
  useEffect(() => {
    if (!enterFrom) return;
    shift.setValue(enterFrom * Math.min(width, 700) * 0.5);
    enterFrom = 0;
    Animated.spring(shift, { toValue: 0, speed: 28, bounciness: 0, useNativeDriver: native }).start();
  }, [id]);
  const swipe = useRef(
    PanResponder.create({
      // Seuils bas : le geste est pris dès qu'il est nettement horizontal (ou vers le bas, fiche tout en haut).
      onMoveShouldSetPanResponderCapture: (_, g) =>
        (Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5) ||
        (scrollY.current <= 0 && g.dy > 10 && g.dy > Math.abs(g.dx) * 1.5),
      onPanResponderMove: (_, g) => {
        if (Math.abs(g.dy) > Math.abs(g.dx)) {
          drop.setValue(Math.max(0, g.dy));
          return;
        }
        const { prev, next } = navRef.current;
        // Résistance quand il n'y a pas de carte de ce côté.
        shift.setValue((g.dx > 0 && !prev) || (g.dx < 0 && !next) ? g.dx / 4 : g.dx);
      },
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dy) > Math.abs(g.dx)) {
          if (g.dy > 90 || g.vy > 0.5) {
            // Vitesse du doigt conservée : la fiche part d'autant plus vite que le geste était rapide.
            const rest = Math.max(0, height - g.dy);
            Animated.timing(drop, { toValue: height, duration: Math.max(90, Math.min(220, rest / Math.max(g.vy, 1.5))), useNativeDriver: native }).start(close);
          } else {
            Animated.spring(drop, { toValue: 0, speed: 24, bounciness: 4, useNativeDriver: native }).start();
          }
          return;
        }
        const { prev, next } = navRef.current;
        const target = g.dx < -60 || g.vx < -0.35 ? next : g.dx > 60 || g.vx > 0.35 ? prev : undefined;
        if (!target) {
          Animated.spring(shift, { toValue: 0, speed: 24, bounciness: 4, useNativeDriver: native }).start();
          return;
        }
        const out = target === next ? -width : width;
        const rest = Math.abs(out - g.dx);
        Animated.timing(shift, { toValue: out, duration: Math.max(80, Math.min(160, rest / Math.max(Math.abs(g.vx), 2))), useNativeDriver: native }).start(() => {
          go(target, target === next ? 1 : -1);
        });
      },
      onPanResponderTerminate: () => {
        Animated.spring(shift, { toValue: 0, useNativeDriver: native }).start();
        Animated.spring(drop, { toValue: 0, useNativeDriver: native }).start();
      },
    }),
  ).current;

  useEffect(() => {
    let alive = true;
    // Affichage immédiat avec les infos de la liste, puis la fiche complète (prix, attributs).
    setCard(browseCard({ game, id, lang, variant }) ?? null);
    setVariantKey(variant);
    setError(null);
    // Fiche complète : le visuel déjà affiché est gardé (pas de second chargement d'image en plein geste).
    GAMES[game].getCard(id, lang).then(
      (c) => alive && setCard((prev) => (prev && c
        ? { ...c, imageSmall: prev.baseImage?.small ?? prev.imageSmall ?? c.imageSmall, imageLarge: prev.baseImage?.large ?? prev.imageLarge ?? c.imageLarge }
        : c)),
      (e) => alive && setError(String(e)),
    );
    return () => { alive = false; };
  }, [game, id, lang, variant]);

  // Flèches du clavier (ordinateur) pour passer d'une carte à l'autre.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(nav.prev, -1);
      if (e.key === 'ArrowRight') go(nav.next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Historique des prix de la carte (toutes ses variantes : même fichier d'extension).
  const histCards = useMemo(() => (card ? [card] : []), [card]);
  const points = usePriceHistory(histCards);
  const [range, setRange] = useState<number>(0);
  const [zoom, setZoom] = useState(false);

  if (error) return <View style={[s.screen, s.pad]}><Text style={{ color: colors.danger }}>{error}</Text></View>;
  if (!card) return <View style={[s.screen, s.pad]}><ActivityIndicator color={colors.accent} /></View>;
  // Images des cartes voisines préchargées : le passage d'une carte à l'autre est instantané.
  for (const c of [nav.prev, nav.next]) {
    const v = c ? withVariant(c, c.variant) : undefined;
    for (const u of [v?.imageLarge, v?.imageSmall]) if (u) Image.prefetch(u).catch(() => {});
  }

  // La carte dans la variante choisie : prix (moyenne Cardmarket 7 jours) et fiche Cardmarket de la variante.
  const view = withVariant(card, variantKey);
  const ownedOf = (key?: string) => collection.find((e) => collectionKey(e.card) === collectionKey(withVariant(card, key)))?.quantity ?? 0;
  const owned = ownedOf(view.variant);
  const priceLabel = (p: Price) => {
    const k = `price.${p.label}` as TKey;
    const tr = t(k);
    return tr === k ? p.label : tr;
  };
  const [main, ...others] = view.prices;
  const allPoints = points(view);
  const change = dayChange(allPoints);
  const lastDay = allPoints[allPoints.length - 1]?.d;
  const shortDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  const since = change && lastDay && addDays(change.since, 1) === lastDay ? t('price.sinceYesterday') : change ? t('dash.periodSince', { d: shortDate(change.since) }) : '';
  // Périodes proposées quand l'historique est assez long (30 jours, 3 mois, 1 an, tout).
  const spanDays = allPoints.length > 1 ? (Date.parse(lastDay!) - Date.parse(allPoints[0].d)) / 86400000 : 0;
  const ranges = [30, 90, 365].filter((n) => spanDays > n);
  const shown = range && lastDay ? allPoints.filter((p) => p.d >= addDays(lastDay, -range)) : allPoints;
  const hasCmSales = view.prices.some((p) => p.label.startsWith('cm.avg'));

  return (
    <Animated.View style={[s.screen, SWIPE_STYLE, { transform: [{ translateX: shift }, { translateY: drop }], opacity: drop.interpolate({ inputRange: [0, 400], outputRange: [1, 0.4], extrapolate: 'clamp' }) }]} {...swipe.panHandlers}>
    <ScrollView
      style={s.screen}
      onScroll={(e) => { scrollY.current = e.nativeEvent.contentOffset.y; }}
      scrollEventThrottle={16}
      contentContainerStyle={[s.pad, { maxWidth: 700, width: '100%', alignSelf: 'center' }]}>
      <Stack.Screen options={{ title: displayName(card, appLang) }} />
      {/* Visuel de la variante choisie (photo à part pour Poké Ball, Master Ball…, reflet pour le reverse). */}
      {/* Un appui sur le visuel l'affiche en grand. */}
      <Pressable onPress={() => setZoom(true)} style={{ width: (imgH * 63) / 88, height: imgH, alignSelf: 'center' }} accessibilityRole="imagebutton" accessibilityLabel={t('card.zoom')}>
        {/* Petite image (déjà en mémoire depuis la liste) affichée tout de suite, en attendant la grande. */}
        <Image
          source={view.imageLarge ?? view.imageSmall}
          placeholder={view.imageSmall && view.imageSmall !== view.imageLarge ? { uri: view.imageSmall } : undefined} placeholderContentFit="contain"
          style={{ width: '100%', height: '100%', borderRadius: 12 }} contentFit="contain" transition={0} cachePolicy="memory-disk"
        />
        {needsSheen(view) && <ReverseSheen radius={12} />}
      </Pressable>
      <ImageViewer open={zoom} onClose={() => setZoom(false)} uri={view.imageLarge ?? view.imageSmall} placeholder={view.imageSmall} sheen={needsSheen(view)} />
      {nav.total > 1 && (
        <View style={st.nav}>
          <Pressable style={[st.navBtn, !nav.prev && st.navOff]} disabled={!nav.prev} onPress={() => go(nav.prev, -1)} accessibilityLabel={t('card.prev')}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={st.navCount}>{nav.index + 1} / {nav.total}</Text>
          <Pressable style={[st.navBtn, !nav.next && st.navOff]} disabled={!nav.next} onPress={() => go(nav.next)} accessibilityLabel={t('card.next')}>
            <Ionicons name="chevron-forward" size={22} color={colors.text} />
          </Pressable>
        </View>
      )}
      <Text style={s.h2}>{displayName(card, appLang)}</Text>
      {displayName(card, appLang) !== card.name && <Text style={s.muted}>{card.name}</Text>}
      <Text style={s.muted}>
        {[GAMES[card.game].label, card.setName, card.number, langLabel(card.lang)].filter(Boolean).join(' · ')}
      </Text>

      {/* Toujours une section Variante : celle de la carte (déduite de la rareté) quand la source n'en liste pas. */}
      {card.variants?.length ? (
        <VariantPicker variants={card.variants} value={view.variant} onChange={setVariantKey} owned={ownedOf} />
      ) : (
        <VariantPicker variants={[{ key: baseVariant(card.rarity) }]} onChange={() => {}} owned={() => owned} />
      )}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable style={[s.button, { flex: 1 }]} onPress={() => add(view)}>
          <Text style={s.buttonText}>＋ {t('card.add')}{owned ? ` (${owned})` : ''}</Text>
        </Pressable>
        {owned > 0 && (
          <Pressable style={[s.ghost, { paddingHorizontal: 18 }]} onPress={() => remove(view)}>
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
          <PriceChange change={change} currency={main.currency} size={14} suffix={since} />
        </View>
      )}
      {others.map((p, i) => (
        <View key={i} style={st.priceRow}>
          <Text style={[s.name, { flex: 1 }]}>{SOURCE_LABEL[p.source]} · {priceLabel(p)}</Text>
          <Text style={s.price}>{money(p.value, p.currency)}</Text>
        </View>
      ))}
      {hasCmSales && <Text style={[s.muted, { fontSize: 12 }]}>{t('card.salesNote')}</Text>}

      {!!main && (
        <>
          <Text style={s.h2}>{t('card.history')}</Text>
          <View style={st.chartBox}>
            {ranges.length > 0 && (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[...ranges, 0].map((n) => (
                  <Pressable key={n} onPress={() => setRange(n)} style={[st.rangeBtn, range === n && st.rangeOn]} accessibilityState={{ selected: range === n }}>
                    <Text style={[st.rangeText, range === n && { color: colors.bg }]}>{n ? t(`card.range.${n}` as TKey) : t('common.all')}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            {shown.length > 1 ? (
              <PriceChart points={shown} format={(v) => money(v, main.currency)} locale={locale} />
            ) : (
              <Text style={s.muted}>{t('card.historyEmpty')}</Text>
            )}
            {allPoints.length > 0 && <Text style={[s.muted, { fontSize: 12 }]}>{t('card.historyNote', { d: shortDate(allPoints[0].d) })}</Text>}
          </View>
        </>
      )}

      <Text style={s.h2}>{t('card.seeOn')}</Text>
      {marketLinks(view, appLang).map((l) => (
        <Pressable key={l.id} style={st.link} onPress={() => Linking.openURL(l.url)}>
          <Image source={siteLogo(l.id)} style={st.linkLogo} contentFit="contain" />
          <Text style={[s.ghostText, { flex: 1 }]}>{l.label}</Text>
          <Ionicons name="open-outline" size={18} color={colors.muted} />
        </Pressable>
      ))}

      {!!card.attributes?.length && (
        <>
          <Text style={s.h2}>{t('card.attributes')}</Text>
          {card.attributes.map((a) => (
            <AttributeRow key={a.key} a={a} game={card.game} appLang={appLang} locale={locale} label={t(`attr.${a.key}` as TKey)} />
          ))}
        </>
      )}
      <Pressable
        style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 14 }}
        onPress={() => router.push({ pathname: '/report', params: { game: card.game, id: card.id, lang: card.lang, name: card.name, number: card.number, set: card.setName ?? card.setId ?? '' } })}
        accessibilityRole="link"
      >
        <Ionicons name="flag-outline" size={14} color={colors.muted} />
        <Text style={[s.muted, { fontSize: 13, textDecorationLine: 'underline' }]}>{t('report.link')}</Text>
      </Pressable>
    </ScrollView>
    </Animated.View>
  );
}

/** Sur le web, le navigateur garde le défilement vertical et laisse les glissements horizontaux à l'app. */
const SWIPE_STYLE = (Platform.OS === 'web' ? { touchAction: 'pan-y' } : {}) as ViewStyle;

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
  chartBox: { backgroundColor: colors.card, borderRadius: 16, padding: 14, gap: 10 },
  rangeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.line },
  rangeOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  rangeText: { color: colors.text, fontFamily: fonts.bold, fontSize: 12 },
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
