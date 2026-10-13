#!/usr/bin/env bash
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
get() { curl -sS -L -m 40 -A "$UA" "$1"; }
code() { curl -sS -o /tmp/o.html -L -m 30 -A "$UA" -w "%{http_code} %{size_download}o %{url_effective}\n" "$1"; }
echo "== One Piece : liens produits"
get "https://en.onepiece-cardgame.com/products/" | grep -oE 'href="[^"]*products/[^"]*"' | sort -u | head -15
for u in "https://en.onepiece-cardgame.com/products/boosters/op01.php" "https://en.onepiece-cardgame.com/products/boosters/op13.php" "https://www.onepiece-cardgame.com/products/boosters/op01.php"; do code "$u"; grep -oE '(src|data-src)="[^"]*(logo|title|ttl|mv|main)[^"]*"' /tmp/o.html | head -6; done
echo "== One Piece : TCGplayer / Limitless"
code "https://onepiece.limitlesstcg.com/cards"; grep -oE '(src)="[^"]*"' /tmp/o.html | head -8
code "https://www.optcgapi.com/api/allSets/"; head -c 400 /tmp/o.html; echo
echo "== Riftbound"
for u in "https://riftbound.leagueoflegends.com/en-us/" "https://riftbound.leagueoflegends.com/en-us/products/" "https://riftbound.leagueoflegends.com/en-us/news/"; do code "$u"; grep -oE '(src|srcset)="[^" ]*\.(png|webp|jpg|svg)[^" ]*' /tmp/o.html | grep -iE 'logo|set|origin|spirit|proving|unleash|vendetta|radiant' | head -8; done
echo "== Pokellector chinois ?"
for u in "https://www.pokellector.com/sets/chinese" "https://cn.pokellector.com/sets" "https://tw.pokellector.com/sets"; do code "$u"; grep -oE 'den-media.pokellector.com/logos/[^"]+\.logo\.[0-9]+\.png' /tmp/o.html | head -5; done
echo "== asia.pokemon-card.com TW : liste des extensions (logos)"
get "https://asia.pokemon-card.com/tw/card-search/list/" > /tmp/o.html; wc -c < /tmp/o.html; grep -oE '(src|data-src)="[^"]*\.(png|jpg|webp)"' /tmp/o.html | head -15
get "https://asia.pokemon-card.com/tw/card-search/" | grep -oE 'expansionCodes[^"]{0,40}|name="[^"]*expansion[^"]*"|<option value="[^"]+">[^<]{2,40}' | head -20
