#!/usr/bin/env bash
# Mew RGB japonais : base officielle pokemon-card.com (recherche « ミュウ »).
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"
K=$(python3 -c 'import urllib.parse;print(urllib.parse.quote("ミュウ"))')
for p in 1 2 3; do
  curl -s -m 30 -A "$UA" "https://www.pokemon-card.com/card-search/resultAPI.php?keyword=$K&regulation_sidebar_form=all&page=$p" \
   | jq -c '.cardList[]? | select(.cardThumbFile|test("M6a")) | {cardID, cardThumbFile, cardNameAltText}'
done
echo "== fiches"
for id in $(for p in 1 2 3; do curl -s -m 30 -A "$UA" "https://www.pokemon-card.com/card-search/resultAPI.php?keyword=$K&regulation_sidebar_form=all&page=$p" | jq -r '.cardList[]? | select(.cardThumbFile|test("M6a")) | .cardID'; done); do
  curl -s -m 30 -A "$UA" "https://www.pokemon-card.com/card-search/details.php/card/$id/regu/all" > /tmp/d.html
  echo "$id $(grep -o '<img class="fit" src="[^"]*"' /tmp/d.html) $(grep -o '<div class="subtext[^<]*<[^<]*<[^<]*' /tmp/d.html | head -2 | tr -s ' \n' ' ')"
done
