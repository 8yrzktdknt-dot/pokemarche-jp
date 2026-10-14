#!/usr/bin/env bash
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
for u in https://limitlesstcg.com/cards/jp/M6a/1 https://limitlesstcg.com/cards/jp/M6a/80 https://limitlesstcg.com/cards/jp/MF/20; do
  echo "== $u"; curl -sL -m 30 -A "$UA" "$u" > /tmp/c.html
  node -e 'const h=require("fs").readFileSync("/tmp/c.html","utf8");const i=h.indexOf("card-text");console.log(h.slice(i-50,i+2500).replace(/\s+/g," "));const j=h.indexOf("prints");console.log("---",h.slice(j-200,j+800).replace(/\s+/g," "))'
done
