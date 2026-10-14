#!/usr/bin/env bash
# Exploration : sources chinoises, 2e passage.
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
G() { curl -sL -m 40 -A "$UA" "$@"; }
echo "=========== zsjy947 sets_index"
G https://raw.githubusercontent.com/zsjy947/PTCG-card-data/master/data/sets_index.json | head -c 6000; echo
echo "=========== zsjy947 CSV1C sample"
G https://raw.githubusercontent.com/zsjy947/PTCG-card-data/master/data/cards/CSV1C.json | head -c 3000; echo
G https://raw.githubusercontent.com/zsjy947/PTCG-card-data/master/fetch_data.py | head -c 5000; echo
echo "=========== mik.moe"
G -o /tmp/m.html -w "%{http_code} %{size_download}\n" https://tcg.mik.moe/
grep -oE '(src|href)="[^"]*"' /tmp/m.html | head -30
for js in $(grep -oE 'src="[^"]*\.js"' /tmp/m.html | sed 's/src="//;s/"$//' | head -5); do
  case $js in http*) u=$js;; *) u="https://tcg.mik.moe$js";; esac
  echo "--- $u"; G "$u" | grep -oE '"(/api|https?://[^"]*mik[^"]*)[^"]{0,120}"' | sort -u | head -40
done
echo "=========== TW expansions pages"
for p in 2 3 4 5; do G "https://asia.pokemon-card.com/tw/card-search/?pageNo=$p" | grep -oE 'expansionCodes=[A-Za-z0-9-]+' | sort -u | tr '\n' ' '; echo; done
echo "=========== TW list M6a"
G "https://asia.pokemon-card.com/tw/card-search/list/?expansionCodes=M6a" > /tmp/l.html
grep -oE 'detail/[0-9]+' /tmp/l.html | head -3; grep -oE 'resultTotalPages[^<]{0,80}|totalCount[^<]{0,80}|共[^<]{0,40}' /tmp/l.html | head
grep -oE '<img[^>]*>' /tmp/l.html | head -5
D=$(grep -oE 'detail/[0-9]+' /tmp/l.html | head -1)
echo "=========== TW detail $D"
G "https://asia.pokemon-card.com/tw/card-search/$D/" > /tmp/d.html
sed -e 's/<script.*//' /tmp/d.html | tr -s ' \n' | grep -vE '^\s*$' | sed -n '/<main/,/<\/main>/p' | head -c 9000; echo
echo "=========== TW list old (SV8, S12a)"
for e in SV8 S12a SV2a; do G "https://asia.pokemon-card.com/tw/card-search/list/?expansionCodes=$e" | grep -oE 'detail/[0-9]+' | head -2 | tr '\n' ' '; echo " $e"; done
