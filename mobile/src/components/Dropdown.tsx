import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { normalize } from '../lib/search';
import { useStore } from '../lib/store';
import { colors, fonts, s } from './ui';

export interface Option {
  value: string;
  label: string;
}

interface Props {
  label: string;
  value?: string;
  options: Option[];
  onChange(value: string | undefined): void;
  /** Libellé de l'option « tout » ; absent = pas de remise à zéro possible. */
  allLabel?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Menu déroulant : un champ qui ouvre la liste des choix (avec recherche quand elle est longue). */
export function Dropdown({ label, value, options, onChange, allLabel, disabled, style }: Props) {
  const { t } = useStore();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const current = options.find((o) => o.value === value)?.label;
  const list = useMemo(() => {
    const n = normalize(q);
    const filtered = options.filter((o) => !n || normalize(o.label).includes(n));
    return allLabel ? [{ value: '', label: allLabel }, ...filtered] : filtered;
  }, [options, q, allLabel]);

  return (
    <>
      <Pressable
        style={[st.field, style, disabled && { opacity: 0.5 }]}
        onPress={() => !disabled && setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label} : ${current ?? allLabel ?? ''}`}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.label}>{label}</Text>
          <Text style={[st.value, value ? { color: colors.text } : null]} numberOfLines={1}>{current ?? allLabel ?? '—'}</Text>
        </View>
        <Ionicons name="chevron-down" size={16} color={colors.muted} />
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)} presentationStyle="pageSheet">
        <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
          <View style={st.header}>
            <Text style={s.h2}>{label}</Text>
            <Pressable onPress={() => setOpen(false)} style={st.close} accessibilityLabel={t('common.close')}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          {options.length > 12 && (
            <TextInput
              style={[s.input, { marginHorizontal: 16, marginBottom: 8 }]}
              placeholder={t('common.filterList')}
              placeholderTextColor={colors.muted}
              value={q}
              onChangeText={setQ}
              autoCorrect={false}
            />
          )}
          <FlatList
            data={list}
            keyExtractor={(o) => o.value || '__all'}
            keyboardShouldPersistTaps="handled"
            // Hauteur bornée par l'écran : sans flex: 1, une longue liste dépasse et ne défile pas.
            style={{ flex: 1, paddingHorizontal: 16 }}
            contentContainerStyle={{ paddingBottom: 24, gap: 6 }}
            renderItem={({ item }) => {
              const on = (value ?? '') === item.value;
              return (
                <Pressable
                  style={[st.row, on && { borderColor: colors.good }]}
                  onPress={() => { onChange(item.value || undefined); setOpen(false); setQ(''); }}
                >
                  <Text style={[s.name, { flex: 1 }, on && { color: colors.good }]} numberOfLines={2}>{item.label}</Text>
                  {on && <Ionicons name="checkmark" size={18} color={colors.good} />}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const st = StyleSheet.create({
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 52, paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.line,
  },
  label: { color: colors.muted, fontFamily: fonts.bold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { color: colors.muted, fontFamily: fonts.bold, fontSize: 14, marginTop: 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, minHeight: 48,
    backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.card,
  },
});
