#!/usr/bin/env bash
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
get() { curl -sS -L -m 40 -A "$UA" "$1"; }
code() { curl -sS -o /tmp/o.bin -L -m 30 -A "$UA" -w "%{http_code} %{content_type} %{size_download}o %{url_effective}\n" "$1"; }
echo "== Limitless : fiche carte japonaise (Dresseur) -> versions internationales"
get "https://limitlesstcg.com/cards/jp/SV8/100" > /tmp/p.html; wc -c < /tmp/p.html
grep -oiE '(international|english|prints|other versions)[^<]{0,80}' /tmp/p.html | sort -u | head -10
python3 - <<'PY'
import re
h=open('/tmp/p.html',encoding='utf-8',errors='ignore').read()
i=h.lower().find('prints'); print(re.sub(r'\s+',' ',h[i-200:i+2500]) if i>0 else 'pas de section prints')
PY
get "https://limitlesstcg.com/cards/jp/SV1S/074" | grep -oE 'href="/cards/[A-Z0-9]+/[0-9A-Za-z]+"[^>]*>[^<]{0,60}' | head -10
echo "== M6a : autres sources d'images (104)"
get "https://jp.pokellector.com/sets" | grep -oE 'href="/30th-Celebration[^"]*"' | sort -u | head
get "https://jp.pokellector.com/30th-Celebration-Japanese-Expansion/" > /tmp/p.html; wc -c < /tmp/p.html; grep -oE '(src|data-src)="[^"]*den-cards[^"]*"' /tmp/p.html | grep -E '\.10[4-9]\.|\.1[1-3][0-9]\.' | head -8
code "https://images.scrydex.com/pokemon/m6a_ja-104/large"
code "https://images.scrydex.com/pokemon/m6a-104/large"
get "https://scrydex.com/pokemon/expansions" | grep -oiE 'href="/pokemon/expansions/[^"]*(30th|m6a)[^"]*"' | sort -u | head
get "https://www.tcgcollector.com/sets/jp" | grep -oiE 'href="/sets/[0-9]+/[^"]*30th[^"]*"' | sort -u | head
code "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpc/M6a/M6a_104_R_JP_LG.png"
code "https://tcgplayer-cdn.tcgplayer.com/product/716906_in_1000x1000.jpg"
get "https://www.pricecharting.com/console/pokemon-japanese-30th-celebration" | grep -oE 'src="[^"]*(storage\.googleapis|pricecharting)[^"]*"' | head -5
