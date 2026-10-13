#!/usr/bin/env bash
# Exploration ciblée (structure des réponses) : lancé par le workflow « Explorer les sources » avec deep=1.
set -u
UA="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
get() { curl -sS -L -m 40 -A "$UA" "$1"; }
section() { echo; echo "=================== $1"; }

section "pokemon-card.com resultAPI (page 1)"
get "https://www.pokemon-card.com/card-search/resultAPI.php?keyword=&regulation_sidebar_form=all&pg=1" | head -c 3500; echo
section "pokemon-card.com resultAPI : recherche M6"
get "https://www.pokemon-card.com/card-search/resultAPI.php?keyword=%E3%83%AC%E3%83%83%E3%82%AF%E3%82%A6%E3%82%B6&regulation_sidebar_form=all&pg=1" | head -c 2500; echo

section "Limitless : page carte M6 110 (images et liens)"
get "https://limitlesstcg.com/cards/jp/M6/110" | grep -oE '(src|href)="[^"]*(png|jpg|webp|/cards/jp/[^"]*)"' | head -20
section "Limitless : page carte SV8 1"
get "https://limitlesstcg.com/cards/jp/SV8/1" | grep -oE 'src="[^"]*(png|jpg|webp)"' | head -5
section "Limitless : liste des extensions JP"
get "https://limitlesstcg.com/cards/jp" | grep -oE 'href="/cards/jp/[A-Za-z0-9-]+"[^<]*<[^>]*>[^<]{0,80}' | head -30
get "https://limitlesstcg.com/cards/jp" | grep -oE '<tr[^>]*>.{0,600}' | head -5 | cut -c1-600

section "TCGdex ja set SV8 (fin : date, logo, série)"
get "https://api.tcgdex.net/v2/ja/sets/SV8" | python3 -c "import json,sys;d=json.load(sys.stdin);d.pop('cards',None);print(json.dumps(d,ensure_ascii=False)[:800])"
section "TCGdex ja set M6 (date, logo)"
get "https://api.tcgdex.net/v2/ja/sets/M6" | python3 -c "import json,sys;d=json.load(sys.stdin);c=d.pop('cards',None);print(json.dumps(d,ensure_ascii=False)[:800]);print('cartes',len(c),'avec image',sum(1 for x in c if x.get('image')))"
section "TCGdex ja : extensions avec/sans images (comptage)"
python3 - <<'PY'
import json,urllib.request
def g(u): return json.load(urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'x'}),timeout=40))
sets=g('https://api.tcgdex.net/v2/ja/sets')
print('extensions',len(sets),'logos',sum(1 for s in sets if s.get('logo')))
print([ (s['id'],s.get('logo') is not None) for s in sets][-25:])
PY

section "pokemontcg.io cartes"
get "https://api.pokemontcg.io/v2/cards?q=set.id:sv8&pageSize=1&select=id,name,number,images,set" | head -c 1200; echo
get "https://api.pokemontcg.io/v2/sets?pageSize=1" | python3 -c "import json,sys;print('totalCount', json.load(sys.stdin).get('totalCount'))"

section "Riftbound : galerie officielle (__NEXT_DATA__)"
get "https://riftbound.leagueoflegends.com/en-us/card-gallery/" > /tmp/rb.html; wc -c /tmp/rb.html
python3 - <<'PY'
import re,json
h=open('/tmp/rb.html',encoding='utf-8',errors='ignore').read()
m=re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>',h,re.S)
print('next data', bool(m))
if m:
    d=json.loads(m.group(1)); s=json.dumps(d)
    print('taille',len(s))
    i=s.find('collectorNumber'); print(s[max(0,i-1500):i+1500])
PY
section "One Piece : redirections de la liste officielle"
curl -sS -I -L -m 20 -A "$UA" "https://en.onepiece-cardgame.com/cardlist/" | grep -iE "^(HTTP|location)"
get "https://en.onepiece-cardgame.com/cardlist/?series=569001" | grep -oE 'data-src="[^"]+"' | head -5
get "https://www.onepiece-cardgame.com/cardlist/?series=556201" | grep -oE '<option value="[0-9]+"[^>]*>[^<]+' | head -40
