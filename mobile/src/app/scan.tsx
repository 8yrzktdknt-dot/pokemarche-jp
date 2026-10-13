import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScanCamera, useCameraAccess, type ScanCameraHandle } from '../components/ScanCamera';
import { colors, displayName, fonts, s, useBestPrice } from '../components/ui';
import { GAMES, langFor } from '../lib/games';
import { GUIDE } from '../lib/scan/guide';
import { recognizeText } from '../lib/scan/ocr';
import { parseScanText } from '../lib/scan/parse';
import { ScanStabilizer } from '../lib/scan/stabilizer';
import { matchVisual, prepareVisual, visualSupported } from '../lib/scan/visual';
import { isConfident, isLikely, type IndexItem, type Match } from '../lib/scan/visualIndex';
import { useStore } from '../lib/store';
import type { Card, CardLang, GameId } from '../lib/types';

const SCAN_INTERVAL_MS = 450;
/** Une pression sur le déclencheur analyse au plus ~5 s d'images. */
const MAX_TRIES = 10;
const NATIVE_DRIVER = Platform.OS !== 'web';

type ScanLang = CardLang | 'auto';
const SCAN_LANGS: { value: ScanLang; flag: string }[] = [
  { value: 'auto', flag: '🌐' },
  { value: 'ja', flag: '🇯🇵' },
  { value: 'fr', flag: '🇫🇷' },
  { value: 'en', flag: '🇬🇧' },
  { value: 'zh-tw', flag: '🇹🇼' },
  { value: 'zh-cn', flag: '🇨🇳' },
];

/** Coins du cadre de visée, plus une ligne qui balaie la carte pendant l'analyse. */
function ScanFrame({ scanning, found, width, height }: { scanning: boolean; found: boolean; width: number; height: number }) {
  const sweep = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!scanning) {
      sweep.stopAnimation();
      pulse.stopAnimation();
      sweep.setValue(0);
      pulse.setValue(0);
      return;
    }
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(sweep, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE_DRIVER }),
      ]),
    );
    const b = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 550, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(pulse, { toValue: 0, duration: 550, useNativeDriver: NATIVE_DRIVER }),
      ]),
    );
    a.start();
    b.start();
    return () => { a.stop(); b.stop(); };
  }, [scanning, sweep, pulse]);

  const color = found ? colors.good : scanning ? colors.accent : '#ffffff';
  const corner = { position: 'absolute' as const, width: 42, height: 42, borderColor: color };
  const translateY = sweep.interpolate({ inputRange: [0, 1], outputRange: [0, height - 4] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.015] });

  return (
    <Animated.View pointerEvents="none" style={{ width, height, transform: [{ scale }] }}>
      <View style={[corner, { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 22 }]} />
      <View style={[corner, { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 22 }]} />
      <View style={[corner, { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 22 }]} />
      <View style={[corner, { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 22 }]} />
      {scanning && (
        <Animated.View style={[st.sweep, { transform: [{ translateY }] }]}>
          <View style={st.sweepGlow} />
          <View style={st.sweepLine} />
        </Animated.View>
      )}
    </Animated.View>
  );
}

