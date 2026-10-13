import { Link, router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BarList, Panel, StatTile, moneyText } from '../../components/Stats';
import { CardRow, colors, s } from '../../components/ui';
import { GAMES, LANG_LABEL } from '../../lib/games';
import { formatPrice } from '../../lib/prices/marketplaces';
import { collectionStats } from '../../lib/stats';
import { useStore } from '../../lib/store';

export default function Dashboard() {
  const { collection, settings } = useStore();
  const st = useMemo(() => collectionStats(collection), [collection]);
  const hello = settings.profileName ? `Bonjour ${settings.profileName}` : 'Bonjour';

  if (!collection.length) {
    return (
      <ScrollView style={s.screen} contentContainerStyle={[s.pad, { gap: 16 }]}>
        <Text style={s.h2}>{hello} !</Text>
        <Panel title="Ta collection est vide">
          <Text style={s.muted}>Scanne tes cartes avec le bouton appareil photo, ou parcours les extensions pour les ajouter.</Text>
          <Pressable style={s.button} onPress={() => router.push('/scan')}><Text style={s.buttonText}>Scanner une carte</Text></Pressable>
          <Pressable style={s.ghost} onPress={() => router.push('/extensions')}><Text style={s.ghostText}>Parcourir les extensions</Text></Pressable>
        </Panel>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { gap: 14, maxWidth: 900, width: '100%', alignSelf: 'center' }]}>
      <Text style={s.h2}>{hello} !</Text>

      <StatTile
        label="Valeur estimée de la collection"
        value={moneyText(st.value)}
        hint={st.unpriced ? `${st.unpriced} carte${st.unpriced > 1 ? 's' : ''} sans prix` : undefined}
      />
      <View style={styles.row}>
        <StatTile label="Cartes" value={String(st.count)} />
        <StatTile label="Cartes uniques" value={String(st.unique)} />
        <StatTile label="Jeux" value={String(st.games.filter((g) => g.count).length)} />
      </View>

      <Panel title="Par jeu">
        <BarList
          rows={st.games.map((g) => ({
            label: GAMES[g.game].label,
            value: g.count,
            detail: Object.keys(g.value).length ? moneyText(g.value) : undefined,
          }))}
        />
      </Panel>

      {st.top.length > 0 && (
        <Panel title="Les plus précieuses">
          {st.top.map((t) => (
            <CardRow
              key={`${t.card.game}:${t.card.lang}:${t.card.id}`}
              card={t.card}
              right={`${formatPrice(t.unit, t.currency)}${t.quantity > 1 ? ` ×${t.quantity}` : ''}`}
            />
          ))}
        </Panel>
      )}

      <View style={styles.row}>
        <View style={{ flexGrow: 1, flexBasis: 280 }}>
          <Panel title="Langues">
            <BarList rows={st.langs.map((l) => ({ label: LANG_LABEL[l.lang], value: l.count }))} />
          </Panel>
        </View>
        {st.rarities.length > 0 && (
          <View style={{ flexGrow: 1, flexBasis: 280 }}>
            <Panel title="Raretés">
              <BarList rows={st.rarities.map((r) => ({ label: r.rarity, value: r.count }))} />
            </Panel>
          </View>
        )}
      </View>

      <Panel title="Derniers ajouts">
        {st.recent.map((e) => <CardRow key={`${e.card.game}:${e.card.lang}:${e.card.id}`} card={e.card} />)}
        <Link href="/collection" asChild>
          <Pressable style={s.ghost}><Text style={s.ghostText}>Voir toute ma collection</Text></Pressable>
        </Link>
      </Panel>

      <Text style={[s.muted, { fontSize: 12 }]}>
        Valeurs indicatives : cote Cardmarket (€) ou TCGplayer ($) au moment de l'ajout, sans conversion entre devises.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
