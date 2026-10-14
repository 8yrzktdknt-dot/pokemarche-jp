#!/usr/bin/env bash
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
get() { curl -sS -L -m 40 -A "$UA" "$1"; }
for u in "https://scrydex.com/pokemon/expansions?language=ja" "https://scrydex.com/pokemon/expansions?lang=ja" "https://scrydex.com/pokemon/expansions/ja" "https://scrydex.com/ja/pokemon/expansions" "https://scrydex.com/pokemon/expansions?page=2"; do
  get "$u" > /tmp/e.html
  echo "== $u $(wc -c < /tmp/e.html) octets, liens _ja: $(grep -oE 'href="/pokemon/expansions/[^"]+_ja"' /tmp/e.html | sort -u | wc -l)"
done
get "https://scrydex.com/pokemon/expansions?language=ja" | grep -oE 'href="/pokemon/expansions/[^"]+"' | sort -u | head -80
echo "== slugs probables"
for s in "starter-set-ex-eevee-ex" "ex-starter-set-eevee-ex" "mega-starter-set-mega-gengar-ex"; do get "https://scrydex.com/pokemon/expansions/$s" | grep -oE 'images\.scrydex\.com/pokemon/[a-z0-9_]+-logo' | head -2; done
get "https://scrydex.com/pokemon/expansions/30th-celebration/m6a_ja" | grep -oE '"/pokemon/expansions/[^"]+_ja"' | sort -u | head -40
