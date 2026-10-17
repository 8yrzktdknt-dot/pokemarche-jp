# TCGMarket — feuille de route (décisions et idées à garder)

## Modèle économique visé
- Appli de collection **100 % gratuite** pour toutes les fonctions de collection (scan, prix, suivi, alertes, échanges).
- Financement : **petits bandeaux de pub** discrets, et **options payantes** facultatives (monnaie virtuelle Pack Rush, ou autre).

## Pack Rush (packs virtuels) — idée retenue, pas encore lancée
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
