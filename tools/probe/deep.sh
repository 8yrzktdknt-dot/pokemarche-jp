#!/usr/bin/env bash
set -u
curl -s -m 30 "https://downloads.s3.cardmarket.com/?prefix=productCatalog/" | grep -oE '<Key>[^<]+</Key>' | head -60
curl -s -m 30 "https://downloads.s3.cardmarket.com/" | head -c 1500; echo
curl -s -m 60 -o /tmp/p.json https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_6.json
node -e '
const d=JSON.parse(require("fs").readFileSync("/tmp/p.json")).products;
const ex=d.filter(p=>/^Exeggcute/.test(p.name));console.log(JSON.stringify(ex.slice(-8)));
const byExp={};for(const p of d){(byExp[p.idExpansion]??=[]).push(p)}
const recent=Object.entries(byExp).map(([k,v])=>[k,v.length,v.map(x=>x.dateAdded).sort().pop(),v.slice(0,3).map(x=>x.name).join("; ")]).sort((a,b)=>b[2].localeCompare(a[2])).slice(0,40);
for(const r of recent)console.log(r.join(" | "));'
