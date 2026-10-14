#!/usr/bin/env bash
# Visuels et logos chinois : protection anti-liens externes, proxy d'images, sources de logos.
set -u
UA="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
R="https://bananaintrouble.github.io/"
t() { curl -s -o /tmp/x -m 25 -A "$UA" "$@" -w "%{http_code} %{content_type} %{size_download}"; echo "  $*" | cut -c1-200; }
echo "== TW image (referer github)"; t -H "Referer: $R" https://asia.pokemon-card.com/tw/card-img/tw00019913.png
echo "== TW image (sans referer)"; t https://asia.pokemon-card.com/tw/card-img/tw00019913.png
echo "== mik image (referer github)"; t -H "Referer: $R" https://tcg.mik.moe/static/img/CSV1C/008.png
curl -sI -m 20 -H "Referer: $R" https://tcg.mik.moe/static/img/CSV1C/008.png | grep -iE "access-control|cache|cross-origin|content-length"
curl -sI -m 20 -H "Referer: $R" https://asia.pokemon-card.com/tw/card-img/tw00019913.png | grep -iE "access-control|cache|cross-origin|content-length|server"
echo "== weserv"; t "https://images.weserv.nl/?url=tcg.mik.moe/static/img/CSV1C/008.png&w=400&output=webp"; t "https://images.weserv.nl/?url=asia.pokemon-card.com/tw/card-img/tw00019913.png&w=400&output=webp"
echo "== wsrv"; t "https://wsrv.nl/?url=tcg.mik.moe/static/img/CSV1C/008.png&w=400&output=webp"
echo "== mik logos"; for u in /static/setCode/CSV1C.png /static/setCodeEN/CSV1C.png /static/setCodeEn/CSV1C.png /static/logo/CSV1C.png /static/product/CSV1C.png /static/expansion/CSV1C.png; do t -H "Referer: https://tcg.mik.moe/" "https://tcg.mik.moe$u"; done
P() { curl -s -m 60 -A "$UA" -H "Content-Type: application/json" -H "Referer: https://tcg.mik.moe/" -X POST "https://tcg.mik.moe/api/v3/$1" -d "$2"; }
echo "== product-list"; P card/product-list '{}' | head -c 2500; echo; P card/product-list '{"page":1,"pageSize":5}' | head -c 2500; echo
echo "== TW expansions logos?"; curl -sL -m 30 -A "$UA" "https://asia.pokemon-card.com/tw/products/" | grep -oE '(src|data-original)="[^"]*(logo|Logo|LOGO)[^"]*"' | sort -u | head -20
curl -sL -m 30 -A "$UA" "https://asia.pokemon-card.com/tw/products/" | grep -oE 'href="/tw/products/[^"]*"' | sort -u | head -10
