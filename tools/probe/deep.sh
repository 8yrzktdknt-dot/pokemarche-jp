#!/usr/bin/env bash
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
get() { curl -sS -L -m 40 -A "$UA" "$1"; }
for u in "https://www.fujicardshop.com/card-lists/30th-celebration/" "https://www.pokemonwizard.com/sets/24721/30th-celebration-m6a" "https://samuraiswordtokyo.com/blogs/news/30th-celebration-ar-list-all-20-art-rares" "https://limitlesstcg.com/cards/jp/M6a?display=list"; do
  echo; echo "=================== $u"
  get "$u" > /tmp/p.html; wc -c /tmp/p.html
  python3 - "$u" <<'PY'
import re,sys
h=open('/tmp/p.html',encoding='utf-8',errors='ignore').read()
t=re.sub(r'<script[\s\S]*?</script>|<style[\s\S]*?</style>','',h)
for m in list(re.finditer(r'1(0[4-9]|1\d|2\d|3[0-5])\s*/\s*103',t))[:6]:
    s=m.start(); print('CTX', re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',t[max(0,s-300):s+300]))[:400])
imgs=re.findall(r'(?:src|data-src|href)="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"',h)
print('images', len(imgs)); [print(' ',x) for x in imgs if re.search(r'10[4-9]|11\d|12\d|13[0-5]',x)][:15]
print('sample', imgs[:8])
PY
done