export default function Scan() {
  const camera = useCameraAccess();
  const { settings, setSettings, add, t, langLabel } = useStore();
  const cam = useRef<ScanCameraHandle>(null);
  const stabilizer = useRef(new ScanStabilizer());
  const history = useRef<Match[][]>([]);
  const tries = useRef(0);
  const [active, setActive] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState(t('scan.take'));
  const [candidates, setCandidates] = useState<Card[]>([]);
  const [addedCount, setAddedCount] = useState(0);
  const [langSheet, setLangSheet] = useState(false);
  /** Nombre de cartes reconnaissables par l'image (null = en préparation, 0 = indisponible). */
  const [visualCount, setVisualCount] = useState<number | null>(visualSupported ? null : 0);
  const { width: W, height: H } = useWindowDimensions();
  const frameW = W * GUIDE.width;
  const frameH = frameW / GUIDE.aspect;
  const scanLang: ScanLang = settings.scanLang ?? 'auto';
  const auto = !!settings.scanAuto;
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
      (n) => { setVisualCount(n); setStatus(n ? t('scan.take') : t('scan.noIndex')); },
      () => { setVisualCount(0); setStatus(t('scan.noAi')); },
    );
  }, [t]);

  /**
   * Pokémon : les cartes diffèrent d'une langue à l'autre (extensions, numéros), on ne garde que l'index de la langue
   * choisie. One Piece et Riftbound : même illustration dans toutes les langues, on cherche partout.
   */
  const accept = useCallback(
    (it: IndexItem) => scanLang === 'auto' || it.game !== 'pokemon' || it.lang === scanLang,
    [scanLang],
  );

  const restart = () => {
    setCandidates([]);
    setScanning(false);
    history.current = [];
    tries.current = 0;
    stabilizer.current.reset();
    setStatus(t('scan.take'));
  };

  const showMatches = useCallback(async (matches: Match[], sure: boolean) => {
    const top = matches.slice(0, sure ? 1 : 3);
    const cards = await Promise.all(
      top.map(async (m): Promise<Card> => {
        const game = (m.item.game ?? 'pokemon') as GameId;
        // Langue choisie quand le jeu la propose (même illustration), sinon celle de l'index.
        const lang = scanLang !== 'auto' && game !== 'pokemon' && GAMES[game].langs.includes(scanLang)
          ? scanLang
          : ((m.item.lang ?? 'ja') as CardLang);
        const full = await GAMES[game].getCard(m.item.id, lang).catch(() => null);
        return full ?? {
          game, id: m.item.id, lang, name: m.item.name, number: m.item.localId, prices: [],
          imageSmall: m.item.image ? (/\.(png|jpe?g|webp)(\?|$)/.test(m.item.image) ? m.item.image : `${m.item.image}/low.webp`) : undefined,
        };
      }),
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setScanning(false);
    setCandidates(cards);
    setStatus(sure ? t('scan.found') : t('scan.unsure'));
  }, [scanLang, t]);

  /** iOS / Android sans reconnaissance visuelle (pour l'instant) : lecture du numéro de la carte. */
  const analyseByCode = useCallback(async (uri: string) => {
    const hint = parseScanText(await recognizeText(uri, settings.lang));
    if (!stabilizer.current.push(hint ? `${hint.game}:${hint.code}` : null) || !hint) return;
    const found = await GAMES[hint.game].resolveScan(hint, langFor(hint.game, hint.lang ?? settings.lang));
    if (!found.length) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setScanning(false);
    setCandidates(found);
    setStatus(t('scan.found'));
  }, [settings.lang, t]);

  /** Une image : true quand une carte a été proposée. */
  const analyse = useCallback(async (): Promise<boolean> => {
    const shot = await cam.current?.capture();
    if (!shot) return false;
    if (!visualSupported) { await analyseByCode(shot.ocr); return false; }
    if (!visualCount || !shot.card) return false;
    const matches = await matchVisual(shot.card, accept);
    if (!matches?.length) return false;
    history.current = [...history.current.slice(-5), matches];
    const sure = isConfident(matches);
    // Certain deux fois de suite → reconnue ; même carte en tête 3 fois → proposée avec d'autres choix.
    if (stabilizer.current.push(sure ? matches[0].item.id : null)) { await showMatches(matches, true); return true; }
    if (!sure && isLikely(history.current)) { history.current = []; await showMatches(matches, false); return true; }
    return false;
  }, [visualCount, accept, analyseByCode, showMatches]);

  // Boucle d'analyse : pendant un scan déclenché (au plus MAX_TRIES images) ou en continu en mode Auto.
  useEffect(() => {
    const running = (scanning || auto) && active && camera.state === 'granted' && !candidates.length && visualCount !== null;
    if (!running) return;
    let stop = false;
    (async () => {
      while (!stop) {
        const started = Date.now();
        let done = false;
        try {
          done = await analyse();
        } catch (e) {
          console.warn(e);
        }
        if (done || stop) return;
        if (!auto && ++tries.current >= MAX_TRIES) {
          // Dernière chance : les meilleures correspondances, même incertaines.
          const last = history.current.at(-1);
          if (last?.length && last[0].score >= 0.8) { await showMatches(last, false); return; }
          setScanning(false);
          setStatus(t('scan.notFound'));
          return;
        }
        await new Promise((r) => setTimeout(r, Math.max(0, SCAN_INTERVAL_MS - (Date.now() - started))));
      }
    })();
    return () => { stop = true; };
  }, [scanning, auto, active, camera.state, candidates.length, visualCount, analyse, showMatches, t]);

  const shoot = () => {
    if (candidates.length || visualCount === null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    history.current = [];
    tries.current = 0;
    stabilizer.current.reset();
    setStatus(t('scan.analysing'));
    setScanning(true);
  };

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

  const flag = SCAN_LANGS.find((l) => l.value === scanLang)?.flag ?? '🌐';
  const busy = scanning || (auto && !candidates.length);

  return (
    <View style={[s.screen, { backgroundColor: '#000' }]}>
      <ScanCamera ref={cam} active={active} />
      {/* Voile sombre au-dessus et au-dessous du cadre, pour concentrer le regard sur la carte. */}
      <View pointerEvents="none" style={[st.veil, { top: 0, height: H * GUIDE.top }]} />
      <View pointerEvents="none" style={[st.veil, { top: H * GUIDE.top + frameH, bottom: 0 }]} />
      <View pointerEvents="none" style={{ position: 'absolute', top: H * GUIDE.top, left: (W - frameW) / 2 }}>
        <ScanFrame scanning={busy} found={candidates.length > 0} width={frameW} height={frameH} />
      </View>

      <SafeAreaView style={st.overlay} edges={['top', 'bottom']} pointerEvents="box-none">
        <View style={st.topBar}>
          <Pressable onPress={close} style={st.squareBtn} accessibilityLabel={t('scan.back')}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
          {addedCount > 0 && (
            <Pressable onPress={() => router.replace('/collection')} style={st.addedPill}>
              <Text style={st.addedText}>{t('scan.addedCount', { n: addedCount })}</Text>
            </Pressable>
          )}
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Pressable onPress={restart} style={st.roundBtn} accessibilityLabel={t('scan.restart')}>
              <Ionicons name="refresh" size={24} color={colors.text} />
            </Pressable>
            <Text style={st.smallLabel}>{t('scan.restart')}</Text>
          </View>
        </View>

        <View style={st.instruction}>
          <Ionicons
            name={busy ? 'scan' : candidates.length ? 'checkmark-circle' : 'albums-outline'}
            size={18}
            color={candidates.length ? colors.good : colors.accent}
          />
          <Text style={st.instructionText} numberOfLines={2}>{status}</Text>
        </View>

        <View style={{ flex: 1 }} pointerEvents="none" />

        {candidates.length > 0 ? (
          <View style={st.sheet}>
            {candidates.map((c) => (
              <View key={`${c.game}:${c.id}`} style={st.candidate}>
                <Image source={c.imageSmall} style={s.thumb} contentFit="contain" />
                <View style={{ flex: 1 }}>
                  <Text style={s.name} numberOfLines={2}>{displayName(c, settings.appLang)}</Text>
                  <Text style={s.meta}>{[GAMES[c.game].label, c.number, c.setName].filter(Boolean).join(' · ')}</Text>
                  {bestPrice(c) && <Text style={s.price}>{bestPrice(c)}</Text>}
                </View>
                <View style={{ gap: 6 }}>
                  <Pressable style={[s.button, { paddingHorizontal: 14, paddingVertical: 8 }]} onPress={() => keep(c)} accessibilityLabel={t('card.add')}>
                    <Ionicons name="add" size={22} color={colors.bg} />
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
            <Pressable style={st.ghostPill} onPress={restart}>
              <Text style={[s.ghostText, { textAlign: 'center' }]}>{t('scan.ignore')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={st.bottomBar}>
            <Pressable
              style={st.flagBtn}
              onPress={() => setLangSheet(true)}
              accessibilityLabel={`${t('scan.lang')} : ${scanLang === 'auto' ? t('scan.langAuto') : langLabel(scanLang)}`}
            >
              <Text style={st.flag}>{flag}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [st.shutter, pressed && { transform: [{ scale: 0.94 }] }]}
              onPress={shoot}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={t('scan.shutter')}
            >
              <View style={[st.shutterInner, busy && { backgroundColor: colors.primary }]}>
                {busy && <Ionicons name="scan" size={30} color="#fff" />}
              </View>
            </Pressable>
            <Pressable
              style={[st.toggle, auto && st.toggleOn]}
              onPress={() => setSettings({ scanAuto: !auto })}
              accessibilityRole="switch"
              accessibilityState={{ checked: auto }}
            >
              <Text style={[st.toggleText, auto && { color: colors.bg }]}>{t('scan.auto')}</Text>
              <View style={[st.dot, auto && { backgroundColor: colors.bg, borderColor: colors.bg }]} />
            </Pressable>
          </View>
        )}
      </SafeAreaView>

      <Modal visible={langSheet} transparent animationType="fade" onRequestClose={() => setLangSheet(false)}>
        <Pressable style={st.backdrop} onPress={() => setLangSheet(false)}>
          <View style={st.langSheet}>
            <Text style={[s.h2, { marginBottom: 8 }]}>{t('scan.lang')}</Text>
            {SCAN_LANGS.map((l) => (
              <Pressable
                key={l.value}
                style={[st.langRow, scanLang === l.value && { borderColor: colors.good }]}
                onPress={() => { setSettings({ scanLang: l.value }); setLangSheet(false); restart(); }}
              >
                <Text style={st.flag}>{l.flag}</Text>
                <Text style={[s.name, { flex: 1 }]}>{l.value === 'auto' ? t('scan.langAuto') : langLabel(l.value)}</Text>
                {scanLang === l.value && <Ionicons name="checkmark" size={20} color={colors.good} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  veil: { position: 'absolute', left: 0, right: 0, backgroundColor: '#0A1F1799' },
  sweep: { position: 'absolute', left: 6, right: 6, top: 0, height: 4 },
  sweepLine: { height: 3, borderRadius: 2, backgroundColor: colors.accent },
  sweepGlow: { position: 'absolute', left: 0, right: 0, top: -14, height: 30, backgroundColor: '#F5C54233', borderRadius: 15 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  squareBtn: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: '#0A1F17CC', borderWidth: 1, borderColor: colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  roundBtn: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#0A1F17CC', borderWidth: 1, borderColor: colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  smallLabel: { color: colors.muted, fontFamily: fonts.bold, fontSize: 11 },
  addedPill: { backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, marginTop: 6 },
  addedText: { color: '#fff', fontFamily: fonts.heavy },
  instruction: {
    flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'center', marginTop: 10, maxWidth: '100%',
    backgroundColor: '#0A1F17E6', borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10,
  },
  instructionText: { color: colors.text, fontFamily: fonts.heavy, fontSize: 15, flexShrink: 1 },
  bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  flagBtn: {
    width: 64, height: 48, borderRadius: 16, backgroundColor: '#0A1F17CC', borderWidth: 1, borderColor: colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  flag: { fontSize: 26 },
  shutter: {
    width: 84, height: 84, borderRadius: 42, borderWidth: 4, borderColor: colors.text,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A1F1766',
  },
  shutterInner: { width: 66, height: 66, borderRadius: 33, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  toggle: {
    flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, paddingHorizontal: 16, borderRadius: 999,
    backgroundColor: '#0A1F17CC', borderWidth: 1, borderColor: colors.line,
  },
  toggleOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  toggleText: { color: colors.text, fontFamily: fonts.heavy, fontSize: 15 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.text },
  sheet: { gap: 8, backgroundColor: '#0A1F17F2', borderRadius: 20, padding: 10, borderWidth: 1, borderColor: colors.line },
  candidate: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, backgroundColor: colors.card, borderRadius: 14 },
  ghostPill: { borderRadius: 999, paddingVertical: 12, borderWidth: 1, borderColor: colors.line },
  backdrop: { flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' },
  langSheet: { backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, gap: 8 },
  langRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, minHeight: 52,
    backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.card,
  },
});
