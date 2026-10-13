#!/usr/bin/env bash
set -u
loc() { curl -sS -o /dev/null -m 30 -w "%{http_code} -> %{redirect_url}\n" "$1"; }
echo "== redirections pokemontcg.io"
loc "https://prices.pokemontcg.io/cardmarket/sv8-238"
loc "https://prices.pokemontcg.io/tcgplayer/sv8-238"
loc "https://prices.pokemontcg.io/cardmarket/me1-1"
loc "https://prices.pokemontcg.io/cardmarket/swsh12tg-TG01"
echo "== cardmarket (en-têtes seulement)"
curl -sS -I -m 30 "https://www.cardmarket.com/en/Pokemon/Products?idProduct=794611" | head -12
echo "== pokemontcg.io carte (cardmarket.url)"
curl -sS -m 30 "https://api.pokemontcg.io/v2/cards/sv8-238?select=id,cardmarket,tcgplayer" | head -c 700; echo
echo "== tcgplayer produit"
loc "https://www.tcgplayer.com/product/590027"
echo "== cardtrader recherche"
loc "https://www.cardtrader.com/en/search?q=Pikachu"
loc "https://www.cardtrader.com/en/cards/search?q=Pikachu"
