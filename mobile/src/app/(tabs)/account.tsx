import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Dropdown } from '../../components/Dropdown';
import { Panel } from '../../components/Stats';
import { colors, fonts, s } from '../../components/ui';
import { GAME_LIST, LANG_LABEL } from '../../lib/games';
import { useStore } from '../../lib/store';
import type { CardLang, GameId } from '../../lib/types';

const ALL_LANGS = Object.keys(LANG_LABEL) as CardLang[];

function confirm(message: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onYes();
    return;
  }
  Alert.alert('Confirmer', message, [{ text: 'Annuler', style: 'cancel' }, { text: 'Oui', style: 'destructive', onPress: onYes }]);
}

export default function Account() {
  const { settings, setSettings, collection, clear } = useStore();
  const [name, setName] = useState(settings.profileName ?? '');
  const count = collection.reduce((n, e) => n + e.quantity, 0);

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { gap: 14, maxWidth: 700, width: '100%', alignSelf: 'center' }]}>
      <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="person" size={44} color="#fff" />
        </View>
        <Text style={s.h2}>{settings.profileName || 'Dresseur'}</Text>
        <Text style={s.muted}>{count} carte{count > 1 ? 's' : ''} dans la collection</Text>
      </View>

      <Panel title="Profil">
        <TextInput
          style={s.input}
          placeholder="Ton pseudo"
          placeholderTextColor={colors.muted}
          value={name}
          onChangeText={setName}
          onBlur={() => setSettings({ profileName: name.trim() || undefined })}
          onSubmitEditing={() => setSettings({ profileName: name.trim() || undefined })}
          returnKeyType="done"
        />
        <Text style={[s.muted, { fontSize: 12 }]}>
          Bientôt : connexion (Apple, Google, e-mail) pour sauvegarder la collection et la retrouver sur tous tes appareils.
          Pour l'instant, elle est enregistrée sur cet appareil uniquement.
        </Text>
      </Panel>

      <Panel title="Préférences">
        <Dropdown
          label="Jeu par défaut"
          value={settings.game}
          options={[{ value: 'auto', label: 'Automatique (scanner)' }, ...GAME_LIST.map((g) => ({ value: g.id, label: g.label }))]}
          onChange={(g) => g && setSettings({ game: g as GameId | 'auto' })}
        />
        <Dropdown
          label="Langue des cartes"
          value={settings.lang}
          options={ALL_LANGS.map((l) => ({ value: l, label: LANG_LABEL[l] }))}
          onChange={(l) => l && setSettings({ lang: l as CardLang })}
        />
      </Panel>

      <Panel title="Collection">
        <Pressable style={s.ghost} onPress={() => router.push('/collection')}>
          <Text style={s.ghostText}>Voir ma collection</Text>
        </Pressable>
        <Pressable
          style={[s.ghost, { borderColor: colors.danger }]}
          onPress={() => confirm('Supprimer toutes les cartes de la collection ?', clear)}
          disabled={!collection.length}
        >
          <Text style={[s.ghostText, { color: colors.danger, fontFamily: fonts.bold }]}>Vider la collection</Text>
        </Pressable>
      </Panel>

      <Text style={[s.muted, { fontSize: 12, textAlign: 'center' }]}>
        PokéMarket · données TCGdex, OPTCG API et Riftcodex. Pokémon, One Piece et Riftbound sont des marques de leurs ayants droit.
      </Text>
    </ScrollView>
  );
}
