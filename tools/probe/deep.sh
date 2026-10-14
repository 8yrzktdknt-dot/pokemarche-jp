#!/usr/bin/env bash
# Vérifie le projet Supabase des comptes (réglages d'authentification, table des collections).
set -u
U=https://pobettqrcmaqqtwvidlf.supabase.co
K=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvYmV0dHFyY21hcXF0d3ZpZGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5Nzg0NzgsImV4cCI6MjEwNzU1NDQ3OH0.mBamLEvUqFob7-_CCwr44Y9WCSYDTgwfudQ_6TtPvnE
echo "== auth settings"; curl -s -m 20 "$U/auth/v1/settings" -H "apikey: $K"; echo
echo "== table collections"; curl -s -m 20 "$U/rest/v1/collections?select=user_id&limit=1" -H "apikey: $K" -H "Authorization: Bearer $K" -w " [%{http_code}]"; echo
echo "== google authorize"; curl -s -m 20 -o /dev/null -w "%{http_code} %{redirect_url}\n" "$U/auth/v1/authorize?provider=google&redirect_to=https://bananaintrouble.github.io/tcgmarket/app/account"
