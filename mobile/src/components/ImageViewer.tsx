import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { Animated, Modal, PanResponder, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../lib/store';
import { ReverseSheen } from './ReverseSheen';

/**
 * Carte en grand, sur fond noir. Se referme d'un glissement vers le bas (le fond s'éclaircit en suivant le doigt),
 * d'un appui n'importe où ou avec la croix. `placeholder` : petite image (déjà en mémoire) affichée en attendant la grande.
 */
export function ImageViewer({ open, onClose, uri, placeholder, sheen }: { open: boolean; onClose(): void; uri?: string; placeholder?: string; sheen?: boolean }) {
  const { t } = useStore();
  const { width, height } = useWindowDimensions();
  const { top, bottom } = useSafeAreaInsets();
  // Le plus grand format de carte (63 × 88) qui tient dans l'écran, marges et encoche comprises.
  const maxH = height - top - bottom - 48;
  const w = Math.min(width - 24, (maxH * 63) / 88);
  const h = (w * 88) / 63;

  const drag = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (open) drag.setValue(0); }, [open, drag]);
  const close = useRef(onClose);
  close.current = onClose;
  // Un glissement n'est pas un appui : le navigateur envoie quand même un « clic » en relâchant.
  const dragged = useRef(false);
  const tap = () => { if (dragged.current) { dragged.current = false; return; } onClose(); };
  const pan = useRef(PanResponder.create({
    // Seulement un geste surtout vertical vers le bas : un simple appui ferme toujours (Pressable du fond).
    onMoveShouldSetPanResponderCapture: (_, g) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx) * 1.2,
    onPanResponderGrant: () => { dragged.current = true; },
    onPanResponderMove: (_, g) => drag.setValue(Math.max(0, g.dy)),
    onPanResponderRelease: (_, g) => {
      if (g.dy > 110 || g.vy > 0.7) {
        Animated.timing(drag, { toValue: 900, duration: 180, useNativeDriver: true }).start(() => close.current());
      } else {
        Animated.spring(drag, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
        // Sur téléphone, aucun « clic » ne suit un glissement : rien à ignorer ensuite.
        setTimeout(() => { dragged.current = false; }, 400);
      }
    },
    onPanResponderTerminate: () => Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start(),
  })).current;
  const backdrop = drag.interpolate({ inputRange: [0, 400], outputRange: [0.94, 0.2], extrapolate: 'clamp' });
  const scale = drag.interpolate({ inputRange: [0, 400], outputRange: [1, 0.85], extrapolate: 'clamp' });

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: backdrop }]} />
      {/* Le glissement est pris par le conteneur (même s'il commence sur la carte) ; un simple appui va au fond. */}
      <Animated.View style={st.center} {...pan.panHandlers}>
        <Pressable style={StyleSheet.absoluteFill} onPress={tap} accessibilityLabel={t('common.close')} />
        <Animated.View pointerEvents="none" style={{ width: w, height: h, transform: [{ translateY: drag }, { scale }] }}>
          <Image
            source={uri} placeholder={placeholder ? { uri: placeholder } : undefined} placeholderContentFit="contain"
            style={{ width: '100%', height: '100%', borderRadius: 14 }} contentFit="contain" transition={120} cachePolicy="memory-disk"
          />
          {sheen && <ReverseSheen radius={14} />}
        </Animated.View>
      </Animated.View>
      <Pressable style={[st.close, { top: top + 12 }]} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={10}>
        <Ionicons name="close" size={26} color="#fff" />
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  close: { position: 'absolute', right: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
});
