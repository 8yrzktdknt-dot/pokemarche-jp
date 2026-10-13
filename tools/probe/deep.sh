#!/usr/bin/env bash
set -u
UA="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
get() { curl -sS -L -m 40 -A "$UA" "$1"; }
head_() { curl -sS -o /dev/null -L -m 30 -A "$UA" -w "%{http_code} %{url_effective} %{size_download}o\n" "$1"; }
section() { echo; echo "=================== $1"; }
section "TCGdex : fiche complète fr (pricing, illustrateur, etc.)"
get "https://api.tcgdex.net/v2/fr/cards/sv08-238" | python3 -c "import json,sys;d=json.load(sys.stdin);d.pop('attacks',None);print(json.dumps(d,ensure_ascii=False)[:2500])"
section "TCGdex : fiche ja"
get "https://api.tcgdex.net/v2/ja/cards/SV8-100" | python3 -c "import json,sys;d=json.load(sys.stdin);d.pop('attacks',None);print(json.dumps(d,ensure_ascii=False)[:1200])"
section "Cardmarket : lien direct idProduct"
ID=$(get "https://api.tcgdex.net/v2/en/cards/sv08-238" | python3 -c "import json,sys;d=json.load(sys.stdin);print((d.get('pricing') or {}).get('cardmarket',{}).get('idProduct',''))")
echo "idProduct=$ID"
head_ "https://www.cardmarket.com/en/Pokemon/Products?idProduct=$ID"
head_ "https://www.cardmarket.com/fr/Pokemon/Products/Singles?idProduct=$ID"
head_ "https://www.cardmarket.com/en/OnePiece/Products/Search?searchString=OP05-119"
head_ "https://www.cardmarket.com/en/Riftbound/Products/Search?searchString=Blazing"
section "TCGplayer"
TP=$(get "https://api.tcgdex.net/v2/en/cards/sv08-238" | python3 -c "import json,sys;d=json.load(sys.stdin);t=(d.get('pricing') or {}).get('tcgplayer') or {};print(t.get('productId',''), list(t.keys()))")
echo "tcgplayer: $TP"
section "OPTCG API : champs d'une carte"
get "https://optcgapi.com/api/allSetCards/" | python3 -c "import json,sys;d=json.load(sys.stdin);print(len(d));print(json.dumps(d[0],ensure_ascii=False)[:1500])"
section "One Piece : bloc carte officiel"
get "https://en.onepiece-cardgame.com/cardlist/?series=569101" | python3 -c "
import sys;h=sys.stdin.read();i=h.find('<dl class=\"modalCol\"');print(h[i:i+3500])"
section "Riftbound : une carte (clés)"
get "https://riftbound.leagueoflegends.com/en-us/card-gallery/" | python3 -c "
import sys,json,re;h=sys.stdin.read();m=re.search(r'<script id=\"__NEXT_DATA__\"[^>]*>(.*?)</script>',h,re.S);d=json.loads(m.group(1))
def find(o):
  if isinstance(o,dict):
    if 'cards' in o and isinstance(o['cards'],dict) and isinstance(o['cards'].get('items'),list): return o['cards']
    for v in o.values():
      r=find(v)
      if r: return r
  if isinstance(o,list):
    for v in o:
      r=find(v)
      if r: return r
c=find(d)['items'][0];print(json.dumps(c,ensure_ascii=False)[:3000])"
section "Limitless JP : page carte (illustrateur)"
get "https://limitlesstcg.com/cards/jp/M6/110" | grep -oE '(card-text-artist|Illustrated by|illustrator)[^<]{0,40}<[^>]*>[^<]{0,60}' | head -3
get "https://limitlesstcg.com/cards/jp/M6/110" | grep -oE 'class="card-text-[a-z-]+"[^>]*>[^<]{0,80}' | head -12
