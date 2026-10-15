#!/usr/bin/env bash
# Limitless : section « Translations » d'une carte japonaise sans version internationale (M6 #68, #63, #71).
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"
for n in 68 63 71 15; do
  echo "== jp/M6/$n"
  curl -s -m 30 -A "$UA" "https://limitlesstcg.com/cards/jp/M6/$n" | tr '\n' ' ' | sed 's/<[^>]*>/ /g; s/  */ /g' | grep -o 'Translations.\{0,700\}' | head -1
done
echo "== PokemonWizard : recherche M6"
for p in 1 2 3; do curl -s -m 30 -A "$UA" "https://www.pokemonwizard.com/sets?language=japanese&page=$p" | grep -o 'href="/sets/[0-9]*/[a-z0-9-]*"' | grep -i "emerald\|storm\|m6" ; done | sort -u
