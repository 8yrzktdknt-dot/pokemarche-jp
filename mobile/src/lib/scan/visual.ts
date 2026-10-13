import type { Match } from './visualIndex';

/**
 * Reconnaissance visuelle sur iOS / Android : pas encore disponible (il faudra embarquer le modèle
 * avec onnxruntime-react-native). Le scanner natif s'appuie sur la lecture du numéro (ML Kit).
 */
export const visualSupported = false;

export async function prepareVisual(_onStatus?: (percent: number) => void): Promise<number> {
  return 0;
}

export async function matchVisual(_cardImage: string): Promise<Match[] | null> {
  return null;
}
