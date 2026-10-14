#!/usr/bin/env bash
set -u
node tools/probe/audit.mjs cardmarket
node tools/probe/audit.mjs images
node tools/probe/audit.mjs tcgdex
