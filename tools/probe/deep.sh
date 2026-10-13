#!/usr/bin/env bash
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
get() { curl -sS -L -m 40 -A "$UA" "$1"; }
head_() { curl -sS -o /tmp/h.bin -L -m 30 -A "$UA" -w "%{http_code} %{content_type} %{size_download}o  $1\n" "$1"; python3 -c "
import struct;b=open('/tmp/h.bin','rb').read()
if b[:8]==b'\x89PNG\r\n\x1a\n': print('   png',struct.unpack('>II',b[16:24]))
elif b[:2]==b'\xff\xd8':
  i=2
  while i<len(b):
    if b[i]!=0xFF: break
    m=b[i+1];L=int.from_bytes(b[i+2:i+4],'big')
    if m in (0xC0,0xC2): print('   jpg',int.from_bytes(b[i+7:i+9],'big'),'x',int.from_bytes(b[i+5:i+7],'big'));break
    i+=2+L
elif b[:4]==b'RIFF': print('   webp')
" 2>/dev/null; }
imgs() { python3 -c "
import re,sys;h=open('/tmp/p.html',encoding='utf-8',errors='ignore').read()
l=re.findall(r'(?:src|data-src|srcset|href|content)=\"([^\" ]+\.(?:png|jpg|jpeg|webp|svg)[^\" ]*)',h)
print(len(l));[print('  ',x) for x in l if re.search(sys.argv[1],x,re.I)][:int(sys.argv[2])]" "$1" "$2"; }
section() { echo; echo "=================== $1"; }

section "M6a : images TCGplayer grand format"
head_ "https://tcgplayer-cdn.tcgplayer.com/product/716932_in_1000x1000.jpg"
head_ "https://tcgplayer-cdn.tcgplayer.com/product/716906_in_1000x1000.jpg"
head_ "https://images.pokemonwizard.com/uploads/images/cards/24721/716932-mew-ex-135103-full.jpg"
section "M6a : page officielle"
get "https://www.pokemon-card.com/ex/m6a/" > /tmp/p.html; wc -c < /tmp/p.html; imgs "card|list|1[0-3][0-9]" 15
head_ "https://samuraiswordtokyo.com/wp-content/uploads/2026/09/img_30th_m6a_109_ae67sejz_074ac9ba59be.webp"

section "pokemontcg.io : logos"
head_ "https://images.pokemontcg.io/swsh12tg/logo.png"
head_ "https://images.pokemontcg.io/svp/logo.png"
head_ "https://images.pokemontcg.io/sm75/logo.png"
section "TCGCollector"
get "https://www.tcgcollector.com/sets/intl" > /tmp/p.html; wc -c < /tmp/p.html; imgs "logo|expansion|set" 8
get "https://www.tcgcollector.com/sets/jp" > /tmp/p.html; wc -c < /tmp/p.html; imgs "logo|expansion|set" 8
section "Pokellector"
get "https://www.pokellector.com/sets" > /tmp/p.html; wc -c < /tmp/p.html; imgs "logo" 8
get "https://jp.pokellector.com/sets" > /tmp/p.html; wc -c < /tmp/p.html; imgs "logo" 8
section "Serebii : toutes les extensions japonaises (alt)"
get "https://www.serebii.net/card/japanese.shtml" | grep -oE 'alt="[^"]+ Set Icon"' | sed 's/ Set Icon"//;s/alt="//' | tr '\n' ';' | head -c 6000; echo
section "One Piece : produits"
get "https://en.onepiece-cardgame.com/products/" > /tmp/p.html; wc -c < /tmp/p.html; imgs "products|logo|op|eb|st" 15
get "https://www.onepiece-cardgame.com/products/" > /tmp/p.html; wc -c < /tmp/p.html; imgs "products|logo" 8
get "https://onepiece.limitlesstcg.com/cards" > /tmp/p.html; wc -c < /tmp/p.html; imgs "logo|set" 10
section "Riftbound : sets (galerie)"
get "https://riftbound.leagueoflegends.com/en-us/card-gallery/" | python3 -c "
import sys,re,json;h=sys.stdin.read();m=re.search(r'<script id=\"__NEXT_DATA__\"[^>]*>(.*?)</script>',h,re.S);d=json.loads(m.group(1))
def find(o):
  if isinstance(o,dict):
    if 'sets' in o and isinstance(o['sets'],dict) and isinstance(o['sets'].get('items'),list): return o['sets']
    for v in o.values():
      r=find(v)
      if r: return r
  if isinstance(o,list):
    for v in o:
      r=find(v)
      if r: return r
print(json.dumps(find(d)['items'][0])[:1500])"
section "Chinois : TCGdex zh-tw / zh-cn"
for l in zh-tw zh-cn; do get "https://api.tcgdex.net/v2/$l/sets" | python3 -c "import json,sys;d=json.load(sys.stdin);print('$l',len(d),'avec logo',sum(1 for x in d if x.get('logo')),[x['id'] for x in d][:10])"; done
get "https://asia.pokemon-card.com/tw/card-search/" > /tmp/p.html; wc -c < /tmp/p.html; imgs "expansion|logo|series|product" 12
get "https://asia.pokemon-card.com/tw/" > /tmp/p.html; wc -c < /tmp/p.html; imgs "expansion|logo|product" 12
