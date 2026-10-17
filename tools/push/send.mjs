// Envoie les alertes de prix (liste de souhaits) en notifications sur les téléphones abonnés (Web Push), même
// appli fermée. Lancé par GitHub après chaque mise à jour du catalogue (.github/workflows/push-alerts.yml).
//  - abonnements et listes de souhaits : fonction push_targets de Supabase (jeton tiré de la clé privée) ;
//  - cotes : historique des prix publié avec le catalogue (dernier relevé de chaque carte) ;
//  - cartes déjà signalées : .push-state/state.json (gardé entre deux passages par le cache de GitHub).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import webpush from 'web-push';
import { historyDir, historyKey, pointsOf } from '../../mobile/src/lib/priceHistory.ts';
import { translate } from '../../mobile/src/lib/i18n.ts';
import { APP_LOCALE } from '../../mobile/src/lib/i18n.ts';
import { FALLBACK_RATES, convert, formatMoney } from '../../mobile/src/lib/currency.ts';
import { collectionKey } from '../../mobile/src/lib/variants.ts';
import { computeAlerts } from './alerts.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CATALOG = join(ROOT, 'catalog');
const STATE = join(ROOT, '.push-state', 'state.json');
const APP_URL = 'https://bananaintrouble.github.io/tcgmarket/app';

const config = readFileSync(join(ROOT, 'mobile/src/lib/cloud/config.ts'), 'utf8');
const constant = (name) => config.match(new RegExp(`${name} = '([^']*)'`))?.[1] ?? '';
const SUPABASE_URL = constant('SUPABASE_URL');
const SUPABASE_KEY = constant('SUPABASE_KEY');
const PUBLIC_KEY = constant('PUSH_PUBLIC_KEY');
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY?.trim();
// Essais : base simulée.
const API = process.env.PUSH_API_URL || SUPABASE_URL;

if (!PRIVATE_KEY) {
  console.log('Pas de clé VAPID_PRIVATE_KEY (secret GitHub) : rien à envoyer.');
  process.exit(0);
}
const token = createHash('sha256').update(`tcgmarket-push:${PRIVATE_KEY}`).digest('hex');

async function rpc(name, body) {
  const r = await fetch(`${API}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${name} : HTTP ${r.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

async function rates() {
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD,JPY');
    const j = await r.json();
    return { EUR: 1, USD: j.rates?.USD ?? FALLBACK_RATES.USD, JPY: j.rates?.JPY ?? FALLBACK_RATES.JPY };
  } catch {
    return FALLBACK_RATES;
  }
}

const histories = new Map();
function history(path) {
  if (!histories.has(path)) {
    const file = join(CATALOG, 'history', `${path}.json`);
    histories.set(path, existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null);
  }
  return histories.get(path);
}

/** Cote actuelle : dernier relevé de l'historique (sinon le prix enregistré avec la carte). */
function priceOf(card) {
  const currency = card.prices?.[0]?.currency ?? 'EUR';
  const dir = historyDir(card.game, card.lang);
  const points = dir && card.setId ? pointsOf(history(`${dir}/${card.setId}`), card) : [];
  const last = points[points.length - 1];
  if (last) return { value: last.v, currency };
  const p = card.prices?.[0];
  return p ? { value: p.value, currency: p.currency } : undefined;
}

const appLang = (l) => (APP_LOCALE[l] ? l : 'en');
const nameOf = (card, lang) => card.names?.[lang] ?? (lang === 'fr' ? card.nameFr : undefined) ?? card.name;

function message(lang, deals) {
  const l = appLang(lang);
  const money = (v, c) => formatMoney(v, c, APP_LOCALE[l]);
  const first = deals[0];
  if (deals.length === 1) {
    return {
      title: translate(l, 'wish.notifTitle'),
      body: translate(l, 'wish.notifBody', { name: nameOf(first.card, l), price: money(first.now, first.currency), target: money(first.target, first.currency) }),
      icon: first.card.imageSmall,
      tag: collectionKey(first.card),
    };
  }
  return {
    title: translate(l, 'wish.notifTitleMany', { n: deals.length }),
    body: deals.slice(0, 4).map((d) => `${nameOf(d.card, l)} · ${money(d.now, d.currency)}`).join('\n') + (deals.length > 4 ? '\n…' : ''),
    icon: first.card.imageSmall,
    tag: 'wishlist',
  };
}

/** Étiquette propre à chaque envoi : une nouvelle alerte ne remplace jamais en silence la précédente. */
const fresh = (tag) => `${tag}:${Date.now()}`;

async function main() {
  webpush.setVapidDetails('https://github.com/BananaInTrouble/tcgmarket', PUBLIC_KEY, PRIVATE_KEY);
  const targets = await rpc('push_targets', { token });
  console.log(`${targets.length} appareil(s) abonné(s).`);
  const r = await rates();
  // Test (lancement à la main, case « renvoyer ») : les alertes déjà signalées repartent.
  const state = process.env.PUSH_RESEND ? {} : existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : {};
  const { alerts, state: next } = computeAlerts(targets, priceOf, (v, from, to) => convert(v, from, to, r), state);
  let sent = 0, gone = 0;
  const delivered = new Set();
  for (const { target, deals } of alerts) {
    const m = message(target.lang, deals);
    const payload = JSON.stringify({ ...m, tag: fresh(m.tag), url: `${APP_URL}/wishlist` });
    try {
      // Urgence haute : sinon iPhone et Android peuvent garder la notification jusqu'au réveil de l'appareil ou
      // l'ouverture de l'appli (économie de batterie).
      await webpush.sendNotification({ endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } }, payload, { TTL: 24 * 3600, urgency: 'high' });
      delivered.add(target.user);
      sent++;
    } catch (e) {
      // Abonnement expiré ou retiré (appli désinstallée, notifications coupées) : oublié.
      if (e.statusCode === 404 || e.statusCode === 410) {
        await rpc('push_forget', { token, p_endpoint: target.endpoint }).catch(() => {});
        gone++;
      } else console.warn(`Envoi impossible (${e.statusCode ?? e.message})`);
    }
  }
  // Alertes arrivées sur aucun appareil : retentées au passage suivant.
  for (const { target, deals } of alerts) {
    if (delivered.has(target.user)) continue;
    for (const d of deals) { if (d.before === undefined) delete next[d.key]; else next[d.key] = d.before; }
  }
  mkdirSync(dirname(STATE), { recursive: true });
  writeFileSync(STATE, JSON.stringify(next));
  console.log(`${sent} notification(s) envoyée(s), ${gone} abonnement(s) expiré(s).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
