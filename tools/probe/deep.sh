#!/usr/bin/env bash
# Guide des prix Cardmarket : champs des cartes jamais vendues (Mew RGB japonais) et part des produits sans vente.
set -u
curl -s -m 120 -o g.json https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_6.json
jq -c '.priceGuides[] | select(.idProduct==909512 or .idProduct==909513 or .idProduct==909514 or .idProduct==909518)' g.json
echo "== produits sans vente (avg7, avg30, avg vides)"
jq -c '[.priceGuides[] | select((.avg7//0)==0 and (.avg30//0)==0 and (.avg//0)==0 and ((."avg7-holo"//0)==0) and ((."avg-holo"//0)==0))] | {n: length, trend: ([.[]|select((.trend//0)>0 or (."trend-holo"//0)>0)]|length), low: ([.[]|select((.low//0)>0 or (."low-holo"//0)>0)]|length)}' g.json
