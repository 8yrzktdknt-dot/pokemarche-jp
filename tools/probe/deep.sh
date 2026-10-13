#!/usr/bin/env bash
set -u
python3 - <<'PY'
import urllib.request,re
from concurrent.futures import ThreadPoolExecutor
def g(u): return urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=40).read().decode()
def one(cid):
    h=g(f"https://www.pokemon-card.com/card-search/details.php/card/{cid}/regu/all")
    b=re.search(r'class="subtext[^"]*"[^>]*>[\s\S]*?/>([^<]*)</div>',h)
    t=re.search(r'<h1[^>]*>([^<]*)',h)
    return cid,(b.group(1).replace('&nbsp;',' ').strip() if b else None),(t.group(1).strip() if t else None),h
with ThreadPoolExecutor(6) as ex: rows=list(ex.map(one, range(50613,50753)))
empty=[r for r in rows if not r[1]]
print('sans numéro', len(empty)); [print(r[0], r[2]) for r in empty]
h=[r for r in rows if r[0]==50700][0][3]
i=h.find('subtext'); print(h[i-200:i+900])
i=h.find('img-regulation'); print(h[i-50:i+400])
PY
