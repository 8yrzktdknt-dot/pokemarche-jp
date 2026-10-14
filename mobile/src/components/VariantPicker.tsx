import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../lib/store';
import type { CardVariant } from '../lib/types';
import { variantIcon, variantLabel } from '../lib/variants';
import { colors, fonts } from './ui';

/**
 * Section « Variante » de la fiche carte : une seule variante → simple ligne (Normale, Holo…) ;
 * plusieurs → menu déroulant (feuille du bas) avec le prix Cardmarket de chacune et le nombre possédé.
 */
export function VariantPicker({ variants, value, onChange, owned }: {
  variants: CardVariant[];
  value?: string;
  onChange(key: string): void;
  /** Exemplaires possédés par variante. */
  owned: (key: string) => number;
}) {
  const { t, appLang, money } = useStore();
  const [open, setOpen] = useState(false);
  const current = variants.find((v) => v.key === value) ?? variants[0];
  const many = variants.length > 1;
  return (
    <>
      <Pressable
        style={st.box} disabled={!many} onPress={() => setOpen(true)}
        accessibilityRole={many ? 'button' : undefined} accessibilityLabel={`${t('variant.title')} : ${variantLabel(current.key, appLang)}`}>
        <Ionicons name={variantIcon(current.key)} size={24} color={colors.text} />
        <View style={{ flex: 1 }}>
          <Text style={st.label}>{many ? t('variant.count', { n: variants.length }) : t('variant.title')}</Text>
          <Text style={st.value}>{variantLabel(current.key, appLang)}</Text>
        </View>
        {many && <Ionicons name="chevron-down" size={22} color={colors.muted} />}
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={st.backdrop} onPress={() => setOpen(false)} accessibilityLabel={t('common.close')} />
        <View style={st.sheet}>
          <View style={st.head}>
            <Text style={st.title}>{t('variant.all')}</Text>
            <Pressable style={st.close} onPress={() => setOpen(false)} accessibilityLabel={t('common.close')}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 32 }}>
            {variants.map((v) => {
              const on = v.key === current.key;
              const n = owned(v.key);
              return (
                <Pressable
                  key={v.key} style={[st.item, on && st.itemOn]} accessibilityState={{ selected: on }}
                  onPress={() => { onChange(v.key); setOpen(false); }}>
                  <Ionicons name={variantIcon(v.key)} size={24} color={colors.text} />
                  <View style={{ flex: 1 }}>
                    <Text style={st.itemName}>{variantLabel(v.key, appLang)}</Text>
                    <Text style={st.itemMeta}>
                      {[v.price ? money(v.price, 'EUR') : t('variant.noPrice'), n ? t('variant.owned', { n }) : ''].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={on ? colors.accent : colors.muted} />
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const st = StyleSheet.create({
  box: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card,
    borderRadius: 16, borderWidth: 1, borderColor: colors.line, paddingVertical: 12, paddingHorizontal: 16,
  },
  label: { color: colors.muted, fontFamily: fonts.body, fontSize: 13 },
  value: { color: colors.text, fontFamily: fonts.heavy, fontSize: 18, marginTop: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '75%', backgroundColor: colors.bg,
    borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: colors.line,
    paddingHorizontal: 16, paddingTop: 20, gap: 16,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontFamily: fonts.heavy, fontSize: 22 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card,
    borderRadius: 16, borderWidth: 1, borderColor: colors.line, paddingVertical: 14, paddingHorizontal: 16,
  },
  itemOn: { borderColor: colors.accent },
  itemName: { color: colors.text, fontFamily: fonts.heavy, fontSize: 16 },
  itemMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
});
