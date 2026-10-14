#!/usr/bin/env bash
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
for u in https://limitlesstcg.com/cards/SSP/238 https://limitlesstcg.com/cards/MEG/1 https://limitlesstcg.com/cards/jp/SV9a/1 https://limitlesstcg.com/cards/jp/M6a/1 https://limitlesstcg.com/cards/BS/4; do
  echo "== $u"; curl -sL -m 30 -A "$UA" "$u" | grep -oiE 'href="[^"]*(cardmarket|tcgplayer)[^"]*"' | sort -u | head -8
done
for u in https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_6.json https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_6.json https://downloads.s3.cardmarket.com/productCatalog/productList/products_nonsingles_6.json; do
  echo "== $u"; curl -s -m 60 -A "$UA" -o /tmp/f -w '%{http_code} %{size_download}\n' "$u"; head -c 700 /tmp/f; echo
  node -e 'const d=JSON.parse(require("fs").readFileSync("/tmp/f"));const k=Object.keys(d);console.log(k);const arr=d.priceGuides||d.products||[];console.log(arr.length);for(const x of arr.filter(x=>[794611,895792,273699].includes(x.idProduct)))console.log(JSON.stringify(x))' 2>&1 | head -12
done
