import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, Text, View } from 'react-native';
import { CardRow, colors, fonts, s } from '../components/ui';
import { formatMoney, type Currency } from '../lib/currency';
import { dayChange } from '../lib/priceHistory';
import { useStore } from '../lib/store';
import { usePriceHistory } from '../lib/usePriceHistory';
import { collectionKey } from '../lib/variants';

const canNotify = () => Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window;

/** Liste de souhaits : cartes recherchées, cote du jour, prix cible ; les bonnes affaires en tête. */
export default function Wishlist() {
  const { t, wishlist, deals, settings, setSettings, money, locale } = useStore();
  const [denied, setDenied] = useState(canNotify() && Notification.permission === 'denied');
  const dealKeys = useMemo(() => new Set(deals.map((w) => collectionKey(w.card))), [deals]);
  const list = useMemo(() => [...wishlist].sort((a, b) => Number(dealKeys.has(collectionKey(b.card))) - Number(dealKeys.has(collectionKey(a.card))) || b.addedAt - a.addedAt), [wishlist, dealKeys]);
  const cards = useMemo(() => list.map((w) => w.card), [list]);
  const points = usePriceHistory(cards);

  const toggleNotify = async () => {
    if (settings.wishNotify) return setSettings({ wishNotify: false });
    if (!canNotify()) return;
    const p = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    setDenied(p === 'denied');
    if (p === 'granted') setSettings({ wishNotify: true });
  };

  return (
    <View style={s.screen}>
      <FlatList
        data={list}
        keyExtractor={(w) => collectionKey(w.card)}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 8, maxWidth: 700, width: '100%', alignSelf: 'center' }}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 6 }}>
            <Text style={s.muted}>{t('wish.count', { n: wishlist.length })}</Text>
            {deals.length > 0 && (
              <View style={{ backgroundColor: colors.good, borderRadius: 12, padding: 12 }}>
                <Text style={{ color: colors.bg, fontFamily: fonts.heavy }}>🔔 {t('wish.deals', { n: deals.length })}</Text>
              </View>
            )}
            {canNotify() && (
              <Pressable onPress={toggleNotify} style={[s.ghost, { flexDirection: 'row', justifyContent: 'center', gap: 8 }, settings.wishNotify && { borderColor: colors.accent }]} accessibilityRole="switch" accessibilityState={{ checked: !!settings.wishNotify }}>
                <Ionicons name={settings.wishNotify ? 'notifications' : 'notifications-outline'} size={18} color={settings.wishNotify ? colors.accent : colors.text} />
                <Text style={[s.ghostText, settings.wishNotify && { color: colors.accent }]}>{t('wish.notify')}{settings.wishNotify ? ' ✓' : ''}</Text>
              </Pressable>
            )}
            {canNotify() && <Text style={[s.muted, { fontSize: 12 }]}>{denied ? t('wish.notifyDenied') : t('wish.notifyHint')}</Text>}
          </View>
        }
        ListEmptyComponent={<Text style={[s.muted, { textAlign: 'center', marginTop: 20 }]}>{t('wish.empty')}</Text>}
        renderItem={({ item }) => {
          const p = item.card.prices[0];
          const deal = dealKeys.has(collectionKey(item.card));
          return (
            <View style={{ gap: 4 }}>
              <CardRow card={item.card} list={cards} change={dayChange(points(item.card))} right={p ? money(p.value, p.currency) : undefined} />
              {item.target !== undefined && (
                <Text style={{ marginLeft: 12, fontFamily: deal ? fonts.heavy : fonts.bold, fontSize: 12, color: deal ? colors.good : colors.muted }}>
                  {deal ? '🔔 ' : '🎯 '}{t('wish.target')} : {formatMoney(item.target, (item.currency ?? settings.currency) as Currency, locale)}{deal ? ` · ${t('wish.deal')}` : ''}
                </Text>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}
