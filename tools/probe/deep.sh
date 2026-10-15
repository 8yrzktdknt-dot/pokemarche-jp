#!/usr/bin/env bash
# One Piece : visuels officiels des cartes accessibles depuis l'app (Referer, CORS, type) ?
set -u
UA="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
for u in https://en.onepiece-cardgame.com/images/cardlist/card/OP01-120.png https://en.onepiece-cardgame.com/images/cardlist/card/EB04-061_p2.png https://www.onepiece-cardgame.com/images/cardlist/card/OP01-120.png https://fr.onepiece-cardgame.com/images/cardlist/card/EB04-061_p2.webp https://fr.onepiece-cardgame.com/images/cardlist/card/OP09-001.webp; do
  echo "== $u"
  for ref in "" "https://bananaintrouble.github.io/" "https://en.onepiece-cardgame.com/cardlist/"; do
    curl -s -o /tmp/img -m 30 -A "$UA" ${ref:+-H "Referer: $ref"} -w "ref=[$ref] %{http_code} %{content_type} %{size_download}\n" "$u"
  done
  curl -sI -m 30 -A "$UA" -H "Referer: https://bananaintrouble.github.io/" "$u" | grep -i "^\(cache\|access-control\|cross-origin\|x-frame\|content-security\|server\|location\)" 
done
echo "== page liste (attribut des images)"
curl -s -m 30 -A "$UA" "https://en.onepiece-cardgame.com/cardlist/?series=569101" | grep -o '<img[^>]*cardlist/card[^>]*>' | head -3
