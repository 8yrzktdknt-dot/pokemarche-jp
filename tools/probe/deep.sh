#!/usr/bin/env bash
set -u
UA="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
get() { curl -sS -L -m 40 -A "$UA" "$1"; }
section() { echo; echo "=================== $1"; }
for u in "https://limitlesstcg.com/cards/jp/M6?display=list" "https://limitlesstcg.com/cards/jp/SV8?display=list"; do
  section "$u"
  get "$u" > /tmp/l.html; wc -c /tmp/l.html
  python3 - <<'PY'
h=open('/tmp/l.html',encoding='utf-8').read()
i=h.find('<table'); print(h[i:i+3000])
print('lignes', h.count('<tr'))
PY
done
section "Limitless liste JP : sous-titres (blocs)"
get "https://limitlesstcg.com/cards/jp" | grep -oE 'sub-heading[^>]*>[^<]+' | head -40
section "Limitless : extension ancienne (SM1M)"
get "https://limitlesstcg.com/cards/jp/SM1M" | grep -oE 'src="[^"]*tpc[^"]*"' | head -3
section "PokeAPI noms d'espèces (CSV)"
get "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_names.csv" | head -12
get "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_names.csv" | wc -l
section "TCGdex fr : extension (date, logo)"
get "https://api.tcgdex.net/v2/fr/sets/sv08" | python3 -c "import json,sys;d=json.load(sys.stdin);d.pop('cards',None);print(json.dumps(d,ensure_ascii=False)[:600])"
section "Riftbound fr : une carte"
get "https://riftbound.leagueoflegends.com/fr-fr/card-gallery/" | python3 -c "
import re,json,sys
h=sys.stdin.read();d=json.loads(re.search(r'<script id=\"__NEXT_DATA__\"[^>]*>(.*?)</script>',h,re.S).group(1));s=json.dumps(d,ensure_ascii=False);i=s.find('\"collectorNumber\"');print(s[i-60:i+500])"
section "One Piece EN : liste des extensions"
get "https://en.onepiece-cardgame.com/cardlist/" | grep -oE '<option value="[0-9]+"[^>]*>[^<]+' | head -50
