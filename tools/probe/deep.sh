#!/usr/bin/env bash
# One Piece : sources possibles des logos d'extension et des dates, site français.
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"
imgs() { grep -o '\(src\|data-src\|href\|content\)="[^"]*\.\(png\|webp\|jpg\|svg\)[^"]*"' | sort -u | head -${1:-40}; }
for s in en www fr; do
  echo "== site $s cardlist"
  curl -sL -m 30 -A "$UA" -o /tmp/p.html -w "%{http_code} %{url_effective}\n" "https://$s.onepiece-cardgame.com/cardlist/"
  grep -o '<option value="[0-9]*"[^>]*>[^<]*' /tmp/p.html | head -8
done
echo "== limitless one piece"
curl -sL -m 30 -A "$UA" "https://onepiece.limitlesstcg.com/cards" | imgs 60
echo "== ja products"
curl -sL -m 30 -A "$UA" -w "%{http_code} %{url_effective}\n" "https://www.onepiece-cardgame.com/products/" | imgs 80
for p in boosters/op01 boosters/op02 boosters/op03 boosters/op06 boosters/op13 boosters/eb01; do
  echo "== ja $p"
  curl -sL -m 30 -A "$UA" "https://www.onepiece-cardgame.com/products/$p.php" -o /tmp/j.html -w "%{http_code} %{url_effective}\n"
  imgs 25 < /tmp/j.html
  grep -o '発売日[^<]\{0,80\}' /tmp/j.html | head -3
done
for p in boosters/op01 decks/st01 boosters/op13 boosters/op16; do
  echo "== en $p dates"
  curl -sL -m 30 -A "$UA" "https://en.onepiece-cardgame.com/products/$p.php" -o /tmp/e.html -w "%{http_code} %{url_effective}\n"
  grep -io 'release[^<]\{0,120\}' /tmp/e.html | head -4
  grep -o '<img[^>]*logo[^>]*>' /tmp/e.html | head -5
done
echo "== en products listing items"
curl -sL -m 30 -A "$UA" "https://en.onepiece-cardgame.com/products/" | grep -o 'href="[^"]*products/[^"]*"' | sort -u | head -60
