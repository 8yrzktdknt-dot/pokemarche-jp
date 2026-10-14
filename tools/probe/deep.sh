#!/usr/bin/env bash
set -u
cd tools/probe && npm init -y >/dev/null && npm i playwright@1.47.2 >/dev/null 2>&1 && npx playwright install --with-deps chromium >/dev/null 2>&1 && node cm.cjs
