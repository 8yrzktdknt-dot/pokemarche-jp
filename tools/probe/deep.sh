#!/usr/bin/env bash
# Exploration : sources chinoises (traditionnel / simplifié).
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
J() { curl -s -m 40 -A "$UA" "$1"; }
for L in zh-tw zh-cn; do
  echo "=========== TCGdex $L sets"
  J "https://api.tcgdex.net/v2/$L/sets" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=JSON.parse(s);console.log("total",a.length);for(const x of a)console.log(x.id,"|",x.name,"|",x.cardCount?.total,"/",x.cardCount?.official,"|",x.logo??"")})'
  echo "=========== TCGdex $L series"
  J "https://api.tcgdex.net/v2/$L/series" | head -c 1500; echo
done
for L in zh-tw zh-cn; do
  S=$(J "https://api.tcgdex.net/v2/$L/sets" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=JSON.parse(s);console.log(a[a.length-1].id)})')
  echo "=========== TCGdex $L set $S"
  J "https://api.tcgdex.net/v2/$L/sets/$S" | head -c 2500; echo
  C=$(J "https://api.tcgdex.net/v2/$L/sets/$S" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=JSON.parse(s);console.log(a.cards[0].id)})')
  echo "=========== TCGdex $L card $C"
  J "https://api.tcgdex.net/v2/$L/cards/$C" | head -c 3500; echo
  echo "=========== stats $L (images / pricing)"
  J "https://api.tcgdex.net/v2/$L/cards" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=JSON.parse(s);console.log("cards",a.length,"with image",a.filter(c=>c.image).length)})'
done
echo "=========== TCGdex zh-tw card with pricing sample"
for id in SV8-001 SV8a-001 M1L-001 M2-001; do J "https://api.tcgdex.net/v2/zh-tw/cards/$id" | head -c 1800; echo; done
echo "=========== Official TW site"
for u in "https://asia.pokemon-card.com/tw/card-search/" "https://asia.pokemon-card.com/tw/card-search/list/" "https://asia.pokemon-card.com/tw/card-search/list/?pageNo=1&sortCondition=&keyword=&cardType=all&regulation=all&expansionCodes=" ; do
  echo "--- $u"; curl -sL -m 30 -A "$UA" -o /tmp/p.html -w "%{http_code} %{size_download}\n" "$u"
  grep -oE '(href|src|data-src)="[^"]*(card|expansion|img)[^"]*"' /tmp/p.html | sort -u | head -60
  grep -oE 'expansionCodes[^<]{0,200}' /tmp/p.html | head -20
done
echo "=========== Official CN candidates"
for u in https://www.pokemon-card.com.cn/ https://pokemon-card.com.cn/ https://www.pokemon.cn/ https://tcg.pokemon.cn/ https://www.pokemoncenter.cn/ https://cn.portal-pokemon.com/ https://www.pokemon-tcg.com.cn/ https://ptcg.pokemon.com.cn/ https://www.ptcg.com.cn/; do
  echo "--- $u"; curl -sL -m 20 -A "$UA" -o /tmp/p.html -w "%{http_code} %{size_download} %{url_effective}\n" "$u"; grep -oE '<title>[^<]*' /tmp/p.html | head -2
done
echo "=========== Scrydex zh"
for u in https://scrydex.com/pokemon/expansions https://api.scrydex.com/pokemon/v1/zh/expansions; do curl -sL -m 20 -A "$UA" -o /tmp/p.html -w "%{http_code} %{size_download}\n" "$u"; grep -oiE '(chinese|zh-|/zh/)[^"<]{0,80}' /tmp/p.html | sort -u | head -15; done
echo "=========== Cardmarket expansions 6602/6603 names in products"
curl -s -m 60 https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_6.json -o /tmp/ps.json
node -e '
const p=JSON.parse(require("fs").readFileSync("/tmp/ps.json","utf8")).products;
const by={};for(const x of p){(by[x.idExpansion]??=[]).push(x)}
const ids=Object.keys(by).map(Number).sort((a,b)=>a-b);
console.log("expansions",ids.length,"max",ids.at(-1));
for(const e of ids.slice(-60))console.log(e,by[e].length,by[e][0].dateAdded,by[e].slice(0,3).map(x=>x.name).join(" ; "));
'
