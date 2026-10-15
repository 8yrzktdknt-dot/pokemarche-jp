#!/usr/bin/env bash
# Noms anglais des cartes japonaises récentes sans version internationale (M6) : PokemonWizard, Limitless.
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"
for p in 1 2; do curl -s -m 30 -A "$UA" "https://www.pokemonwizard.com/sets?language=japanese&page=$p" | grep -o 'href="/sets/[0-9]*/[a-z0-9-]*"' ; done | sort -u | grep -iv "logo\|symbol" | head -15
P=$(for p in 1 2; do curl -s -m 30 -A "$UA" "https://www.pokemonwizard.com/sets?language=japanese&page=$p"; done | grep -o '/sets/[0-9]*/storm-emerald[a-z-]*' | grep -v "logo\|symbol" | head -1)
echo "path M6: $P"
[ -n "$P" ] && curl -s -m 30 -A "$UA" "https://www.pokemonwizard.com$P?page=2" | sed 's/\\"/"/g' | grep -o '"name":"[^"]*","slug":"[^"]*","card_number":"[0-9]*"' | head -60
echo "== Limitless jp/M6/68"
curl -s -m 30 -A "$UA" "https://limitlesstcg.com/cards/jp/M6/68" | grep -o '<title>[^<]*\|card-text-name[^<]*<[^<]*<[^<]*\|translation[^<]\{0,120\}' | head -8
