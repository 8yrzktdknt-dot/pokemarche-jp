#!/usr/bin/env bash
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
echo "== pokemon.com FR Dracaufeu"; curl -sL -m 40 -A "$UA" "https://www.pokemon.com/fr/jcc-pokemon/cartes-pokemon?cardName=Dracaufeu" | grep -oE 'cards/web/[A-Z0-9]+/[A-Za-z0-9_-]+\.png' | sort -u | head -60
echo "== pokemon.com FR Ondine"; curl -sL -m 40 -A "$UA" "https://www.pokemon.com/fr/jcc-pokemon/cartes-pokemon?cardName=Ondine" | grep -oE 'cards/web/[A-Z0-9]+/[A-Za-z0-9_-]+\.png' | sort -u | head -30
echo "== Limitless 30C"; curl -sL -m 30 -A "$UA" https://limitlesstcg.com/cards/30C > /tmp/l.html; wc -c </tmp/l.html; grep -oE 'src="[^"]+"' /tmp/l.html | grep -i '30C' | head -12; grep -oE 'href="/cards/30C/[^"]+"' /tmp/l.html | head -40 | tr '\n' ' '
echo; for u in zz-1 30thc-1 30th-c-1 30thc-bs-4 30thc-BS4; do echo "$(curl -s -o /tmp/x -m 20 -w '%{http_code} %{size_download}' https://images.scrydex.com/pokemon/$u/large) $(md5sum </tmp/x | cut -c1-8) scrydex $u"; done
