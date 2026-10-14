import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { AccountSection } from '../../components/AccountPanel';
import { Dropdown } from '../../components/Dropdown';
import { Panel } from '../../components/Stats';
import { colors, fonts, s } from '../../components/ui';
import { CURRENCIES, type Currency } from '../../lib/currency';
import { GAME_LIST, VISIBLE_LANGS } from '../../lib/games';
import type { AppLang } from '../../lib/i18n';
import { useStore } from '../../lib/store';
import type { CardLang, GameId } from '../../lib/types';

const CARD_LANGS: CardLang[] = VISIBLE_LANGS;
const CURRENCY_LABEL: Record<Currency, string> = { EUR: 'Euro (€)', USD: 'US Dollar ($)', JPY: 'Yen (¥)' };

function confirm(message: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onYes();
    return;
  }
  Alert.alert('', message, [{ text: 'Annuler / Cancel', style: 'cancel' }, { text: 'OK', style: 'destructive', onPress: onYes }]);
}

export default function Account() {
  const { settings, setSettings, collection, clear, t, langLabel, user } = useStore();
  const [name, setName] = useState(settings.profileName ?? '');
  const count = collection.reduce((n, e) => n + e.quantity, 0);
  const saveName = () => setSettings({ profileName: name.trim() || undefined });

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { gap: 14, maxWidth: 700, width: '100%', alignSelf: 'center', paddingBottom: 48 }]}>
      <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="person" size={44} color="#fff" />
        </View>
        <Text style={s.h2}>{settings.profileName || t('acc.trainer')}</Text>
        <Text style={s.muted}>{t('acc.inCollection', { n: count })}</Text>
        {user?.email ? <Text style={[s.muted, { fontSize: 12 }]}>{user.email}</Text> : null}
      </View>

      <Panel title={t('acc.profile')}>
        <TextInput
          style={s.input}
          placeholder={t('acc.nickname')}
          placeholderTextColor={colors.muted}
          value={name}
          onChangeText={setName}
          onBlur={saveName}
          onSubmitEditing={saveName}
          returnKeyType="done"
        />
      </Panel>

      <AccountSection />

      <Panel title={t('acc.prefs')}>
        <Dropdown
          label={t('lang.app')}
          value={settings.appLang}
          options={[{ value: 'fr', label: 'Français' }, { value: 'en', label: 'English' }]}
          onChange={(l) => l && setSettings({ appLang: l as AppLang })}
        />
        <Dropdown
          label={t('acc.currency')}
          value={settings.currency}
          options={CURRENCIES.map((c) => ({ value: c, label: CURRENCY_LABEL[c] }))}
          onChange={(c) => c && setSettings({ currency: c as Currency })}
        />
        <Dropdown
          label={t('acc.defaultGame')}
          value={settings.game === 'auto' ? 'pokemon' : settings.game}
          options={GAME_LIST.map((g) => ({ value: g.id, label: g.label }))}
          onChange={(g) => g && setSettings({ game: g as GameId })}
        />
        <Dropdown
          label={t('lang.cards')}
          value={settings.lang}
          options={CARD_LANGS.map((l) => ({ value: l, label: langLabel(l) }))}
          onChange={(l) => l && setSettings({ lang: l as CardLang })}
        />
      </Panel>

      <Panel title={t('acc.collection')}>
        <Pressable style={s.ghost} onPress={() => router.push('/collection')}>
          <Text style={s.ghostText}>{t('acc.see')}</Text>
        </Pressable>
        <Pressable
          style={[s.ghost, { borderColor: colors.danger }]}
          onPress={() => confirm(t('acc.clearConfirm'), clear)}
          disabled={!collection.length}
        >
          <Text style={[s.ghostText, { color: colors.danger, fontFamily: fonts.bold }]}>{t('acc.clear')}</Text>
        </Pressable>
      </Panel>

      <Text style={[s.muted, { fontSize: 12, textAlign: 'center' }]}>{t('acc.footer')}</Text>
      {!!process.env.EXPO_PUBLIC_VERSION && (
        <Text style={[s.muted, { fontSize: 13, textAlign: 'center', fontFamily: fonts.bold }]}>{t('acc.version', { v: process.env.EXPO_PUBLIC_VERSION })}</Text>
      )}
    </ScrollView>
  );
}
