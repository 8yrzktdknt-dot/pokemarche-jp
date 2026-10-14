#!/usr/bin/env bash
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
curl -s -m 30 "https://api.pokemontcg.io/v2/cards?q=set.id:me55c&select=id,number,name,images&pageSize=60" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{for(const c of JSON.parse(s).data)console.log(c.id,"|",c.number,"|",c.name,"|",c.images?.small)})'
for n in $(seq 1 30); do
  curl -sL -m 20 -A "$UA" "https://limitlesstcg.com/cards/30C/CC$n" > /tmp/c.html
  node -e 'const h=require("fs").readFileSync("/tmp/c.html","utf8");const name=h.match(/class="card-text-name">\s*<a[^>]*>([^<]+)</)?.[1];const p=[...h.matchAll(/Singles\/(30th-Celebration\/[^"?&]+)/g)].map(m=>m[1]);const img=h.match(/src="([^"]*30C_CC[^"]*)"/)?.[1];console.log("CC'$n'",name,"|",[...new Set(p)].join(" "),"|",img)'
done
