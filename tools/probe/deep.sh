#!/usr/bin/env bash
# Visuels des variantes : TCGplayer (n° produit par variante), TCGdex, PokemonWizard (anglais et japonais).
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"
echo "== TCGdex variants_detailed : toutes les clés"
curl -s -m 30 "https://api.tcgdex.net/v2/en/cards/sv08.5-001" | jq -c '[.variants_detailed[] | keys] , .image'
for u in 610356 610536 610637; do
  for f in "product/${u}_in_1000x1000.jpg" "product/${u}_200w.jpg"; do
    echo "tcgplayer $f $(curl -s -m 20 -o /tmp/i -w '%{http_code} %{size_download} %{content_type}' "https://tcgplayer-cdn.tcgplayer.com/$f")"
  done
done
for p in high.webp reverse/high.webp high-reverse.webp; do echo "tcgdex $p $(curl -s -m 20 -o /dev/null -w '%{http_code}' "https://assets.tcgdex.net/en/sv/sv08.5/001/$p")"; done
echo "== PokemonWizard EN Prismatic Evolutions"
P=$(curl -s -m 30 -A "$UA" "https://www.pokemonwizard.com/sets?page=1" | grep -o '/sets/[0-9]*/prismatic-evolutions"' | head -1 | tr -d '"')
[ -z "$P" ] && P=$(for pg in 2 3 4; do curl -s -m 30 -A "$UA" "https://www.pokemonwizard.com/sets?page=$pg"; done | grep -o '/sets/[0-9]*/prismatic-evolutions"' | head -1 | tr -d '"')
echo "path $P"
curl -s -m 30 -A "$UA" "https://www.pokemonwizard.com$P?page=1" | sed 's/\\"/"/g' | grep -o '"tcgplayer_product_id":[0-9]*,"name":"Exeggcute[^"]*"[^}]\{0,300\}"image_url":"[^"]*"' | head -6
echo "== PokemonWizard JP M2a Roserade images"
curl -s -m 30 -A "$UA" "https://www.pokemonwizard.com/sets/24499/mega-dream-ex?page=1" | sed 's/\\"/"/g' | grep -o '"tcgplayer_product_id":[0-9]*,"name":"Cynthia.s Roserade[^"]*"[^}]\{0,300\}"image_url":"[^"]*"' | head -6
echo "== TCGdex ja M2a-010 variants"
curl -s -m 30 "https://api.tcgdex.net/v2/ja/cards/M2a-010" | jq -c '[.variants_detailed[]? | {type, foil, tp: .thirdParty}]'
