import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMoney } from '../../lib/currency';
import type { CollectionStats } from '../../lib/stats';
import { useStore } from '../../lib/store';
import { change, dayKey, series, type ValuePoint } from '../../lib/valueHistory';
import { Panel, StatTile } from '../Stats';
import { CardRow, colors, s } from '../ui';
import { EmptyCollection, Page, d } from './common';

/** Courbe de la valeur en barres (30 derniers relevés) : l'écart entre le plus bas et le plus haut occupe la hauteur. */
function ValueBars({ points }: { points: ValuePoint[] }) {
  const vs = points.map((p) => p.v);
  const lo = Math.min(...vs), hi = Math.max(...vs);
  return (
    <View style={st.chart} accessibilityElementsHidden>
      {points.map((p, i) => (
        <View
          key={p.d}
          style={[st.bar, {
            height: `${hi > lo ? 18 + ((p.v - lo) / (hi - lo)) * 82 : 60}%`,
            backgroundColor: i === points.length - 1 ? colors.accent : colors.good,
            opacity: i === points.length - 1 ? 1 : 0.55,
          }]}
        />
      ))}
    </View>
  );
}

export function CollectionPage({ st: stats, history }: { st: CollectionStats; history: ValuePoint[] }) {
  const { collection, settings, t, locale } = useStore();
  const fmt = (v: number) => formatMoney(v, settings.currency, locale);
  if (!collection.length) return <Page><EmptyCollection /></Page>;

  const pts = series(history, settings.currency, 30);
  const ch = change(history, settings.currency, dayKey(Date.now()));
  const since = ch && new Date(`${ch.since}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' });

  return (
    <Page>
      <View style={d.hero}>
        <Text style={d.kicker}>{t('dash.value')}</Text>
        <Text style={d.money} numberOfLines={1} adjustsFontSizeToFit>{fmt(stats.value)}</Text>
        {ch ? (
          <Text style={ch.delta >= 0 ? d.up : d.down}>
            {ch.delta >= 0 ? '▲ +' : '▼ '}{fmt(ch.delta)}{ch.pct !== undefined ? ` (${ch.pct >= 0 ? '+' : ''}${ch.pct.toLocaleString(locale, { maximumFractionDigits: 1 })} %)` : ''}
            <Text style={d.caption}>  {ch.week ? t('dash.period7') : t('dash.periodSince', { d: since ?? '' })}</Text>
          </Text>
        ) : (
          <Text style={d.caption}>{t('dash.trackingStart')}</Text>
        )}
        {pts.length > 1 && <ValueBars points={pts} />}
        {stats.unpriced > 0 && <Text style={[d.caption, { fontSize: 11 }]}>{t('dash.unpriced', { n: stats.unpriced })}</Text>}
      </View>

      <View style={d.row}>
        <StatTile label={t('dash.cards')} value={String(stats.count)} />
        <StatTile label={t('dash.unique')} value={String(stats.unique)} />
        <StatTile label={t('dash.setsCount')} value={String(stats.sets.length)} />
      </View>

      {stats.top.length > 0 && (
        <Panel title={t('dash.top')}>
          {stats.top.map((x) => (
            <CardRow key={`${x.card.game}:${x.card.lang}:${x.card.id}:${x.card.variant ?? ''}`} card={x.card} list={stats.top.map((y) => y.card)} right={`${fmt(x.unit)}${x.quantity > 1 ? ` ×${x.quantity}` : ''}`} />
          ))}
        </Panel>
      )}

      <Panel title={t('dash.recent')}>
        {stats.recent.map((e) => <CardRow key={`${e.card.game}:${e.card.lang}:${e.card.id}:${e.card.variant ?? ''}`} card={e.card} list={stats.recent.map((y) => y.card)} />)}
        <Link href="/collection" asChild>
          <Pressable style={s.ghost}><Text style={s.ghostText}>{t('dash.seeAll')}</Text></Pressable>
        </Link>
      </Panel>
      <Text style={[s.muted, { fontSize: 12 }]}>{t('dash.note')}</Text>
    </Page>
  );
}

const st = StyleSheet.create({
  chart: { height: 64, flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginTop: 4 },
  bar: { flex: 1, maxWidth: 18, borderRadius: 3, minHeight: 4 },
});
