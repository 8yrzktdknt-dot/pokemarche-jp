// Crée des logos « façon officiels » pour les produits japonais sans logo (decks, starter sets, coffrets).
// Usage : PW=... node decklogos.cjs <catalog dir> [ids séparés par des virgules] [dossier de sortie]
// Polices : @fontsource/dela-gothic-one et @fontsource/m-plus-rounded-1c (npm pack) dans <dossier du script>/fonts.
// Les logos produits sont enregistrés dans catalog/logos/pokemon-ja ; le robot du catalogue garde les fichiers existants.
const { chromium } = require(process.env.PW);
const fs = require('fs');
const sharp = require(process.env.SHARP);
const path = require('path');

const FONTS = path.join(__dirname, 'fonts');
const catalog = process.argv[2];
const only = (process.argv[3] || '').split(',').filter(Boolean);
// SETS=pokemon-fr pour les extensions françaises (par défaut : japonaises).
const SETS = process.env.SETS || 'pokemon-ja';
const outDir = process.argv[4] || path.join(catalog, 'logos', SETS);

// Couleurs par génération : dégradé du nom, contour, ruban du type de produit.
const ERA = {
  mega: { grad: ['#fffbe0', '#ffe066', '#f5b800', '#b8860b'], stroke: '#2b1a00', ribbon: ['#1a1a1a', '#3a3a3a'], ribbonText: '#ffd84d' },
  'scarlet-violet': { grad: ['#fff4d6', '#ffb347', '#ff5e7a', '#8e44ff'], stroke: '#2a0b3d', ribbon: ['#5b2a86', '#d9480f'], ribbonText: '#ffffff' },
  'sword-shield': { grad: ['#ffffff', '#cfe6ff', '#5aa0ff', '#1b3fa8'], stroke: '#0b1a40', ribbon: ['#0d47a1', '#c62828'], ribbonText: '#ffffff' },
  'sun-moon': { grad: ['#fffbe6', '#ffd54f', '#ff8f00', '#d84315'], stroke: '#3e1600', ribbon: ['#ef6c00', '#6a1b9a'], ribbonText: '#ffffff' },
  xy: { grad: ['#ffffff', '#b3e5fc', '#29b6f6', '#283593'], stroke: '#0d1440', ribbon: ['#1565c0', '#c2185b'], ribbonText: '#ffffff' },
  'black-white': { grad: ['#ffffff', '#e0e0e0', '#9e9e9e', '#424242'], stroke: '#111111', ribbon: ['#212121', '#616161'], ribbonText: '#ffffff' },
  hs: { grad: ['#fffde7', '#ffe082', '#ffb300', '#8d6e63'], stroke: '#2b1600', ribbon: ['#b8860b', '#9e9e9e'], ribbonText: '#ffffff' },
  dp: { grad: ['#ffffff', '#e1f5fe', '#81d4fa', '#7e57c2'], stroke: '#1a1033', ribbon: ['#1e88e5', '#ec407a'], ribbonText: '#ffffff' },
  ex: { grad: ['#fffde7', '#ff8a65', '#e53935', '#4527a0'], stroke: '#200a0a', ribbon: ['#c62828', '#1565c0'], ribbonText: '#ffffff' },
  classic: { grad: ['#fffde7', '#fff176', '#fdd835', '#1e5bb8'], stroke: '#0b1f4d', ribbon: ['#1e5bb8', '#e53935'], ribbonText: '#ffd600' },
  onepiece: { grad: ['#fffde7', '#ffe082', '#ffb300', '#c62828'], stroke: '#1a0505', ribbon: ['#b71c1c', '#212121'], ribbonText: '#ffd54f' },
  riftbound: { grad: ['#ffffff', '#f3e5ab', '#d4af37', '#7a5c12'], stroke: '#0a1030', ribbon: ['#1a237e', '#00838f'], ribbonText: '#f3e5ab' },
  mc: { grad: ['#fffde7', '#ffeb3b', '#ffc107', '#ff8f00'], stroke: '#5d0000', ribbon: ['#da291c', '#b71c1c'], ribbonText: '#ffc72c' },
};
// Blocs internationaux (identifiants TCGdex) → couleurs ; les kits du dresseur suivent leur génération (« tk-xy-… »).
const INTL_ERA = { me: 'mega', sv: 'scarlet-violet', swsh: 'sword-shield', sm: 'sun-moon', xy: 'xy', bw: 'black-white', hgss: 'hs', hs: 'hs', dp: 'dp', pl: 'dp', ex: 'ex', base: 'classic', ecard: 'classic', neo: 'classic', mc: 'mc', misc: 'classic' };
const eraOf = (bloc, id) => {
  if (SETS.startsWith('onepiece')) return 'onepiece';
  if (SETS.startsWith('riftbound')) return 'riftbound';
  if (ERA[bloc]) return bloc;
  const tk = id.match(/^tk-([a-z]+)-/);
  return INTL_ERA[tk ? tk[1] : bloc] ?? 'classic';
};

