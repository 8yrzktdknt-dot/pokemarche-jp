#!/usr/bin/env bash
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
for p in mee mem mez mbg mbd ma mc svod svln svhk sv8 svaw; do
  U="https://www.pokemon-card.com/ex/$p/"
  curl -sS -o /tmp/o.html -L -m 30 -A "$UA" -w "%{http_code} $U\n" "$U"
  grep -oE '(src|data-src|content)="[^"]*(logo|title|ttl|mv|kv|ogp)[^"]*\.(png|jpg|webp|svg)[^"]*"' /tmp/o.html | grep -v 'include/images\|common/header-logo\|/assets/images/og' | sort -u | head -6
done
echo "== page produits officielle (liste)"
curl -sS -L -m 30 -A "$UA" "https://www.pokemon-card.com/products/index.html" | grep -oE '(src|data-src)="[^"]*products[^"]*\.(png|jpg|webp)"' | head -10
curl -sS -L -m 30 -A "$UA" "https://www.pokemon-card.com/products/" | grep -oE 'href="[^"]*products/[^"]*"' | sort -u | head -15
