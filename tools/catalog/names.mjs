// Traduction des noms de cartes japonais → anglais / français, à partir des noms officiels des Pokémon (PokeAPI).
import { getText } from './lib.mjs';

const CSV = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_names.csv';
// Identifiants de langue PokeAPI.
const JA_KANA = '1', FR = '5', EN = '9', JA = '11';

// Dresseurs fréquents dans les noms de cartes « X の Pokémon » (« Lillie's Clefairy ex », « Mélofée de Lilie-ex »).
const TRAINERS = {
  'リーリエ': ['Lillie', 'Lilie'], 'エリカ': ['Erika', 'Érika'], 'アオキ': ['Larry', 'Okuba'], 'ナンジャモ': ['Iono', 'Mashynn'],
  'シロナ': ['Cynthia', 'Cynthia'], 'カスミ': ['Misty', 'Ondine'], 'タケシ': ['Brock', 'Pierre'], 'ロケット団': ['Team Rocket', 'de la Team Rocket'],
  'ホップ': ['Hop', 'Nabil'], 'マリィ': ['Marnie', 'Rosemary'], 'N': ['N', 'N'], 'ヒビキ': ['Ethan', 'Gold'], 'ダイゴ': ['Steven', 'Pierre Rochard'],
  'ペパー': ['Arven', 'Pepper'], 'ネモ': ['Nemona', 'Menzi'], 'ボタン': ['Penny', 'Pania'], 'サカキ': ['Giovanni', 'Giovanni'],
  'ナツメ': ['Sabrina', 'Morgane'], 'カツラ': ['Blaine', 'Auguste'], 'キョウ': ['Koga', 'Koga'], 'マチス': ['Lt. Surge', 'Major Bob'],
  'ハルカ': ['May', 'Flora'], 'ヒカリ': ['Dawn', 'Aurore'], 'セレナ': ['Serena', 'Serena'], 'スティーブン': ['Steven', 'Pierre Rochard'],
  'ミモザ': ['Miriam', 'Mimosa'], 'ハッサク': ['Hassel', 'Hassaku'], 'リップ': ['Tulip', 'Tulipe'], 'ライム': ['Ryme', 'Laïm'],
  'グルーシャ': ['Grusha', 'Grusha'], 'チリ': ['Rika', 'Chili'], 'ポピー': ['Poppy', 'Popi'], 'オモダカ': ['Geeta', 'Alisma'],
  'サトシ': ['Ash', 'Sacha'],
};
// Formes au nom officiel propre (anglais, français).
const FORMS = {
  'ヒートロトム': ['Heat Rotom', 'Motisma Chaleur'], 'ウォッシュロトム': ['Wash Rotom', 'Motisma Lavage'],
  'フロストロトム': ['Frost Rotom', 'Motisma Froid'], 'スピンロトム': ['Fan Rotom', 'Motisma Hélice'], 'カットロトム': ['Mow Rotom', 'Motisma Tonte'],
  'オリジンパルキア': ['Origin Forme Palkia', 'Palkia Originel'], 'オリジンディアルガ': ['Origin Forme Dialga', 'Dialga Originel'],
  'オリジンギラティナ': ['Origin Forme Giratina', 'Giratina Originel'],
  'ウルトラネクロズマ': ['Ultra Necrozma', 'Ultra-Necrozma'],
  'ネクロズマ あかつきのつばさ': ['Dawn Wings Necrozma', "Necrozma Ailes de l'Aurore"],
  'ネクロズマ たそがれのたてがみ': ['Dusk Mane Necrozma', 'Necrozma Crinière du Couchant'],
  'ホワイトキュレム': ['White Kyurem', 'Kyurem Blanc'], 'ブラックキュレム': ['Black Kyurem', 'Kyurem Noir'],
  'サトシゲッコウガ': ['Ash-Greninja', 'Amphinobi de Sacha'], '名探偵ピカチュウ': ['Detective Pikachu', 'Détective Pikachu'],
};
// Préfixes d'anciennes cartes (« ひかるセレビィ » → « Shining Celebi », « わるいバンギラス » → « Dark Tyranitar »).
const PREFIXES = { 'ひかる': ['Shining', 'brillant'], 'わるい': ['Dark', 'obscur'] };
const REGIONS = {
  'アローラ': ['Alolan', "d'Alola"], 'ガラル': ['Galarian', 'de Galar'], 'ヒスイ': ['Hisuian', 'de Hisui'], 'パルデア': ['Paldean', 'de Paldea'],
};

