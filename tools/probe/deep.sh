#!/usr/bin/env bash
set -u
UA="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
get() { curl -sS -L -m 40 -A "$UA" "$1"; }
head_() { curl -sS -o /dev/null -L -m 30 -A "$UA" -w "%{http_code} %{content_type} %{size_download}o  $1\n" "$1"; }
section() { echo; echo "=================== $1"; }

section "pokemon-card.com : API de recherche, M6a"
get "https://www.pokemon-card.com/card-search/resultAPI.php?keyword=&regulation_sidebar_form=all&pg=1&expansionCodes=M6a" | head -c 1500; echo
get "https://www.pokemon-card.com/card-search/resultAPI.php?keyword=&regulation_sidebar_form=all&pg=1&expansionCodes=M6a" | python3 -c "
import json,sys
d=json.load(sys.stdin); print({k:v for k,v in d.items() if k!='cardList'}); l=d.get('cardList',[]); print(len(l)); print(l[:2]); print(l[-2:])" || true
get "https://www.pokemon-card.com/card-search/index.php?keyword=&regulation_sidebar_form=all&expansionCodes=M6a" | grep -oE '(resultAPI|expansionCodes|card_images)[^"]{0,120}' | sort -u | head -10
section "pokemon-card.com : fiche carte (image, numéro)"
ID=$(get "https://www.pokemon-card.com/card-search/resultAPI.php?keyword=&regulation_sidebar_form=all&pg=1&expansionCodes=M6a" | python3 -c "import json,sys;l=json.load(sys.stdin).get('cardList',[]);print(l[-1]['cardID'] if l else '')" 2>/dev/null)
echo "id=$ID"
[ -n "$ID" ] && get "https://www.pokemon-card.com/card-search/details.php/card/$ID/regu/all" | grep -oE '(card_images[^"]+|subtext[^<]{0,80}<[^<]{0,80}|[0-9]{3} ?/ ?[0-9]{3}[^<]{0,30})' | head -10
section "pokemon-card.com : logos d'extension (page liste)"
get "https://www.pokemon-card.com/card-search/index.php" | grep -oE 'src="[^"]*(logo|expansion|pack|ex_)[^"]*"' | sort -u | head -20
section "Limitless : page d'extension, images plus grandes ?"
get "https://limitlesstcg.com/cards/jp/M6" | grep -oE '(src|href)="[^"]*(\.png|\.webp|\.jpg)"' | grep -v '/cards/jp/M6/' | sort -u | head -10
section "TCGdex ja : logos disponibles ?"
python3 - <<'PY'
import json,urllib.request
def g(u): return json.load(urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'x'}),timeout=40))
s=g('https://api.tcgdex.net/v2/ja/sets'); print(len(s), 'avec logo', sum(1 for x in s if x.get('logo')), [x['id'] for x in s if x.get('logo')][:20])
PY
section "TCGdex fr / en : images manquantes par extension"
python3 - <<'PY'
import json,urllib.request,concurrent.futures as cf
def g(u): return json.load(urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'x'}),timeout=60))
for lang in ['fr','en']:
    sets=g(f'https://api.tcgdex.net/v2/{lang}/sets')
    def one(s):
        try:
            d=g(f'https://api.tcgdex.net/v2/{lang}/sets/{s["id"]}'); c=d.get('cards',[])
            return (s['id'], d['name'], len(c), sum(1 for x in c if not x.get('image')), bool(d.get('logo')), (d.get('releaseDate') or ''))
        except Exception as e: return (s['id'], str(e), 0, 0, False, '')
    with cf.ThreadPoolExecutor(12) as ex: r=list(ex.map(one, sets))
    tot=sum(x[2] for x in r); miss=sum(x[3] for x in r)
    print(lang, 'extensions', len(r), 'cartes', tot, 'sans image', miss, 'sans logo', sum(1 for x in r if not x[4]))
    for x in sorted(r, key=lambda x:x[5], reverse=True):
        if x[3]: print('  ', x)
PY
section "TCGdex fr 30th : cartes > 128"
get "https://api.tcgdex.net/v2/fr/sets/30th" | python3 -c "import json,sys;d=json.load(sys.stdin);c=d['cards'];print(len(c));print([ (x['localId'],x['name'],bool(x.get('image'))) for x in c[120:]])"
section "pokecardex (FR)"
head_ "https://www.pokecardex.com/series/ME1"
get "https://www.pokecardex.com/series/ME1" | grep -oE 'src="[^"]*(\.png|\.jpg|\.webp)"' | head -8
