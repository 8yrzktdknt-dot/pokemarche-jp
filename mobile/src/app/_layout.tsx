import { Manrope_400Regular, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { Unbounded_800ExtraBold } from '@expo-google-fonts/unbounded';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Wordmark, colors, fonts } from '../components/ui';
import { StoreProvider } from '../lib/store';

export default function Layout() {
  const [loaded, error] = useFonts({ Manrope_400Regular, Manrope_700Bold, Manrope_800ExtraBold, Unbounded_800ExtraBold });
  // Polices introuvables (hors-ligne…) : on affiche quand même l'app avec les polices système.
  if (!loaded && !error) return null;
  return (
    <StoreProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: fonts.bold },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'PokéMarket', headerTitle: () => <Wordmark /> }} />
        <Stack.Screen name="scan" options={{ title: 'Scanner', headerShown: false }} />
        <Stack.Screen name="collection" options={{ title: 'Ma collection' }} />
        <Stack.Screen name="card/[game]/[id]" options={{ title: 'Carte' }} />
      </Stack>
    </StoreProvider>
  );
}
