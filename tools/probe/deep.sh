#!/usr/bin/env bash
set -u
UA="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1"
echo '== https://images.pokemontcg.io/mcd11/1.png'
curl -s -o /dev/null -m 30 -A "$UA" -H 'Referer: https://bananaintrouble.github.io/' -w '%{http_code} %{content_type} %{size_download} %{time_total}s\n' 'https://images.pokemontcg.io/mcd11/1.png'
curl -sI -m 30 -A "$UA" 'https://images.pokemontcg.io/mcd11/1.png' | grep -i 'cross-origin\|access-control\|cache-control' || true
echo '== https://images.scrydex.com/pokemon/mcd23-1/large'
curl -s -o /dev/null -m 30 -A "$UA" -H 'Referer: https://bananaintrouble.github.io/' -w '%{http_code} %{content_type} %{size_download} %{time_total}s\n' 'https://images.scrydex.com/pokemon/mcd23-1/large'
curl -sI -m 30 -A "$UA" 'https://images.scrydex.com/pokemon/mcd23-1/large' | grep -i 'cross-origin\|access-control\|cache-control' || true
echo '== https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC2_R_EN_SM.png'
curl -s -o /dev/null -m 30 -A "$UA" -H 'Referer: https://bananaintrouble.github.io/' -w '%{http_code} %{content_type} %{size_download} %{time_total}s\n' 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC2_R_EN_SM.png'
curl -sI -m 30 -A "$UA" 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/30C/30C_CC2_R_EN_SM.png' | grep -i 'cross-origin\|access-control\|cache-control' || true
echo '== https://assets.tcgdex.net/en/me/30th/001/low.webp'
curl -s -o /dev/null -m 30 -A "$UA" -H 'Referer: https://bananaintrouble.github.io/' -w '%{http_code} %{content_type} %{size_download} %{time_total}s\n' 'https://assets.tcgdex.net/en/me/30th/001/low.webp'
curl -sI -m 30 -A "$UA" 'https://assets.tcgdex.net/en/me/30th/001/low.webp' | grep -i 'cross-origin\|access-control\|cache-control' || true
echo '== https://www.pokemon.com/static-assets/content-assets/cms2/img/cards/web/BWP/BWP_EN_BW04.png'
curl -s -o /dev/null -m 30 -A "$UA" -H 'Referer: https://bananaintrouble.github.io/' -w '%{http_code} %{content_type} %{size_download} %{time_total}s\n' 'https://www.pokemon.com/static-assets/content-assets/cms2/img/cards/web/BWP/BWP_EN_BW04.png'
curl -sI -m 30 -A "$UA" 'https://www.pokemon.com/static-assets/content-assets/cms2/img/cards/web/BWP/BWP_EN_BW04.png' | grep -i 'cross-origin\|access-control\|cache-control' || true
echo '== https://www.30th.pokemon-card.com/images/m6a/cards/m6a_007_rj5sa808.png'
curl -s -o /dev/null -m 30 -A "$UA" -H 'Referer: https://bananaintrouble.github.io/' -w '%{http_code} %{content_type} %{size_download} %{time_total}s\n' 'https://www.30th.pokemon-card.com/images/m6a/cards/m6a_007_rj5sa808.png'
curl -sI -m 30 -A "$UA" 'https://www.30th.pokemon-card.com/images/m6a/cards/m6a_007_rj5sa808.png' | grep -i 'cross-origin\|access-control\|cache-control' || true
echo '== https://www.pokemon-card.com/assets/images/card_images/large/M6a/050713_P_PIKACHIXYUU.jpg'
curl -s -o /dev/null -m 30 -A "$UA" -H 'Referer: https://bananaintrouble.github.io/' -w '%{http_code} %{content_type} %{size_download} %{time_total}s\n' 'https://www.pokemon-card.com/assets/images/card_images/large/M6a/050713_P_PIKACHIXYUU.jpg'
curl -sI -m 30 -A "$UA" 'https://www.pokemon-card.com/assets/images/card_images/large/M6a/050713_P_PIKACHIXYUU.jpg' | grep -i 'cross-origin\|access-control\|cache-control' || true
echo '== https://tcg.mik.moe/static/img/151C/173.png'
curl -s -o /dev/null -m 30 -A "$UA" -H 'Referer: https://bananaintrouble.github.io/' -w '%{http_code} %{content_type} %{size_download} %{time_total}s\n' 'https://tcg.mik.moe/static/img/151C/173.png'
curl -sI -m 30 -A "$UA" 'https://tcg.mik.moe/static/img/151C/173.png' | grep -i 'cross-origin\|access-control\|cache-control' || true
echo '== https://wsrv.nl/?url=asia.pokemon-card.com/tw/card-img/tw00004285.png&w=360&output=webp'
curl -s -o /dev/null -m 30 -A "$UA" -H 'Referer: https://bananaintrouble.github.io/' -w '%{http_code} %{content_type} %{size_download} %{time_total}s\n' 'https://wsrv.nl/?url=asia.pokemon-card.com/tw/card-img/tw00004285.png&w=360&output=webp'
curl -sI -m 30 -A "$UA" 'https://wsrv.nl/?url=asia.pokemon-card.com/tw/card-img/tw00004285.png&w=360&output=webp' | grep -i 'cross-origin\|access-control\|cache-control' || true
