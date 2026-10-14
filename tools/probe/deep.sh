#!/usr/bin/env bash
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
echo "== pokemontcg.io sets"; curl -s -m 30 "https://api.pokemontcg.io/v2/sets?select=id,name,total&pageSize=250" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const d=JSON.parse(s).data;console.log(d.filter(x=>/30|classic|trainer kit|mcdonald|unown|celebration|alternate|sample|futsal|black star|energ/i.test(x.name)).map(x=>x.id+"="+x.name+"("+x.total+")").join(" | "))})'
echo "== Limitless 30C"; curl -sL -m 30 -A "$UA" https://limitlesstcg.com/cards/30C | grep -oE '(href="/cards/30C/[^"]+"|src="[^"]+30C[^"]+")' | sort -u | head -20
echo "== pokemon.com FR 30th list page 3"; curl -sL -m 40 -A "$UA" "https://www.pokemon.com/fr/jcc-pokemon/cartes-pokemon/3?30th=on" | grep -oE 'cards/web/[A-Z0-9]+/[A-Z0-9_]+\.png' | sort -u | head -40
for u in 30THC/30THC_FR_1 30TH/30TH_FR_BS4 30TH/30TH_FR_CC1 CLC/CLC_FR_1 30THCC/30THCC_FR_1 CEL25C/CEL25C_FR_CC1 CEL25/CEL25_FR_CC1 CEL25/CEL25_FR_2; do
  echo "$(curl -s -o /dev/null -m 20 -A "$UA" -w '%{http_code}' "https://www.pokemon.com/static-assets/content-assets/cms2-fr-fr/img/cards/web/$u.png") $u"; done
for u in 30thc-1 30th-c-1 cel25c-2_A tk1a-1 tk2a-1 mcd23-1 mcd24-1; do echo "$(curl -s -o /tmp/x -m 20 -w '%{http_code} %{size_download}' https://images.scrydex.com/pokemon/$u/large) $(md5sum </tmp/x | cut -c1-8) scrydex $u"; done
curl -s -m 20 https://api.tcgdex.net/v2/fr/sets/30th-c | head -c 500; echo
