#!/usr/bin/env bash
# Cherche les logos manquants : One Piece (OP14-16, decks ST) et Riftbound.
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
get() { curl -sS -L -m 30 -A "$UA" "$1"; }
imgs() { grep -oE '(src|data-src|srcset|href|content)="[^"]*\.(png|jpg|jpeg|webp|svg)[^"]*"' | sort -u | head -${2:-40}; }
for p in boosters/op14 boosters/op15 boosters/op16 decks/st23 decks/st30 decks/st01 decks/st36; do
  echo "== OP $p"; for site in https://en.onepiece-cardgame.com https://www.onepiece-cardgame.com; do
    for path in "/products/$p/" "/products/$p.php"; do
      code=$(curl -s -o /tmp/p.html -L -m 30 -A "$UA" -w '%{http_code}' "$site$path"); echo "$code $site$path"; [ "$code" = 200 ] && imgs < /tmp/p.html 15
    done; done; done
echo "== OP products list"; get https://en.onepiece-cardgame.com/products/ | imgs 80
echo "== Riftbound site"; get https://riftbound.leagueoflegends.com/en-us/ | imgs 60
for u in https://riftbound.leagueoflegends.com/en-us/news/ https://api.riftcodex.com/sets https://riftcodex.com/ https://piltoverarchive.com/sets https://www.tcgplayer.com/categories/trading-and-collectible-card-games/riftbound-league-of-legends-trading-card-game; do
  echo "== $u"; get "$u" | head -c 3000 | tr '\n' ' ' | head -c 3000; echo; get "$u" | imgs 40; done
