/**
 * Évite les faux positifs de l'OCR : un code n'est validé que s'il est lu
 * `needed` fois de suite, et une carte déjà validée est ignorée pendant `cooldownMs`
 * (sinon la même carte resterait détectée en boucle sous la caméra).
 */
export class ScanStabilizer {
  private last: string | null = null;
  private streak = 0;
  private recent = new Map<string, number>();
  private readonly needed: number;
  private readonly cooldownMs: number;

  constructor(needed = 2, cooldownMs = 4000) {
    this.needed = needed;
    this.cooldownMs = cooldownMs;
  }

  /** Renvoie le code quand il est confirmé, sinon null. `code` null = rien lu sur cette image. */
  push(code: string | null, now = Date.now()): string | null {
    if (!code) {
      this.last = null;
      this.streak = 0;
      return null;
    }
    this.streak = code === this.last ? this.streak + 1 : 1;
    this.last = code;
    if (this.streak < this.needed) return null;
    const seen = this.recent.get(code);
    if (seen !== undefined && now - seen < this.cooldownMs) return null;
    this.recent.set(code, now);
    this.streak = 0;
    return code;
  }

  reset(): void {
    this.last = null;
    this.streak = 0;
    this.recent.clear();
  }
}
