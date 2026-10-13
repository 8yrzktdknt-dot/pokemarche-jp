#!/usr/bin/env bash
# Explore les sources de données possibles (lancé à la main par GitHub Actions, workflow « Explorer les sources »).
# Affiche le statut HTTP, l'en-tête CORS et le début de chaque réponse.
set -u
probe() {
  local url="$1" n="${2:-1200}"
  echo
  echo "=================== $url"
  curl -sS -L -m 25 -A "Mozilla/5.0 PokeMarket-probe" -H "Origin: https://bananaintrouble.github.io" \
    -D /tmp/h -o /tmp/b "$url" || { echo "ÉCHEC"; return; }
  grep -iE "^HTTP/|^access-control-allow-origin|^content-type|^content-length" /tmp/h | tr -d '\r'
  head -c "$n" /tmp/b | tr -d '\000' ; echo
}
for u in ${EXTRA_URLS:-}; do probe "$u" 3000; done
[ -n "${EXTRA_URLS:-}" ] && exit 0

# TCGdex : dates de sortie, logos
probe "https://api.tcgdex.net/v2/ja/series" 600
probe "https://api.tcgdex.net/v2/ja/series/SV" 1500
probe "https://api.tcgdex.net/v2/ja/sets/M6" 1500
probe "https://api.tcgdex.net/v2/ja/sets/SV8" 900
probe "https://api.tcgdex.net/v2/ja/cards/SV8-001" 1500
probe "https://api.tcgdex.net/v2/en/sets/me01" 900
probe "https://api.tcgdex.net/v2/fr/series" 600
# pokemontcg.io (anglais complet)
probe "https://api.pokemontcg.io/v2/sets?orderBy=-releaseDate&pageSize=2" 2000
probe "https://api.pokemontcg.io/v2/cards?q=set.id:sv8&pageSize=1" 2500
# Limitless (cartes japonaises)
probe "https://limitlesstcg.com/cards/jp" 1500
probe "https://limitlesstcg.com/cards/jp/M6/110" 3000
probe "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpc/SV8/SV8_001_R_JP_SM.png" 200
probe "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpc/M6/M6_110_R_JP_SM.png" 200
# Site officiel japonais
probe "https://www.pokemon-card.com/card-search/resultAPI.php?keyword=&regulation_sidebar_form=all&pg=1" 1500
# PokeAPI (noms traduits)
probe "https://pokeapi.co/api/v2/pokemon-species/384" 800
# One Piece
probe "https://optcgapi.com/api/allSetCards/" 1500
probe "https://optcgapi.com/api/allSTCards/" 600
probe "https://optcgapi.com/api/allPromoCards/" 400
probe "https://en.onepiece-cardgame.com/cardlist/" 1500
probe "https://www.onepiece-cardgame.com/cardlist/" 800
probe "https://en.onepiece-cardgame.com/images/cardlist/card/OP05-119.png" 200
# Riftbound
probe "https://api.riftcodex.com/cards?size=2" 2500
probe "https://api.riftcodex.com/sets" 1500
probe "https://riftbound.leagueoflegends.com/en-us/card-gallery/" 1500
# Taux de change
probe "https://api.frankfurter.app/latest?from=EUR&to=USD,JPY" 300
