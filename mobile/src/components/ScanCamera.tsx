import { CameraView } from 'expo-camera';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';

export interface Capture {
  /** Image pour la lecture du numéro (OCR). */
  ocr: string;
  /** Carte entière en carré 224×224, pour la reconnaissance visuelle (web uniquement pour l'instant). */
  card?: string;
}

export interface ScanCameraHandle {
  /** Images à analyser, ou null si la caméra n'est pas prête. */
  capture(): Promise<Capture | null>;
}

/** Caméra iOS / Android : photo complète, l'OCR ML Kit lit les petits caractères sans recadrage. */
export const ScanCamera = forwardRef<ScanCameraHandle, { active: boolean }>(function ScanCamera({ active }, ref) {
  const camera = useRef<CameraView>(null);
  useImperativeHandle(ref, () => ({
    async capture() {
      const photo = await camera.current?.takePictureAsync({ quality: 0.6, shutterSound: false });
      return photo?.uri ? { ocr: photo.uri } : null;
    },
  }));
  return <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" animateShutter={false} active={active} />;
});
