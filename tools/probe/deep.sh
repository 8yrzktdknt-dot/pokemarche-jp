#!/usr/bin/env bash
# Vérifie chaque logo distant des catalogues : affiche ceux qui ne répondent pas en image.
set -u
UA="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
for f in catalog/sets/*.json; do
  node -e 'const t=require("./"+process.argv[1]);for(const b of t.blocs)for(const s of b.sets)for(const u of [s.logo,s.symbol])if(/^http/.test(u||""))console.log(s.id+" "+u)' "$f" > /tmp/urls.txt
  echo "== $f : $(wc -l < /tmp/urls.txt) logos distants"
  while read -r id u; do
    r=$(curl -s -o /tmp/img -m 20 -A "$UA" -w '%{http_code} %{content_type} %{size_download}' "$u")
    case "$r" in 200\ image*) ;; *) echo "KO $id $r $u";; esac
  done < /tmp/urls.txt
done
