#!/usr/bin/env bash
set -u
UA="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
get() { curl -sS -L -m 40 -A "$UA" "$1"; }
head_() { curl -sS -o /dev/null -L -m 30 -A "$UA" -w "%{http_code} %{content_type} %{size_download}o  $1\n" "$1"; }
section() { echo; echo "=================== $1"; }
API="https://www.pokemon-card.com/card-search/resultAPI.php?keyword=&regulation_sidebar_form=all"
section "pokemon-card.com : extensions par page (les plus récentes)"
for p in 1 2 3 4 5 6 8 10 15 20; do
  get "$API&page=$p" | python3 -c "
import json,sys,collections;l=json.load(sys.stdin).get('cardList',[])
c=collections.Counter(x['cardThumbFile'].split('/')[5] for x in l); print($p, dict(c), l[0]['cardID'] if l else '', l[-1]['cardID'] if l else '')"
done
section "pokemon-card.com : M6a, plus grands ID"
for p in 2 3 4; do get "$API&page=$p" | python3 -c "
import json,sys;l=json.load(sys.stdin).get('cardList',[]);[print(x['cardID'],x['cardThumbFile'],x['cardNameViewText']) for x in l if '/M6a/' in x['cardThumbFile']][-6:] if False else [print(x['cardID'],x['cardThumbFile'].split('/')[-1],x['cardNameViewText']) for x in [y for y in l if '/M6a/' in y['cardThumbFile']][-6:]]"; done
section "pokemon-card.com : fiche (rareté) 50651 et une carte rare"
get "https://www.pokemon-card.com/card-search/details.php/card/50651/regu/all" > /tmp/a.html
grep -n -iE 'rare|rarity|ic_' /tmp/a.html | head -10
sed -n '/subtext/,+6p' /tmp/a.html | head -10
LAST=$(for p in 1 2 3 4 5; do get "$API&page=$p" | python3 -c "import json,sys;l=json.load(sys.stdin).get('cardList',[]);[print(x['cardID']) for x in l if '/M6a/' in x['cardThumbFile']]"; done | sort -n | tail -1)
echo "last M6a id=$LAST"
get "https://www.pokemon-card.com/card-search/details.php/card/$LAST/regu/all" > /tmp/b.html
grep -n -iE 'rare|rarity|ic_' /tmp/b.html | head -10
sed -n '/subtext/,+6p' /tmp/b.html | head -10
grep -oE '<h1[^>]*>[^<]*' /tmp/b.html | head -2
section "Serebii : images de la page japonaise"
get "https://www.serebii.net/card/japanese.shtml" | grep -oE '<img[^>]*src="[^"]*"[^>]*>' | sed -n '1,400p' | grep -iE 'logo|card/' | head -30
get "https://www.serebii.net/card/japanese.shtml" | grep -oE 'href="/card/[a-z0-9]+/"' | sort -u | wc -l
get "https://www.serebii.net/card/japanese.shtml" | grep -oE '<a href="/card/[a-z0-9]+/"><img[^>]*>' | head -10
get "https://www.serebii.net/card/japanese.shtml" | grep -oE '<tr>.{0,600}' | grep -i 'ninja\|abyss\|emerald' | head -3
head_ "https://www.serebii.net/card/ninjaspinner/logo.png"
head_ "https://www.serebii.net/card/30thcelebration/logo.png"
