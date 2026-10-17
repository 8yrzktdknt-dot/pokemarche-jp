import { Manrope_400Regular, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { Unbounded_800ExtraBold } from '@expo-google-fonts/unbounded';
import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ChooseUsername, Welcome } from '../components/Welcome';
import { cloudEnabled } from '../lib/cloud/config';
import { StatusBar } from 'expo-status-bar';
import { colors, fonts } from '../components/ui';
import { useEffect } from 'react';
import { watchForUpdates } from '../lib/autoUpdate';
import { StoreProvider, useStore } from '../lib/store';

export default function Layout() {
  useEffect(() => watchForUpdates(), []);
  const [loaded, error] = useFonts({ Manrope_400Regular, Manrope_700Bold, Manrope_800ExtraBold, Unbounded_800ExtraBold });
  // Polices introuvables (hors-ligne…) : on affiche quand même l'app avec les polices système.
  if (!loaded && !error) return null;
  return (
    <StoreProvider>
      <StatusBar style="light" />
      <AppStack />
    </StoreProvider>
  );
}

function AppStack() {
  const { t, authReady, user, username, recovery } = useStore();
  const path = usePathname();
  // Compte obligatoire : écran de connexion tant qu'on n'est pas connecté (sauf la page ouverte par le lien de
  // confirmation de l'e-mail), puis choix du pseudo pour les comptes qui n'en ont pas. La session reste ouverte.
  // Par-dessus la navigation (qui reste en place : à la reconnexion, on retrouve l'app là où on l'attend).
  // Pages ouvertes sans compte : confirmation de l'e-mail et profils publics (« /u/pseudo »).
  const gated = cloudEnabled() && !path.startsWith('/confirm') && !path.startsWith('/u/');
  const gate = !gated ? null : !authReady ? <View style={{ flex: 1, backgroundColor: colors.bg }} />
    : !user ? <Welcome /> : username === '' && !recovery ? <ChooseUsername /> : null;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: fonts.bold },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'TCGMarket' }} />
        <Stack.Screen name="scan" options={{ title: t('tab.scan'), headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="set/[game]/[id]" options={{ title: t('title.set') }} />
        <Stack.Screen name="set-stats/[game]/[id]" options={{ title: t('setStats.title') }} />
        <Stack.Screen name="confirm" options={{ title: t('confirm.title'), headerShown: false }} />
        <Stack.Screen name="report" options={{ title: t('report.title') }} />
        <Stack.Screen name="collection" options={{ title: t('title.collection') }} />
        <Stack.Screen name="wishlist" options={{ title: t('wish.title') }} />
        <Stack.Screen name="trades" options={{ title: t('trades.title') }} />
        <Stack.Screen name="packrush" options={{ title: t('pr.title') }} />
        <Stack.Screen name="import" options={{ title: t('imp.title') }} />
        <Stack.Screen name="u/[username]" options={{ title: t('prof.title') }} />
        <Stack.Screen name="card/[game]/[id]" options={{ title: t('title.card') }} />
      </Stack>
      {gate && <View style={StyleSheet.absoluteFill}>{gate}</View>}
    </View>
  );
}
