#!/usr/bin/env bash
# Mew RGB : version japonaise (Limitless M6a, Cardmarket 6602) et chinoise traditionnelle (site officiel TW).
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"
for v in R G B; do
  code=$(curl -s -m 20 -A "$UA" -o /tmp/l.html -w "%{http_code}" "https://limitlesstcg.com/cards/jp/M6a/$v")
  echo "== Limitless jp/M6a/$v : $code"
  grep -o 'https://limitlesstcg[^"]*\.\(png\|jpg\|webp\)' /tmp/l.html | sort -u | head -3
  grep -o 'cardmarket[^"?]*' /tmp/l.html | sort -u | head -4
  grep -o '<title>[^<]*' /tmp/l.html
  echo "img $(curl -s -m 20 -o /dev/null -w "%{http_code}" "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpc/M6a/M6a_${v}_R_JP_SM.png")"
done
curl -s -m 120 -o p.json https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_6.json
curl -s -m 120 -o g.json https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_6.json
echo "== Mew dans 6602 (JP), 6603 (S-CN), 6604"
jq -c --slurpfile g g.json '($g[0].priceGuides|map({(.idProduct|tostring):.})|add) as $pg | .products[]|select((.idExpansion==6602 or .idExpansion==6603 or .idExpansion==6604) and (.name|startswith("Mew [")))|[.idExpansion,.idProduct,.name,($pg[.idProduct|tostring]|{avg7,avg30,avg})]' p.json
echo "== TW"
for id in 20081 20082 20093 20094 20095 20099 20100 20101 20102 20103; do
  code=$(curl -s -m 20 -A "$UA" -o /tmp/t.html -w "%{http_code}" "https://asia.pokemon-card.com/tw/card-search/detail/$id/")
  echo "$id $code $(grep -o '<h1[^>]*>[^<]*' /tmp/t.html | head -1) $(grep -o 'card-img/tw[0-9]*\.png' /tmp/t.html | head -1) $(grep -o '[A-Z]*/RGB\|RGB' /tmp/t.html | head -2 | tr '\n' ' ')"
done
echo "== TW recherche 夢幻 M6a"
curl -s -m 30 -A "$UA" "https://asia.pokemon-card.com/tw/card-search/list/?keyword=%E5%A4%A2%E5%B9%BB&expansionCodes=M6a" | grep -o 'detail/[0-9]*' | sort -u | head -20
