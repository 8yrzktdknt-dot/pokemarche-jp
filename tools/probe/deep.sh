#!/usr/bin/env bash
# Message de test au support (même envoi que « Signaler un problème ») et vérification de la table « reports ».
set -u
curl -s -m 60 -X POST https://api.web3forms.com/submit \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -H "Origin: https://bananaintrouble.github.io" -H "Referer: https://bananaintrouble.github.io/tcgmarket/app/report" \
  -H "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" \
  -d '{"access_key":"bb7cad15-ec72-4d2e-a04e-382e7ce1c473","subject":"[TCGMarket] Test · Signaler un problème","from_name":"TCGMarket","Sujet":"Test","Message":"Ceci est un message de test envoyé par le formulaire « Signaler un problème » de TCGMarket.","Carte":"Bulbizarre · 001/132 · Méga-Évolution","Identifiant":"pokemon / fr / me01-001","Version":"0.0.20"}' -w "\n[%{http_code}]\n"
K=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvYmV0dHFyY21hcXF0d3ZpZGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5Nzg0NzgsImV4cCI6MjEwNzU1NDQ3OH0.mBamLEvUqFob7-_CCwr44Y9WCSYDTgwfudQ_6TtPvnE
echo "== table reports (insert test)"
curl -s -m 30 -X POST "https://pobettqrcmaqqtwvidlf.supabase.co/rest/v1/reports" -H "apikey: $K" -H "Authorization: Bearer $K" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d '{"topic":"Test","message":"Message de test (vérification de la table)","version":"0.0.20"}' -w "[%{http_code}]\n"
