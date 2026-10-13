import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { CardRow, GamePicker, LangPicker, colors, s } from '../components/ui';
import { GAMES, langFor } from '../lib/games';
import { useStore } from '../lib/store';
import type { Card, GameId } from '../lib/types';

export default function Home() {
  const { settings, setSettings, collection } = useStore();
  const game: GameId = settings.game === 'auto' ? 'pokemon' : settings.game;
  const lang = langFor(game, settings.lang);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return setResults([]);
    let alive = true;
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await GAMES[game].search(q, lang);
        if (alive) setResults(r);
      } catch (e) {
        if (alive) setError(String(e));
      } finally {
        if (alive) setLoading(false);
      }
    }, 350);
    return () => { alive = false; clearTimeout(t); };
  }, [query, game, lang]);

  return (
    <View style={s.screen}>
      <View style={s.pad}>
        <Link href="/scan" asChild>
          <Pressable style={s.button}><Text style={s.buttonText}>📷  Scanner une carte</Text></Pressable>
        </Link>
        <Link href="/collection" asChild>
          <Pressable style={s.ghost}><Text style={s.ghostText}>Ma collection ({collection.reduce((n, e) => n + e.quantity, 0)})</Text></Pressable>
        </Link>
        <GamePicker value={game} onChange={(g) => setSettings({ game: g })} />
        <LangPicker langs={GAMES[game].langs} value={lang} onChange={(l) => setSettings({ lang: l })} />
        <TextInput
          style={s.input}
          placeholder={game === 'onepiece' ? 'Nom ou code (OP05-119)' : 'Nom de la carte'}
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
        />
        {loading && <ActivityIndicator color={colors.accent} />}
        {error && <Text style={{ color: colors.danger }}>{error}</Text>}
      </View>
      <FlatList
        data={results}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 8 }}
        renderItem={({ item }) => <CardRow card={item} />}
      />
    </View>
  );
}
