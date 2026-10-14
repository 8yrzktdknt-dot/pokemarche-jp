// Petites images hébergées avec l'app (chargement plus rapide qu'un site tiers) :
//  - sprites du Pokédex national (PokeAPI) : catalog/sprites/<n>.png ;
//  - icônes des sites de vente : catalog/sites/<id>.png.
// Les fichiers déjà présents sont gardés : seuls les nouveaux sont téléchargés.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { CATALOG, getBuffer, pool } from './lib.mjs';

const DEX_MAX = Number(process.env.DEX_MAX || 1025);
export const SITES = { cardmarket: 'cardmarket.com', tcgplayer: 'tcgplayer.com', cardtrader: 'cardtrader.com', ebay: 'ebay.com' };

async function save(url, folder, name, size) {
  const file = join(CATALOG, folder, `${name}.png`);
  if (existsSync(file)) return 'kept';
  const buf = await getBuffer(url);
  if (!buf) return 'missing';
  try {
    const png = await sharp(buf).trim({ threshold: 1 }).resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9, palette: true }).toBuffer();
    writeFileSync(file, png);
    return 'new';
  } catch {
    return 'missing';
  }
}

export async function buildAssets() {
  for (const d of ['sprites', 'sites']) mkdirSync(join(CATALOG, d), { recursive: true });
  const count = { new: 0, kept: 0, missing: 0 };
  const dex = Array.from({ length: DEX_MAX }, (_, i) => i + 1);
  for (const r of await pool(dex, 8, (n) => save(`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${n}.png`, 'sprites', n, 96))) count[r]++;
  for (const [id, domain] of Object.entries(SITES)) count[await save(`https://www.google.com/s2/favicons?domain=${domain}&sz=64`, 'sites', id, 64)]++;
  console.log(`Images hébergées : ${count.new} nouvelles, ${count.kept} déjà là, ${count.missing} introuvables`);
}
