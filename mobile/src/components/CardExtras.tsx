import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatMoney, type Currency } from '../lib/currency';
import { useStore } from '../lib/store';
import type { Card } from '../lib/types';
import { collectionKey } from '../lib/variants';
import { gainOf, parsePrice } from '../lib/wishlist';
import { CONDITIONS, CONDITION_NAMES, GRADERS, conditionFactor, copiesOf, copyLabel, copyValue, unitValue, type CopyDetails } from '../lib/condition';
import { colors, fonts, s } from './ui';

/** Saisie d'un prix (enregistré en quittant le champ). */
function PriceInput({ value, onSave, placeholder, currency }: { value?: number; onSave(v?: number): void; placeholder: string; currency: string }) {
  const { locale } = useStore();
  const show = (v?: number) => (v === undefined ? '' : v.toLocaleString(locale, { maximumFractionDigits: 2 }));
  const [text, setText] = useState(show(value));
  useEffect(() => setText(show(value)), [value]);
  const save = () => onSave(parsePrice(text));
  const symbol = formatMoney(0, currency as Currency, locale).replace(/[\d\s.,]/g, '');
  return (
    <View style={st.inputRow}>
      <TextInput
        style={st.input} value={text} onChangeText={setText} onBlur={save} onSubmitEditing={save}
        placeholder={placeholder} placeholderTextColor={colors.muted} keyboardType="decimal-pad" inputMode="decimal" returnKeyType="done"
      />
      <Text style={st.symbol}>{symbol}</Text>
    </View>
  );
}

function Chip({ label, on, onPress, hint }: { label: string; on?: boolean; onPress(): void; hint?: string }) {
  return (
    <Pressable onPress={onPress} style={[st.chip, on && st.chipOn]} accessibilityState={{ selected: !!on }} accessibilityLabel={hint ?? label}>
      <Text style={[st.chipText, on && { color: colors.bg }]}>{label}</Text>
    </Pressable>
  );
}

/** Variation colorée : « +3,20 € (+25 %) ». */
export function GainText({ delta, pct, size = 15 }: { delta: number; pct: number; size?: number }) {
  const { settings, locale } = useStore();
  const up = delta >= 0;
  const sign = up ? '+' : '−';
  return (
    <Text style={{ color: up ? colors.good : colors.danger, fontFamily: fonts.heavy, fontSize: size }}>
      {sign}{formatMoney(Math.abs(delta), settings.currency, locale)} ({sign}{Math.abs(pct).toLocaleString(locale, { maximumFractionDigits: 1 })} %)
    </Text>
  );
}

/**
 * Sous le bouton « Ajouter » de la fiche carte : liste de souhaits (avec prix cible) et, pour une carte possédée,
 * prix payé et plus-value.
 */
