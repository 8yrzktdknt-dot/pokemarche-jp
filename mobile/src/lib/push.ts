import { Platform } from 'react-native';
import { PUSH_PUBLIC_KEY } from './cloud/config';
import { supabase } from './cloud/supabase';

/**
 * Notifications sur l'appareil même appli fermée (Web Push) : l'appareil s'abonne auprès du navigateur, l'abonnement
 * est enregistré sur le compte, et le robot des prix envoie les alertes (tools/push/send.mjs).
 * iPhone et iPad : seulement pour l'app ajoutée à l'écran d'accueil (iOS 16.4 et plus).
 */
const web = () => Platform.OS === 'web' && typeof window !== 'undefined' && typeof navigator !== 'undefined';

export const pushSupported = () =>
  web() && !!PUSH_PUBLIC_KEY && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/** iPhone ou iPad dans Safari (pas depuis l'écran d'accueil) : il faut d'abord ajouter l'app à l'écran d'accueil. */
export function needsHomeScreen(): boolean {
  if (!web()) return false;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = (navigator as { standalone?: boolean }).standalone || window.matchMedia?.('(display-mode: standalone)').matches;
  return ios && !standalone;
}

const keyBytes = (b64: string) => {
  const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ?? (await Promise.race([navigator.serviceWorker.ready, new Promise<null>((r) => setTimeout(() => r(null), 4000))]));
}

/** Abonnement de cet appareil (null s'il n'y en a pas). */
export async function currentPush(): Promise<PushSubscription | null> {
  try { return (await (await registration())?.pushManager.getSubscription()) ?? null; } catch { return null; }
}

/** Abonne l'appareil et l'enregistre sur le compte (langue des notifications) ; true si c'est fait. */
export async function enablePush(lang: string): Promise<boolean> {
  const sb = supabase();
  const reg = await registration();
  if (!sb || !reg) return false;
  if (Notification.permission !== 'granted' && (await Notification.requestPermission()) !== 'granted') return false;
  const sub = (await reg.pushManager.getSubscription())
    ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUSH_PUBLIC_KEY) }));
  const j = sub.toJSON();
  const { error } = await sb.rpc('save_push_subscription', { p_endpoint: sub.endpoint, p_p256dh: j.keys?.p256dh, p_auth: j.keys?.auth, p_lang: lang });
  return !error;
}

/** Désabonne l'appareil (et l'oublie sur le compte). */
export async function disablePush(): Promise<void> {
  const sub = await currentPush();
  if (!sub) return;
  await supabase()?.rpc('delete_push_subscription', { p_endpoint: sub.endpoint }).then(() => {}, () => {});
  await sub.unsubscribe().catch(() => false);
}

/** Diagnostic : dernière alerte reçue par cet appareil (notée par le service worker) et dernière erreur d'affichage. */
export async function pushDiagnostic(): Promise<{ push?: { at: number; title?: string }; error?: { at: number; message?: string } }> {
  if (!web() || typeof caches === 'undefined') return {};
  try {
    const c = await caches.open('diag-v1');
    const keys = await c.keys();
    const read = async (k: string) => {
      const req = keys.find((r) => r.url.endsWith(`/__diag/${k}`));
      const res = req && (await c.match(req));
      return res ? res.json() : undefined;
    };
    return { push: await read('push'), error: await read('error') };
  } catch {
    return {};
  }
}

/** Notification de test affichée par le service worker (comme une vraie alerte, sans passer par le robot). */
export async function testNotification(title: string, body: string): Promise<boolean> {
  const reg = await registration();
  if (!reg || Notification.permission !== 'granted') return false;
  try { await reg.showNotification(title, { body, tag: `test:${Date.now()}` }); return true; } catch { return false; }
}
