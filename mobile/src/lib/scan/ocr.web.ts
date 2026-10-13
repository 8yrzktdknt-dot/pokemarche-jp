import { createWorker, PSM, type Worker } from 'tesseract.js';
import type { CardLang } from '../types';

let worker: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  worker ??= (async () => {
    const w = await createWorker('eng');
    // Texte épars : les codes de carte sont de petits blocs isolés.
    await w.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      // Uniquement les caractères des numéros de carte : moins de confusions.
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/-',
    });
    return w;
  })();
  // Échec (réseau coupé…) : on réessaiera au prochain appel.
  worker.catch(() => { worker = null; });
  return worker;
}

/**
 * OCR dans le navigateur (Tesseract.js). Moins rapide que ML Kit : on ne lit que l'alphabet latin,
 * suffisant pour les codes de carte ; la langue de la carte vient alors des réglages.
 */
export async function recognizeText(uri: string, _lang: CardLang): Promise<string> {
  const w = await getWorker();
  const { data } = await w.recognize(uri);
  return data.text;
}
