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
};
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

function species(ja) {
  if (table.has(ja)) return table.get(ja);
  if (table.has(fullWidth(ja))) return table.get(fullWidth(ja));
  if (table.has(ja.normalize('NFKC'))) return table.get(ja.normalize('NFKC'));
  // Région (« アローラロコン » → « Alolan Vulpix », « Goupix d'Alola »)
  for (const [r, [en, fr]] of Object.entries(REGIONS)) {
    if (ja.startsWith(r) && table.has(ja.slice(r.length))) {
      const [sEn, sFr] = table.get(ja.slice(r.length));
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
  const m = name.trim().match(/^(.*?)\s*((?:ex|EX|GX|V|VMAX|VSTAR|V-UNION|BREAK|LV\.X|☆|◇|δ)?)$/);
  const core = m[1];
  const suffix = m[2];
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
