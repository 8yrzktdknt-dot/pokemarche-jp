#!/usr/bin/env bash
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
U="https://www.pokemonwizard.com/sets/24721/30th-celebration-m6a"
curl -sS -L -m 40 -A "$UA" "$U" > /tmp/p.html
python3 - <<'PY'
import re
h=open('/tmp/p.html',encoding='utf-8',errors='ignore').read()
i=h.find('716932-mew-ex-135103-medium'); print('RAW', h[i-600:i+900]); print()
print('pages', sorted(set(re.findall(r'href="([^"]*(?:page=|/page/)[^"]*)"',h)))[:15])
print('next_f', h.count('self.__next_f'), '__NEXT_DATA__' in h)
nums=sorted(set(int(x) for x in re.findall(r'-(\d{1,3})103-medium',h))); print('numéros', len(nums), nums)
for k in ['total','cards','perPage','per_page','pageSize','sort']:
    print(k, [m.group(0)[:120] for m in re.finditer(k+r'[\\\\"]*:[^,]{0,60}',h)][:3])
PY
for q in "?page=2" "?sort=number" "?page=1&per_page=250" ; do curl -sS -L -m 40 -A "$UA" "$U$q" | python3 -c "import re,sys;h=sys.stdin.read();n=sorted(set(int(x) for x in re.findall(r'-(\d{1,3})103-medium',h)));print('$q',len(n),n[:5],n[-5:])"; done
curl -sS -L -m 40 -A "$UA" "https://www.pokemonwizard.com/api/sets/24721/cards" | head -c 400; echo