let table = null;

/** Charge les noms d'espèces : japonais → [anglais, français]. */
export async function loadSpeciesNames() {
  if (table) return table;
  const csv = (await getText(CSV)) ?? '';
  const bySpecies = new Map();
  for (const line of csv.split('\n').slice(1)) {
    const [id, lang, name] = line.split(',');
    if (!id || !name) continue;
    if (!bySpecies.has(id)) bySpecies.set(id, {});
    bySpecies.get(id)[lang] = name;
  }
  table = new Map();
  for (const n of bySpecies.values()) {
    for (const ja of [n[JA], n[JA_KANA]]) if (ja && n[EN]) table.set(ja, [n[EN], n[FR] ?? n[EN]]);
  }
  console.log(`Noms d'espèces : ${table.size}`);
  return table;
}

/** Lettres et chiffres en pleine largeur, comme dans les noms PokeAPI (« ポリゴンZ » → « ポリゴンＺ »). */
const fullWidth = (s) => s.replace(/[A-Za-z0-9]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0xfee0));

function species(raw) {
  const ja = raw.trim();
  const form = FORMS[ja] ?? FORMS[ja.normalize('NFKC')];
  if (form) return form;
  if (table.has(ja)) return table.get(ja);
  if (table.has(fullWidth(ja))) return table.get(fullWidth(ja));
  if (table.has(ja.normalize('NFKC'))) return table.get(ja.normalize('NFKC'));
  // Région (« アローラロコン » → « Alolan Vulpix », « Goupix d'Alola »)
  for (const [r, [en, fr]] of Object.entries(REGIONS)) {
    const rest = ja.slice(r.length).trim();
    if (ja.startsWith(r) && table.has(rest)) {
      const [sEn, sFr] = table.get(rest);
      return [`${en} ${sEn}`, `${sFr} ${fr}`];
    }
  }
  for (const [p, [en, fr]] of Object.entries(PREFIXES)) {
    const rest = ja.slice(p.length).trim();
    if (ja.startsWith(p) && table.has(rest)) {
      const [sEn, sFr] = table.get(rest);
      return [`${en} ${sEn}`, `${sFr} ${fr}`];
    }
  }
  // Méga-Évolution (« メガレックウザ » ; « メガリザードンY »)
  const m = ja.match(/^メガ(.+?)([XYＸＹ]?)$/);
  if (m && table.has(m[1])) {
    const [sEn, sFr] = table.get(m[1]);
    const xy = m[2] ? ` ${m[2].replace('Ｘ', 'X').replace('Ｙ', 'Y')}` : '';
    return [`Mega ${sEn}${xy}`, `Méga-${sFr}${xy}`];
  }
  return null;
}

/**
 * « メガレックウザex » → ["Mega Rayquaza ex", "Méga-Rayquaza-ex"] ; null si le nom n'est pas entièrement traduisible
 * (objets, dresseurs…) : mieux vaut le nom d'origine qu'un nom à moitié traduit.
 */
