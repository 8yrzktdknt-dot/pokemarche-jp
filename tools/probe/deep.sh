#!/usr/bin/env bash
set -u
API="https://www.pokemon-card.com/card-search/resultAPI.php?keyword=&regulation_sidebar_form=all"
python3 - <<'PY'
import json,urllib.request,re
def g(u): return urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=40).read().decode()
API="https://www.pokemon-card.com/card-search/resultAPI.php?keyword=&regulation_sidebar_form=all"
ids=[]
for p in range(1,8):
    l=json.loads(g(f"{API}&page={p}")).get('cardList',[])
    m=[(int(c['cardID']),c['cardThumbFile'].split('/')[-1]) for c in l if '/M6a/' in c['cardThumbFile']]
    print(p,len(l),len(m), m[0] if m else '', m[-1] if m else '')
    ids+=m
print('total M6a', len(ids), 'min', min(i for i,_ in ids), 'max', max(i for i,_ in ids))
have=set(i for i,_ in ids)
print('missing ids in range', [i for i in range(min(have),max(have)+1) if i not in have][:60])
for cid in [50680,50690,50700,50712,50729]:
    h=g(f"https://www.pokemon-card.com/card-search/details.php/card/{cid}/regu/all")
    b=re.search(r'class="subtext[^"]*"[^>]*>[\s\S]*?/>([^<]*)</div>',h)
    t=re.search(r'<h1[^>]*>([^<]*)',h)
    print(cid, (b.group(1).replace('&nbsp;',' ').strip() if b else None), t.group(1).strip() if t else None)
PY
