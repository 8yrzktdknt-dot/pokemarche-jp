import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { localName } from '../../lib/catalog/static';
import { formatMoney } from '../../lib/currency';
import { GAMES } from '../../lib/games';
import { percent, setStats, type SetStats } from '../../lib/setStats';
import type { CollectionStats } from '../../lib/stats';
import { useStore } from '../../lib/store';
import type { Card, SetInfo } from '../../lib/types';
import { variantOwnership } from '../../lib/variants';
import { Ring } from '../SetOverview';
import { colors, fonts } from '../ui';
import { EmptyCollection, Page, d } from './common';

/** Extensions suivies au plus (les plus fournies de la collection). */
const MAX_SETS = 12;

interface Loaded { key: string; set: SetInfo | null; cards: Card[] }
interface Row { key: string; game: CollectionStats['sets'][number]; set: SetInfo | null; stats: SetStats }

/** Avancement de la collection extension par extension : la plus avancée en grand, les autres en liste. */
export function SetsPage({ st: stats }: { st: CollectionStats }) {
  const { collection, t, toCurrency, appLang, settings, locale } = useStore();
  const tracked = stats.sets.slice(0, MAX_SETS);
  const wanted = tracked.map((x) => `${x.game}:${x.lang}:${x.setId}`).join('|');
  const [loaded, setLoaded] = useState<Map<string, Loaded> | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all(tracked.map(async (x) => {
      const key = `${x.game}:${x.lang}:${x.setId}`;
      const r = await GAMES[x.game].setCards(x.setId, x.lang).catch(() => null);
      return r?.cards.length ? { key, set: r.set, cards: r.cards } : null;
    })).then((list) => alive && setLoaded(new Map(list.filter((x): x is Loaded => !!x).map((x) => [x.key, x]))));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted]);

  const variantOwned = useMemo(() => variantOwnership(collection), [collection]);
  const rows = useMemo<Row[]>(() => {
    if (!loaded) return [];
    const out: Row[] = [];
    for (const x of tracked) {
      const key = `${x.game}:${x.lang}:${x.setId}`;
      const l = loaded.get(key);
      if (!l) continue;
      const owned = new Set(collection.filter((e) => e.card.game === x.game && e.card.lang === x.lang).map((e) => e.card.id));
      out.push({ key, game: x, set: l.set, stats: setStats(l.cards, (c) => owned.has(c.id), toCurrency, variantOwned) });
    }
    return out.sort((a, b) => percent(b.stats.master) - percent(a.stats.master) || b.stats.master.owned - a.stats.master.owned);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, collection, toCurrency, variantOwned]);

  if (!collection.length) return <Page><EmptyCollection text={t('dash.setsEmpty')} /></Page>;
  if (!loaded) return <Page><ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} /></Page>;

  const fmt = (v: number) => formatMoney(v, settings.currency, locale);
  const open = (r: Row) => router.push({ pathname: '/set/[game]/[id]', params: { game: r.game.game, id: r.game.setId, lang: r.game.lang } });
  const name = (r: Row) => (r.set ? localName(r.set, appLang) : r.game.setName ?? r.game.setId);
  const missing = (r: Row) => {
    const all = r.stats.base.total + r.stats.extra.total;
    return all - r.stats.base.owned - r.stats.extra.owned;
  };
  const [first, ...others] = rows;

  return (
    <Page>
      {first && (
        <Pressable style={d.hero} onPress={() => open(first)} accessibilityRole="button">
          <Text style={d.kicker}>{t('dash.closest')}</Text>
          <View style={st.heroRow}>
            <View style={{ flex: 1, gap: 6 }}>
              {first.set?.logo ? <Image source={first.set.logo} style={st.heroLogo} contentFit="contain" contentPosition="left" /> : null}
              <Text style={st.heroName} numberOfLines={2}>{name(first)}</Text>
              <Text style={d.caption}>{t('setStats.master')} · {first.stats.master.owned}/{first.stats.master.total}</Text>
              <Text style={d.caption}>{missing(first) ? t('dash.setMissing', { n: missing(first), v: fmt(first.stats.missingValue) }) : t('dash.complete')}</Text>
            </View>
            <Ring value={first.stats.master.total ? first.stats.master.owned / first.stats.master.total : 0} size={96} width={10}>
              <Text style={st.ring}>{percent(first.stats.master)}%</Text>
            </Ring>
          </View>
        </Pressable>
      )}

      {others.length > 0 && <Text style={st.title}>{t('dash.setsTitle')}</Text>}
      {others.map((r) => (
        <Pressable key={r.key} style={st.row} onPress={() => open(r)} accessibilityRole="button" accessibilityLabel={name(r)}>
          <View style={st.logoBox}>
            {r.set?.logo ? <Image source={r.set.logo} style={StyleSheet.absoluteFill} contentFit="contain" /> : <Text style={st.code}>{r.set?.code ?? r.game.setId}</Text>}
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <View style={st.line}>
              <Text style={st.name} numberOfLines={1}>{name(r)}</Text>
              <Text style={st.pct}>{percent(r.stats.master)}%</Text>
            </View>
            <View style={st.track}><View style={[st.fill, { width: `${r.stats.master.total ? (r.stats.master.owned / r.stats.master.total) * 100 : 0}%` }]} /></View>
            <Text style={st.meta} numberOfLines={2}>
              {r.stats.master.owned}/{r.stats.master.total} · {missing(r) ? t('dash.setMissing', { n: missing(r), v: fmt(r.stats.missingValue) }) : t('dash.complete')}
            </Text>
          </View>
        </Pressable>
      ))}
      <Text style={[d.caption, { fontSize: 11 }]}>{t('setStats.master')} : {t('setStats.masterHint')}</Text>
    </Page>
  );
}

const st = StyleSheet.create({
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroLogo: { width: '100%', height: 44 },
  heroName: { color: colors.text, fontFamily: fonts.display, fontSize: 18 },
  ring: { color: colors.text, fontFamily: fonts.display, fontSize: 18 },
  title: { color: colors.muted, fontFamily: fonts.heavy, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 14, padding: 10 },
  logoBox: { width: 64, height: 40, borderRadius: 8, backgroundColor: '#0E2A1D', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  code: { color: colors.accent, fontFamily: fonts.display, fontSize: 12 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, color: colors.text, fontFamily: fonts.bold, fontSize: 14 },
  pct: { color: colors.accent, fontFamily: fonts.heavy, fontSize: 14 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.bg, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.good },
  meta: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
});
