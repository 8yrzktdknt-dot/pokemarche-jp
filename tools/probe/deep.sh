#!/usr/bin/env bash
# Mew RGB (30th Celebration) : où trouver fiches et visuels (TCGdex, Limitless).
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"
for l in en fr; do
  echo "== TCGdex $l me55"
  curl -s -m 30 "https://api.tcgdex.net/v2/$l/sets/me55" | jq -c '{cardCount, last: [.cards[-6:][]|{id,localId,name,image}], rgb: [.cards[]|select(.localId|test("[A-Z]"))|{id,localId,name,image}]}'
done
echo "== Limitless liste 30C (RGB)"
curl -s -m 30 -A "$UA" "https://limitlesstcg.com/cards/30C" | grep -o '[^"<> ]*RGB[^"<> ]*' | sort -u | head -40
for n in RRGB R-RGB GRGB BRGB 159 160 161 R G B; do
  code=$(curl -s -m 20 -A "$UA" -o /tmp/l.html -w "%{http_code}" "https://limitlesstcg.com/cards/30C/$n")
  echo "== Limitless 30C/$n : $code"
  grep -o 'https://limitlesstcg[^"]*\.\(png\|jpg\|webp\)' /tmp/l.html | sort -u | head -4
  grep -o 'cardmarket[^"]*' /tmp/l.html | head -3
  grep -o '<title>[^<]*' /tmp/l.html
done
echo "== Limitless recherche Mew 30C"
curl -s -m 30 -A "$UA" "https://limitlesstcg.com/cards?q=mew+set%3A30C" | grep -o 'href="/cards/30C/[^"]*"' | sort -u | head -20
for v in R G B; do
  for p in "30C_${v}RGB_R_EN" "30C_${v}-RGB_R_EN" "30C_RGB${v}_R_EN" "30C_${v}_RGB_R_EN"; do
    echo "$p $(curl -s -m 20 -o /dev/null -w "%{http_code}" "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/${p}_LG.png")"
  done
done
echo "== mik.moe 30thC R/G/B"
for v in R G B; do echo "$v $(curl -s -m 20 -o /dev/null -w "%{http_code} %{size_download}" "https://tcg.mik.moe/static/img/30thC/$v.png")"; done
