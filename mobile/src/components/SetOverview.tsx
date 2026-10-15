import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatMoney } from '../lib/currency';
import { percent, type Progress, type SetStats } from '../lib/setStats';
import { useStore } from '../lib/store';
import type { CardLang, GameId } from '../lib/types';
import { colors, displayName, fonts } from './ui';

/**
 * Anneau de progression sans SVG : deux demi-cercles (bordures haut + droite) tournés dans deux moitiés masquées.
 * Bordures haut + droite = arc de -45° à 135° (sens horaire depuis midi) : tourné de 45° il couvre 0→180°, de 225° 180→360°.
 */
export function Ring({ value, size = 112, width = 12, color = colors.accent, children }: {
  value: number; size?: number; width?: number; color?: string; children?: React.ReactNode;
}) {
  const a = Math.max(0, Math.min(1, value)) * 360;
  const arc = (rotate: number) => ({
    position: 'absolute' as const, width: size, height: size, borderRadius: size / 2, borderWidth: width,
    borderColor: 'transparent', borderTopColor: color, borderRightColor: color, transform: [{ rotate: `${rotate}deg` }],
  });
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: width, borderColor: colors.line, opacity: 0.45 }} />
      {a > 0 && (
        <View style={{ position: 'absolute', left: size / 2, top: 0, width: size / 2, height: size, overflow: 'hidden' }}>
          <View style={[arc(225 + Math.min(a, 180)), { left: -size / 2 }]} />
        </View>
      )}
      {a > 180 && (
        <View style={{ position: 'absolute', left: 0, top: 0, width: size / 2, height: size, overflow: 'hidden' }}>
          <View style={arc(45 + (a - 180))} />
        </View>
      )}
      {children}
    </View>
  );
}

function Bar({ label, p }: { label: string; p: Progress }) {
  const { t } = useStore();
  return (
    <View style={st.barRow}>
      <Text style={st.barLabel} numberOfLines={1}>{label}</Text>
      <View style={st.track}>
        <View style={[st.fill, { width: `${p.total ? (p.owned / p.total) * 100 : 0}%` }]} />
      </View>
      <Text style={st.barValue}><Text style={{ color: colors.text }}>{p.owned}</Text>{t('setStats.of', { n: p.total })}</Text>
    </View>
  );
}

/**
 * Bandeau d'une extension, à faire glisser : 1) progression de la collection, 2) valeur de l'extension et cartes
 * les plus chères. Un appui ouvre la page de statistiques de l'extension.
 */
