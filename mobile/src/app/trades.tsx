import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { CardRow, colors, fonts, s } from '../components/ui';
import { useStore } from '../lib/store';
import { matchTrades } from '../lib/trades';
import { useFriendProfiles } from '../lib/useFriendProfiles';

/**
 * Échanges avec les amis : pour chaque ami (profil public), ses cartes à échanger que l'on recherche et les nôtres
 * qu'il recherche. Les amis avec le plus d'échanges possibles en tête.
 */
export default function Trades() {
  const { t, settings, collection, wishlist } = useStore();
  const friends = settings.friends ?? [];
  const [reload, setReload] = useState(0);
  const profiles = useFriendProfiles(friends, reload);
  const myTrades = collection.filter((e) => e.trade).length;

  const rows = useMemo(() => {
    if (!profiles) return [];
    return friends.map((name) => {
      const p = profiles.get(name);
      const m = p ? matchTrades({ collection, wishlist }, { collection: p.collection ?? [], wishlist: p.wishlist ?? [] }) : null;
      return { name, p, m, n: m ? m.theyHave.length + m.youHave.length : -1 };
    }).sort((a, b) => b.n - a.n);
  }, [profiles, friends, collection, wishlist]);
  const total = rows.reduce((a, r) => a + Math.max(0, r.n), 0);

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14, maxWidth: 700, width: '100%', alignSelf: 'center' }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => setReload((n) => n + 1)} tintColor={colors.accent} />}
    >
      <Text style={s.muted}>{t('trades.intro')}</Text>
      {myTrades === 0 && <Text style={[s.muted, { fontSize: 12 }]}>⇄ {t('trades.noneMine')}</Text>}
      {!friends.length && (
        <View style={{ alignItems: 'center', gap: 12, paddingTop: 20 }}>
          <Ionicons name="people-outline" size={56} color={colors.muted} />
          <Text style={[s.muted, { textAlign: 'center' }]}>{t('trades.noFriends')}</Text>
          <Pressable style={[s.button, { paddingHorizontal: 22 }]} onPress={() => router.push('/account')}>
            <Text style={s.buttonText}>{t('trades.addFriends')}</Text>
          </Pressable>
        </View>
      )}
      {friends.length > 0 && !profiles && <ActivityIndicator color={colors.accent} />}
      {profiles && friends.length > 0 && (
        <View style={{ backgroundColor: total ? colors.good : colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: total ? colors.good : colors.line }}>
          <Text style={{ color: total ? colors.bg : colors.text, fontFamily: fonts.heavy }}>{total ? `⇄ ${t('trades.total', { n: total })}` : t('trades.none')}</Text>
        </View>
      )}
      {rows.map(({ name, p, m }) => (
        <View key={name} style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 12, gap: 8 }}>
          <Pressable onPress={() => router.push(`/u/${name}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Avatar value={p?.avatar} size={40} />
            <Text style={[s.name, { flex: 1, color: colors.accent }]}>@{name}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
          {!p && <Text style={[s.muted, { fontSize: 12 }]}>{t('trades.private')}</Text>}
          {m && !m.theyHave.length && !m.youHave.length && <Text style={[s.muted, { fontSize: 12 }]}>{t('trades.nothing')}</Text>}
          {m && m.theyHave.length > 0 && (
            <View style={{ gap: 6 }}>
              <Text style={{ color: colors.good, fontFamily: fonts.bold, fontSize: 13 }}>{t('trades.theyHave', { n: m.theyHave.length })}</Text>
              {m.theyHave.map((e, i) => <CardRow key={`t${i}`} card={e.card} list={m.theyHave.map((x) => x.card)} right={e.quantity > 1 ? `×${e.quantity}` : undefined} />)}
            </View>
          )}
          {m && m.youHave.length > 0 && (
            <View style={{ gap: 6 }}>
              <Text style={{ color: colors.accent, fontFamily: fonts.bold, fontSize: 13 }}>{t('trades.youHave', { n: m.youHave.length })}</Text>
              {m.youHave.map((e, i) => <CardRow key={`y${i}`} card={e.card} list={m.youHave.map((x) => x.card)} right={e.quantity > 1 ? `×${e.quantity}` : undefined} />)}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}
