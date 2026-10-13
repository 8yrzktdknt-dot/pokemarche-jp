#!/usr/bin/env bash
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
for u in boosters/op05 boosters/op10 boosters/op12 boosters/eb01 boosters/eb02 boosters/prb01 decks/st01 decks/st21 boosters/op14 boosters/op16; do
  for suf in "/" ".php"; do
    U="https://en.onepiece-cardgame.com/products/$u$suf"
    curl -sS -o /tmp/o.html -L -m 30 -A "$UA" -w "%{http_code} $U\n" "$U"
    grep -oE '(src|data-src)="[^"]*\.(png|jpg|webp)[^"]*"' /tmp/o.html | grep -viE 'common|footer|sdk|icon|banner_' | head -6
  done
done
echo "== liste produits (pages)"
curl -sS -L -m 30 -A "$UA" "https://en.onepiece-cardgame.com/products/?subcategory=boosters" | grep -oE 'href="[^"]*products/[^"]*"' | sort -u | head -40
