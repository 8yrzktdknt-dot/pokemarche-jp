#!/usr/bin/env bash
# Fichiers publics Cardmarket : produits et prix de l'extension « 30th Celebration » (6601) et voisines.
set -u
curl -s -m 120 -o p.json https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_6.json
curl -s -m 120 -o g.json https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_6.json
ls -la p.json g.json
for e in 6600 6601 6605 6606 6607; do
  echo "== extension $e : $(jq "[.products[]|select(.idExpansion==$e)]|length" p.json) produits"
done
echo "== 6601 (tous)"
jq -c --slurpfile g g.json '($g[0].priceGuides|map({(.idProduct|tostring):.})|add) as $pg | .products[]|select(.idExpansion==6601)|[.idProduct,.name,.dateAdded,($pg[.idProduct|tostring]|{avg7,avg30,avg,"avg7-holo","avg30-holo"})]' p.json
echo "== extensions récentes (id >= 6590)"
jq -c '[.products[]|select(.idExpansion>=6590)]|group_by(.idExpansion)|map([.[0].idExpansion,length,.[0].name,.[1].name])[]' p.json