export function CardExtras({ card }: { card: Card }) {
  const { t, collection, settings, inWishlist, toggleWish, setWishTarget, setPaid, updateEntry, toCurrency, locale, deals } = useStore();
  const wish = inWishlist(card);
  const entry = collection.find((e) => collectionKey(e.card) === collectionKey(card));
  const gain = entry ? gainOf([{ ...entry, card }], toCurrency) : null;
  const unit = entry ? unitValue({ ...entry, card }, toCurrency) : undefined;
  const fmt = (v: number) => formatMoney(v, settings.currency, locale);
  const deal = !!wish && deals.some((w) => collectionKey(w.card) === collectionKey(card));
  // Exemplaire modifié (plusieurs exemplaires) : undefined = tous.
  const [copy, setCopy] = useState<number | undefined>(undefined);
  const copies = entry ? copiesOf(entry) : [];
  const sel = copy !== undefined && copy < copies.length ? copy : undefined;
  // Détails affichés : ceux de l'exemplaire choisi, ceux de la ligne, rien quand les exemplaires diffèrent.
  const d: CopyDetails = sel !== undefined ? copies[sel] : entry?.copies ? {} : copies[0] ?? {};
  const mixed = sel === undefined && !!entry?.copies;
  const edit = (patch: CopyDetails) => updateEntry(card, patch, sel);
  const selUnit = sel !== undefined ? copyValue(card, d, toCurrency) : unit;
  const selFactor = sel !== undefined ? conditionFactor({ card, quantity: 1, ...d }) : entry ? conditionFactor(entry) : 1;

  return (
    <View style={{ gap: 10 }}>
      <Pressable style={[s.ghost, st.wishBtn, wish && { borderColor: colors.accent }]} onPress={() => toggleWish(card)} accessibilityState={{ selected: !!wish }}>
        <Ionicons name={wish ? 'heart' : 'heart-outline'} size={19} color={wish ? colors.accent : colors.text} />
        <Text style={[s.ghostText, wish && { color: colors.accent }]}>{t(wish ? 'wish.added' : 'wish.add')}</Text>
      </Pressable>
      {wish && (
        <View style={st.box}>
          <Text style={st.label}>{t('wish.target')}</Text>
          <PriceInput value={wish.target} currency={wish.currency ?? settings.currency} placeholder="—" onSave={(v) => setWishTarget(card, v)} />
          <Text style={st.hint}>{t('wish.targetHint')}</Text>
          {deal && <Text style={st.deal}>🔔 {t('wish.deal')}</Text>}
        </View>
      )}
      {!!entry && entry.quantity > 1 && (
        <View style={st.box}>
          <Text style={st.label}>{t('copy.title')}</Text>
          <View style={st.chips}>
            <Chip label={t('copy.all')} on={sel === undefined} onPress={() => setCopy(undefined)} />
            {copies.map((c, i) => {
              const l = copyLabel(c);
              return <Chip key={i} label={`#${i + 1}${l ? ` · ${l}` : ''}`} on={sel === i} onPress={() => setCopy(i)} />;
            })}
          </View>
          <Text style={st.hint}>{t(mixed ? 'copy.mixed' : sel === undefined ? 'copy.allHint' : 'copy.oneHint', { n: (sel ?? 0) + 1 })}</Text>
        </View>
      )}
      {!!entry && (
        <View style={st.box}>
          <Text style={st.label}>{t('cond.title')}{sel !== undefined ? ` · #${sel + 1}` : ''}</Text>
          <View style={st.chips}>
            {CONDITIONS.map((c) => (
              <Chip key={c} label={c} on={!d.graded && d.condition === c} onPress={() => edit({ condition: d.condition === c ? undefined : c, graded: undefined })} hint={CONDITION_NAMES[c]} />
            ))}
            <Chip label={`🏅 ${t('cond.graded')}`} on={!!d.graded} onPress={() => edit(d.graded ? { graded: undefined, value: undefined, valueCurrency: undefined } : { graded: { by: 'PSA', grade: '10' } })} />
          </View>
          {d.graded && (
            <View style={{ gap: 6 }}>
              <Text style={st.label}>{t('cond.company')}</Text>
              <View style={st.chips}>
                {GRADERS.map((g) => <Chip key={g} label={g} on={d.graded?.by === g} onPress={() => edit({ graded: { by: g, grade: d.graded?.grade ?? '10' } })} />)}
              </View>
              <Text style={st.label}>{t('cond.grade')}</Text>
              <View style={st.chips}>
                {['10', '9.5', '9', '8.5', '8', '7', '6', '5'].map((g) => <Chip key={g} label={g} on={d.graded?.grade === g} onPress={() => edit({ graded: { by: d.graded?.by ?? 'PSA', grade: g } })} />)}
              </View>
              <Text style={st.label}>{t('cond.value')}</Text>
              <PriceInput value={d.value} currency={d.valueCurrency ?? settings.currency} placeholder="—" onSave={(v) => edit({ value: v, valueCurrency: v === undefined ? undefined : settings.currency })} />
              <Text style={st.hint}>{t('cond.valueHint')}</Text>
            </View>
          )}
          {selUnit !== undefined && (
            <Text style={st.hint}>
              {t('cond.used', { v: fmt(selUnit) })}{selFactor !== 1 ? ` · ${t('cond.factor', { f: (Math.round(selFactor * 100) / 100).toLocaleString(locale) })}` : ''}
            </Text>
          )}
          <Chip label={`⇄ ${t('trade.toggle')}`} on={!!entry.trade} onPress={() => updateEntry(card, { trade: !entry.trade || undefined })} />
        </View>
      )}
      {!!entry && (
        <View style={st.box}>
          <Text style={st.label}>{t('paid.title')}{sel !== undefined ? ` · #${sel + 1}` : ''}</Text>
          <PriceInput value={d.paid} currency={d.paidCurrency ?? settings.currency} placeholder={t('paid.placeholder')} onSave={(v) => setPaid(card, v, sel)} />
          {gain && (
            <View style={{ gap: 2 }}>
              <Text style={st.label}>{t(gain.delta >= 0 ? 'paid.gain' : 'paid.loss')}{gain.count > 1 ? ` · ×${gain.count}` : ''}</Text>
              <GainText delta={gain.delta} pct={gain.pct} />
              <Text style={st.hint}>{t('paid.detail', { paid: fmt(gain.paid), value: fmt(gain.value) })}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  wishBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  box: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 6 },
  label: { color: colors.muted, fontFamily: fonts.bold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 },
  hint: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  deal: { color: colors.good, fontFamily: fonts.heavy, fontSize: 14 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: 12, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12 },
  input: { flex: 1, color: colors.text, fontFamily: fonts.bold, fontSize: 17, paddingVertical: 10, outlineStyle: 'none' } as object,
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg, alignSelf: 'flex-start' },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontFamily: fonts.bold, fontSize: 13 },
  symbol: { color: colors.muted, fontFamily: fonts.bold, fontSize: 16 },
});