/** Noms internationaux : « XY Kit du dresseur (Latias) » → { type: 'Kit du dresseur XY', main: 'Latias' }. */
const INTL_NAMES = {
  'Collection Classique30ᵉ Anniversaire': { type: 'Collection Classique', main: '30ᵉ Anniversaire' },
  '30th Classic Collection': { type: 'Classic Collection', main: '30th Anniversary' },
  'carte alternative A Jaune': { type: 'Carte alternative', main: 'A Jaune' },
  'Yellow A Alternate': { type: 'Alternate Card', main: 'Yellow A' },
  'EX Forces Cachées Collection Zarbi': { type: 'EX Forces Cachées', main: 'Collection Zarbi' },
  'Unseen Forces Unown Collection': { type: 'EX Unseen Forces', main: 'Unown Collection' },
  'W Promotional': { type: 'Wizards', main: 'W Promo' },
  'Poké Card Creator Pack': { type: 'EX', main: 'Poké Card Creator Pack' },
  Sample: { type: 'e-Card', main: 'Sample' },
};

/** One Piece : « ST-36 » + « Yellow Eustass "Captain" Kid » ; Riftbound : « Riftbound » + nom de l'extension. */
function splitOther(s) {
  if (SETS.startsWith('riftbound')) return { type: 'Riftbound', main: s.name };
  const main = s.name.replace(/^(RED|GREEN|BLUE|PURPLE|BLACK|YELLOW)(?=[\s/])/g, (w) => w[0] + w.slice(1).toLowerCase())
    .replace(/\/(RED|GREEN|BLUE|PURPLE|BLACK|YELLOW)\b/g, (w) => '/' + w[1] + w.slice(2).toLowerCase())
    .replace(/(\S)"([^"]+)"(\S)/g, '$1 "$2" $3').replace(/\s+/g, ' ').trim();
  return { type: s.code, main };
}

