// Alertes de prix de la liste de souhaits : quelles cartes signaler à chaque abonné (appareil), sans répéter.
// Une carte est signalée quand sa cote passe sous le prix cible, puis de nouveau seulement si elle baisse encore
// d'au moins 10 % ; elle redevient « nouvelle » dès qu'elle repasse au-dessus du prix cible.
import { collectionKey } from '../../mobile/src/lib/variants.ts';

const DROP = 0.9;

/**
 * @param targets abonnements : { user, endpoint, p256dh, auth, lang, wishlist: [{ card, target, currency }] }
 * @param priceOf cote actuelle d'une carte : { value, currency } ou undefined
 * @param convert conversion (valeur, devise de départ, devise d'arrivée)
 * @param state cartes déjà signalées : { 'user|clé de la carte': prix signalé (devise du prix cible) }
 * @returns par abonnement, les cartes à signaler (avec leur clé d'état et le prix signalé avant) ; et le nouvel état
 */
export function computeAlerts(targets, priceOf, convert, state = {}) {
  const next = {};
  const seen = new Set();
  const byUser = new Map();
  // Une fois par utilisateur (plusieurs appareils : même liste, même état).
  for (const t of targets) {
    if (byUser.has(t.user)) continue;
    const deals = [];
    for (const w of t.wishlist ?? []) {
      if (!(w?.target > 0) || !w.card) continue;
      const p = priceOf(w.card);
      if (!p) continue;
      const now = convert(p.value, p.currency, w.currency ?? p.currency);
      const k = `${t.user}|${collectionKey(w.card)}`;
      if (seen.has(k)) continue;
      seen.add(k);
      if (now > w.target) continue;
      const before = state[k];
      next[k] = before !== undefined && now > before * DROP ? before : now;
      if (before === undefined || now <= before * DROP) deals.push({ key: k, before, card: w.card, now, target: w.target, currency: w.currency ?? p.currency, price: p });
    }
    byUser.set(t.user, deals);
  }
  return {
    alerts: targets.map((t) => ({ target: t, deals: byUser.get(t.user) ?? [] })).filter((a) => a.deals.length),
    state: next,
  };
}
