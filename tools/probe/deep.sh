#!/usr/bin/env bash
# One Piece : Cardmarket, logos des pages produits officielles, site français.
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"
node tools/probe/op.mjs
for s in en www fr; do
  echo "== site $s"
  curl -s -m 30 -A "$UA" -o /dev/null -w "%{http_code} %{url_effective}\n" "https://$s.onepiece-cardgame.com/cardlist/"
done
curl -s -m 30 -A "$UA" "https://fr.onepiece-cardgame.com/cardlist/" | grep -o '<option value="[0-9]*"[^>]*>[^<]*' | head -40
for p in boosters/op01 boosters/op02 boosters/op07 boosters/eb01 boosters/prb01 decks/st01; do
  echo "== en $p"
  curl -s -m 30 -A "$UA" "https://en.onepiece-cardgame.com/products/$p.php" | grep -o '\(src\|href\)="[^"]*\.\(png\|webp\|jpg\)"' | head -25
done
echo "== ja products op13"
curl -s -m 30 -A "$UA" "https://www.onepiece-cardgame.com/products/boosters/op13.php" | grep -o '\(src\|href\)="[^"]*\.\(png\|webp\|jpg\)"' | head -15
echo "== en products list"
curl -s -m 30 -A "$UA" "https://en.onepiece-cardgame.com/products/" | grep -o '\(src\|href\)="[^"]*\.\(png\|webp\|jpg\|php\)"' | head -80
