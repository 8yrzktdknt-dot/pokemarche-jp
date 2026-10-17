import { Link } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { formatMoney } from '../../lib/currency';
import type { CollectionStats } from '../../lib/stats';
import { useStore } from '../../lib/store';
import { addDays, collectionSeries, dayChange } from '../../lib/priceHistory';
import { usePriceHistory } from '../../lib/usePriceHistory';
import { PriceChange } from '../PriceChange';
import { PriceChart } from '../PriceChart';
import { Panel, StatTile } from '../Stats';
import { CardRow, colors, fonts, s } from '../ui';
import { GainText } from '../CardExtras';
import { gainOf } from '../../lib/wishlist';
import { EmptyCollection, Page, d } from './common';

export function CollectionPage({ st: stats }: { st: CollectionStats }) {
  const { collection, settings, t, locale, toCurrency, deals, wishlist } = useStore();
  const gain = useMemo(() => gainOf(collection, toCurrency), [collection, toCurrency]);
  const fmt = (v: number) => formatMoney(v, settings.currency, locale);
  // Valeur de la collection jour par jour d'après l'historique des prix Cardmarket de chaque carte.
  const cards = useMemo(() => collection.map((e) => e.card), [collection]);
  const points = usePriceHistory(cards);
  const series = useMemo(
    () => collectionSeries(collection.map((e) => ({ card: e.card, quantity: e.quantity, points: points(e.card) })), toCurrency),
    [collection, points, toCurrency],
  );
  if (!collection.length) return <Page><EmptyCollection /></Page>;

  const ch = dayChange(series);
  const last = series[series.length - 1]?.d;
  const since = ch && last && addDays(ch.since, 1) === last
    ? t('price.sinceYesterday')
    : ch ? t('dash.periodSince', { d: new Date(`${ch.since}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) }) : '';

  return (
    <Page>
      <View style={d.hero}>
        <Text style={d.kicker}>{t('dash.value')}</Text>
        <Text style={d.money} numberOfLines={1} adjustsFontSizeToFit>{fmt(stats.value)}</Text>
        {ch ? <PriceChange change={ch} currency={settings.currency} size={15} suffix={since} /> : <Text style={d.caption}>{t('dash.trackingStart')}</Text>}
        {series.length > 1 && <PriceChart points={series.slice(-30)} format={fmt} locale={locale} height={110} />}
        {stats.unpriced > 0 && <Text style={[d.caption, { fontSize: 11 }]}>{t('dash.unpriced', { n: stats.unpriced })}</Text>}
        {gain && (
          <View style={{ alignItems: 'center', gap: 2, marginTop: 6 }}>
            <Text style={d.kicker}>{t(gain.delta >= 0 ? 'paid.gain' : 'paid.loss')}</Text>
            <GainText delta={gain.delta} pct={gain.pct} size={17} />
            <Text style={[d.caption, { fontSize: 11 }]}>{t('dash.gainNote', { n: gain.count })}</Text>
          </View>
        )}
      </View>

      {deals.length > 0 && (
        <Link href="/wishlist" asChild>
          <Pressable style={{ backgroundColor: colors.good, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 20 }}>🔔</Text>
            <Text style={{ flex: 1, color: colors.bg, fontFamily: fonts.heavy, fontSize: 14 }}>{t('wish.deals', { n: deals.length })}</Text>
            <Text style={{ color: colors.bg, fontFamily: fonts.heavy, fontSize: 18 }}>›</Text>
          </Pressable>
        </Link>
      )}

      <View style={d.row}>
        <StatTile label={t('dash.cards')} value={String(stats.count)} />
        <StatTile label={t('dash.unique')} value={String(stats.unique)} />
        <StatTile label={t('dash.setsCount')} value={String(stats.sets.length)} />
      </View>

      {stats.top.length > 0 && (
        <Panel title={t('dash.top')}>
          {stats.top.map((x) => (
            <CardRow key={`${x.card.game}:${x.card.lang}:${x.card.id}:${x.card.variant ?? ''}`} card={x.card} list={stats.top.map((y) => y.card)} change={dayChange(points(x.card))} right={`${fmt(x.unit)}${x.quantity > 1 ? ` ×${x.quantity}` : ''}`} />
          ))}
        </Panel>
      )}

      <Panel title={t('dash.recent')}>
        {stats.recent.map((e) => <CardRow key={`${e.card.game}:${e.card.lang}:${e.card.id}:${e.card.variant ?? ''}`} card={e.card} list={stats.recent.map((y) => y.card)} change={dayChange(points(e.card))} />)}
        <Link href="/collection" asChild>
          <Pressable style={s.ghost}><Text style={s.ghostText}>{t('dash.seeAll')}</Text></Pressable>
        </Link>
      </Panel>
      <Link href="/wishlist" asChild>
        <Pressable style={s.ghost}><Text style={s.ghostText}>♡ {t('wish.see')}{wishlist.length ? ` (${wishlist.length})` : ''}</Text></Pressable>
      </Link>
      <Text style={[s.muted, { fontSize: 12 }]}>{t('dash.note')}</Text>
    </Page>
  );
}
