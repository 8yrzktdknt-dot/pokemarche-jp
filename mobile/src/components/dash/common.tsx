import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../../lib/store';
import { colors, fonts, s } from '../ui';

/** Page du tableau de bord : défile verticalement, largeur limitée sur grand écran. */
export function Page({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.pad, { gap: 14, paddingTop: 2, paddingBottom: 32, maxWidth: 900, width: '100%', alignSelf: 'center' }]}>
      {children}
    </ScrollView>
  );
}

/** Collection vide : inviter à scanner ou à parcourir les extensions. */
export function EmptyCollection({ text }: { text?: string }) {
  const { t } = useStore();
  return (
    <View style={d.hero}>
      <Text style={d.kicker}>{t('dash.empty')}</Text>
      <Text style={s.muted}>{text ?? t('dash.emptyText')}</Text>
      <Pressable style={s.button} onPress={() => router.push('/scan')}><Text style={s.buttonText}>{t('dash.scan')}</Text></Pressable>
      <Pressable style={s.ghost} onPress={() => router.push('/extensions')}><Text style={s.ghostText}>{t('dash.browse')}</Text></Pressable>
    </View>
  );
}

export const d = StyleSheet.create({
  hero: { backgroundColor: colors.card, borderRadius: 22, padding: 18, gap: 12, borderWidth: 1, borderColor: colors.line },
  kicker: { color: colors.accent, fontFamily: fonts.heavy, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' },
  money: { color: colors.text, fontFamily: fonts.display, fontSize: 34 },
  caption: { color: colors.muted, fontFamily: fonts.bold, fontSize: 13 },
  up: { color: colors.good, fontFamily: fonts.heavy, fontSize: 14 },
  down: { color: colors.danger, fontFamily: fonts.heavy, fontSize: 14 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
