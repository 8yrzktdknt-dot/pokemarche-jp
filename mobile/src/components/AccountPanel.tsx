import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { PROVIDERS, cloudEnabled } from '../lib/cloud/config';
import { sendEmailCode, signInWith, signOut, verifyEmailCode } from '../lib/cloud/supabase';
import { useStore } from '../lib/store';
import { Panel } from './Stats';
import { colors, fonts, s } from './ui';

/** Connexion (code par e-mail, Google, Apple) et état de la sauvegarde de la collection sur le compte. */
export function AccountPanel() {
  const { t, user, sync } = useStore();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!cloudEnabled()) return <Text style={[s.muted, { fontSize: 12 }]}>{t('acc.soon')}</Text>;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try { await fn(); } catch (e) { setError(e instanceof Error && e.message ? e.message : t('auth.error')); } finally { setBusy(false); }
  };

  if (user) {
    const label = { off: '', syncing: t('auth.syncing'), ok: t('auth.synced'), error: t('auth.syncError') }[sync];
    return (
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name={user.provider === 'google' ? 'logo-google' : user.provider === 'apple' ? 'logo-apple' : 'mail'} size={20} color={colors.text} />
          <Text style={[s.name, { flex: 1 }]} numberOfLines={1}>{user.email ?? t('auth.connected')}</Text>
        </View>
        {!!label && (
          <Text style={[s.meta, { color: sync === 'error' ? colors.danger : sync === 'ok' ? colors.good : colors.muted }]}>
            {sync === 'ok' ? '✓ ' : ''}{label}
          </Text>
        )}
        <Pressable style={s.ghost} onPress={() => run(signOut)} disabled={busy}>
          <Text style={s.ghostText}>{t('auth.signOut')}</Text>
        </Pressable>
      </View>
    );
  }

  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());
  return (
    <View style={{ gap: 10 }}>
      <Text style={[s.muted, { fontSize: 13 }]}>{t('auth.why')}</Text>
      {step === 'email' ? (
        <>
          <TextInput
            style={s.input} placeholder={t('auth.email')} placeholderTextColor={colors.muted} value={email}
            onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" inputMode="email"
            onSubmitEditing={() => validEmail && run(async () => { await sendEmailCode(email.trim()); setStep('code'); })}
          />
          <Pressable
            style={[s.button, (!validEmail || busy) && { opacity: 0.5 }]} disabled={!validEmail || busy}
            onPress={() => run(async () => { await sendEmailCode(email.trim()); setStep('code'); })}
          >
            {busy ? <ActivityIndicator color={colors.bg} /> : <Text style={s.buttonText}>{t('auth.sendCode')}</Text>}
          </Pressable>
        </>
      ) : (
        <>
          <Text style={[s.meta, { fontSize: 13 }]}>{t('auth.codeSent', { email: email.trim() })}</Text>
          <TextInput
            style={[s.input, { letterSpacing: 6, textAlign: 'center', fontSize: 22 }]} placeholder="123456" placeholderTextColor={colors.muted}
            value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 8))} keyboardType="number-pad" inputMode="numeric" autoComplete="one-time-code"
          />
          <Pressable
            style={[s.button, (code.length < 6 || busy) && { opacity: 0.5 }]} disabled={code.length < 6 || busy}
            onPress={() => run(() => verifyEmailCode(email.trim(), code))}
          >
            {busy ? <ActivityIndicator color={colors.bg} /> : <Text style={s.buttonText}>{t('auth.verify')}</Text>}
          </Pressable>
          <Pressable onPress={() => { setStep('email'); setCode(''); }}><Text style={[s.meta, { textAlign: 'center' }]}>{t('auth.changeEmail')}</Text></Pressable>
        </>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 2 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
        <Text style={s.meta}>{t('auth.or')}</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
      </View>
      {PROVIDERS.google && (
        <Pressable style={[s.ghost, { flexDirection: 'row', justifyContent: 'center', gap: 10, backgroundColor: '#fff', borderColor: '#fff' }]} onPress={() => run(() => signInWith('google'))} disabled={busy}>
          <Ionicons name="logo-google" size={18} color="#1f1f1f" />
          <Text style={[s.ghostText, { color: '#1f1f1f' }]}>{t('auth.google')}</Text>
        </Pressable>
      )}
      <Pressable
        style={[s.ghost, { flexDirection: 'row', justifyContent: 'center', gap: 10, backgroundColor: '#000', borderColor: '#000' }, !PROVIDERS.apple && { opacity: 0.45 }]}
        onPress={() => run(() => signInWith('apple'))} disabled={busy || !PROVIDERS.apple}
      >
        <Ionicons name="logo-apple" size={18} color="#fff" />
        <Text style={[s.ghostText, { color: '#fff' }]}>{PROVIDERS.apple ? t('auth.apple') : t('auth.appleSoon')}</Text>
      </Pressable>
      {!!error && <Text style={{ color: colors.danger, fontFamily: fonts.bold, fontSize: 13 }}>{error}</Text>}
    </View>
  );
}

export function AccountSection() {
  const { t } = useStore();
  return <Panel title={t('auth.title')}><AccountPanel /></Panel>;
}
