import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import { loadProfilePublic, setProfilePublic } from '../lib/cloud/supabase';
import { normalizeUsername, validUsername } from '../lib/cloud/username';
import { shareLink } from '../lib/share';
import { useStore } from '../lib/store';
import { Panel } from './Stats';
import { colors, fonts, s } from './ui';

/** Adresse du profil public (« https://…/app/u/sacha_92 »). */
export function profileUrl(username: string): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const i = window.location.pathname.indexOf('/app');
    return `${window.location.origin}${i >= 0 ? window.location.pathname.slice(0, i) : ''}/app/u/${username}`;
  }
  return `https://bananaintrouble.github.io/tcgmarket/app/u/${username}`;
}

/** Onglet Compte : profil public (activation, partage du lien) et profils des amis. */
export function PublicProfilePanel() {
  const { t, user, username, settings } = useStore();
  const [isPublic, setIsPublic] = useState<boolean | null>(null);
  const [friend, setFriend] = useState('');
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    if (user) loadProfilePublic(user.id).then(setIsPublic, () => setIsPublic(null));
  }, [user?.id]);
  if (!user || !username) return null;

  const toggle = async () => {
    const next = !isPublic;
    setIsPublic(next);
    try { await setProfilePublic(user.id, next); } catch { setIsPublic(!next); setNote(t('prof.unavailable')); }
  };
  const share = async () => {
    const r = await shareLink(`@${username} · TCGMarket`, profileUrl(username));
    if (r === 'copied') { setNote(t('prof.copied')); setTimeout(() => setNote(null), 2500); }
  };
  const target = normalizeUsername(friend);
  const friends = settings.friends ?? [];

  return (
    <Panel title={t('prof.title')}>
      <Pressable onPress={toggle} disabled={isPublic === null && !note} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} accessibilityRole="switch" accessibilityState={{ checked: !!isPublic }}>
        <View style={{ width: 46, height: 28, borderRadius: 14, backgroundColor: isPublic ? colors.good : colors.line, justifyContent: 'center', paddingHorizontal: 3 }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignSelf: isPublic ? 'flex-end' : 'flex-start' }} />
        </View>
        <Text style={[s.name, { flex: 1 }]}>{t('prof.public')}</Text>
      </Pressable>
      <Text style={[s.muted, { fontSize: 12 }]}>{t('prof.publicHint')}</Text>
      {isPublic && (
        <Pressable style={[s.ghost, { flexDirection: 'row', justifyContent: 'center', gap: 8 }]} onPress={share}>
          <Ionicons name="share-outline" size={18} color={colors.text} />
          <Text style={s.ghostText}>{t('prof.copy')}</Text>
        </Pressable>
      )}
      {!!note && <Text style={{ color: colors.accent, fontFamily: fonts.bold, fontSize: 13 }}>{note}</Text>}

      <Text style={[s.name, { marginTop: 6 }]}>{t('prof.friend')}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          style={[s.input, { flex: 1 }]} value={friend} onChangeText={setFriend} placeholder="@pseudo" placeholderTextColor={colors.muted}
          autoCapitalize="none" autoCorrect={false} onSubmitEditing={() => validUsername(target) && router.push(`/u/${target}`)}
        />
        <Pressable style={[s.button, { paddingHorizontal: 18 }, !validUsername(target) && { opacity: 0.5 }]} disabled={!validUsername(target)} onPress={() => router.push(`/u/${target}`)}>
          <Text style={s.buttonText}>{t('prof.see')}</Text>
        </Pressable>
      </View>
      {friends.length > 0 && (
        <View style={{ gap: 6 }}>
          <Text style={[s.muted, { fontSize: 12 }]}>{t('prof.friends')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {friends.map((f) => (
              <Pressable key={f} onPress={() => router.push(`/u/${f}`)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.line }}>
                <Text style={{ color: colors.accent, fontFamily: fonts.bold }}>@{f}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </Panel>
  );
}
