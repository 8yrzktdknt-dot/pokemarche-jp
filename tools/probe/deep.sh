#!/usr/bin/env bash
set -u
UA="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
get() { curl -sS -L -m 40 -A "$UA" "$1"; }
head_() { curl -sS -o /dev/null -L -m 30 -A "$UA" -w "%{http_code} %{content_type} %{size_download}o  $1\n" "$1"; }
section() { echo; echo "=================== $1"; }

section "Limitless : logos (taille réelle)"
head_ "https://s3.limitlesstcg.com/sets/jp/M6.png"
python3 - <<'PY'
import urllib.request,struct
b=urllib.request.urlopen(urllib.request.Request("https://s3.limitlesstcg.com/sets/jp/M6.png",headers={'User-Agent':'x'})).read()
print('png', struct.unpack('>II', b[16:24]) if b[:8]==b'\x89PNG\r\n\x1a\n' else b[:20])
PY
section "Limitless : M6a (liste et nombre de cartes)"
get "https://limitlesstcg.com/cards/jp/M6a?display=list" | grep -oE 'href="/cards/jp/M6a/[0-9A-Za-z]+"' | sort -u | wc -l
get "https://limitlesstcg.com/cards/jp/M6a?display=list" | grep -oE 'href="/cards/jp/M6a/[0-9A-Za-z]+"' | sort -t/ -k5 -n -u | tail -5
get "https://limitlesstcg.com/cards/jp/M6a" | grep -oE '[0-9]+ Cards' | head -2
get "https://limitlesstcg.com/cards/jp/M6a" | grep -oiE '(secret|rare|show all|variants?|parallel)[^<]{0,80}' | sort -u | head -15
section "TCGdex ja M6a / fr 30th"
get "https://api.tcgdex.net/v2/ja/sets/M6a" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('cardCount'), len(d.get('cards',[])), [c['localId'] for c in d.get('cards',[])][-5:])"
get "https://api.tcgdex.net/v2/fr/sets" | python3 -c "import json,sys;d=json.load(sys.stdin);print([ (s['id'],s['name'],s['cardCount']) for s in d if '30' in s['id'] or 'célébr' in s['name'].lower() or 'celebr' in s['name'].lower()])"
get "https://api.tcgdex.net/v2/fr/sets/30th-c" | python3 -c "import json,sys;d=json.load(sys.stdin);c=d.get('cards',[]);print(d.get('cardCount'), len(c), sum(1 for x in c if x.get('image')))"
section "TCGdex fr : extensions récentes, cartes avec / sans image"
python3 - <<'PY'
import json,urllib.request
def g(u): return json.load(urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'x'}),timeout=40))
for sid in ['me01','me02','sv10','sv08','swsh12','sm12']:
    try:
        d=g(f'https://api.tcgdex.net/v2/fr/sets/{sid}'); c=d.get('cards',[])
        print(sid, d['name'], len(c), 'avec image', sum(1 for x in c if x.get('image')), 'logo', bool(d.get('logo')))
    except Exception as e: print(sid, e)
PY
section "pokemon.com : images officielles FR / EN"
for u in \
 "https://assets.pokemon.com/assets/cms2-fr-fr/img/cards/web/SV08/SV08_FR_1.png" \
 "https://assets.pokemon.com/assets/cms2/img/cards/web/SV08/SV08_EN_1.png" \
 "https://assets.pokemon.com/assets/cms2-fr-fr/img/cards/web/ME01/ME01_FR_1.png" \
 "https://assets.pokemon.com/assets/cms2/img/cards/web/ME01/ME01_EN_1.png" \
 "https://assets.pokemon.com/assets/cms2-fr-fr/img/cards/web/SV10/SV10_FR_1.png" \
 "https://www.pokemon.com/fr/jcc-pokemon/galerie-de-cartes/"; do head_ "$u"; done
get "https://www.pokemon.com/fr/jcc-pokemon/galerie-de-cartes/?cardName=pikachu" | grep -oE 'src="[^"]*cards/web[^"]*"' | head -5
section "pokemon-card.com : page produit (logo) SV8 / M6"
for p in "https://www.pokemon-card.com/ex/sv8/" "https://www.pokemon-card.com/ex/m6/" "https://www.pokemon-card.com/products/"; do head_ "$p"; get "$p" | grep -oE '(src|data-src)="[^"]*(logo|title|mainvisual|kv|ttl)[^"]*"' | head -6; done
section "pokemon-card.com : liste des produits (images)"
get "https://www.pokemon-card.com/products/" | grep -oE 'src="[^"]*(\.png|\.jpg)"' | head -15
section "Bulbagarden archives : logos JP"
for u in "https://archives.bulbagarden.net/wiki/File:SV8_Super_Electric_Breaker_Logo.png" "https://archives.bulbagarden.net/wiki/Category:Japanese_expansion_logos"; do head_ "$u"; done
get "https://archives.bulbagarden.net/wiki/Category:Japanese_expansion_logos" | grep -oE 'title="File:[^"]+"' | head -20
