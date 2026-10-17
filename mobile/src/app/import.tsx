import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Dropdown } from '../components/Dropdown';
import { CardRow, colors, fonts, s } from '../components/ui';
import { GAMES, GAME_LIST, VISIBLE_LANGS } from '../lib/games';
import { resolveImport, rowsFromCsv, type ImportDeps, type ImportResult } from '../lib/importCsv';
import { useStore } from '../lib/store';
import type { CardLang, GameId } from '../lib/types';

const deps: ImportDeps = {
  langs: (g) => GAMES[g].langs,
  sets: async (g, l) => (await GAMES[g].blocs(l)).flatMap((b) => b.sets),
  setCards: async (g, id, l) => (await GAMES[g].setCards(id, l)).cards,
  search: (g, text, l) => GAMES[g].search({ text, facets: {}, sort: 'relevance' }, l),
};

/** Fichier choisi sur l'appareil (web), lu comme texte. */
function pickFile(): Promise<string | null> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.tsv,.txt,text/csv,text/plain';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      file.text().then(resolve, () => resolve(null));
    };
    input.click();
  });
}

/** Import d'une collection exportée en CSV (Cardmarket, Collectr, Dragon Shield, TCGplayer, tableur…). */
export default function Import() {
  const { t, settings, langLabel, importEntries } = useStore();
  const [game, setGame] = useState<GameId | ''>('');
  const [lang, setLang] = useState<CardLang>(settings.lang);
  const [text, setText] = useState('');
  const [file, setFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [imported, setImported] = useState<number | null>(null);

  const analyse = async (csv: string) => {
    setError(null); setResult(null); setImported(null);
    const rows = rowsFromCsv(csv, settings.currency);
    if (!rows) return setError(t('imp.badFile'));
    if (!rows.length) return setError(t('imp.empty'));
    setProgress({ done: 0, total: rows.length });
    try {
      setResult(await resolveImport(rows, { game: game || undefined, lang }, deps, (done) => setProgress({ done, total: rows.length })));
    } catch {
      setError(t('imp.error'));
    } finally {
      setProgress(null);
    }
  };
  const choose = async () => {
    const content = await pickFile();
    if (content === null) return;
    setFile(content);
    setText('');
    analyse(content);
  };
  const copies = result?.found.reduce((a, f) => a + f.row.quantity, 0) ?? 0;
  const doImport = () => {
    if (!result) return;
    importEntries(result.found.map((f) => ({ card: f.card, quantity: f.row.quantity, details: f.row.details })));
    setImported(copies);
    setResult(null);
    setFile(null);
    setText('');
  };

  const chip = (on: boolean) => ({ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: on ? colors.accent : colors.line, backgroundColor: on ? colors.accent : 'transparent' });
  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12, maxWidth: 700, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
      <Text style={s.muted}>{t('imp.intro')}</Text>

      <Text style={s.name}>{t('imp.game')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {[{ id: '' as const, label: t('imp.auto') }, ...GAME_LIST.map((g) => ({ id: g.id, label: g.label }))].map((g) => (
          <Pressable key={g.id || 'auto'} onPress={() => setGame(g.id)} style={chip(game === g.id)}>
            <Text style={{ color: game === g.id ? colors.bg : colors.text, fontFamily: fonts.bold, fontSize: 13 }}>{g.label}</Text>
          </Pressable>
        ))}
      </View>
      <Dropdown
        label={t('imp.lang')}
        value={lang}
        options={VISIBLE_LANGS.map((l) => ({ value: l, label: langLabel(l) }))}
        onChange={(l) => l && setLang(l as CardLang)}
      />
      <Text style={[s.muted, { fontSize: 12 }]}>{t('imp.langHint')}</Text>

      {Platform.OS === 'web' && (
        <Pressable style={[s.button, { flexDirection: 'row', justifyContent: 'center', gap: 8 }]} onPress={choose} disabled={!!progress}>
          <Ionicons name="document-text-outline" size={18} color={colors.bg} />
          <Text style={s.buttonText}>{t('imp.file')}</Text>
        </Pressable>
      )}
      <TextInput
        style={[s.input, { minHeight: 110, textAlignVertical: 'top', fontSize: 13 }]} multiline value={text} onChangeText={(v) => { setText(v); setFile(null); }}
        placeholder={t('imp.paste')} placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false}
      />
      {!!text.trim() && (
        <Pressable style={[s.ghost, { borderColor: colors.accent }]} onPress={() => analyse(text)} disabled={!!progress}>
          <Text style={[s.ghostText, { color: colors.accent }]}>{t('imp.analyse')}</Text>
        </Pressable>
      )}

      {!!error && <Text style={{ color: colors.danger, fontFamily: fonts.bold }}>{error}</Text>}
      {progress && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <ActivityIndicator color={colors.accent} />
          <Text style={s.muted}>{t('imp.progress', { done: progress.done, total: progress.total })}</Text>
        </View>
      )}
      {imported !== null && (
        <View style={{ backgroundColor: colors.good, borderRadius: 12, padding: 12, gap: 8 }}>
          <Text style={{ color: colors.bg, fontFamily: fonts.heavy }}>✓ {t('imp.done', { n: imported })}</Text>
          <Pressable onPress={() => router.push('/collection')}>
            <Text style={{ color: colors.bg, fontFamily: fonts.bold, textDecorationLine: 'underline' }}>{t('acc.see')}</Text>
          </Pressable>
        </View>
      )}

      {result && (
        <View style={{ gap: 10 }}>
          <Text style={s.h2}>{t('imp.found', { n: copies })}</Text>
          {result.found.length > 0 && (
            <Pressable style={s.button} onPress={doImport}>
              <Text style={s.buttonText}>{t('imp.add', { n: copies })}</Text>
            </Pressable>
          )}
          {result.missing.length > 0 && (
            <View style={{ backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.line, padding: 12, gap: 4 }}>
              <Text style={{ color: colors.danger, fontFamily: fonts.bold }}>{t('imp.missing', { n: result.missing.length })}</Text>
              {result.missing.slice(0, 30).map((r) => (
                <Text key={r.line} style={[s.muted, { fontSize: 12 }]} numberOfLines={1}>
                  {t('imp.line', { n: r.line })} · {[r.name, r.set ?? r.setCode, r.number].filter(Boolean).join(' · ')}
                </Text>
              ))}
              {result.missing.length > 30 && <Text style={[s.muted, { fontSize: 12 }]}>…</Text>}
              <Text style={[s.muted, { fontSize: 12, marginTop: 4 }]}>{t('imp.missingHint')}</Text>
            </View>
          )}
          {result.found.slice(0, 60).map((f) => (
            <CardRow key={f.row.line} card={f.card} list={result.found.map((x) => x.card)} right={[f.row.details.graded ? `${f.row.details.graded.by} ${f.row.details.graded.grade}` : f.row.details.condition, f.row.quantity > 1 ? `×${f.row.quantity}` : undefined].filter(Boolean).join(' · ') || undefined} />
          ))}
          {result.found.length > 60 && <Text style={s.muted}>{t('imp.more', { n: result.found.length - 60 })}</Text>}
        </View>
      )}
      {!!file && !result && !progress && !error && <Text style={s.muted}>…</Text>}
    </ScrollView>
  );
}
