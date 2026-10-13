// Logos des extensions, rassemblés depuis plusieurs sources et publiés avec le catalogue
// (catalog/logos/<dossier>/<id>.png, réduits à 400 px de large) pour ne pas dépendre des sites d'origine.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { CATALOG, getText, pool, unescapeHtml } from './lib.mjs';

/** Nom d'extension comparable entre sources : minuscules, sans ponctuation ni suffixe de langue. */
export const setKey = (name) =>
  name.toLowerCase().normalize('NFKD').replace(/&/g, 'and').replace(/[^a-z0-9]/g, '').replace(/(jp|japan|japanese)$/, '');

/**
 * Noms qui diffèrent d'une source à l'autre (clé normalisée → autres clés possibles).
 * Limitless donne les noms anglais officiels ; Serebii et Pokellector, des traductions de fans.
 */
const ALIASES = {
  amazingvolttackle: ['astonishingvolttackle'],
  legendaryheartbeat: ['legendarybeat'],
  rebelclash: ['rebelliousclash'],
  jetblackspirit: ['jetblackpoltergeist'],
  skyscrapingperfection: ['skyscrapingperfect'],
  matchlessfighters: ['matchlessfighter'],
  terastalfestex: ['terastalfestivalex'],
  fullmetalforce: ['fullmetalwall'],
  superburstimpact: ['explosiveimpact'],
  charismaoftherippedsky: ['charismaofthewreckedsky'],
  championsroad: ['championroad'],
  beastsfromtheultradimension: ['ultradimensionalbeast', 'ultradimensionalbeasts'],
  awakenedheroes: ['awakeninghero'],
  shininglegends: ['shininglegend'],
  letsfacenewtrials: ['beyondanewchallenge'],
  sunandmoonplus: ['sunmoonstrengtheningpack'],
  pikachuandnewfriends: ['pikachunewfriends'],
  bestofxy: ['thebestofxy'],
  '20thanniversarypack': ['20thanniversary'],
  illusionlegenddreamholocollection: ['mythicallegendarydreamholocollection'],
  heatburstfighter: ['feverburstfighter'],
  exxmegaxbreakchampionpack: ['premiumchampionpackexmbreak'],
  awakenedpsychicking: ['awakeningpsychicchampion', 'awakeningofpsychickings'],
  rageofthebrokenheaven: ['rageofthetornheavens'],
  bluecounterattack: ['blueshock'],
  redlightflash: ['redflash'],
  perfectbattledeckzygardeex: ['perfectbattledeck60zygardeex'],
  megarayquazaexdeck: ['megabattledeckmrayquazaex', 'megarayquazaexbattledeck'],
  megacharizarddeck: ['megabattledeckmcharizardex'],
  genesecthalfdeck: ['mewtwovsgenesectgenesect'],
  mewtwohalfdeck: ['mewtwovsgenesectmewtwo'],
  raidenknuckle: ['thunderknuckle'],
  teamplasmapowereddeck: ['teamplasmapowerdeck'],
  blastoiseandkyuremexdeck: ['blastoisekyuremcombodeck'],
  ashvsteamrockethalfdecks: ['ashvsteamrocketbattleset'],
  rockrufffullstrengthdeck: ['rockrufffullpowerdeck'],
  heatwavearena: ['hotairarena'],
  nihilzero: ['munikiszero'],
  megadream: ['megadreamex'],
  pokemoncard151: ['151'],
  '151': ['pokemoncard151'],
  pokemongo: ['pokemongoxpokemoncardgame'],
  terastalfestival: ['terastalfestivalex'],
  shinytreasure: ['shinytreasureex'],
  scarletex: ['scarlet'],
  violetex: ['violet'],
  forbiddenlight: ['forbiddenlightjp'],
};
export const keysFor = (name) => {
  const k = setKey(name);
  return [k, ...(ALIASES[k] ?? []), k.replace(/ex$/, ''), `${k}ex`];
};

// Les sites de logos refusent souvent les robots : on se présente comme un navigateur.
const BROWSER = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
async function download(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': BROWSER, Accept: 'image/*,*/*;q=0.8', Referer: new URL(url).origin + '/' } });
      if (r.status === 404) return null;
      if (r.ok) return Buffer.from(await r.arrayBuffer());
    } catch {
      // nouvel essai
    }
    await new Promise((res) => setTimeout(res, 800 * (i + 1)));
  }
  return null;
}
export const failures = [];

/** Logos Pokellector (anglais ou japonais) : « …/logos/Storm-Emeralda.logo.437.png » → clé du nom → URL. */
export function parsePokellectorLogos(html) {
  const out = new Map();
  for (const m of html.matchAll(/https:\/\/den-media\.pokellector\.com\/logos\/([^"'\s]+?)\.logo\.\d+\.png/g)) {
    const k = setKey(decodeURIComponent(m[1]).replace(/-/g, ' '));
    if (k && !out.has(k)) out.set(k, m[0]);
  }
  return out;
}

export async function pokellectorLogos(site) {
  const r = await fetch(`${site}/sets`, { headers: { 'User-Agent': BROWSER } }).catch(() => null);
  const html = r?.ok ? await r.text() : null;
  return html ? parsePokellectorLogos(html) : new Map();
}

/** Logos Serebii de la page des extensions japonaises : clé du nom anglais → URL. */
export function parseSerebiiLogos(html) {
  const out = new Map();
  for (const m of html.matchAll(/<img src="(\/card\/logo\/[^"]+\.png)"[^>]*alt="([^"]+?) Set Icon"/g)) {
    const k = setKey(unescapeHtml(m[2]));
    if (k && !out.has(k)) out.set(k, `https://www.serebii.net${m[1]}`);
  }
  return out;
}

export async function serebiiLogoMap() {
  const r = await fetch('https://www.serebii.net/card/japanese.shtml', { headers: { 'User-Agent': BROWSER } }).catch(() => null);
  const html = r?.ok ? await r.text() : null;
  return html ? parseSerebiiLogos(html) : new Map();
}

/** Premier logo trouvé pour ce nom dans les tables (dans l'ordre de préférence). */
export function findLogo(name, tables) {
  for (const t of tables) for (const k of keysFor(name)) if (t.has(k)) return t.get(k);
  return undefined;
}

/**
 * Télécharge un logo, le réduit (400 px de large au plus) et l'enregistre dans catalog/logos/<folder>/<id>.png.
 * Renvoie le chemin relatif au catalogue, ou undefined si l'image est introuvable.
 */
export async function saveLogo(url, folder, id) {
  const rel = `logos/${folder}/${id.replace(/[^A-Za-z0-9._-]/g, '_')}.png`;
  const file = join(CATALOG, rel);
  if (existsSync(file)) return rel;
  const buf = await download(url);
  if (!buf || buf.length < 200) { failures.push(url); return undefined; }
  try {
    const png = await sharp(buf).resize({ width: 400, withoutEnlargement: true }).png({ compressionLevel: 9, palette: true }).toBuffer();
    mkdirSync(join(CATALOG, 'logos', folder), { recursive: true });
    writeFileSync(file, png);
    return rel;
  } catch {
    failures.push(url);
    return undefined;
  }
}

/** Enregistre les logos trouvés pour une liste d'extensions ; `pick(set)` donne l'URL d'origine. Renvoie id → chemin. */
export async function saveLogos(sets, folder, pick) {
  const found = new Map();
  await pool(sets, 6, async (s) => {
    const url = await pick(s);
    if (!url) return;
    const rel = await saveLogo(url, folder, s.id);
    if (rel) found.set(s.id, rel);
  });
  return found;
}
