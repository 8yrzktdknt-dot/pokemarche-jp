import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../lib/store';
import { ReverseSheen } from './ReverseSheen';

/** Carte en grand, sur fond noir : un appui n'importe où (ou la croix) la referme. */
export function ImageViewer({ open, onClose, uri, sheen }: { open: boolean; onClose(): void; uri?: string; sheen?: boolean }) {
  const { t } = useStore();
  const { width, height } = useWindowDimensions();
  const { top, bottom } = useSafeAreaInsets();
  // Le plus grand format de carte (63 × 88) qui tient dans l'écran, marges et encoche comprises.
  const maxH = height - top - bottom - 48;
  const w = Math.min(width - 24, (maxH * 63) / 88);
  const h = (w * 88) / 63;
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={st.backdrop} onPress={onClose} accessibilityLabel={t('common.close')}>
        <View style={{ width: w, height: h }}>
          <Image source={uri} style={{ width: '100%', height: '100%', borderRadius: 14 }} contentFit="contain" transition={0} cachePolicy="memory-disk" />
          {sheen && <ReverseSheen radius={14} />}
        </View>
      </Pressable>
      <Pressable style={[st.close, { top: top + 12 }]} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={10}>
        <Ionicons name="close" size={26} color="#fff" />
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', alignItems: 'center', justifyContent: 'center' },
  close: { position: 'absolute', right: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
});
