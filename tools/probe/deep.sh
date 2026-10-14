#!/usr/bin/env bash
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
for u in https://limitlesstcg.com/cards/jp/M6a/1 https://limitlesstcg.com/cards/jp/M6a/110 https://limitlesstcg.com/cards/jp/MF/20 https://limitlesstcg.com/cards/jp/M6a/80; do
  echo "== $u"; curl -sL -m 30 -A "$UA" "$u" | tr '\n' ' ' | grep -oE '<div class="card-text".{0,2500}' | head -c 2500; echo
done
