// Riftbound : galerie officielle de Riot (données de la page, en anglais et en français).
import { getText, pool, sortByRelease, writeJson } from './lib.mjs';

const LOCALES = { en: 'en-us', fr: 'fr-fr' };
// La galerie ne donne pas les dates de sortie : ordre de sortie connu (du plus récent au plus ancien).
// Les extensions absentes de cette liste sont placées en tête (probablement les plus récentes).
const RELEASE_ORDER = ['VEN', 'RAD', 'UNL', 'SFD', 'OGS', 'OGN'];

function nextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  return m ? JSON.parse(m[1]) : null;
}
function findKey(o, key) {
  if (!o || typeof o !== 'object') return null;
  if (o[key] && typeof o[key] === 'object' && Array.isArray(o[key].items)) return o[key];
  for (const v of Object.values(o)) {
    const r = findKey(v, key);
    if (r) return r;
  }
  return null;
}

/** Attributs de la fiche : artiste, énergie, puissance (« might »), coût en puissance. */
export function attrsOf(c) {
  const label = (f) => f?.value?.label ?? f?.values?.map((v) => v.label).join(', ');
  const a = {
    illustrator: label(c.illustrator),
    energy: label(c.energy),
    might: label(c.might),
    power: label(c.power),
  };
  const out = Object.fromEntries(Object.entries(a).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  return Object.keys(out).length ? out : undefined;
}

export async function buildRiftbound() {
  for (const [lang, locale] of Object.entries(LOCALES)) {
    const html = await getText(`https://riftbound.leagueoflegends.com/${locale}/card-gallery/`);
    const data = html && nextData(html);
    const cards = data && findKey(data, 'cards');
    const sets = data && findKey(data, 'sets');
    if (!cards?.items?.length || !sets?.items?.length) { console.warn(`Riftbound ${lang} : galerie illisible`); continue; }

    const bySet = new Map(sets.items.map((s) => [s.id, []]));
    for (const c of cards.items) {
      const setId = c.set?.value?.id;
      if (!setId) continue;
      if (!bySet.has(setId)) bySet.set(setId, []);
      bySet.get(setId).push({
        id: c.id,
        localId: String(c.collectorNumber ?? ''),
        number: c.publicCode ?? `${setId}-${c.collectorNumber}`,
        name: c.name,
        image: c.cardImage?.url,
        rarity: c.rarity?.value?.label,
        attrs: attrsOf(c),
        facets: {
          domain: (c.domain?.values ?? []).map((d) => d.label),
          type: (c.cardType?.type ?? []).map((t) => t.label),
        },
      });
    }
    const rank = (id) => { const i = RELEASE_ORDER.indexOf(id); return i < 0 ? -1 : i; };
    const setList = sets.items
      .map((s) => ({ id: s.id, code: s.id, name: s.name, count: bySet.get(s.id)?.length ?? 0 }))
      .filter((s) => s.count > 0)
      .sort((a, b) => rank(a.id) - rank(b.id));
    for (const [id, list] of bySet) {
      list.sort((a, b) => Number(a.localId) - Number(b.localId) || a.number.localeCompare(b.number));
      writeJson(`cards/riftbound-${lang}/${id}.json`, list);
    }
    writeJson(`sets/riftbound-${lang}.json`, { built: new Date().toISOString(), blocs: [{ id: 'riftbound', name: 'Riftbound', sets: setList }] });
    console.log(`Riftbound ${lang} : ${cards.items.length} cartes, ${setList.length} extensions`);
  }
}
