import { Alert, Platform, Share } from 'react-native';

/**
 * Partage d'un lien : feuille de partage du téléphone (navigateur ou app), sinon lien copié.
 * Renvoie « copied » quand le lien a seulement été copié (l'écran l'indique).
 */
export async function shareLink(title: string, url: string): Promise<'shared' | 'copied' | 'failed'> {
  if (Platform.OS === 'web') {
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    try {
      if (nav?.share) { await nav.share({ title, url }); return 'shared'; }
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return 'shared';
    }
    try { await nav?.clipboard?.writeText(url); return 'copied'; } catch { return 'failed'; }
  }
  try { await Share.share({ title, message: `${title}\n${url}`, url }); return 'shared'; } catch { return 'failed'; }
}

/** Fichier texte à enregistrer : téléchargement sur le web, feuille de partage ailleurs. */
export async function saveTextFile(name: string, text: string, mime = 'text/csv'): Promise<void> {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return;
  }
  await Share.share({ title: name, message: text });
}

/** Question oui / non avant une action importante. */
export function askConfirm(message: string, ok: string, cancel: string): Promise<boolean> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return Promise.resolve(window.confirm(message));
  return new Promise((resolve) => Alert.alert('', message, [
    { text: cancel, style: 'cancel', onPress: () => resolve(false) },
    { text: ok, onPress: () => resolve(true) },
  ], { cancelable: true, onDismiss: () => resolve(false) }));
}
