import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AVATARS, isPhoto, pickPhoto } from '../lib/avatar';
import { useStore } from '../lib/store';
import { Avatar } from './Avatar';
import { colors, fonts } from './theme';

/** Choix de la photo de profil : 9 images par défaut, une photo de l'appareil, ou aucune. */
export function AvatarPicker({ visible, onClose }: { visible: boolean; onClose(): void }) {
  const { t, settings, setSettings } = useStore();
  const insets = useSafeAreaInsets();
  const choose = (avatar?: string) => { setSettings({ avatar }); onClose(); };
  const importPhoto = async () => {
    const photo = await pickPhoto();
    if (photo) choose(photo);
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={st.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
      <View style={[st.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={st.handle} />
        <Text style={st.title}>{t('acc.photo')}</Text>
        <View style={st.grid}>
          {AVATARS.map((a) => {
            const on = settings.avatar === a.id;
            return (
              <Pressable key={a.id} onPress={() => choose(a.id)} style={[st.choice, on && st.choiceOn]} accessibilityState={{ selected: on }}>
                <Avatar value={a.id} size={72} />
              </Pressable>
            );
          })}
        </View>
        {Platform.OS === 'web' && (
          <Pressable style={st.action} onPress={importPhoto}>
            <Ionicons name="image-outline" size={20} color={colors.text} />
            <Text style={st.actionText}>{t('acc.photoPick')}</Text>
          </Pressable>
        )}
        {!!settings.avatar && (
          <Pressable style={st.action} onPress={() => choose(undefined)}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
            <Text style={[st.actionText, { color: colors.danger }]}>{t(isPhoto(settings.avatar) ? 'acc.photoRemove' : 'acc.photoReset')}</Text>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 14, maxWidth: 700, alignSelf: 'center', width: '100%' },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line, alignSelf: 'center' },
  title: { color: colors.text, fontFamily: fonts.heavy, fontSize: 18, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, maxWidth: 300, alignSelf: 'center' },
  choice: { padding: 4, borderRadius: 44, borderWidth: 3, borderColor: 'transparent' },
  choiceOn: { borderColor: colors.accent },
  action: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.line, paddingVertical: 13 },
  actionText: { color: colors.text, fontFamily: fonts.bold, fontSize: 15 },
});
