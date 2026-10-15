import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../lib/store';
import { colors, fonts } from './theme';

export interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress(): void;
  /** Icône pleine (favori actif…). */
  active?: boolean;
  /** Case à cocher à droite (option qu'on coche et décoche d'un appui). */
  checked?: boolean;
}

/** Menu d'actions ouvert par le bouton « ⋮ » en haut à droite, fermé par un appui à côté. */
export function Menu({ open, onClose, items }: { open: boolean; onClose(): void; items: MenuItem[] }) {
  const { t } = useStore();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('common.close')} />
      <View style={st.menu} accessibilityRole="menu">
        {items.map((x) => (
          <Pressable
            key={x.label}
            style={({ pressed }) => [st.item, pressed && st.pressed]}
            onPress={() => { onClose(); x.onPress(); }}
            accessibilityRole={x.checked !== undefined ? 'checkbox' : 'menuitem'}
            accessibilityState={x.checked !== undefined ? { checked: x.checked } : undefined}
          >
            <Ionicons name={x.icon} size={24} color={x.active ? colors.accent : colors.text} />
            <Text style={st.label}>{x.label}</Text>
            {x.checked !== undefined && (
              <Ionicons name={x.checked ? 'checkbox' : 'square-outline'} size={26} color={x.checked ? colors.accent : colors.muted} />
            )}
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

/** Bouton « ⋮ » de l'en-tête. */
export function MenuButton({ onPress, label }: { onPress(): void; label: string }) {
  return (
    <Pressable onPress={onPress} style={st.button} hitSlop={8} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
    </Pressable>
  );
}

const st = StyleSheet.create({
  menu: {
    position: 'absolute', top: 56, right: 12, minWidth: 260, maxWidth: 340, paddingVertical: 8,
    backgroundColor: colors.card, borderRadius: 22, borderWidth: 1, borderColor: colors.line,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 14 },
  pressed: { backgroundColor: colors.bg },
  label: { flex: 1, color: colors.text, fontFamily: fonts.bold, fontSize: 16 },
  button: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, marginRight: 8 },
});
