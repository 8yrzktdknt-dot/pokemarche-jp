import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../lib/store';
import { colors, fonts } from './ui';

/** Feuille qui monte du bas de l'écran (choix de variante, tri, filtres), fermée par la croix ou un appui à côté. */
export function Sheet({ title, open, onClose, children }: { title: string; open: boolean; onClose(): void; children: ReactNode }) {
  const { t } = useStore();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={st.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
      <View style={st.sheet}>
        <View style={st.head}>
          <Text style={st.title}>{title}</Text>
          <Pressable style={st.close} onPress={onClose} accessibilityLabel={t('common.close')}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 32 }}>{children}</ScrollView>
      </View>
    </Modal>
  );
}

/** Ligne de choix d'une feuille : icône, libellé, détail, coche quand elle est choisie. */
export function SheetOption({ icon, label, detail, on, onPress }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; detail?: string; on: boolean; onPress(): void;
}) {
  return (
    <Pressable style={[st.item, on && st.itemOn]} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }}>
      <Ionicons name={icon} size={24} color={on ? colors.accent : colors.text} />
      <View style={{ flex: 1 }}>
        <Text style={st.itemName}>{label}</Text>
        {!!detail && <Text style={st.itemMeta}>{detail}</Text>}
      </View>
      <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={on ? colors.accent : colors.muted} />
    </Pressable>
  );
}

/** Intitulé d'un groupe de choix dans une feuille (« Ordre », « Par »). */
export function SheetLabel({ children }: { children: string }) {
  return <Text style={st.label}>{children}</Text>;
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '80%', backgroundColor: colors.bg,
    borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: colors.line,
    paddingHorizontal: 16, paddingTop: 20, gap: 16,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontFamily: fonts.heavy, fontSize: 22 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  label: { color: colors.muted, fontFamily: fonts.bold, fontSize: 13, marginTop: 4 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card,
    borderRadius: 16, borderWidth: 1, borderColor: colors.line, paddingVertical: 14, paddingHorizontal: 16,
  },
  itemOn: { borderColor: colors.accent },
  itemName: { color: colors.text, fontFamily: fonts.heavy, fontSize: 16 },
  itemMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
});
