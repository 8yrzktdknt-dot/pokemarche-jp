# TCGMarket — feuille de route (décisions et idées à garder)

## Modèle économique visé
- Appli de collection **100 % gratuite** pour toutes les fonctions de collection (scan, prix, suivi, alertes, échanges).
- Financement : **petits bandeaux de pub** discrets, et **options payantes** facultatives (monnaie virtuelle Pack Rush, ou autre).

## Pack Rush (packs virtuels) — V1 en place (sans boutique)
- But : faire revenir les utilisateurs chaque jour (ouverture de packs, quêtes, collection virtuelle).
- Cahier des charges reçu et analysé (Origines Cosmiques / Éclats Stellaires, 58 cartes, Pièces/Fragments, quêtes, boutique).
- Points de vigilance avant de lancer :
  - **Logique côté serveur obligatoire** (tirages, monnaie, inventaire) : sinon triche depuis le téléphone.
  - **Réglementation des « loot boxes »** : packs aléatoires achetés avec de l'argent réel → interdits ou encadrés dans
    certains pays (Belgique, Pays-Bas…), cadre français à vérifier. Cartes virtuelles sans valeur réelle, non
    revendables ni convertibles en argent ; afficher les probabilités.
  - **Paiements** : sur le web (PWA), Stripe possible ; dans une appli App Store / Play Store, achats intégrés Apple /
    Google obligatoires pour la monnaie virtuelle (commission 15–30 %).
  - **Droits** : cartes Pack Rush propres à TCGMarket (pas de visuels Pokémon / One Piece / Riftbound dans des packs
    payants).

## Publicité — proposition (rien n'est encore branché)
**1. Liens affiliés d'abord (revenu sans aucune pub visible).** L'appli affiche déjà « Voir sur Cardmarket, TCGplayer,
eBay, CardTrader » sur chaque carte : en passant ces liens par les programmes d'affiliation (eBay Partner Network,
TCGplayer via Impact, CardTrader, programme partenaires Cardmarket), chaque achat fait après un clic rapporte une
commission (souvent 1 à 5 %). Aucun bandeau, aucune gêne, et c'est cohérent avec une appli de cotes.

**2. Petits bandeaux sur la version web.**
- Régie : Google AdSense (ou Ezoic / Media.net). AdSense exige un nom de domaine à soi (pas « github.io ») :
  acheter par exemple tcgmarket.app (~10–15 €/an) et le relier à GitHub Pages (gratuit).
- Consentement obligatoire en Europe (RGPD) : bandeau de choix des cookies certifié Google (gratuit) ; sans accord,
  pubs non personnalisées seulement (moins rémunérées).
- Emplacements discrets : un bandeau en bas de l'accueil et dans les listes (toutes les 20 cartes environ),
  jamais sur le scanner, la fiche carte en haut ni pendant l'ouverture d'un pack Pack Rush.
- Revenus indicatifs : 0,5 à 2 € pour 1 000 affichages (≈ 150–600 €/mois à 10 000 utilisateurs actifs).

**3. Appli dans les stores (plus tard).** AdMob (Google) pour les bandeaux, et surtout les **pubs récompensées**
(« regarde une vidéo → +1 pack Pack Rush ») : très bien acceptées par les joueurs et mieux payées.

**4. Option « sans pub ».** Achat unique (2,99 € à 4,99 €), une fois les paiements en place (Stripe sur le web,
achats intégrés dans les stores). Un abonnement seulement s'il apporte des avantages réguliers.

Ordre conseillé : liens affiliés → nom de domaine + AdSense avec consentement → AdMob et pubs récompensées dans
l'appli native → option sans pub avec la boutique Pack Rush.

## Passage sur un vrai serveur — à prévoir plus tard
Déclencheurs : lancement de Pack Rush, forte hausse du nombre d'utilisateurs, site proche de la limite GitHub Pages
(1 Go, ~100 Go de trafic/mois), appli dans les stores, quotas gratuits Supabase dépassés.
Plan envisagé (migration progressive) :
- catalogue et historique des prix sur un stockage de fichiers (ex. Cloudflare R2) → historique jour par jour sur 3 ans
  possible (aujourd'hui : 90 jours jour par jour puis une semaine sur sept, pour tenir dans GitHub Pages) ;
- logique sensible (packs, monnaie, échanges validés, boutique) en fonctions serveur Supabase ;
- robots (prix, catalogue, notifications) restent sur GitHub Actions.
Préparer un plan détaillé avec les coûts avant toute migration.

## Autres idées en attente
- Produits scellés (boosters, displays, ETB) avec leur cote Cardmarket.
- Export de la collection en tableur.
- Visuels anglais pour les cartes McDonald's françaises sans image.
- Nouveau logo (en réflexion).
- E-mails personnalisés (SMTP Brevo).
