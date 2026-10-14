import { Link, router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BarList, Panel, StatTile } from '../../components/Stats';
import { CardRow, s } from '../../components/ui';
import { GAMES } from '../../lib/games';
import { formatMoney } from '../../lib/currency';
import { collectionStats } from '../../lib/stats';
import { useStore } from '../../lib/store';

export default function Dashboard() {
  const { collection, settings, t, langLabel, toCurrency, locale } = useStore();
  const st = useMemo(() => collectionStats(collection, toCurrency), [collection, toCurrency]);
  const fmt = (v: number) => formatMoney(v, settings.currency, locale);
  const hello = settings.profileName ? `${t('dash.hello')} ${settings.profileName}` : t('dash.hello');

  if (!collection.length) {
    return (
      <ScrollView style={s.screen} contentContainerStyle={[s.pad, { gap: 16 }]}>
        <Text style={s.h2}>{hello} !</Text>
        <Panel title={t('dash.empty')}>
          <Text style={s.muted}>{t('dash.emptyText')}</Text>
          <Pressable style={s.button} onPress={() => router.push('/scan')}><Text style={s.buttonText}>{t('dash.scan')}</Text></Pressable>
          <Pressable style={s.ghost} onPress={() => router.push('/extensions')}><Text style={s.ghostText}>{t('dash.browse')}</Text></Pressable>
        </Panel>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { gap: 14, maxWidth: 900, width: '100%', alignSelf: 'center' }]}>
      <Text style={s.h2}>{hello} !</Text>

      <StatTile
        label={t('dash.value')}
        value={fmt(st.value)}
        hint={st.unpriced ? t('dash.unpriced', { n: st.unpriced }) : undefined}
      />
      <View style={styles.row}>
        <StatTile label={t('dash.cards')} value={String(st.count)} />
        <StatTile label={t('dash.unique')} value={String(st.unique)} />
        <StatTile label={t('dash.games')} value={String(st.games.filter((g) => g.count).length)} />
      </View>

      <Panel title={t('dash.byGame')}>
        <BarList
          rows={st.games.map((g) => ({
            label: GAMES[g.game].label,
            value: g.count,
            detail: g.value ? fmt(g.value) : undefined,
          }))}
        />
      </Panel>

      {st.top.length > 0 && (
        <Panel title={t('dash.top')}>
          {st.top.map((x) => (
            <CardRow
              key={`${x.card.game}:${x.card.lang}:${x.card.id}`}
              card={x.card}
              right={`${fmt(x.unit)}${x.quantity > 1 ? ` ×${x.quantity}` : ''}`}
            />
          ))}
        </Panel>
      )}

      <View style={styles.row}>
        <View style={{ flexGrow: 1, flexBasis: 280 }}>
          <Panel title={t('dash.langs')}>
            <BarList rows={st.langs.map((l) => ({ label: langLabel(l.lang), value: l.count }))} />
          </Panel>
        </View>
        {st.rarities.length > 0 && (
          <View style={{ flexGrow: 1, flexBasis: 280 }}>
            <Panel title={t('dash.rarities')}>
              <BarList rows={st.rarities.map((r) => ({ label: r.rarity, value: r.count }))} />
            </Panel>
          </View>
        )}
      </View>

      <Panel title={t('dash.recent')}>
        {st.recent.map((e) => <CardRow key={`${e.card.game}:${e.card.lang}:${e.card.id}`} card={e.card} />)}
        <Link href="/collection" asChild>
          <Pressable style={s.ghost}><Text style={s.ghostText}>{t('dash.seeAll')}</Text></Pressable>
        </Link>
      </Panel>

      <Text style={[s.muted, { fontSize: 12 }]}>{t('dash.note')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
