#!/usr/bin/env bash
# Exploration ciblée (structure des réponses) : lancé par le workflow « Explorer les sources » avec deep=1.
set -u
UA="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
get() { curl -sS -L -m 40 -A "$UA" "$1"; }
section() { echo; echo "=================== $1"; }

section "Limitless : page d'une extension JP (M6) — tableau des cartes"
get "https://limitlesstcg.com/cards/jp/M6" > /tmp/set.html; wc -c /tmp/set.html
python3 - <<'PY'
import re
h=open('/tmp/set.html',encoding='utf-8').read()
i=h.find('card-search-grid'); print('grid at',i)
print(h[i-300:i+2500] if i>0 else '')
j=h.find('<table'); print('table at', j); print(h[j:j+2500] if j>0 else '')
PY
section "Limitless : liste JP (une ligne complète du tableau)"
get "https://limitlesstcg.com/cards/jp" > /tmp/jp.html
python3 - <<'PY'
import re
h=open('/tmp/jp.html',encoding='utf-8').read()
i=h.find('/cards/jp/M6"'); print(h[i-1500:i+1200])
print('lignes', h.count('<tr'))
PY
section "Limitless : liste EN"
get "https://limitlesstcg.com/cards" | python3 -c "import sys;h=sys.stdin.read();i=h.find('/cards/');print(h.count('<tr'));import re;print(re.findall(r'href=\"(/cards/[^\"]+)\"',h)[:40])"
section "Limitless : carte EN"
get "https://limitlesstcg.com/cards/MEG/1" | grep -oE 'src="[^"]*(png|jpg|webp)"' | head -4

section "Riftbound : une carte complète"
get "https://riftbound.leagueoflegends.com/en-us/card-gallery/" > /tmp/rb.html
python3 - <<'PY'
import re,json
h=open('/tmp/rb.html',encoding='utf-8',errors='ignore').read()
d=json.loads(re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>',h,re.S).group(1))
def find(o):
    if isinstance(o,dict):
        if 'cards' in o and isinstance(o['cards'],dict) and 'items' in o['cards']: return o['cards']
        for v in o.values():
            r=find(v)
            if r: return r
    if isinstance(o,list):
        for v in o:
            r=find(v)
            if r: return r
cards=find(d)
print('cartes', len(cards['items']), {k:v for k,v in cards.items() if k!='items'} )
print(json.dumps(cards['items'][0],ensure_ascii=False)[:3500])
from collections import Counter
print(Counter(c['set']['value']['id'] for c in cards['items']))
PY
section "Riftbound : langues de la galerie"
for l in fr-fr zh-cn; do curl -sS -o /dev/null -w "$l %{http_code}\n" -L -m 30 -A "$UA" "https://riftbound.leagueoflegends.com/$l/card-gallery/"; done

section "Frankfurter : adresse finale"
curl -sS -I -L -m 20 -H "Origin: https://bananaintrouble.github.io" "https://api.frankfurter.app/latest?from=EUR&to=USD,JPY" | grep -iE "^(HTTP|location|access-control)"

section "pokemontcg.io : nombre de cartes"
get "https://api.pokemontcg.io/v2/cards?pageSize=1&select=id" | head -c 300; echo
section "One Piece : page d'une extension officielle (JP OP-05)"
get "https://www.onepiece-cardgame.com/cardlist/?series=550105" > /tmp/op.html; wc -c /tmp/op.html
python3 - <<'PY'
h=open('/tmp/op.html',encoding='utf-8',errors='ignore').read()
i=h.find('<dl class="modalCol"'); print(h[i:i+2500])
print('cartes', h.count('<dl class="modalCol"'))
PY