export function SetOverview({ stats, game, id, lang }: { stats: SetStats; game: GameId; id: string; lang: CardLang }) {
  const { t, settings, appLang, locale } = useStore();
  const [w, setW] = useState(0);
  const [page, setPage] = useState(0);
  const scroller = useRef<ScrollView>(null);
  const goTo = (i: number) => { scroller.current?.scrollTo({ x: i * w, animated: true }); setPage(i); };
  const money = (v: number) => formatMoney(v, settings.currency, locale);
  const open = () => router.push({ pathname: '/set-stats/[game]/[id]', params: { game, id, lang } });
  // Chiffre principal : le Master Set (toutes les cartes et leurs variantes), détaillé en dessous.
  const pct = percent(stats.master);
  const fan = stats.top.slice(0, 2).filter((x) => x.card.imageSmall);

  return (
    <View style={{ width: '100%', gap: 10 }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / w))}
          onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / w))}
          scrollEventThrottle={64}
        >
          <Pressable onPress={open} style={[st.panel, { width: w }]} accessibilityLabel={t('setStats.progress')}>
            <View style={st.top}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={st.kicker}>{t('setStats.progress')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                  <Text style={st.big}>{stats.master.owned}</Text>
                  <Text style={st.bigSub}>/ {stats.master.total}</Text>
                </View>
                <Text style={st.caption}>{t('setStats.master')}</Text>
                <Text style={[st.caption, { fontSize: 11 }]}>{t('setStats.masterHint')}</Text>
              </View>
              <Ring value={stats.master.total ? stats.master.owned / stats.master.total : 0}>
                <Text style={st.ringText}>{pct}%</Text>
              </Ring>
            </View>
            <View style={{ gap: 10 }}>
              <Bar label={t('setStats.base')} p={stats.base} />
              {stats.extra.total > 0 && <Bar label={t('setStats.extra')} p={stats.extra} />}
            </View>
          </Pressable>

          <Pressable onPress={open} style={[st.panel, { width: w, overflow: 'hidden' }]} accessibilityLabel={t('setStats.value')}>
            <View style={st.fan} pointerEvents="none">
              {fan.map((x, i) => (
                <Image
                  key={x.card.id}
                  source={x.card.imageSmall}
                  style={[st.fanCard, i === 0 ? { right: 34, top: 70, transform: [{ rotate: '-8deg' }] } : { right: -8, top: 92, transform: [{ rotate: '9deg' }] }]}
                  contentFit="cover"
                />
              ))}
            </View>
            <View style={{ gap: 2 }}>
              <Text style={st.kicker}>{t('setStats.value')}</Text>
              <Text style={st.money} numberOfLines={1}>{stats.priced ? money(stats.value) : '—'}</Text>
              <Text style={st.caption}>
                {stats.priced ? t('setStats.owned', { v: money(stats.ownedValue) }) : t('setStats.noPrices')}
              </Text>
            </View>
            <View style={{ gap: 8, maxWidth: '64%' }}>
              {stats.top.slice(0, 3).map((x) => (
                <View key={x.card.id} style={st.topRow}>
                  <Image source={x.card.imageSmall} style={st.thumb} contentFit="cover" />
                  <Text style={st.topName} numberOfLines={1}>{displayName(x.card, appLang)}</Text>
                  <Text style={st.topPrice}>{money(x.unit)}</Text>
                </View>
              ))}
            </View>
          </Pressable>
        </ScrollView>
      )}
      <View style={st.footer}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[0, 1].map((i) => (
            <Pressable key={i} onPress={() => goTo(i)} hitSlop={10} accessibilityLabel={`${i + 1} / 2`}>
              <View style={[st.dot, page === i && st.dotOn]} />
            </Pressable>
          ))}
        </View>
        <Pressable onPress={open} style={st.more} accessibilityRole="button">
          <Text style={st.moreText}>{t('setStats.open')} ›</Text>
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  panel: { backgroundColor: colors.card, borderRadius: 22, padding: 18, gap: 16, minHeight: 236, justifyContent: 'space-between', borderWidth: 1, borderColor: colors.line },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  kicker: { color: colors.accent, fontFamily: fonts.heavy, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' },
  big: { color: colors.text, fontFamily: fonts.display, fontSize: 52, lineHeight: 60 },
  bigSub: { color: colors.muted, fontFamily: fonts.display, fontSize: 20, marginBottom: 10 },
  caption: { color: colors.muted, fontFamily: fonts.bold, fontSize: 13 },
  ringText: { color: colors.text, fontFamily: fonts.display, fontSize: 20 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: { color: colors.text, fontFamily: fonts.bold, fontSize: 14, width: 118 },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.bg, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.good },
  barValue: { color: colors.muted, fontFamily: fonts.bold, fontSize: 13, minWidth: 64, textAlign: 'right' },
  money: { color: colors.text, fontFamily: fonts.display, fontSize: 30 },
  fan: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 170, opacity: 0.85 },
  fanCard: { position: 'absolute', width: 96, height: 134, borderRadius: 7, backgroundColor: colors.bg },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumb: { width: 26, height: 36, borderRadius: 3, backgroundColor: colors.bg },
  topName: { flex: 1, color: colors.text, fontFamily: fonts.bold, fontSize: 14 },
  topPrice: { color: colors.accent, fontFamily: fonts.heavy, fontSize: 14 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.line },
  dotOn: { width: 24, backgroundColor: colors.accent },
  more: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  moreText: { color: colors.text, fontFamily: fonts.bold, fontSize: 13 },
});
