#!/usr/bin/env bash
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
for id in 50713 50728 50733; do
  echo "== officiel $id"; curl -sL -m 30 -A "$UA" "https://www.pokemon-card.com/card-search/details.php/card/$id/regu/all" > /tmp/o.html
  node -e 'const h=require("fs").readFileSync("/tmp/o.html","utf8");const i=h.indexOf("RightBox");console.log(h.slice(i,i+3500).replace(/\s+/g," "))'
done
for n in 104 105 136 151 152; do echo "$(curl -s -o /dev/null -m 15 -H 'Range: bytes=0-0' -w '%{http_code} %header{content-range}' https://images.scrydex.com/pokemon/m6a_ja-$n/large) scrydex $n"; done
echo "$(curl -s -o /dev/null -m 15 -H 'Range: bytes=0-0' -w '%{http_code} %header{content-range}' https://images.scrydex.com/pokemon/zz_ja-1/large) scrydex vide"
curl -sL -m 30 -A "$UA" https://www.30th.pokemon-card.com/product/m6a | grep -oE 'm6a_(1[3-6][0-9])_[a-z0-9]+\.(png|webp)' | sort -u | head -40
