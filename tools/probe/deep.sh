#!/usr/bin/env bash
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
for u in https://www.pokemonwizard.com/sets https://www.pokemonwizard.com/sets?language=japanese https://www.pokemonwizard.com/japanese-sets; do
  code=$(curl -sL -m 40 -A "$UA" -o /tmp/w.html -w '%{http_code}' "$u"); echo "== $code $u $(wc -c </tmp/w.html)"
  grep -oE 'href="/sets/[0-9]+/[^"]+"' /tmp/w.html | sort -u | wc -l
  grep -oE 'href="/sets/[0-9]+/[^"]+"' /tmp/w.html | sort -u | grep -iE 'm6a|sv9a|japan|-jp|m1l|mega' | head -30
done
curl -sL -m 40 -A "$UA" "https://www.pokemonwizard.com/sets/24721/30th-celebration-m6a" | sed 's/\\"/"/g' | grep -oE '"(market_price|low_price|mid_price|price|tcgplayer_product_id)":[^,]+' | head -12
