import type { CardLang, GameId, ScanHint } from '../types.ts';

/** Extensions Riftbound connues ; un code inconnu reste accepté s'il a la forme XXX-000/000. */
export const RIFTBOUND_SETS = ['OGN', 'OGS', 'SFD', 'UNL'];

const LANG_TAGS: Record<string, CardLang> = {
  EN: 'en', FR: 'fr', DE: 'de', ES: 'es', IT: 'it', PT: 'pt',
};

/** Corrige les confusions OCR courantes dans un code (O/0, I/1, S/5…). */
function fixDigits(s: string): string {
  return s.replace(/[OoQD]/g, '0').replace(/[Il|]/g, '1').replace(/S/g, '5').replace(/B/g, '8');
}

export function detectLang(text: string): CardLang | undefined {
  if (/[぀-ヿ]/.test(text)) return 'ja';
  if (/[가-힯]/.test(text)) return 'ko';
  if (/[฀-๿]/.test(text)) return 'th';
  if (/[一-鿿]/.test(text)) return 'zh-tw';
  const tag = text.match(/\b[A-Z]{2,4}\d?[a-z]?\s+(EN|FR|DE|ES|IT|PT)\b/);
  return tag ? LANG_TAGS[tag[1]] : undefined;
}

function parseOnePiece(text: string): ScanHint | null {
  // OP05-119, ST01-012, EB01-001, PRB01-001, P-001 (l'OCR lit souvent « 0P05 »).
  const m = text.match(/\b([O0]P|ST|EB|PRB)\s?([0-9OoIl]{2})\s?[-‐–]\s?([0-9OoIlSB]{3})\b/) ??
    text.match(/\b(P)()\s?[-‐–]\s?([0-9OoIlSB]{3})\b/);
  if (!m) return null;
  const prefix = m[1].replace('0P', 'OP');
  const setCode = prefix + (m[2] ? fixDigits(m[2]) : '');
  const localId = fixDigits(m[3]);
  return { game: 'onepiece', code: `${setCode}-${localId}`, setCode, localId, text };
}

function parseRiftbound(text: string): ScanHint | null {
  const re = /\b([A-Z]{3})\s*[-‐–·•]?\s*([0-9OoIl]{3}[a-z*]?)\s*\/\s*([0-9OoIl]{3})\b/g;
  for (const m of text.matchAll(re)) {
    const setCode = m[1];
    if (!RIFTBOUND_SETS.includes(setCode) && !text.includes(`${setCode}-`)) continue;
    const localId = fixDigits(m[2].replace(/[a-z*]$/, '')) + (m[2].match(/[a-z*]$/)?.[0] ?? '');
    return {
      game: 'riftbound', code: `${setCode}-${localId}`, setCode, localId,
      setTotal: Number(fixDigits(m[3])), text,
    };
  }
  return null;
}

function parsePokemon(text: string): ScanHint | null {
  // 136/189, TG05/TG30, GG01/GG70, 001/SV-P… précédé éventuellement du code d'extension : « SVI EN 123/198 », « SV4a 123/190 ».
  const re = /(?:\b([A-Za-z]{2,4}\d{0,2}[a-z]?)\s+(?:(?:EN|FR|DE|ES|IT|PT)\s+)?)?\b((?:TG|GG|RC|SV)?[0-9OoIl]{1,3})\s*\/\s*((?:TG|GG|RC|SV)?[0-9OoIl]{2,3})\b/;
  const m = text.match(re);
  if (!m) return null;
  const prefixed = (s: string) => {
    const p = s.match(/^(TG|GG|RC|SV)/)?.[0] ?? '';
    return p + fixDigits(s.slice(p.length));
  };
  const localId = prefixed(m[2]);
  const total = prefixed(m[3]);
  const setTotal = /^\d+$/.test(total) ? Number(total) : undefined;
  const setCode = m[1] && !/^(HP|PV|KP|EN|FR|DE|ES|IT|PT)$/i.test(m[1]) ? m[1] : undefined;
  return { game: 'pokemon', code: `${localId}/${total}`, setCode, localId, setTotal, text };
}

/**
 * Extrait d'un texte OCR le code de collection imprimé sur la carte.
 * `game` restreint la recherche à un jeu ; sinon le jeu est déduit du format du code.
 */
export function parseScanText(rawText: string, game?: GameId): ScanHint | null {
  const text = rawText.replace(/\r/g, '');
  const parsers: Record<GameId, (t: string) => ScanHint | null> = {
    onepiece: parseOnePiece,
    riftbound: parseRiftbound,
    pokemon: parsePokemon,
  };
  const order: GameId[] = game ? [game] : ['onepiece', 'riftbound', 'pokemon'];
  for (const g of order) {
    const hint = parsers[g](text);
    if (hint) return { ...hint, lang: detectLang(text) };
  }
  return null;
}

/** Similarité grossière entre un nom de carte et le texte OCR (0..1), pour classer les candidats. */
export function nameScore(name: string, text: string): number {
  const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
  const n = norm(name);
  const t = norm(text);
  if (!n) return 0;
  if (t.includes(n)) return 1;
  const words = n.split(/[\s\-']+/).filter((w) => w.length > 1);
  if (!words.length) return 0;
  return words.filter((w) => t.includes(w)).length / words.length;
}
