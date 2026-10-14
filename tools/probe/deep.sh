#!/usr/bin/env bash
# Cherche les vrais logos One Piece (pages produits officielles) et Riftbound (site officiel, Scrydex).
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
st() { curl -s -o /tmp/x -L -m 20 -A "$UA" -w '%{http_code} %{content_type} %{size_download}' "$1"; echo " $1"; }
for site in https://en.onepiece-cardgame.com https://www.onepiece-cardgame.com; do
  for p in boosters/op14 boosters/op15 boosters/op16 boosters/op13 boosters/op12 boosters/eb04 decks/st23 decks/st29 decks/st30 decks/st36 decks/st15 decks/st01 decks/st13; do
    code=$(curl -s -o /tmp/p.html -L -m 30 -A "$UA" -w '%{http_code}' "$site/products/$p.php")
    echo "== $code $site/products/$p.php"
    [ "$code" = 200 ] && grep -oE '"[^"]*(logo|title|ttl|mv)[^"]*\.(png|webp|jpg|svg)[^"]*"' /tmp/p.html | grep -v 'common/' | sort -u | head -12
  done
done
echo "== EN products listing (liens)"; curl -sL -m 30 -A "$UA" https://en.onepiece-cardgame.com/products/ | grep -oE 'href="[^"]*products/[^"]+"' | sort -u | head -80
echo "== Scrydex"
for u in onepiece/OP15-logo/logo onepiece/op15-logo/logo onepiece/OP15/logo riftbound/OGN-logo/logo riftbound/ogn-logo/logo riftbound/SFD-logo/logo riftbound/unl-logo/logo pokemon/zz-inconnu-logo/logo onepiece/zz-logo/logo; do st "https://images.scrydex.com/$u"; md5sum /tmp/x | cut -c1-10; done
echo "== Riftbound"
for u in https://playriftbound.com/en-us/ https://playriftbound.com/en-us/products/ https://playriftbound.com/en-us/sets/ https://playriftbound.com/en-us/card-gallery/; do
  code=$(curl -s -o /tmp/r.html -L -m 30 -A "$UA" -w '%{http_code}' "$u"); echo "-- $code $u $(wc -c < /tmp/r.html)"
  grep -oE 'https://cmsassets\.rgpub\.io/[^"\\ ]+' /tmp/r.html | sort -u | head -40
  grep -oiE '.{0,200}(origins|spiritforged|unleashed|vendetta|radiance|proving grounds).{0,200}' /tmp/r.html | grep -i 'logo\|image\|url' | head -8
done
