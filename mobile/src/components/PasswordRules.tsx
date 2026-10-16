import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { passwordChecks } from '../lib/cloud/password';
import { useStore } from '../lib/store';
import { colors, fonts } from './theme';

/** Règles du mot de passe, cochées au fur et à mesure de la saisie. */
export function PasswordRules({ password }: { password: string }) {
  const { t } = useStore();
  const c = passwordChecks(password);
  const rows = [[c.length, 'auth.pwLength'], [c.upper, 'auth.pwUpper'], [c.lower, 'auth.pwLower'], [c.special, 'auth.pwSpecial']] as const;
  return (
    <View style={{ gap: 4, paddingHorizontal: 4 }}>
      {rows.map(([ok, key]) => (
        <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name={ok ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={ok ? colors.good : colors.muted} />
          <Text style={[st.hint, { color: ok ? colors.good : colors.muted }]}>{t(key)}</Text>
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({ hint: { fontFamily: fonts.bold, fontSize: 12 } });
