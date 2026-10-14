#!/usr/bin/env bash
set -u
curl -s -m 60 -o /tmp/p.json https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_6.json
node tools/probe/cmjp.mjs
