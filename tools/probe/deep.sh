#!/usr/bin/env bash
# Variantes des cartes (normal, holo, reverse, Poké Ball, Master Ball…) : ce que donnent les sources.
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"
for u in en/cards/sv08.5-001 en/cards/sv08.5-010 en/cards/sv10-001 en/cards/me01-001 fr/cards/me01-001 en/cards/swsh12-001 en/cards/base1-4 ja/cards/SV11B-001 ja/cards/M2a-010 ja/cards/SV8a-001; do
  echo "== TCGdex $u"
  curl -s -m 30 "https://api.tcgdex.net/v2/$u" | jq -c '{id, rarity, variants, variants_detailed, cm: .pricing.cardmarket, tpk: (.pricing.tcgplayer|keys?)}'
done
echo "== TCGdex set sv08.5 (brief: variants ?)"
curl -s -m 30 "https://api.tcgdex.net/v2/en/sets/sv08.5" | jq -c '.cards[0]'
echo "== Cardmarket price guide : champs"
curl -s -m 120 -o g.json https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_6.json
jq -c '.priceGuides[0], ([.priceGuides[]|select(.["avg7-holo"]!=null and .avg7!=null)]|length), (.priceGuides|length)' g.json
curl -s -m 120 -o p.json https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_6.json
echo "== Cardmarket produits JP M2a (Roserade / Cynthia)"
jq -c '.products[]|select(.name|test("Cynthia.s Roserade"))|[.idProduct,.idExpansion,.name]' p.json | head -20
echo "== PokemonWizard M2a"
curl -s -m 30 -A "$UA" "https://www.pokemonwizard.com/sets?language=japanese&page=1" | grep -o '/sets/[0-9]*/[a-z0-9-]*' | sort -u | head -40
P=$(curl -s -m 30 -A "$UA" "https://www.pokemonwizard.com/sets?language=japanese&page=1" | grep -o '/sets/[0-9]*/mega-dream[a-z0-9-]*' | head -1)
echo "path $P"
curl -s -m 30 -A "$UA" "https://www.pokemonwizard.com$P?page=1" | sed 's/\\"/"/g' | grep -o '"name":"[^"]*Roserade[^"]*"[^}]\{0,400\}' | head -5
echo "== Limitless JP M2a 10"
curl -s -m 30 -A "$UA" "https://limitlesstcg.com/cards/jp/M2a/10" | grep -io 'ball[^<]\{0,60\}\|variant[^<]\{0,80\}\|reverse[^<]\{0,60\}' | sort -u | head -20
echo "== Limitless EN PRE 1"
curl -s -m 30 -A "$UA" "https://limitlesstcg.com/cards/PRE/1" | grep -io 'ball[^<]\{0,60\}\|variant[^<]\{0,80\}\|reverse[^<]\{0,60\}' | sort -u | head -20
