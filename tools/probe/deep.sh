#!/usr/bin/env bash
set -u
for id in 50728 50733 50736 50700; do
  echo "== $id"
  curl -sS -L -m 30 -A "Mozilla/5.0" "https://www.pokemon-card.com/card-search/details.php/card/$id/regu/all" | python3 -c "
import sys,re;h=sys.stdin.read();i=h.find('class=\"subtext');print(h[i:i+500]);t=re.search(r'<h1[^>]*>([^<]*)',h);print('titre',t.group(1).strip() if t else None)"
done
