import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScanCamera, useCameraAccess, type ScanCameraHandle } from '../components/ScanCamera';
import { colors, displayName, fonts, s, useBestPrice } from '../components/ui';
import { GAMES, langFor } from '../lib/games';
import { GUIDE } from '../lib/scan/guide';
import { recognizeText } from '../lib/scan/ocr';
import { parseScanText } from '../lib/scan/parse';
import { ScanStabilizer } from '../lib/scan/stabilizer';
import { matchVisual, prepareVisual, visualSupported } from '../lib/scan/visual';
import { isConfident, isLikely, type Match } from '../lib/scan/visualIndex';
import { useStore } from '../lib/store';
import type { Card, CardLang, GameId } from '../lib/types';

/** Intervalle entre deux analyses : une reconnaissance prend ~2 à 5 s (2 à 6 images). */
const SCAN_INTERVAL_MS = 500;

export default function Scan() {
  const camera = useCameraAccess();
  const { settings, add, t } = useStore();
  const cam = useRef<ScanCameraHandle>(null);
  const stabilizer = useRef(new ScanStabilizer());
  const history = useRef<Match[][]>([]);
  const [active, setActive] = useState(true);
  const [status, setStatus] = useState(t('scan.frame'));
  const [candidates, setCandidates] = useState<Card[]>([]);
  const [addedCount, setAddedCount] = useState(0);
  /** Nombre de cartes reconnaissables par l'image (null = en préparation, 0 = indisponible). */
  const [visualCount, setVisualCount] = useState<number | null>(visualSupported ? null : 0);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const bestPrice = useBestPrice();

  useFocusEffect(
    useCallback(() => {
      setActive(true);
      return () => setActive(false);
    }, []),
  );

  useEffect(() => {
    if (!visualSupported) return;
    setStatus(t('scan.loadingAi'));
    prepareVisual((p) => setStatus(t('scan.downloadAi', { p }))).then(
      (n) => { setVisualCount(n); setStatus(n ? t('scan.frame') : t('scan.noIndex')); },
      () => { setVisualCount(0); setStatus(t('scan.noAi')); },
    );
  }, [t]);

  /** Cartes proposées à partir des correspondances visuelles (fiche complète quand elle est disponible). */
  const showMatches = useCallback(async (matches: Match[], sure: boolean) => {
    const top = matches.slice(0, sure ? 1 : 3);
    const cards = await Promise.all(
      top.map(async (m): Promise<Card> => {
        const game = (m.item.game ?? 'pokemon') as GameId;
        const lang = (m.item.lang ?? 'ja') as CardLang;
        const full = await GAMES[game].getCard(m.item.id, lang).catch(() => null);
        return full ?? {
          game, id: m.item.id, lang, name: m.item.name, number: m.item.localId, prices: [],
          imageSmall: m.item.image ? `${m.item.image}/low.webp` : undefined,
        };
      }),
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCandidates(cards);
    setStatus(sure ? t('scan.found') : t('scan.unsure'));
  }, [t]);

  /** iOS / Android sans reconnaissance visuelle (pour l'instant) : lecture du numéro de la carte. */
  const analyseByCode = useCallback(async (uri: string) => {
    const hint = parseScanText(await recognizeText(uri, settings.lang));
    if (!stabilizer.current.push(hint ? `${hint.game}:${hint.code}` : null) || !hint) return setStatus(t('scan.searching'));
    const found = await GAMES[hint.game].resolveScan(hint, langFor(hint.game, hint.lang ?? settings.lang));
    if (!found.length) return setStatus(t('scan.searching'));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCandidates(found);
    setStatus(t('scan.found'));
  }, [settings.lang, t]);

  const analyse = useCallback(async () => {
    const shot = await cam.current?.capture();
    if (!shot) return;
    if (!visualSupported) return analyseByCode(shot.ocr);
    if (!visualCount || !shot.card) return;
    const matches = await matchVisual(shot.card);
    if (!matches?.length) return;
    history.current = [...history.current.slice(-5), matches];
    const sure = isConfident(matches);
    // Certain deux fois de suite → reconnue ; même carte en tête 3 fois → proposée avec d'autres choix.
    if (stabilizer.current.push(sure ? matches[0].item.id : null)) return showMatches(matches, true);
    if (!sure && isLikely(history.current)) {
      history.current = [];
      return showMatches(matches, false);
    }
    setStatus(t('scan.searching'));
  }, [visualCount, analyseByCode, showMatches, t]);

  useEffect(() => {
    if (!active || camera.state !== 'granted' || candidates.length || visualCount === null) return;
    let stop = false;
    (async () => {
      while (!stop) {
        const started = Date.now();
        try {
          await analyse();
        } catch (e) {
          console.warn(e);
        }
        await new Promise((r) => setTimeout(r, Math.max(0, SCAN_INTERVAL_MS - (Date.now() - started))));
      }
    })();
    return () => { stop = true; };
  }, [active, camera.state, candidates.length, visualCount, analyse]);

  const keep = (card: Card) => {
    add(card);
    setAddedCount((n) => n + 1);
    setCandidates([]);
    history.current = [];
    setStatus(t('scan.added', { name: displayName(card, settings.appLang) }));
  };

  if (camera.state !== 'granted') {
    return (
      <SafeAreaView style={[s.screen, s.pad, { justifyContent: 'center' }]}>
        <Text style={[s.h2, { textAlign: 'center' }]}>{t('scan.cameraNeeded')}</Text>
        <Pressable style={s.button} onPress={camera.request}><Text style={s.buttonText}>{t('scan.allowCamera')}</Text></Pressable>
        <Pressable style={s.ghost} onPress={close}><Text style={s.ghostText}>{t('scan.back')}</Text></Pressable>
        {camera.state === 'denied' && <Text style={[s.muted, { textAlign: 'center' }]}>{t('scan.cameraTip')}</Text>}
      </SafeAreaView>
    );
  }

  return (
    <View style={s.screen}>
      <ScanCamera ref={cam} active={active} />
      <View style={st.frame} pointerEvents="none" />
      <SafeAreaView style={st.overlay} edges={['top', 'bottom']} pointerEvents="box-none">
        <View style={st.topBar}>
          <Pressable onPress={close} style={st.pill} accessibilityLabel={t('common.close')}>
            <Text style={s.ghostText}>✕</Text>
          </Pressable>
          {addedCount > 0 && (
            <Pressable onPress={() => router.replace('/collection')} style={st.pill}>
              <Text style={s.ghostText}>{t('scan.addedCount', { n: addedCount })}</Text>
            </Pressable>
          )}
        </View>

        <View style={{ gap: 8 }}>
          <Text style={st.status}>{status}</Text>
          {candidates.map((c) => (
            <View key={`${c.game}:${c.id}`} style={[s.cardRow, { borderWidth: 1, borderColor: colors.good }]}>
              <Image source={c.imageSmall} style={s.thumb} contentFit="contain" />
              <View style={{ flex: 1 }}>
                <Text style={s.name} numberOfLines={2}>{displayName(c, settings.appLang)}</Text>
                <Text style={s.meta}>{[GAMES[c.game].label, c.number, c.setName].filter(Boolean).join(' · ')}</Text>
                {bestPrice(c) && <Text style={s.price}>{bestPrice(c)}</Text>}
              </View>
              <View style={{ gap: 6 }}>
                <Pressable style={[s.button, { paddingHorizontal: 14, paddingVertical: 8 }]} onPress={() => keep(c)} accessibilityLabel={t('card.add')}>
                  <Text style={s.buttonText}>＋</Text>
                </Pressable>
                <Pressable
                  style={[s.ghost, { paddingHorizontal: 12, paddingVertical: 6 }]}
                  onPress={() => router.push({ pathname: '/card/[game]/[id]', params: { game: c.game, id: c.id, lang: c.lang } })}
                >
                  <Text style={s.ghostText}>{t('card.prices')}</Text>
                </Pressable>
              </View>
            </View>
          ))}
          {candidates.length > 0 && (
            <Pressable style={st.pill} onPress={() => { setCandidates([]); setStatus(t('scan.frame')); }}>
              <Text style={[s.ghostText, { textAlign: 'center' }]}>{t('scan.ignore')}</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'space-between', padding: 16 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  frame: {
    position: 'absolute', alignSelf: 'center', top: `${GUIDE.top * 100}%`, width: `${GUIDE.width * 100}%`,
    aspectRatio: GUIDE.aspect, borderWidth: 3, borderColor: colors.good, borderRadius: 18,
  },
  pill: { backgroundColor: '#000a', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, minHeight: 44, justifyContent: 'center' },
  status: {
    color: colors.text, backgroundColor: '#000a', alignSelf: 'center', paddingHorizontal: 14, maxWidth: '100%', textAlign: 'center',
    paddingVertical: 8, borderRadius: 999, overflow: 'hidden', fontFamily: fonts.heavy,
  },
});
