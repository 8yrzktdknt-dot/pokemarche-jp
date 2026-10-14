#!/usr/bin/env bash
set -u
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"
P() { curl -s -m 60 -A "$UA" -H "Content-Type: application/json" -H "Referer: https://tcg.mik.moe/" -X POST "https://tcg.mik.moe/api/v3/$1" -d "$2"; }
curl -s -m 30 -A "$UA" https://tcg.mik.moe/ -o /tmp/m.html
JS=$(grep -oE '/assets/index-[^"]+\.js' /tmp/m.html | head -1)
curl -s -m 60 -A "$UA" "https://tcg.mik.moe$JS" -o /tmp/i.js
echo "=========== card-detail usage"
for f in /tmp/i.js $(for a in $(grep -oE 'assets/[A-Za-z0-9_-]+\.js' /tmp/i.js | sort -u); do curl -s -m 30 -A "$UA" "https://tcg.mik.moe/$a" -o "/tmp/$(basename $a)"; echo "/tmp/$(basename $a)"; done); do grep -oE '.{200}card-detail.{300}' "$f" | head -2; done
echo "=========== try detail"
for b in '{"setCode":"CSV1C","cardIndex":"008"}' '{"cardId":"CSV1C-008"}' '{"setCode":"CSV1C","cardIndex":"008","effectId":"b7adaa30787295955460c706cadf920b"}' '{"effectId":"b7adaa30787295955460c706cadf920b"}'; do echo "--- $b"; P card/card-detail "$b" | head -c 3000; echo; done
echo "=========== images"
for u in https://tcg.mik.moe/static/img/CSV1C/008.png https://tcg.mik.moe/static/setCode/CSV1C.png https://tcg.mik.moe/static/img/CSV1C/8.png; do curl -s -o /dev/null -m 20 -A "$UA" -H "Referer: https://tcg.mik.moe/" -w "%{http_code} %{content_type} %{size_download} $u\n" "$u"; curl -s -o /dev/null -m 20 -A "$UA" -w "  sans referer %{http_code} %{size_download}\n" "$u"; done
echo "=========== TW list card li"
curl -sL -m 30 -A "$UA" "https://asia.pokemon-card.com/tw/card-search/list/?expansionCodes=M6a" | tr -s ' \n' ' ' | grep -oE '<li class="card">.{0,600}' | head -3
curl -sL -m 30 -A "$UA" "https://asia.pokemon-card.com/tw/card-search/list/?expansionCodes=M6a&pageNo=9" | grep -oE 'detail/[0-9]+' | tail -3
echo "=========== TW expansion block"
curl -sL -m 30 -A "$UA" "https://asia.pokemon-card.com/tw/card-search/" | tr -s ' \n' ' ' | grep -oE 'expansionCodes=MF">.{0,900}' | head -1
echo "=========== TW detail rare / trainer"
for d in 20085 20080 19990; do curl -sL -m 30 -A "$UA" "https://asia.pokemon-card.com/tw/card-search/detail/$d/" | tr -s ' \n' ' ' | grep -oE '<h1 class="pageHeader.{0,300}|collectorNumber">[^<]*|class="alpha">[^<]*|rarity.{0,200}|illustrator.{0,200}' | head -8; echo; done
