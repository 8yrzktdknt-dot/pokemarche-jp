#!/usr/bin/env bash
# One Piece : visuels servis par le proxy wsrv.nl (affichables depuis l'app ?).
set -u
for u in "https://wsrv.nl/?url=en.onepiece-cardgame.com%2Fimages%2Fcardlist%2Fcard%2FOP01-120_p1.png&w=360&output=webp" \
         "https://wsrv.nl/?url=www.onepiece-cardgame.com%2Fimages%2Fcardlist%2Fcard%2FOP01-120.png&w=900&output=webp" \
         "https://wsrv.nl/?url=fr.onepiece-cardgame.com%2Fimages%2Fcardlist%2Fcard%2FOP09-001.webp&w=360&output=webp" \
         "https://wsrv.nl/?url=en.onepiece-cardgame.com%2Fimages%2Fcardlist%2Fcard%2FEB04-061_p2.png&w=360&output=webp"; do
  echo "== $u"
  curl -s -o /tmp/i -m 40 -H "Referer: https://bananaintrouble.github.io/" -w "%{http_code} %{content_type} %{size_download}\n" "$u"
  curl -sI -m 40 "$u" | grep -i "cross-origin\|access-control\|cache-control"
done
