import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs, router } from 'expo-router';
import { Pressable, StyleSheet, View, type ColorValue } from 'react-native';
import { Wordmark, colors, fonts } from '../../components/ui';

type IconName = keyof typeof Ionicons.glyphMap;
const icon = (name: IconName) => ({ color, size }: { color: ColorValue; size: number }) => (
  <Ionicons name={name} color={color as string} size={size} />
);

/** Bouton central : ouvre le scanner en plein écran au lieu d'un onglet. */
function ScanButton() {
  return (
    <View style={st.scanWrap} pointerEvents="box-none">
      <Pressable style={st.scan} onPress={() => router.push('/scan')} accessibilityRole="button" accessibilityLabel="Scanner une carte">
        <Ionicons name="camera" size={30} color={colors.bg} />
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.bold },
        headerShadowVisible: false,
        headerTitle: () => <Wordmark />,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line, height: 64, paddingTop: 6 },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="extensions" options={{ title: 'Extensions', tabBarIcon: icon('albums') }} />
      <Tabs.Screen name="search" options={{ title: 'Rechercher', tabBarIcon: icon('search') }} />
      <Tabs.Screen
        name="capture"
        options={{ title: 'Scanner', tabBarButton: () => <ScanButton /> }}
        listeners={{ tabPress: (e) => { e.preventDefault(); router.push('/scan'); } }}
      />
      <Tabs.Screen name="index" options={{ title: 'Tableau de bord', tabBarLabel: 'Accueil', tabBarIcon: icon('stats-chart') }} />
      <Tabs.Screen name="account" options={{ title: 'Compte', tabBarIcon: icon('person-circle') }} />
    </Tabs>
  );
}

const st = StyleSheet.create({
  scanWrap: { flex: 1, alignItems: 'center' },
  scan: {
    width: 64, height: 64, borderRadius: 32, marginTop: -22, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: colors.bg,
  },
});
