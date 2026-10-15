import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { CollectionPage } from '../../components/dash/CollectionPage';
import { InsightsPage } from '../../components/dash/InsightsPage';
import { NewsPage } from '../../components/dash/NewsPage';
import { SetsPage } from '../../components/dash/SetsPage';
import { Pager } from '../../components/Pager';
import { colors, s } from '../../components/ui';
import { collectionStats } from '../../lib/stats';
import { useStore } from '../../lib/store';
import { dayKey, record, type ValuePoint } from '../../lib/valueHistory';

const KEY_HISTORY = 'valueHistory.v1';

/**
 * Tableau de bord en quatre pages à faire glisser : la collection et sa valeur, l'avancement des extensions,
 * les nouveautés du jeu choisi, et la répartition de la collection.
 */
export default function Dashboard() {
  const { ready, collection, settings, t, toCurrency } = useStore();
  const st = useMemo(() => collectionStats(collection, toCurrency), [collection, toCurrency]);
  const hello = settings.profileName ? `${t('dash.hello')} ${settings.profileName}` : t('dash.hello');

  // Valeur du jour enregistrée sur l'appareil (le dernier relevé de la journée l'emporte).
  const [history, setHistory] = useState<ValuePoint[] | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(KEY_HISTORY).then((x) => setHistory(x ? JSON.parse(x) : []), () => setHistory([]));
  }, []);
  useEffect(() => {
    if (!ready || !history || !collection.length) return;
    const today = dayKey(Date.now());
    const v = Math.round(st.value * 100) / 100;
    if (history.some((p) => p.d === today && p.c === settings.currency && p.v === v)) return;
    const next = record(history, { d: today, v, c: settings.currency });
    setHistory(next);
    AsyncStorage.setItem(KEY_HISTORY, JSON.stringify(next)).catch(() => {});
  }, [ready, history, st.value, settings.currency, collection.length]);

  if (!ready) return <View style={s.screen}><ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} /></View>;

  return (
    <View style={s.screen}>
      <Text style={[s.h2, { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, maxWidth: 900, width: '100%', alignSelf: 'center' }]}>{hello} !</Text>
      <Pager
        initial={collection.length ? 0 : 2}
        tabs={[
          { label: t('dash.tab.collection'), icon: 'wallet' },
          { label: t('dash.tab.sets'), icon: 'albums' },
          { label: t('dash.tab.news'), icon: 'sparkles' },
          { label: t('dash.tab.insights'), icon: 'pie-chart' },
        ]}
      >
        {[
          <CollectionPage key="c" st={st} history={history ?? []} />,
          <SetsPage key="s" st={st} />,
          <NewsPage key="n" />,
          <InsightsPage key="i" st={st} />,
        ]}
      </Pager>
    </View>
  );
}
