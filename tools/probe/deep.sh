#!/usr/bin/env bash
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
curl -sS -L -m 40 -A "$UA" "https://www.pokemon-card.com/ex/me/" > /tmp/p.html; wc -c < /tmp/p.html
grep -oE '(src|data-src|srcset)="[^"]*\.(png|jpg|webp|svg)[^"]*"' /tmp/p.html | grep -v 'include/\|/assets/images/og\|logo_b' | sort -u | head -60
