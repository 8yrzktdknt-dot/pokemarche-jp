import { CameraView } from 'expo-camera';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';

export interface ScanCameraHandle {
  /** Image à analyser (URI), ou null si la caméra n'est pas prête. */
  capture(): Promise<string | null>;
}

/** Caméra iOS / Android : photo complète, l'OCR ML Kit lit les petits caractères sans recadrage. */
export const ScanCamera = forwardRef<ScanCameraHandle, { active: boolean }>(function ScanCamera({ active }, ref) {
  const camera = useRef<CameraView>(null);
  useImperativeHandle(ref, () => ({
    async capture() {
      const photo = await camera.current?.takePictureAsync({ quality: 0.6, shutterSound: false });
      return photo?.uri ?? null;
    },
  }));
  return <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" animateShutter={false} active={active} />;
});
