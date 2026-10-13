#!/usr/bin/env bash
set -u
UA="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
get() { curl -sS -L -m 40 -A "$UA" "$1"; }
head_() { curl -sS -o /dev/null -L -m 30 -A "$UA" -w "%{http_code} %{content_type} %{size_download}o  $1\n" "$1"; }
section() { echo; echo "=================== $1"; }

section "pokemon-card.com : liste des produits (pg)"
get "https://www.pokemon-card.com/card-search/index.php" > /tmp/cs.html
wc -c /tmp/cs.html
grep -oE '<option[^>]*value="[0-9]+"[^>]*>[^<]{2,80}' /tmp/cs.html | head -40
grep -oE '(pg|product)[A-Za-z_]*[=:][^&"]{0,40}' /tmp/cs.html | sort -u | head -20
grep -oE 'src="[^"]*\.js[^"]*"' /tmp/cs.html | head
for js in $(grep -oE 'src="(/card-search/[^"]*\.js[^"]*)"' /tmp/cs.html | sed 's/src="//;s/"$//' | head -4); do echo "--- $js"; get "https://www.pokemon-card.com$js" | grep -oE '.{0,60}(resultAPI|pg=|expansion)[^;]{0,100}' | head -8; done
section "pokemon-card.com : recherche par mot-clé (Mew ex) pour trouver M6a"
get "https://www.pokemon-card.com/card-search/resultAPI.php?keyword=%E3%83%9F%E3%83%A5%E3%82%A6ex&regulation_sidebar_form=all&page=1" | python3 -c "
import json,sys;d=json.load(sys.stdin);print(d.get('hitCnt'),d.get('maxPage'));[print(c) for c in d.get('cardList',[])[:12]]"
section "pokemon-card.com : fiche d'une carte récente"
ID=$(get "https://www.pokemon-card.com/card-search/resultAPI.php?keyword=%E3%83%9F%E3%83%A5%E3%82%A6ex&regulation_sidebar_form=all&page=1" | python3 -c "import json,sys;l=json.load(sys.stdin).get('cardList',[]);print(max(l,key=lambda c:int(c['cardID']))['cardID'] if l else '')")
echo "id=$ID"
get "https://www.pokemon-card.com/card-search/details.php/card/$ID/regu/all" > /tmp/d.html
grep -oE '(card_images[^"]+|<span class="subtext[^>]*>[^<]*|[0-9]{3}&nbsp;/&nbsp;[0-9]{3}[^<]{0,20}|img[^>]*(mark|regulation|expansion)[^>]*>|alt="[A-Za-z0-9]+")' /tmp/d.html | head -15
sed -n '/subtext/,+3p' /tmp/d.html | head -12
section "pokemon-card.com : og:image des pages produit"
for p in sv8 m6 m6a m5 sv11b m1l sv9a; do echo "-- $p"; get "https://www.pokemon-card.com/ex/$p/" | grep -oE '<meta property="og:image" content="[^"]+"' | head -2; done
section "Serebii : extensions japonaises"
head_ "https://www.serebii.net/card/japanese.shtml"
get "https://www.serebii.net/card/japanese.shtml" | grep -oE '(href|src)="[^"]*"' | grep -iE 'logo|\.png|card/' | head -40
section "pokemontcg.io : sets (id) et une carte de galerie"
get "https://api.pokemontcg.io/v2/sets?select=id,name,total,ptcgoCode&pageSize=250" | python3 -c "import json,sys;d=json.load(sys.stdin)['data'];print(len(d));print([x['id'] for x in d])"
get "https://api.pokemontcg.io/v2/cards?q=set.id:swsh12tg&select=number,images&pageSize=3" | head -c 600; echo
