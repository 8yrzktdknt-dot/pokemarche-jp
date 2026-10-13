import { useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScanCamera, type ScanCameraHandle } from '../components/ScanCamera';
import { GamePicker, bestPrice, colors, fonts, s } from '../components/ui';
import { GAMES, langFor } from '../lib/games';
import { GUIDE } from '../lib/scan/guide';
import { recognizeText } from '../lib/scan/ocr';
import { parseScanText } from '../lib/scan/parse';
import { ScanStabilizer } from '../lib/scan/stabilizer';
import { useStore } from '../lib/store';
import type { Card, ScanHint } from '../lib/types';

/** Intervalle entre deux analyses d'image. */
const SCAN_INTERVAL_MS = 700;

export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const { settings, setSettings, add } = useStore();
  const camera = useRef<ScanCameraHandle>(null);
  const stabilizer = useRef(new ScanStabilizer());
  const [active, setActive] = useState(true);
  const [status, setStatus] = useState('Place la carte dans le cadre');
  const [candidates, setCandidates] = useState<Card[]>([]);
  const [addedCount, setAddedCount] = useState(0);
  const [lastText, setLastText] = useState('');
  const [manual, setManual] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // On ne scanne que lorsque l'écran est visible.
  useFocusEffect(
    useCallback(() => {
      setActive(true);
      return () => setActive(false);
    }, []),
  );

  const resolve = useCallback(async (hint: ScanHint) => {
    const lang = langFor(hint.game, hint.lang ?? settings.lang);
    setStatus(`${GAMES[hint.game].label} ${hint.code} — recherche…`);
    const found = await GAMES[hint.game].resolveScan(hint, lang);
    if (!found.length) return setStatus(`${hint.code} introuvable dans le catalogue ${GAMES[hint.game].label}`);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCandidates(found);
    setStatus(found.length > 1 ? `${found.length} cartes possibles` : 'Carte reconnue');
  }, [settings.lang]);

  const analyse = useCallback(async () => {
    const uri = await camera.current?.capture();
    if (!uri) return setStatus('Démarrage de la caméra…');
    const text = await recognizeText(uri, settings.lang);
    const game = settings.game === 'auto' ? undefined : settings.game;
    const hint = parseScanText(text, game);
    const confirmed = stabilizer.current.push(hint ? `${hint.game}:${hint.code}` : null);
    if (!hint) {
      setLastText(text.replace(/\s+/g, ' ').trim().slice(0, 40));
      return setStatus('Recherche du numéro de carte…');
    }
    setLastText('');
    if (!confirmed) return setStatus(`Lu : ${hint.code}…`);
    await resolve(hint);
  }, [settings.game, settings.lang, resolve]);

  const searchManual = async () => {
    const game = settings.game === 'auto' ? undefined : settings.game;
    const hint = parseScanText(manualCode.toUpperCase().replace(/\s+/g, ''), game) ?? parseScanText(manualCode, game);
    if (!hint) return setStatus('Code non reconnu (ex. OP05-119, OGN-042/298, 136/189)');
    setManual(false);
    setManualCode('');
    try {
      await resolve(hint);
    } catch {
      setStatus('Recherche impossible, vérifie ta connexion');
    }
  };

  useEffect(() => {
    if (!active || !permission?.granted || candidates.length || manual) return;
    let stop = false;
    (async () => {
      while (!stop) {
        const started = Date.now();
        try {
          await analyse();
        } catch (e) {
          console.warn(e);
          setStatus('Analyse impossible pour le moment, nouvel essai…');
        }
        await new Promise((r) => setTimeout(r, Math.max(0, SCAN_INTERVAL_MS - (Date.now() - started))));
      }
    })();
    return () => { stop = true; };
  }, [active, permission?.granted, candidates.length, manual, analyse]);

  const keep = (card: Card) => {
    add(card);
    setAddedCount((n) => n + 1);
    setCandidates([]);
    setStatus(`${card.name} ajoutée — carte suivante !`);
  };

  if (!permission) return <View style={s.screen} />;
  if (!permission.granted) {
    return (
      <SafeAreaView style={[s.screen, s.pad, { justifyContent: 'center' }]}>
        <Text style={[s.h2, { textAlign: 'center' }]}>La caméra est nécessaire pour scanner tes cartes.</Text>
        <Pressable style={s.button} onPress={requestPermission}><Text style={s.buttonText}>Autoriser la caméra</Text></Pressable>
        <Pressable style={s.ghost} onPress={() => router.back()}><Text style={s.ghostText}>Retour</Text></Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={s.screen}>
      <ScanCamera ref={camera} active={active} />
      <View style={st.frame} pointerEvents="none">
        <View style={st.band}><Text style={st.bandText}>numéro de la carte ici</Text></View>
      </View>
      <SafeAreaView style={st.overlay} edges={['top', 'bottom']}>
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pressable onPress={() => router.back()} style={st.pill}><Text style={s.ghostText}>✕</Text></Pressable>
            {addedCount > 0 && (
              <Pressable onPress={() => router.replace('/collection')} style={st.pill}>
                <Text style={s.ghostText}>{addedCount} ajoutée{addedCount > 1 ? 's' : ''} →</Text>
              </Pressable>
            )}
          </View>
          <GamePicker allowAuto value={settings.game} onChange={(g) => { stabilizer.current.reset(); setSettings({ game: g }); }} />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={st.status}>{status}</Text>
          {lastText ? <Text style={st.hint} numberOfLines={1}>Texte lu : {lastText}</Text> : null}
          {manual ? (
            <View style={[s.cardRow, { gap: 8 }]}>
              <TextInput
                style={[s.input, { flex: 1 }]}
                placeholder="OP05-119, OGN-042/298, 136/189…"
                placeholderTextColor={colors.muted}
                value={manualCode}
                onChangeText={setManualCode}
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus
                onSubmitEditing={searchManual}
                returnKeyType="search"
              />
              <Pressable style={[s.button, { paddingHorizontal: 16 }]} onPress={searchManual}>
                <Text style={s.buttonText}>OK</Text>
              </Pressable>
            </View>
          ) : (
            !candidates.length && (
              <Pressable style={st.pill} onPress={() => setManual(true)}>
                <Text style={[s.ghostText, { textAlign: 'center' }]}>Saisir le numéro à la main</Text>
              </Pressable>
            )
          )}
          {candidates.slice(0, 4).map((c) => (
            <View key={c.id} style={[s.cardRow, { borderWidth: 1, borderColor: colors.good }]}>
              <Image source={c.imageSmall} style={s.thumb} contentFit="contain" />
              <View style={{ flex: 1 }}>
                <Text style={s.name} numberOfLines={2}>{c.name}</Text>
                <Text style={s.meta}>{[c.number, c.setName].filter(Boolean).join(' · ')}</Text>
                {bestPrice(c) && <Text style={s.price}>{bestPrice(c)}</Text>}
              </View>
              <View style={{ gap: 6 }}>
                <Pressable style={[s.button, { paddingHorizontal: 12, paddingVertical: 8 }]} onPress={() => keep(c)}>
                  <Text style={s.buttonText}>＋</Text>
                </Pressable>
                <Pressable
                  style={[s.ghost, { paddingHorizontal: 12, paddingVertical: 6 }]}
                  onPress={() => router.push({ pathname: '/card/[game]/[id]', params: { game: c.game, id: c.id, lang: c.lang } })}
                >
                  <Text style={s.ghostText}>Prix</Text>
                </Pressable>
              </View>
            </View>
          ))}
          {candidates.length > 0 && (
            <Pressable style={st.pill} onPress={() => setCandidates([])}>
              <Text style={[s.ghostText, { textAlign: 'center' }]}>Ignorer et continuer</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'space-between', padding: 16 },
  frame: {
    position: 'absolute', alignSelf: 'center', top: `${GUIDE.top * 100}%`, width: `${GUIDE.width * 100}%`,
    aspectRatio: GUIDE.aspect, borderWidth: 3, borderColor: colors.good, borderRadius: 18, overflow: 'hidden',
  },
  band: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: `${(1 - GUIDE.codeBandFrom) * 100}%`,
    backgroundColor: '#3CCB7F22', borderTopWidth: 1, borderColor: colors.good, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  bandText: { color: colors.text, fontFamily: fonts.bold, fontSize: 12, opacity: 0.85 },
  hint: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, alignSelf: 'center', maxWidth: '100%' },
  pill: { backgroundColor: '#000a', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  status: {
    color: colors.text, backgroundColor: '#000a', alignSelf: 'center', paddingHorizontal: 14, maxWidth: '100%', textAlign: 'center',
    paddingVertical: 8, borderRadius: 999, overflow: 'hidden', fontFamily: fonts.heavy,
  },
});
