import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LOGO_SVG } from './logoSvg';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PROVIDERS } from '../lib/cloud/config';
import { strongPassword } from '../lib/cloud/password';
import { saveUsername, sendPasswordReset, signInWith, signInWithPassword, signOut, signUpWithPassword, usernameAvailable } from '../lib/cloud/supabase';
import { normalizeUsername, validUsername } from '../lib/cloud/username';
import { useStore } from '../lib/store';
import { authError } from './AccountPanel';
import { PasswordRules } from './PasswordRules';
import { colors, fonts, s, Wordmark } from './ui';

type Mode = 'signup' | 'signin' | 'reset';

/** Saisie du pseudo : sans « @ » (déjà affiché devant), en minuscules, sans espaces. */
const cleanName = (v: string) => v.replace(/^@+/, '').replace(/\s+/g, '').toLowerCase();

/** Disponibilité d'un pseudo, vérifiée pendant la saisie (null : inconnue). */
function useAvailability(name: string): { checking: boolean; free: boolean | null } {
  const [state, setState] = useState<{ checking: boolean; free: boolean | null }>({ checking: false, free: null });
  useEffect(() => {
    if (!validUsername(name)) { setState({ checking: false, free: null }); return; }
    let alive = true;
    setState({ checking: true, free: null });
    const timer = setTimeout(() => {
      usernameAvailable(name).then((free) => alive && setState({ checking: false, free }), () => alive && setState({ checking: false, free: null }));
    }, 400);
    return () => { alive = false; clearTimeout(timer); };
  }, [name]);
  return state;
}

function Field({ icon, prefix, secure, ...props }: React.ComponentProps<typeof TextInput> & { icon: keyof typeof Ionicons.glyphMap; prefix?: string; secure?: boolean }) {
  const { t } = useStore();
  const [shown, setShown] = useState(false);
  return (
    <View style={st.field}>
      <Ionicons name={icon} size={18} color={colors.muted} />
      {!!prefix && <Text style={st.prefix}>{prefix}</Text>}
      <TextInput style={st.fieldInput} placeholderTextColor={colors.muted} secureTextEntry={secure && !shown} autoCapitalize="none" autoCorrect={false} {...props} />
      {secure && (
        <Pressable onPress={() => setShown(!shown)} hitSlop={10} accessibilityLabel={t('auth.showPassword')}>
          <Ionicons name={shown ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
        </Pressable>
      )}
    </View>
  );
}

/** Boutons Google et Apple (Apple : bientôt, abonnement Apple Developer requis). */
function SocialButtons({ onError }: { onError(e: unknown): void }) {
  const { t } = useStore();
  if (!PROVIDERS.google && !PROVIDERS.apple) return null;
  const go = (p: 'google' | 'apple') => signInWith(p).catch(onError);
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
        <Text style={s.meta}>{t('auth.or')}</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
      </View>
      {PROVIDERS.google && (
        <Pressable style={[st.social, { backgroundColor: '#fff' }]} onPress={() => go('google')}>
          <Ionicons name="logo-google" size={18} color="#1f1f1f" />
          <Text style={[st.socialText, { color: '#1f1f1f' }]}>{t('auth.google')}</Text>
        </Pressable>
      )}
      <Pressable style={[st.social, { backgroundColor: '#000', borderWidth: 1, borderColor: '#333' }, !PROVIDERS.apple && { opacity: 0.45 }]} onPress={() => go('apple')} disabled={!PROVIDERS.apple}>
        <Ionicons name="logo-apple" size={19} color="#fff" />
        <Text style={[st.socialText, { color: '#fff' }]}>{PROVIDERS.apple ? t('auth.apple') : t('auth.appleSoon')}</Text>
      </Pressable>
    </>
  );
}

