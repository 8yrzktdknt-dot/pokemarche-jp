#!/usr/bin/env bash
# E-mail de test au support TCGMarket (même service et même format que le formulaire « Signaler un problème » de l'app).
set -u
curl -s -m 60 -X POST "https://formsubmit.co/ajax/support.tcgmarket@gmail.com" \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -H "Origin: https://bananaintrouble.github.io" -H "Referer: https://bananaintrouble.github.io/tcgmarket/app/report" \
  -d '{"_subject":"[TCGMarket] Test · Signaler un problème","_template":"table","_captcha":"false","Sujet":"Test","Message":"Ceci est un e-mail de test envoyé par le formulaire « Signaler un problème » de TCGMarket.","Carte":"Bulbizarre · 001/132 · Méga-Évolution","Identifiant":"pokemon / fr / me01-001","Version":"0.0.18"}' -w "\n[%{http_code}]\n"
