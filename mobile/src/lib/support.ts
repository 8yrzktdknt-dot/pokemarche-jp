/**
 * Messages au support (support.tcgmarket@gmail.com) envoyés depuis l'app, sans logiciel de messagerie :
 * service FormSubmit (formsubmit.co), qui transmet le formulaire par e-mail. Le premier envoi déclenche un e-mail
 * d'activation à valider une fois depuis la boîte du support.
 */
export const SUPPORT_EMAIL = 'support.tcgmarket@gmail.com';
const ENDPOINT = `https://formsubmit.co/ajax/${SUPPORT_EMAIL}`;

export interface Report {
  topic: string;
  message: string;
  /** Adresse de la personne, pour lui répondre (facultative). */
  email?: string;
  card?: { game: string; id: string; lang: string; name?: string; number?: string; set?: string };
  version?: string;
  appLang?: string;
}

/** Sujet et lignes de l'e-mail (lisibles directement dans Gmail). */
export function reportFields(r: Report): Record<string, string> {
  const c = r.card;
  const fields: Record<string, string> = {
    _subject: `[TCGMarket] ${r.topic}${c ? ` · ${c.name ?? c.id} (${c.lang})` : ''}`,
    _template: 'table',
    _captcha: 'false',
    Sujet: r.topic,
    Message: r.message.trim(),
  };
  if (r.email) { fields.Email = r.email; fields._replyto = r.email; }
  if (c) {
    fields.Carte = [c.name, c.number, c.set].filter(Boolean).join(' · ');
    fields['Identifiant'] = `${c.game} / ${c.lang} / ${c.id}`;
  }
  if (r.version) fields.Version = r.version;
  if (r.appLang) fields['Langue de l\'app'] = r.appLang;
  return fields;
}

export async function sendReport(r: Report): Promise<void> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(reportFields(r)),
  });
  const j = (await res.json().catch(() => null)) as { success?: string | boolean; message?: string } | null;
  if (!res.ok || String(j?.success) !== 'true') throw new Error(j?.message || `HTTP ${res.status}`);
}

/** Lien de secours : le même message dans le logiciel de messagerie. */
export function mailtoLink(r: Report): string {
  const f = reportFields(r);
  const body = Object.entries(f).filter(([k]) => !k.startsWith('_')).map(([k, v]) => `${k} : ${v}`).join('\n');
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(f._subject)}&body=${encodeURIComponent(body)}`;
}
