#!/usr/bin/env bash
set -u
cd tools/catalog
node --input-type=module -e "
import { officialRecentCards, officialNumber } from './official-jp.mjs';
const m = await officialRecentCards(5);
const l = m.get('M6A') ?? [];
console.log('M6a', l.length, 'énergies', l.filter(c => c.energy).length);
const ids = l.filter(c => !c.energy && Number(c.cardID) >= 50713);
for (const c of ids) { const n = await officialNumber(c.cardID); console.log(c.cardID, c.name, JSON.stringify(n)); }
const dup = l.map(c => c.cardID).filter((x, i, a) => a.indexOf(x) !== i); console.log('doublons', dup);
"
