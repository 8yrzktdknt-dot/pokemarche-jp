import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { colors, fonts, s, Wordmark } from '../components/ui';
import { useStore } from '../lib/store';

/**
 * Page ouverte par le lien de l'e-mail de confirmation (souvent dans Safari, hors de l'app installée) :
 * l'adresse est déjà confirmée par Supabase à l'ouverture du lien ; il ne reste qu'à se connecter dans l'app.
 */
export default function Confirm() {
  const { t, user } = useStore();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search + window.location.hash.replace(/^#/, '&'));
    if (q.get('error') || q.get('error_description')) setFailed(true);
  }, []);
  return (
    <View style={[s.screen, { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 18 }]}>
      <Stack.Screen options={{ title: t('confirm.title') }} />
      <Wordmark size={30} logo />
      <View style={{ width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: failed ? colors.danger : colors.good }}>
        <Ionicons name={failed ? 'close' : 'checkmark'} size={52} color={colors.bg} />
      </View>
      <Text style={[s.h2, { textAlign: 'center', fontSize: 22 }]}>{t(failed ? 'confirm.failed' : 'confirm.ok')}</Text>
      <Text style={[s.muted, { textAlign: 'center', fontSize: 15, maxWidth: 420 }]}>{t(failed ? 'confirm.failedHint' : user ? 'confirm.signedIn' : 'confirm.hint')}</Text>
      <Pressable style={[s.button, { paddingHorizontal: 28 }]} onPress={() => router.replace('/account')}>
        <Text style={s.buttonText}>{t('confirm.open')}</Text>
      </Pressable>
      <Text style={[s.meta, { textAlign: 'center', fontFamily: fonts.body }]}>{t('confirm.pwa')}</Text>
    </View>
  );
}
