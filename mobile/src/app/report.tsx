import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts, s } from '../components/ui';
import type { TKey } from '../lib/i18n';
import { APP_VERSION } from '../lib/version';
import { useStore } from '../lib/store';
import { saveReport } from '../lib/cloud/reports';
import { SUPPORT_EMAIL, emailReport, mailtoLink, type Report } from '../lib/support';

const TOPICS = ['image', 'price', 'link', 'attributes', 'name', 'other'] as const;

/** Signaler un problème sur une carte (ou un message libre) : envoyé par e-mail au support. */
export default function ReportScreen() {
  const p = useLocalSearchParams<{ game?: string; id?: string; lang?: string; name?: string; number?: string; set?: string }>();
  const { t, user, appLang } = useStore();
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>('image');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [reason, setReason] = useState('');

  const card = p.id && p.game && p.lang ? { game: p.game, id: p.id, lang: p.lang, name: p.name, number: p.number, set: p.set } : undefined;
  const report: Report = {
    topic: t(`report.topic.${topic}` as TKey), message, email: email.trim() || undefined, card,
    version: APP_VERSION, appLang,
  };
  const send = async () => {
    setState('sending');
    // Base et e-mail en parallèle : le signalement est reçu dès que l'un des deux réussit.
    const [db, mail] = await Promise.allSettled([saveReport(report), emailReport(report)]);
    const ok = (db.status === 'fulfilled' && db.value) || (mail.status === 'fulfilled' && mail.value);
    // Diagnostic discret quand seul l'enregistrement a réussi (l'e-mail n'est pas parti).
    if (ok && mail.status === 'rejected') setReason(`e-mail : ${mail.reason instanceof Error ? mail.reason.message : String(mail.reason)}`);
    if (ok) { setState('sent'); return; }
    const err = [db, mail].map((x) => (x.status === 'rejected' ? (x.reason instanceof Error ? x.reason.message : String(x.reason)) : '')).filter(Boolean).join(' · ');
    setReason(err);
    setState('error');
  };

  if (state === 'sent') {
    return (
      <View style={[s.screen, { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }]}>
        <Stack.Screen options={{ title: t('report.title') }} />
        <View style={st.check}><Ionicons name="checkmark" size={44} color={colors.bg} /></View>
        <Text style={[s.h2, { textAlign: 'center' }]}>{t('report.sent')}</Text>
        <Text style={[s.muted, { textAlign: 'center' }]}>{t('report.sentHint')}</Text>
        {!!reason && <Text style={[s.meta, { textAlign: 'center', fontSize: 11 }]}>{reason}</Text>}
        <Pressable style={[s.button, { paddingHorizontal: 28 }]} onPress={() => router.back()}>
          <Text style={s.buttonText}>{t('report.back')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { maxWidth: 700, width: '100%', alignSelf: 'center', paddingBottom: 48 }]}>
      <Stack.Screen options={{ title: t('report.title') }} />
      <Text style={s.muted}>{t('report.intro')}</Text>
      {card && (
        <View style={st.card}>
          <Ionicons name="albums-outline" size={20} color={colors.muted} />
          <View style={{ flex: 1 }}>
            <Text style={s.name} numberOfLines={1}>{card.name ?? card.id}</Text>
            <Text style={s.meta} numberOfLines={1}>{[card.number, card.set, card.lang.toUpperCase()].filter(Boolean).join(' · ')}</Text>
          </View>
        </View>
      )}
      <Text style={st.label}>{t('report.topic')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {TOPICS.map((k) => (
          <Pressable key={k} onPress={() => setTopic(k)} style={[s.chip, topic === k && s.chipOn]} accessibilityState={{ selected: topic === k }}>
            <Text style={[s.chipText, topic === k && s.chipTextOn]}>{t(`report.topic.${k}` as TKey)}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={st.label}>{t('report.message')}</Text>
      <TextInput
        style={[s.input, { minHeight: 130, textAlignVertical: 'top' }]} multiline value={message} onChangeText={setMessage}
        placeholder={t('report.placeholder')} placeholderTextColor={colors.muted}
      />
      <Text style={st.label}>{t('report.email')}</Text>
      <TextInput
        style={s.input} value={email} onChangeText={setEmail} placeholder={t('auth.email')} placeholderTextColor={colors.muted}
        autoCapitalize="none" keyboardType="email-address" inputMode="email" autoComplete="email"
      />
      <Pressable style={[s.button, (message.trim().length < 3 || state === 'sending') && { opacity: 0.5 }]} disabled={message.trim().length < 3 || state === 'sending'} onPress={send}>
        {state === 'sending' ? <ActivityIndicator color={colors.bg} /> : <Text style={s.buttonText}>{t('report.send')}</Text>}
      </Pressable>
      {state === 'error' && (
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.danger, fontFamily: fonts.bold }}>{t('report.error')}</Text>
          {!!reason && <Text style={[s.meta, { fontSize: 12 }]}>{reason}</Text>}
          <Pressable style={s.ghost} onPress={() => Linking.openURL(mailtoLink(report))}>
            <Text style={s.ghostText}>{t('report.mail', { email: SUPPORT_EMAIL })}</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  label: { color: colors.muted, fontFamily: fonts.heavy, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 12, padding: 12 },
  check: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.good, alignItems: 'center', justifyContent: 'center' },
});
