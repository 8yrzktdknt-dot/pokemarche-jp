import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GamePicker, bestPrice, colors, fonts, s } from '../components/ui';
import { GAMES, langFor } from '../lib/games';
import { recognizeText } from '../lib/scan/ocr';
import { parseScanText } from '../lib/scan/parse';
import { ScanStabilizer } from '../lib/scan/stabilizer';
import { useStore } from '../lib/store';
import type { Card } from '../lib/types';

/** Intervalle entre deux analyses d'image. */
const SCAN_INTERVAL_MS = 700;

export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const { settings, setSettings, add } = useStore();
  const camera = useRef<CameraView>(null);
  const stabilizer = useRef(new ScanStabilizer());
  const [active, setActive] = useState(true);
  const [status, setStatus] = useState('Place la carte dans le cadre');
  const [candidates, setCandidates] = useState<Card[]>([]);
  const [addedCount, setAddedCount] = useState(0);

  // On ne scanne que lorsque l'écran est visible.
  useFocusEffect(
    useCallback(() => {
      setActive(true);
      return () => setActive(false);
    }, []),
  );

  const analyse = useCallback(async () => {
    const cam = camera.current;
    if (!cam) return;
    const photo = await cam.takePictureAsync({ quality: 0.6, shutterSound: false });
    if (!photo?.uri) return;
    const text = await recognizeText(photo.uri, settings.lang);
    const game = settings.game === 'auto' ? undefined : settings.game;
    const hint = parseScanText(text, game);
    const confirmed = stabilizer.current.push(hint ? `${hint.game}:${hint.code}` : null);
    if (!hint) return setStatus('Recherche du numéro de carte…');
    if (!confirmed) return setStatus(`Lu : ${hint.code}…`);

    const lang = langFor(hint.game, hint.lang ?? settings.lang);
    setStatus(`${GAMES[hint.game].label} ${hint.code} — recherche…`);
    const found = await GAMES[hint.game].resolveScan(hint, lang);
    if (!found.length) return setStatus(`${hint.code} introuvable dans le catalogue ${GAMES[hint.game].label}`);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCandidates(found);
    setStatus(found.length > 1 ? `${found.length} cartes possibles` : 'Carte reconnue');
  }, [settings.game, settings.lang]);

  useEffect(() => {
    if (!active || !permission?.granted || candidates.length) return;
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
  }, [active, permission?.granted, candidates.length, analyse]);

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
      <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" animateShutter={false} active={active} />
      <View style={st.frame} pointerEvents="none" />
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
    position: 'absolute', alignSelf: 'center', top: '18%', width: '78%', aspectRatio: 63 / 88,
    borderWidth: 3, borderColor: colors.good, borderRadius: 18,
  },
  pill: { backgroundColor: '#000a', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  status: {
    color: colors.text, backgroundColor: '#000a', alignSelf: 'center', paddingHorizontal: 14, maxWidth: '100%', textAlign: 'center',
    paddingVertical: 8, borderRadius: 999, overflow: 'hidden', fontFamily: fonts.heavy,
  },
});