export function translateJa(name) {
  if (!table) throw new Error('loadSpeciesNames() d\'abord');
  const full = name.trim().normalize('NFKC');
  // Moitiés de cartes LEGEND : « ダークライ&クレセリアLEGEND (上) » → « Darkrai & Cresselia LEGEND (Top) ».
  const half = full.match(/^(.*?)\s*\((上|下)\)$/);
  if (half) {
    const t = translateJa(half[1]);
    return t && [`${t[0]} (${half[2] === '上' ? 'Top' : 'Bottom'})`, `${t[1]} (${half[2] === '上' ? 'Haut' : 'Bas'})`];
  }
  // Dresseur seul (« カスミ » → « Misty », « Ondine »).
  if (TRAINERS[full]) return TRAINERS[full];
  const m = full.match(/^(.*?)\s*((?:ex|EX|GX|V|VMAX|VSTAR|V-UNION|BREAK|LV\.X|LEGEND|G|☆|◇|δ)?)$/);
  let core = m[1];
  const suffix = m[2];
  // Méga-Évolution de l'époque XY : « MサーナイトEX » → « M Gardevoir EX ».
  const mega = suffix === 'EX' && core.match(/^M(.+)$/);
  if (mega && species(mega[1])) {
    const [sEn, sFr] = species(mega[1]);
    return [`M ${sEn} EX`, `M-${sFr}-EX`];
  }
  // Duos (« ピカチュウ&ゼクロムGX » → « Pikachu & Zekrom GX »).
  if (/[&＆]/.test(core)) {
    const parts = core.split(/\s*[&＆]\s*/).map((x) => species(x));
    if (parts.some((x) => !x)) return null;
    const en = parts.map((x) => x[0]).join(' & ');
    const fr = parts.map((x) => x[1]).join(' & ');
    return suffix ? [`${en} ${suffix}`, `${fr}-${suffix}`] : [en, fr];
  }
  let en, fr;
  const pos = core.indexOf('の');
  if (pos > 0 && TRAINERS[core.slice(0, pos)]) {
    const [tEn, tFr] = TRAINERS[core.slice(0, pos)];
    const s = species(core.slice(pos + 1));
    if (!s) return null;
    en = `${tEn}'s ${s[0]}`;
    fr = tFr.startsWith('de ') ? `${s[1]} ${tFr}` : `${s[1]} ${/^[AEIOUÉÈ]/i.test(tFr) ? "d'" : 'de '}${tFr}`;
  } else {
    const s = species(core);
    if (!s) return null;
    [en, fr] = s;
  }
  if (!suffix) return [en, fr];
  return [`${en} ${suffix}`, suffix === 'ex' ? `${fr}-ex` : `${fr} ${suffix}`];
}

/**
 * Noms des espèces dans les langues de l'app (catalog/names/species.json) : nom anglais → noms
 * [fr, de, es, it, ja, ko, zh-tw, zh-cn]. L'app traduit ainsi le nom des cartes Pokémon (« Charizard ex »
 * → « リザードンex ») ; portugais, néerlandais, russe, thaï : noms anglais (officiels dans ces pays).
 */
export const SPECIES_LANGS = ['fr', 'de', 'es', 'it', 'ja', 'ko', 'zh-tw', 'zh-cn'];
const POKEAPI_LANG = { fr: '5', de: '6', es: '7', it: '8', ja: '11', ko: '3', 'zh-tw': '4', 'zh-cn': '12' };
export function speciesTable(csv) {
  const bySpecies = new Map();
  for (const line of csv.split('\n').slice(1)) {
    const [id, lang, name] = line.split(',');
    if (!id || !name) continue;
    if (!bySpecies.has(id)) bySpecies.set(id, {});
    bySpecies.get(id)[lang] = name;
  }
  const out = {};
  for (const n of bySpecies.values()) {
    if (!n[EN]) continue;
    out[n[EN]] = SPECIES_LANGS.map((l) => n[POKEAPI_LANG[l]] ?? '');
  }
  return out;
}

/** Écrit catalog/names/species.json (étape « set-names » du robot). */
export async function buildSpeciesNames(writeJson) {
  const csv = await getText(CSV);
  if (!csv) return;
  const names = speciesTable(csv);
  writeJson('names/species.json', { langs: SPECIES_LANGS, names });
  console.log(`Noms d'espèces pour l'app : ${Object.keys(names).length}`);
}
