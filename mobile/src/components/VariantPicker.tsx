import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../lib/store';
import type { CardVariant } from '../lib/types';
import { variantIcon, variantLabel } from '../lib/variants';
import { Sheet, SheetOption } from './Sheet';
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
      <Sheet title={t('variant.all')} open={open} onClose={() => setOpen(false)}>
        {variants.map((v) => {
          const n = owned(v.key);
          return (
            <SheetOption
              key={v.key} icon={variantIcon(v.key)} label={variantLabel(v.key, appLang)} on={v.key === current.key}
              detail={[v.price ? money(v.price, 'EUR') : t('variant.noPrice'), n ? t('variant.owned', { n }) : ''].filter(Boolean).join(' · ')}
              onPress={() => { onChange(v.key); setOpen(false); }}
            />
          );
        })}
      </Sheet>
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
});
