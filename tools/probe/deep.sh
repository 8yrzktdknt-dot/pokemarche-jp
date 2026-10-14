#!/usr/bin/env bash
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
for id in tk3a tk3b tk4a tk4b tk5a tk5b tk6a tk6b tk7a tk7b tk8a tk8b tk9a tk9b tk10a tk10b tk-xy-su tkxysu xytk9s tk9s tk10l tk10a; do
  r=$(curl -s -o /dev/null -m 15 -H 'Range: bytes=0-0' -w '%{http_code} %header{content-range}' "https://images.scrydex.com/pokemon/$id-1/large"); echo "$r $id"; done
for u in "https://limitlesstcg.com/cards?q=set:TK" "https://limitlesstcg.com/cards/TK9S/1" "https://limitlesstcg.com/cards/XYTK/1"; do echo "== $u $(curl -sL -m 20 -A "$UA" -o /tmp/l -w '%{http_code}' "$u")"; grep -oE 'src="[^"]+(TK|tk)[^"]*"' /tmp/l | head -3; done
curl -s -m 20 "https://api.tcgdex.net/v2/en/sets/tk-xy-su" | head -c 400; echo
