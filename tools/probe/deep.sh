#!/usr/bin/env bash
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
curl -s -m 30 "https://api.pokemontcg.io/v2/cards?q=set.id:me55c&select=id,number,name&pageSize=60" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{for(const c of JSON.parse(s).data)console.log(c.id,c.number,c.name)})'
curl -sL -m 30 -A "$UA" https://limitlesstcg.com/cards/30C > /tmp/l.html
grep -oE 'href="/cards/30C/[A-Za-z0-9-]+"' /tmp/l.html | sort -u | grep -vE '/[0-9]+"$' | head -40
for p in BS-4 CC1 1a; do echo "== $p"; curl -sL -m 20 -A "$UA" "https://limitlesstcg.com/cards/30C/$p" | grep -oE 'cardmarket\.com/en/Pokemon/Products/Singles/[^"?]+' | head -3; done
