#!/usr/bin/env bash
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
get() { curl -sS -L -m 40 -A "$UA" "$1"; }
echo "== samurai m6a-card-list"
get "https://samuraiswordtokyo.com/pages/m6a-card-list" > /tmp/p.html; wc -c < /tmp/p.html
grep -oE 'https?://[a-z0-9.-]*pokemon[a-z0-9.-]*/[^"'"'"' <)]*' /tmp/p.html | sort -u | head -20
grep -oE '(src|data-src)="[^"]*1(0[4-9]|1[0-9]|2[0-9]|3[0-5])[^"]*"' /tmp/p.html | head -40
echo "== samurai fur article"
get "https://samuraiswordtokyo.com/blogs/news/30th-celebration-card-list-fur-chase-cards" | grep -oE 'https?://[a-z0-9.-]*pokemon-card[a-z0-9.-]*/[^"'"'"' <)]*' | sort -u | head -20
echo "== sites officiels possibles"
for u in "https://www.pokemon-card.com/30th/" "https://www.pokemon-card.com/ex/30th/" "https://30th.pokemon-card.com/" "https://www.pokemon-card.com/ex/m6a/cardlist/" "https://www.pokemon.co.jp/ex/30th_celebration/" ; do curl -sS -o /tmp/o.html -L -m 30 -A "$UA" -w "%{http_code} %{size_download}o %{url_effective}\n" "$u"; grep -oE '(src|data-src)="[^"]*(m6a|card)[^"]*\.(png|jpg|webp)"' /tmp/o.html | head -8; done
echo "== tcgsetlist / monzap"
get "https://tcgsetlist.com/pokemon/30th-celebration/" | grep -oE '(src|data-src)="[^"]*\.(png|jpg|webp)[^"]*"' | grep -iE '1(0[4-9]|1[0-9]|2[0-9]|3[0-5])' | head -10
get "https://www.monzaptcg.com/guides/30th-celebration-card-list/" | grep -oE '(src|data-src)="[^"]*\.(png|jpg|webp)[^"]*"' | head -10
