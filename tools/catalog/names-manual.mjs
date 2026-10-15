// Noms anglais (et français quand il est sûr) de cartes asiatiques jamais sorties en version internationale liée :
// promos, Dresseurs et Objets propres au Japon ou à Taïwan. Utilisés en dernier recours (fillNamesFromSpecies),
// remplacés dès qu'une version officielle est reliée. Clés : nom imprimé (japonais ou chinois traditionnel).

const SPIRIT = { スピアー: ['Beedrill', 'Dardargnan'], サメハダー: ['Sharpedo', 'Sharpedo'], バクーダ: ['Camerupt', 'Camérupt'], ルカリオ: ['Lucario', 'Lucario'], プテラ: ['Aerodactyl', 'Ptéra'], クチート: ['Mawile', 'Mysdibule'], ボーマンダ: ['Salamence', 'Drattak'], ガブリアス: ['Garchomp', 'Carchacrok'] };
const CITIES = { サッポロ: 'Sapporo', トウホク: 'Tohoku', ヒロシマ: 'Hiroshima', フクオカ: 'Fukuoka', ヨコハマ: 'Yokohama', シブヤ: 'Shibuya', カナザワ: 'Kanazawa', メガトウキョー: 'Mega Tokyo', 臺北: 'Taipei' };

const TABLE = {
  // Japonais
  ポケモンセンター: ['Pokémon Center', 'Centre Pokémon'],
  バトルシティ: ['Battle City'],
  殿堂ベルト: ['Hall of Fame Belt'],
  ビクトリーカップ: ['Victory Cup'],
  トロピカルビーチ: ['Tropical Beach'],
  チャンピオンズフェスティバル: ['Champions Festival', 'Festival des Champions'],
  かがやくイーブイ: ['Radiant Eevee', 'Évoli Radieux'],
  キャンデラ: ['Candela', 'Candela'],
  スパーク: ['Spark', 'Spark'],
  ブランシェ: ['Blanche', 'Blanche'],
  すごいきずぐすり: ['Hyper Potion', 'Hyper Potion'],
  クララ: ['Klara'],
  モノマネむすめ: ['Copycat', 'Imitatrice'],
  バーネット博士: ['Professor Burnet'],
  ワープエネルギー: ['Warp Energy'],
  フレンドボール: ['Friend Ball', 'Copain Ball'],
  ルアーボール: ['Lure Ball', 'Appât Ball'],
  ぼんぐり職人: ['Apricorn Maker'],
  マサキのメンテナンス: ["Bill's Maintenance"],
  釣り人: ['Fisherman', 'Pêcheur'],
  無人発電所: ['Power Plant'],
  ポンチョを着たピカチュウ: ['Poncho-wearing Pikachu'],
  ポンチョを着たイーブイ: ['Poncho-wearing Eevee'],
  レッドのピカチュウ: ["Red's Pikachu", 'Pikachu de Red'],
  なみのりピカチュウ: ['Surfing Pikachu', 'Pikachu Surf'],
  マリオピカチュウ: ['Mario Pikachu'],
  ルイージピカチュウ: ['Luigi Pikachu'],
  アーマードミュウツー: ['Armored Mewtwo', 'Mewtwo Armuré'],
  カリン: ['Karen', 'Marion'],
  トロバ: ['Trevor'],
  パラダイスリゾート: ['Paradise Resort'],
  ジムバッジ: ['Gym Badge'],
  // Chinois traditionnel
  清水記憶碟: ['Water Memory'],
  電子記憶碟: ['Electric Memory'],
  青草記憶碟: ['Grass Memory'],
  精神記憶碟: ['Psychic Memory'],
  戰鬥記憶碟: ['Fighting Memory'],
  火焰記憶碟: ['Fire Memory'],
  扭曲能量: ['Warp Energy'],
  古代水晶: ['Ancient Crystal'],
  皇家蒙面人: ['Masked Royal'],
  電氣力量: ['Electropower'],
  '時拉比◇': ['Celebi ◇'],
  化石發掘地圖: ['Fossil Excavation Map'],
  究極調查隊: ['Ultra Recon Squad'],
  以太基金會職員: ['Aether Foundation Employee'],
  球果職人: ['Apricorn Maker'],
  '單位能量【雷】【超】【鋼】': ['Unit Energy LPM'],
  '單位能量【草】【火】【水】': ['Unit Energy GRW'],
  '單位能量【鬥】【惡】【妖】': ['Unit Energy FDY'],
  謎擬QGX: ['Mimikyu-GX', 'Mimiqui-GX'],
  '耿鬼&謎擬QGX': ['Gengar & Mimikyu-GX', 'Ectoplasma et Mimiqui-GX'],
  多邊獸ZGX: ['Porygon-Z-GX', 'Porygon-Z-GX'],
  神祕珍寶: ['Mysterious Treasure'],
  混和藥草: ['Mixed Herbs'],
  '妖精墜飾【雷】': ['Fairy Charm Lightning'],
  釣魚者: ['Fisherman', 'Pêcheur'],
  弗拉達利實驗室: ['Lysandre Labs'],
  隱密風帽: ['Stealthy Hood'],
  馬志士的作戰: ["Lt. Surge's Strategy"],
  小霞的請求: ["Misty's Favor"],
  坂木的驅逐: ["Giovanni's Exile"],
  小剛的根性: ["Brock's Grit"],
  U迴轉滑板: ['U-Turn Board'],
  偉大捕捉器: ['Great Catcher'],
  大木博士的準備: ["Professor Oak's Setup"],
  混沌之潮漩: ['Chaotic Swell'],
  偉大藥水: ['Great Potion'],
  回收利用能量: ['Recycle Energy'],
  '基本【惡】能量': ['Darkness Energy', 'Énergie Obscurité'],
  '基礎【惡】能量': ['Darkness Energy', 'Énergie Obscurité'],
  '基本【鋼】能量': ['Metal Energy', 'Énergie Métal'],
  '基礎【鋼】能量': ['Metal Energy', 'Énergie Métal'],
  '基本【炎】能量': ['Fire Energy', 'Énergie Feu'],
  辣味香料咖哩: ['Spicy Seasoned Curry'],
  阿渡的噴火龍V: ["Lance's Charizard V", 'Dracaufeu de Peter-V'],
  冠軍慶典: ['Champions Festival', 'Festival des Champions'],
  坎迪拉: ['Candela', 'Candela'],
  史帕克: ['Spark', 'Spark'],
  布蘭雪: ['Blanche', 'Blanche'],
  詛咒之鏟: ['Cursed Shovel'],
  寶可夢培育家的育成: ["Pokémon Breeder's Nurturing"],
  名偵探皮卡丘: ['Detective Pikachu', 'Détective Pikachu'],
  寶可夢中心的姐姐: ['Pokémon Center Lady', 'Infirmière du Centre Pokémon'],
  船長皮卡丘: ['Captain Pikachu', 'Capitaine Pikachu'],
};

/** Nom d'origine → [anglais, français?] ; `toTraditional` convertit un nom en chinois simplifié. */
export function manualName(name, toTraditional) {
  const key = String(name).replace(/[​-‍\s]/g, '');
  const k = toTraditional ? toTraditional(key) : key;
  if (TABLE[k]) return TABLE[k];
  const spirit = k.match(/^(.+)ソウルリンク$/);
  if (spirit && SPIRIT[spirit[1]]) return [`${SPIRIT[spirit[1]][0]} Spirit Link`, `Lien Spirituel ${SPIRIT[spirit[1]][1]}`];
  const city = k.match(/^(.+)(?:のピカチュウ|的皮卡丘)$/);
  if (city && CITIES[city[1]]) return [`${CITIES[city[1]]}'s Pikachu`, `Pikachu de ${CITIES[city[1]]}`];
  return undefined;
}
