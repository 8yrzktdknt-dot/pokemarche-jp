import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../components/ui';
import { StoreProvider } from '../lib/store';

export default function Layout() {
  return (
    <StoreProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'TCG Scanner' }} />
        <Stack.Screen name="scan" options={{ title: 'Scanner', headerShown: false }} />
        <Stack.Screen name="collection" options={{ title: 'Ma collection' }} />
        <Stack.Screen name="card/[game]/[id]" options={{ title: 'Carte' }} />
      </Stack>
    </StoreProvider>
  );
}
