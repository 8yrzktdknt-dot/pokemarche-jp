export type Currency = 'EUR' | 'USD' | 'JPY';
export const CURRENCIES: Currency[] = ['EUR', 'USD', 'JPY'];

/** Valeur de 1 € dans chaque devise. Valeurs de secours, remplacées par le taux du jour (BCE via Frankfurter). */
export type Rates = Record<Currency, number>;
export const FALLBACK_RATES: Rates = { EUR: 1, USD: 1.08, JPY: 162 };

export async function fetchRates(): Promise<Rates> {
  const r = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD,JPY');
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = (await r.json()) as { rates?: Partial<Record<Currency, number>> };
  return { EUR: 1, USD: j.rates?.USD ?? FALLBACK_RATES.USD, JPY: j.rates?.JPY ?? FALLBACK_RATES.JPY };
}

export function convert(value: number, from: string, to: Currency, rates: Rates): number {
  const f = rates[from as Currency];
  if (!f || from === to) return value;
  return (value / f) * rates[to];
}

export function formatMoney(value: number, currency: Currency, locale = 'fr-FR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
  }).format(value);
}