function splitIntl(name) {
  if (INTL_NAMES[name]) return INTL_NAMES[name];
  const tk = name.match(/^(\w+) (Kit du dresseur|Kit dresseur|trainer Kit(?: \d)?) \((.+)\)$/i);
  if (tk && /^trainer/i.test(tk[2])) return { type: `${tk[1]} ${tk[2].replace(/^trainer kit/i, 'Trainer Kit')}`, main: tk[3] };
  if (tk) return { type: `Kit du dresseur ${tk[1]}`, main: tk[3] };
  const mc = name.match(/^(?:Collection )?McDonald's(?: Collection)? (\d{4})$/i);
  if (mc) return { type: "McDonald's Collection", main: mc[1] };
  return { type: null, main: name };
}

// Préfixes de types de produits (le reste du nom est le nom du deck).
const PREFIXES = [
  'スターターセットテラスタル', 'スターターセット テラスタイプ：ステラ', 'スターターセットex', 'スターターセットVMAX', 'スターターセットVSTAR', 'スターターセット伝説',
  'スターターデッキ＆ビルドセット', 'スタートデッキ', 'デッキビルドBOX', 'バトル強化デッキ60', 'バトル強化デッキ30', 'BW バトル強化デッキ30', 'バトル強化デッキ',
  'VSTAR&VMAX ハイクラスデッキ', 'ハイクラスデッキ', 'スペシャルデッキセットex', 'スペシャルデッキセット', 'プレミアムトレーナーボックス', 'バトルマスターデッキ テラスタル',
  'バトルマスターデッキ', 'メガバトルデッキ60', 'XY BREAKコンボデッキ60', 'XY BREAK進化パック', 'MマスターデッキビルドBOX', '対戦スタートセット30',
  'スーパーレジェンドセット60', 'ハイパーメタルチェーンデッキ60', 'バトルギフトセット', 'バトルテーマデッキ', 'ジャンボパックセット', 'ムービースペシャルパック',
  'トレーナーバトルデッキ：', 'BW コレクションシート', 'スターターセット',
];

/** « スターターセットex イーブイex » → { type: 'スターターセットex', main: 'イーブイex' }. */
function split(local) {
  const s = local.replace(/　/g, ' ').trim();
  const q = s.match(/^(.*?)[「『](.+?)[」』](.*)$/);
  if (q) {
    const rest = [...s.matchAll(/[「『](.+?)[」』]/g)].map((m) => m[1]).join(' ・ ');
    return { type: q[1].trim() || null, main: rest };
  }
  for (const p of PREFIXES) {
    if (s.startsWith(p) && s.length > p.length) return { type: p.replace(/：$/, ''), main: s.slice(p.length).trim() };
  }
  const sp = s.indexOf(' ');
  if (sp > 0) return { type: s.slice(0, sp), main: s.slice(sp + 1) };
  return { type: null, main: s };
}

function html({ type, main }, era) {
  const c = ERA[era] ?? ERA.mega;
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  // « ex », « EX », « GX », « VMAX »… en écriture penchée comme sur les logos officiels.
  // Noms longs : retour à la ligne après « ＆ », « ・ » ou « + » (deux lignes équilibrées).
  const wrap = (t) => {
    const latin = /^[\x00-\u024f\u2019\s]+$/.test(t);
    if ([...t].length <= (latin ? 14 : 9)) return esc(t);
    const cuts = [...t.matchAll(latin ? /\s/g : /[＆&・+＋]|\s/g)].map((m) => m.index + m[0].length);
    if (!cuts.length) return esc(t);
    const mid = [...t].length / 2;
    const at = cuts.reduce((a, b) => (Math.abs(b - mid) < Math.abs(a - mid) ? b : a));
    return esc(t.slice(0, at).trim()) + '<br>' + esc(t.slice(at).trim());
  };
  const deco = (t) => wrap(t).replace(/(ex|EX|GX|VMAX|VSTAR|BREAK|V)(?=$|[ ・&＆+＋、]|<)/g, '<i>$1</i>');
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="file://${FONTS}/fontsource-dela-gothic-one-5.3.0/400.css">
<link rel="stylesheet" href="file://${FONTS}/fontsource-m-plus-rounded-1c-5.3.0/800.css">
<style>
  html,body{margin:0;background:transparent}
  #logo{width:800px;height:380px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px}
  .type{font-family:'M PLUS Rounded 1c';font-weight:800;font-size:40px;color:${c.ribbonText};
    padding:4px 26px 8px;border-radius:999px;background:linear-gradient(90deg,${c.ribbon[0]},${c.ribbon[1]});
    border:4px solid #fff;box-shadow:0 4px 0 ${c.stroke};white-space:nowrap;letter-spacing:1px}
  .main{position:relative;font-family:'Dela Gothic One';font-size:120px;line-height:1.12;white-space:nowrap;letter-spacing:2px;word-spacing:0.3em;text-align:center}
  .main span{display:block}
  .main .back{position:absolute;inset:0;-webkit-text-stroke:26px #ffffff;color:#fff;filter:drop-shadow(0 7px 0 ${c.stroke})}
  .main .mid{position:absolute;inset:0;-webkit-text-stroke:14px ${c.stroke};color:${c.stroke}}
  .main .front{position:relative;background:linear-gradient(180deg,${c.grad.join(',')});-webkit-background-clip:text;background-clip:text;color:transparent}
  i{font-style:italic}
  .main br{display:block}
</style></head><body><div id="logo">
  ${type ? `<div class="type">${esc(type)}</div>` : ''}
  <div class="main" id="main"><span class="back">${deco(main)}</span><span class="mid">${deco(main)}</span><span class="front">${deco(main)}</span></div>
</div>
<script>
  // Réduit la taille du texte pour tenir dans le cadre.
  document.fonts.ready.then(() => {
    const m = document.getElementById('main'), t = document.querySelector('.type');
    let size = 120;
    const maxH = t ? 240 : 320;
    while ((m.scrollWidth > 760 || m.offsetHeight > maxH) && size > 30) { size -= 4; m.style.fontSize = size + 'px'; }
    if (t) { let ts = 40; while (t.scrollWidth > 740 && ts > 18) { ts -= 2; t.style.fontSize = ts + 'px'; } }
    document.body.dataset.ready = '1';
  });
</script></body></html>`;
}

(async () => {
  const sets = JSON.parse(fs.readFileSync(path.join(catalog, 'sets', `${SETS}.json`), 'utf8'));
  const todo = [];
  for (const b of sets.blocs) {
    for (const s of b.sets) {
      const hasLogo = s.logo && (/^https?:/.test(s.logo) || fs.existsSync(path.join(catalog, s.logo)));
      if ((only.length ? only.includes(s.id) : !hasLogo) && (s.nameLocal || s.name)) todo.push({ s, era: eraOf(b.id, s.id) });
    }
  }
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 800, height: 380 }, deviceScaleFactor: 1 });
  const tmp = path.join(__dirname, 'logo.html');
  for (const { s, era } of todo) {
    const parts = SETS.startsWith('pokemon') ? (s.nameLocal ? split(s.nameLocal) : splitIntl(s.name)) : splitOther(s);
    fs.writeFileSync(tmp, html(parts, era));
    await page.goto('file://' + tmp);
    await page.waitForSelector('body[data-ready="1"]');
    const shot = await page.locator('#logo').screenshot({ omitBackground: true });
    // Marges transparentes retirées, 400 px de large au plus (comme les autres logos du catalogue).
    s.logo = path.relative(catalog, path.join(outDir, `${s.id}.png`));
    await sharp(shot).trim({ threshold: 1 }).resize({ width: 400, height: 220, fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toFile(path.join(outDir, `${s.id}.png`));
    console.log(s.id, '|', parts.type, '|', parts.main);
  }
  await browser.close();
  // Le catalogue pointe vers les logos créés.
  fs.writeFileSync(path.join(catalog, 'sets', `${SETS}.json`), JSON.stringify(sets));
})();
