#!/usr/bin/env bash
# Cherche des logos français d'extensions Pokémon (Nuit Noire / ME05…).
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
page() { code=$(curl -s -o /tmp/p.html -L -m 30 -A "$UA" -w '%{http_code} %{url_effective}' "$1"); echo "== $code ($(wc -c < /tmp/p.html)) $1"; }
for u in https://www.pokecardex.com/series https://www.pokecardex.com/series/ME05 https://www.pokecardex.com/series/me05 https://www.pokecardex.com/series/PBL; do
  page "$u"; grep -oiE '(src|data-src|href)="[^"]*(logo|serie|set)[^"]*\.(png|webp|jpg|svg)[^"]*"' /tmp/p.html | sort -u | head -25
done
for u in https://www.pokemon.com/fr/jcc-pokemon/nuit-noire https://www.pokemon.com/fr/jcc-pokemon/extensions https://www.pokemon.com/fr/jcc-pokemon/mega-evolution-nuit-noire https://www.pokemon.com/fr/jcc-pokemon https://www.pokemon.com/fr/jcc-pokemon/series; do
  page "$u"; grep -oiE '(src|data-src|href)="[^"]*(logo|expansion|nuit|me05|pbl)[^"]*"' /tmp/p.html | sort -u | head -25
  grep -oiE 'href="/fr/jcc-pokemon/[^"]+"' /tmp/p.html | sort -u | head -40
done
for u in https://assets.tcgdex.net/fr/me/me05/logo.webp https://assets.tcgdex.net/fr/me/me05/logo.png https://assets.tcgdex.net/fr/me/me05/symbol.webp https://assets.tcgdex.net/en/me/me05/logo.webp; do
  echo "$(curl -s -o /dev/null -m 20 -A "$UA" -w '%{http_code} %{content_type}' $u) $u"; done
curl -s -m 20 https://api.tcgdex.net/v2/fr/sets/me05 | head -c 600; echo
