#!/usr/bin/env bash
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
curl -sL -m 40 -A "$UA" "https://www.pokemon.com/fr/jcc-pokemon/cartes-pokemon" > /tmp/s.html; wc -c < /tmp/s.html
# Cases à cocher des extensions : <input ... id="xy1" name="xy1" ...><label for="xy1">...</label>
grep -oE '<input[^>]*type="checkbox"[^>]*>' /tmp/s.html | grep -oE 'name="[^"]+"' | sort -u | tr '\n' ' ' | head -c 6000; echo
grep -oE 'for="[^"]+"[^>]*>[^<]{2,60}<' /tmp/s.html | head -400 | tr '\n' '|' | head -c 12000; echo
for u in 30TH/30TH_FR_1 MEP/MEP_FR_1 SVP/SVP_FR_1 SVE/SVE_FR_1 SWSHP/SWSHP_FR_SWSH001 SMP/SMP_FR_SM01 SMP/SMP_FR_SM1 CEL25C/CEL25C_FR_2 TK10L/TK10L_FR_1 MCD19/MCD19_FR_1 XYP/XYP_FR_XY01 BWP/BWP_FR_BW01; do
  echo "$(curl -s -o /dev/null -m 20 -A "$UA" -w '%{http_code} %{content_type} %{size_download}' "https://www.pokemon.com/static-assets/content-assets/cms2-fr-fr/img/cards/web/$u.png") $u"; done
