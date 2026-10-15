import { useMemo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { CollectionPage } from '../../components/dash/CollectionPage';
import { InsightsPage } from '../../components/dash/InsightsPage';
import { NewsPage } from '../../components/dash/NewsPage';
import { SetsPage } from '../../components/dash/SetsPage';
import { Pager } from '../../components/Pager';
import { colors, s } from '../../components/ui';
import { collectionStats } from '../../lib/stats';
import { useStore } from '../../lib/store';

/**
 * Tableau de bord en quatre pages à faire glisser : la collection et sa valeur, l'avancement des extensions,
 * les nouveautés du jeu choisi, et la répartition de la collection.
 */
export default function Dashboard() {
  const { ready, collection, settings, t, toCurrency } = useStore();
  const st = useMemo(() => collectionStats(collection, toCurrency), [collection, toCurrency]);
  const hello = settings.profileName ? `${t('dash.hello')} ${settings.profileName}` : t('dash.hello');

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
          <CollectionPage key="c" st={st} />,
          <SetsPage key="s" st={st} />,
          <NewsPage key="n" />,
          <InsightsPage key="i" st={st} />,
        ]}
      </Pager>
    </View>
  );
}
