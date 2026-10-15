import { rarityName } from '../../lib/catalog/pokemonNames';
import { formatMoney } from '../../lib/currency';
import { GAMES } from '../../lib/games';
import type { CollectionStats } from '../../lib/stats';
import { useStore } from '../../lib/store';
import { BarList, Panel } from '../Stats';
import { EmptyCollection, Page } from './common';

/** Répartition de la collection : jeux, langues, raretés et tranches de prix. */
export function InsightsPage({ st: stats }: { st: CollectionStats }) {
  const { collection, settings, t, langLabel, appLang, locale } = useStore();
  if (!collection.length) return <Page><EmptyCollection /></Page>;
  const fmt = (v: number) => formatMoney(v, settings.currency, locale);
  const whole = (v: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: settings.currency, maximumFractionDigits: 0 }).format(v);
  const range = (b: { min: number; max?: number }) => (b.max === undefined ? `${whole(b.min)} +` : `${whole(b.min)} – ${whole(b.max)}`);

  return (
    <Page>
      <Panel title={t('dash.byGame')}>
        <BarList rows={stats.games.filter((g) => g.count).map((g) => ({ label: GAMES[g.game].label, value: g.count, detail: g.value ? fmt(g.value) : undefined }))} />
      </Panel>
      <Panel title={t('dash.priceRanges')}>
        <BarList rows={stats.buckets.map((b) => ({ label: range(b), value: b.count }))} />
      </Panel>
      <Panel title={t('dash.langs')}>
        <BarList rows={stats.langs.map((l) => ({ label: langLabel(l.lang), value: l.count }))} />
      </Panel>
      {stats.rarities.length > 0 && (
        <Panel title={t('dash.rarities')}>
          <BarList rows={stats.rarities.map((r) => ({ label: rarityName(r.rarity, appLang) ?? r.rarity, value: r.count }))} />
        </Panel>
      )}
    </Page>
  );
}
