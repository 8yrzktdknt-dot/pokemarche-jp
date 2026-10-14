import { Platform } from 'react-native';
import { APP_VERSION } from './version';

/**
 * Mise à jour automatique de l'app installée (web) : au démarrage et à chaque retour dans l'app, la version en ligne
 * (version.json, jamais en cache) est comparée à celle qui tourne ; si elle est plus récente, le service worker est
 * relancé et la page rechargée une fois sur la nouvelle version.
 */
export function watchForUpdates(): () => void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return () => {};
  const path = window.location.pathname;
  const i = path.indexOf('/app');
  const base = `${i >= 0 ? path.slice(0, i) : ''}/app`;
  let busy = false;
  const check = async () => {
    if (busy || document.visibilityState === 'hidden') return;
    busy = true;
    try {
      const r = await fetch(`${base}/version.json?t=${Date.now()}`, { cache: 'no-store' });
      const online = r.ok ? ((await r.json()) as { version?: string }).version : undefined;
      const key = `reloaded-for-${online}`;
      if (online && online !== APP_VERSION && !sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        const reg = await navigator.serviceWorker?.getRegistration?.();
        await reg?.update().catch(() => {});
        window.location.reload();
      }
    } catch {
      // Hors ligne : on réessaiera au prochain retour dans l'app.
    } finally {
      busy = false;
    }
  };
  check();
  document.addEventListener('visibilitychange', check);
  return () => document.removeEventListener('visibilitychange', check);
}