/** Mise en page commune : marque, titre, puis le formulaire dans une carte. */
function Frame({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[st.page, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
        <View style={st.logo}>
          <Image source={{ uri: LOGO_SVG }} style={{ width: 84, height: 84 }} accessibilityIgnoresInvertColors />
          <Wordmark size={30} />
        </View>
        <Text style={st.title}>{title}</Text>
        <Text style={st.text}>{text}</Text>
        <View style={st.card}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * Écran d'arrivée : un compte est obligatoire pour garder la collection en mémoire. Création avec pseudo unique
 * (« @… »), e-mail et mot de passe fort, ou Google (pseudo choisi ensuite) ; connexion par e-mail et mot de passe,
 * ou Google. La session reste ensuite ouverte.
 */
export function Welcome() {
  const { t } = useStore();
  const [mode, setMode] = useState<Mode>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const username = normalizeUsername(name);
  const avail = useAvailability(mode === 'signup' ? username : '');

  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());
  // Nouveaux comptes : mot de passe fort ; connexion : n'importe quel mot de passe (comptes plus anciens).
  const ready = validEmail && (mode === 'reset' || (mode === 'signup' ? strongPassword(password) : password.length > 0))
    && (mode !== 'signup' || (validUsername(username) && avail.free !== false));
  const switchTo = (m: Mode) => { setMode(m); setError(null); setInfo(null); };

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    const e = email.trim();
    try {
      if (mode === 'signup') {
        if (await signUpWithPassword(e, password, username)) { setInfo(t('auth.confirmSent', { email: e })); setMode('signin'); }
      } else if (mode === 'signin') await signInWithPassword(e, password);
      else { await sendPasswordReset(e); setInfo(t('auth.resetSent', { email: e })); }
    } catch (err) {
      // Pseudo pris entre la vérification et l'envoi : la base refuse la création du compte.
      const m = err instanceof Error ? err.message : '';
      setError(mode === 'signup' && /database error|duplicate|unique/i.test(m) ? t('auth.usernameTaken') : authError(err, t));
    } finally {
      setBusy(false);
    }
  };

  const hint = mode !== 'signup' || !name ? null
    : !validUsername(username) ? { color: colors.muted, text: t('auth.usernameHint') }
    : avail.checking ? { color: colors.muted, text: '…' }
    : avail.free === false ? { color: colors.danger, text: t('auth.usernameTaken') }
    : avail.free ? { color: colors.good, text: `✓ ${t('auth.usernameFree')}` } : null;

  return (
    <Frame title={t('auth.welcome')} text={t('auth.tagline')}>
      {mode !== 'reset' && (
        <View style={st.tabs}>
          {(['signup', 'signin'] as const).map((m) => (
            <Pressable key={m} onPress={() => switchTo(m)} style={[st.tab, mode === m && st.tabOn]} accessibilityState={{ selected: mode === m }}>
              <Text style={[st.tabText, mode === m && { color: colors.bg }]}>{t(m === 'signin' ? 'auth.signIn' : 'auth.signUp')}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {mode === 'signup' && (
        <View style={{ gap: 6 }}>
          <Field icon="person-outline" prefix="@" placeholder={t('auth.username')} value={name} onChangeText={(v) => setName(cleanName(v))} maxLength={20} autoComplete="username-new" />
          {!!hint && <Text style={[st.hint, { color: hint.color }]}>{hint.text}</Text>}
        </View>
      )}
      <Field icon="mail-outline" placeholder={t('auth.email')} value={email} onChangeText={setEmail} autoComplete="email" keyboardType="email-address" inputMode="email" />
      {mode !== 'reset' && (
        <Field
          icon="lock-closed-outline" secure placeholder={t('auth.password')} value={password}
          onChangeText={setPassword} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} onSubmitEditing={submit}
        />
      )}
      {mode === 'signup' && <PasswordRules password={password} />}
      <Pressable style={[s.button, (!ready || busy) && { opacity: 0.5 }]} disabled={!ready || busy} onPress={submit}>
        {busy ? <ActivityIndicator color={colors.bg} /> : <Text style={s.buttonText}>{t(mode === 'signin' ? 'auth.signIn' : mode === 'signup' ? 'auth.create' : 'auth.sendReset')}</Text>}
      </Pressable>
      {mode !== 'signup' && (
        <Pressable onPress={() => switchTo(mode === 'reset' ? 'signin' : 'reset')} hitSlop={8}>
          <Text style={[s.meta, { textAlign: 'center' }]}>{t(mode === 'reset' ? 'auth.backToSignIn' : 'auth.forgot')}</Text>
        </Pressable>
      )}
      {!!info && <Text style={[st.hint, { color: colors.good, fontSize: 13 }]}>{info}</Text>}
      {!!error && <Text style={[st.hint, { color: colors.danger, fontSize: 13 }]}>{error}</Text>}
      {mode !== 'reset' && <SocialButtons onError={(e) => setError(authError(e, t))} />}
    </Frame>
  );
}

/** Compte connecté sans pseudo (créé avant les pseudos) : choix du pseudo avant d'entrer dans l'app. */
export function ChooseUsername() {
  const { t, user, setUsername } = useStore();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const username = normalizeUsername(name);
  const avail = useAvailability(username);
  const ready = validUsername(username) && avail.free !== false;
  const submit = async () => {
    if (!ready || busy || !user) return;
    setBusy(true);
    setError(null);
    try {
      await saveUsername(user.id, username);
      setUsername(username);
    } catch (err) {
      const m = err instanceof Error ? err.message : '';
      setError(/duplicate|unique/i.test(m) ? t('auth.usernameTaken') : authError(err, t));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Frame title={t('auth.chooseTitle')} text={t('auth.chooseText')}>
      <View style={{ gap: 6 }}>
        <Field icon="person-outline" prefix="@" placeholder={t('auth.username')} value={name} onChangeText={(v) => setName(cleanName(v))} maxLength={20} onSubmitEditing={submit} />
        <Text style={[st.hint, { color: !name || !validUsername(username) ? colors.muted : avail.free === false ? colors.danger : avail.free ? colors.good : colors.muted }]}>
          {!name || !validUsername(username) ? t('auth.usernameHint') : avail.checking ? '…' : avail.free === false ? t('auth.usernameTaken') : avail.free ? `✓ ${t('auth.usernameFree')}` : ''}
        </Text>
      </View>
      <Pressable style={[s.button, (!ready || busy) && { opacity: 0.5 }]} disabled={!ready || busy} onPress={submit}>
        {busy ? <ActivityIndicator color={colors.bg} /> : <Text style={s.buttonText}>{t('auth.save')}</Text>}
      </Pressable>
      {!!error && <Text style={[st.hint, { color: colors.danger, fontSize: 13 }]}>{error}</Text>}
      <Pressable onPress={() => signOut()} hitSlop={8}>
        <Text style={[s.meta, { textAlign: 'center' }]}>{t('auth.signOut')}</Text>
      </Pressable>
    </Frame>
  );
}

const st = StyleSheet.create({
  page: { flexGrow: 1, paddingHorizontal: 20, gap: 14, width: '100%', maxWidth: 480, alignSelf: 'center' },
  logo: { alignItems: 'center', gap: 12, marginBottom: 6 },
  title: { color: colors.text, fontFamily: fonts.heavy, fontSize: 24, textAlign: 'center' },
  text: { color: colors.muted, fontFamily: fonts.body, fontSize: 15, textAlign: 'center', lineHeight: 21, marginBottom: 6 },
  card: { backgroundColor: colors.card, borderRadius: 22, padding: 18, gap: 12, borderWidth: 1, borderColor: colors.line },
  tabs: { flexDirection: 'row', gap: 6, backgroundColor: colors.bg, borderRadius: 14, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabOn: { backgroundColor: colors.accent },
  tabText: { color: colors.text, fontFamily: fonts.bold, fontSize: 14 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bg, borderRadius: 14, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, minHeight: 50 },
  prefix: { color: colors.accent, fontFamily: fonts.heavy, fontSize: 16, marginRight: -6 },
  fieldInput: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 16, paddingVertical: 12, outlineStyle: 'none' } as object,
  social: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, borderRadius: 14, minHeight: 50 },
  socialText: { fontFamily: fonts.bold, fontSize: 15 },
  hint: { fontFamily: fonts.bold, fontSize: 12, paddingHorizontal: 4 },
});
