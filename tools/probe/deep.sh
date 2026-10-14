#!/usr/bin/env bash
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
get() { curl -sS -L -m 40 -A "$UA" "$1"; }
code() { curl -sS -o /tmp/o.bin -L -m 30 -A "$UA" -w "%{http_code} %{content_type} %{size_download}o %{url_effective}\n" "$1"; }
echo "== Scrydex : page extension japonaise"
get "https://scrydex.com/pokemon/expansions/30th-celebration/m6a_ja" > /tmp/p.html; wc -c < /tmp/p.html
grep -oE '(src|srcset|href|content)="[^"]*images\.scrydex\.com[^"]*"' /tmp/p.html | sort -u | head -15
echo "== Scrydex : liste des extensions (japonaises)"
get "https://scrydex.com/pokemon/expansions" > /tmp/e.html; wc -c < /tmp/e.html
grep -oE 'href="/pokemon/expansions/[^"]+_ja"' /tmp/e.html | sort -u | wc -l
grep -oE 'href="/pokemon/expansions/[^"]+_ja"' /tmp/e.html | sort -u | head -30
grep -oE '(src|data-src)="[^"]*images\.scrydex\.com[^"]*"' /tmp/e.html | head -20
echo "== motifs probables"
for id in mbg_ja mbd_ja mem_ja ma_ja mc_ja m3_ja m6_ja; do code "https://images.scrydex.com/pokemon/$id-logo/logo"; code "https://images.scrydex.com/pokemon/$id-symbol/symbol"; done
