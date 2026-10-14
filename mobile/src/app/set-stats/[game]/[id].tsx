import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ring } from '../../../components/SetOverview';
import { BarList, Panel } from '../../../components/Stats';
import { CardRow, colors, fonts, s } from '../../../components/ui';
import { formatMoney } from '../../../lib/currency';
import { GAMES } from '../../../lib/games';
import { percent, setStats } from '../../../lib/setStats';
import { useStore } from '../../../lib/store';
import type { Card, CardLang, GameId, SetInfo } from '../../../lib/types';

/** Statistiques d'une extension : avancement, valeur, raretés, tranches de prix, cartes chères et manquantes. */
export default function SetStatsScreen() {
  const { game, id, lang } = useLocalSearchParams<{ game: GameId; id: string; lang: CardLang }>();
  const { collection, t, settings, toCurrency } = useStore();
  const [set, setSet] = useState<SetInfo | null>(null);
  const [cards, setCards] = useState<Card[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    GAMES[game].setCards(id, lang).then((r) => { setSet(r.set); setCards(r.cards); }, (e) => setError(String(e)));
  }, [game, id, lang]);

  const owned = useMemo(
    () => new Set(collection.filter((e) => e.card.game === game && e.card.lang === lang).map((e) => e.card.id)),
    [collection, game, lang],
  );
  const copies = useMemo(
    () => collection.filter((e) => e.card.game === game && e.card.lang === lang && e.card.setId === id).reduce((n, e) => n + e.quantity, 0),
    [collection, game, lang, id],
  );
  const stats = useMemo(() => (cards ? setStats(cards, (c) => owned.has(c.id), toCurrency) : null), [cards, owned, toCurrency]);

  if (error) return <View style={[s.screen, s.pad]}><Text style={{ color: colors.danger }}>{error}</Text></View>;
  if (!cards || !stats) return <View style={[s.screen, s.pad]}><ActivityIndicator color={colors.accent} /></View>;

  const locale = settings.appLang === 'en' ? 'en-US' : 'fr-FR';
  const money = (v: number) => formatMoney(v, settings.currency, locale);
  const bucketLabel = (b: { min: number; max?: number }) =>
    b.max === undefined ? `${money(b.min)} +` : `${money(b.min)} – ${money(b.max)}`;

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { maxWidth: 900, width: '100%', alignSelf: 'center', paddingBottom: 48 }]}>
      <Stack.Screen options={{ title: t('setStats.title') }} />
      <View style={st.head}>
        {set?.logo ? <Image source={set.logo} style={{ width: 140, height: 56 }} contentFit="contain" /> : null}
        <View style={{ flex: 1 }}>
          <Text style={s.h2} numberOfLines={2}>{set?.name ?? id}</Text>
          <Text style={s.muted}>{set?.code ?? id} · {t('setStats.cards', { n: cards.length })}</Text>
        </View>
      </View>

      <View style={st.hero}>
        <Ring value={stats.master.total ? stats.master.owned / stats.master.total : 0} size={128} width={14}>
          <Text style={st.ringBig}>{percent(stats.master)}%</Text>
          <Text style={st.ringSmall}>{t('setStats.master')}</Text>
        </Ring>
        <View style={{ flex: 1, gap: 6 }}>
          <Line label={t('setStats.base')} value={`${stats.base.owned} / ${stats.base.total}`} pct={percent(stats.base)} />
          <Line label={t('setStats.extra')} value={`${stats.extra.owned} / ${stats.extra.total}`} pct={percent(stats.extra)} />
          <Line label={t('setStats.copies')} value={String(copies)} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Tile label={t('setStats.value')} value={stats.priced ? money(stats.value) : '—'} hint={t('setStats.priced', { n: stats.priced, total: cards.length })} />
        <Tile label={t('setStats.ownedValue')} value={money(stats.ownedValue)} />
        <Tile label={t('setStats.missingValue')} value={money(stats.missingValue)} />
        <Tile label={t('setStats.median')} value={stats.median !== undefined ? money(stats.median) : '—'} />
      </View>

      {stats.top.length > 0 && (
        <Panel title={t('setStats.top')}>
          {stats.top.map((x, i) => (
            <View key={x.card.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={st.rank}>{i + 1}</Text>
              <View style={{ flex: 1 }}><CardRow card={x.card} list={stats.top.map((y) => y.card)} right={`${x.owned ? '✓ ' : ''}${money(x.unit)}`} /></View>
            </View>
          ))}
        </Panel>
      )}

      {stats.topMissing.length > 0 && (
        <Panel title={t('setStats.topMissing')}>
          {stats.topMissing.slice(0, 5).map((x) => (
            <CardRow key={x.card.id} card={x.card} list={stats.topMissing.map((y) => y.card)} right={money(x.unit)} />
          ))}
        </Panel>
      )}

      <Panel title={t('setStats.rarities')}>
        <BarList rows={stats.rarities.map((r) => ({ label: r.rarity, value: r.total, detail: t('setStats.rarityDetail', { owned: r.owned, v: money(r.value) }) }))} />
      </Panel>

      {stats.priced > 0 && (
        <Panel title={t('setStats.buckets')}>
          <BarList rows={stats.buckets.map((b) => ({ label: bucketLabel(b), value: b.count, detail: t('setStats.bucketOwned', { n: b.owned }) }))} />
        </Panel>
      )}

      <Text style={[s.muted, { fontSize: 12 }]}>{t('setStats.note')}</Text>
    </ScrollView>
  );
}

/** Chiffre clé sur deux colonnes (les montants restent lisibles sur un téléphone). */
function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View style={st.tile}>
      <Text style={st.tileValue}>{value}</Text>
      <Text style={st.tileLabel}>{label}</Text>
      {hint ? <Text style={st.tileHint}>{hint}</Text> : null}
    </View>
  );
}

function Line({ label, value, pct }: { label: string; value: string; pct?: number }) {
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={st.lineLabel}>{label}</Text>
        <Text style={st.lineValue}>{value}</Text>
      </View>
      {pct !== undefined && (
        <View style={st.track}><View style={[st.fill, { width: `${pct}%` }]} /></View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 18, backgroundColor: colors.card, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.line },
  ringBig: { color: colors.text, fontFamily: fonts.display, fontSize: 24 },
  ringSmall: { color: colors.muted, fontFamily: fonts.bold, fontSize: 10 },
  lineLabel: { color: colors.text, fontFamily: fonts.bold, fontSize: 14 },
  lineValue: { color: colors.muted, fontFamily: fonts.bold, fontSize: 14 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.bg, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.good },
  tile: { flexGrow: 1, flexBasis: '40%', backgroundColor: colors.card, borderRadius: 16, padding: 14, gap: 2 },
  tileValue: { color: colors.text, fontFamily: fonts.display, fontSize: 19 },
  tileLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 12 },
  tileHint: { color: colors.muted, fontFamily: fonts.body, fontSize: 11 },
  rank: { color: colors.accent, fontFamily: fonts.display, fontSize: 16, width: 22, textAlign: 'center' },
});
