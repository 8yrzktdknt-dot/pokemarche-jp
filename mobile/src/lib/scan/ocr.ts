import TextRecognition, { TextRecognitionScript } from '@react-native-ml-kit/text-recognition';
import type { CardLang } from '../types';

function scriptFor(lang: CardLang): TextRecognitionScript {
  if (lang === 'ja') return TextRecognitionScript.JAPANESE;
  if (lang === 'ko') return TextRecognitionScript.KOREAN;
  if (lang === 'zh-tw' || lang === 'zh-cn') return TextRecognitionScript.CHINESE;
  return TextRecognitionScript.LATIN;
}

/** OCR sur l'appareil (ML Kit). Les scripts japonais/coréen/chinois lisent aussi l'alphabet latin des codes. */
export async function recognizeText(uri: string, lang: CardLang): Promise<string> {
  const result = await TextRecognition.recognize(uri, scriptFor(lang));
  return result.text;
}
