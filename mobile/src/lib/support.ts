/**
 * Messages au support (support.tcgmarket@gmail.com) envoyés depuis l'app, sans logiciel de messagerie :
 *  - enregistrés dans la base Supabase (table « reports », voir supabase/schema.sql) : rien n'est perdu ;
 *  - transmis par e-mail par Web3Forms (web3forms.com) avec la clé d'accès reçue sur l'adresse du support.
 */
export const SUPPORT_EMAIL = 'support.tcgmarket@gmail.com';
/** Clé d'accès Web3Forms (publique par conception : elle ne permet que d'envoyer à l'adresse du support). */
export const WEB3FORMS_KEY = 'bb7cad15-ec72-4d2e-a04e-382e7ce1c473';
const ENDPOINT = 'https://api.web3forms.com/submit';

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

/** Envoi par e-mail (Web3Forms) ; false si la clé n'est pas encore configurée. */
export async function emailReport(r: Report): Promise<boolean> {
  if (!WEB3FORMS_KEY) return false;
  const { _subject, _replyto, ...rest } = reportFields(r);
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ access_key: WEB3FORMS_KEY, subject: _subject, from_name: 'TCGMarket', ...(_replyto ? { replyto: _replyto } : {}), ...rest }),
  });
  const j = (await res.json().catch(() => null)) as { success?: boolean; message?: string } | null;
  if (!res.ok || !j?.success) throw new Error(j?.message || `HTTP ${res.status}`);
  return true;
}

/** Lien de secours : le même message dans le logiciel de messagerie. */
export function mailtoLink(r: Report): string {
  const f = reportFields(r);
  const body = Object.entries(f).filter(([k]) => !k.startsWith('_')).map(([k, v]) => `${k} : ${v}`).join('\n');
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(f._subject)}&body=${encodeURIComponent(body)}`;
}
