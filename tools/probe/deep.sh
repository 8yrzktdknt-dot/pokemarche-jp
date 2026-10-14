#!/usr/bin/env bash
# Exploration : mik.moe (chinois simplifié) et site officiel TW (listes).
set -u
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"
P() { curl -s -m 60 -A "$UA" -H "Content-Type: application/json" -H "Referer: https://tcg.mik.moe/" -X POST "https://tcg.mik.moe/api/v3/$1" -d "$2"; }
echo "=========== params"
P card/card-advance-search-params '{}' > /tmp/params.json; head -c 300 /tmp/params.json; echo
node -e 'const d=JSON.parse(require("fs").readFileSync("/tmp/params.json","utf8")).data;console.log(Object.keys(d));const e=d.expansion;console.log("expansions",e.length);for(const x of e)console.log(JSON.stringify(x))' | head -150
echo "=========== search CSV1C page1"
P card/card-advance-search '{"type":"advance","name":"","text":"","m":[],"s":[],"label":[],"t":[],"has":[],"weak":[],"rs":[],"series":[],"set":["CSV1C"],"artist":[],"r":[],"hp":null,"rc":null,"reg":[],"mark":[],"unique":false,"page":1,"pageSize":3}' | head -c 6000; echo
echo "=========== bundle hints"
curl -s -m 30 -A "$UA" https://tcg.mik.moe/ -o /tmp/m.html
JS=$(grep -oE '/assets/index-[^"]+\.js' /tmp/m.html | head -1)
curl -s -m 60 -A "$UA" "https://tcg.mik.moe$JS" -o /tmp/i.js; wc -c /tmp/i.js
grep -oE '.{80}(\.png|\.webp|\.jpg|/img/|image|cdn)[^,;]{0,100}' /tmp/i.js | grep -iE 'http|/img|\.webp|\.png' | head -30
grep -oE 'https?://[a-zA-Z0-9./_-]+' /tmp/i.js | sort -u | head -60
grep -oE '"card/[a-zA-Z/-]+"|`card/[^`]+`|v3/[a-zA-Z/-]+' /tmp/i.js | sort -u | head -40
for f in $(grep -oE 'assets/[A-Za-z0-9_-]+\.js' /tmp/i.js | sort -u | head -80); do curl -s -m 30 -A "$UA" "https://tcg.mik.moe/$f" | grep -oE '.{60}(webp|png|jpg)["`].{0,40}' | head -3 | sed "s|^|$f: |"; done | head -40
echo "=========== TW expansion list page names"
curl -sL -m 30 -A "$UA" "https://asia.pokemon-card.com/tw/card-search/" | tr -s ' \n' | grep -oE 'expansionCodes=[A-Za-z0-9-]+">.{0,600}' | head -4
curl -sL -m 30 -A "$UA" "https://asia.pokemon-card.com/tw/card-search/list/?expansionCodes=M6a" | tr -s ' \n' | grep -oE '<li class="card">.{0,500}' | head -3
