# TCG Scanner (iOS + Android)

Application mobile façon « Dex », avec **scanner automatique** de cartes pour
**Pokémon**, **One Piece** et **Riftbound**, cartes en plusieurs langues et accès
aux prix **Cardmarket**, **TCGplayer**, **CardTrader** et **eBay**.

Stack : Expo (SDK 57) + React Native + TypeScript + Expo Router.

## Fonctionnalités de cette première version

- **Scanner automatique** (`src/app/scan.tsx`) : la caméra analyse une image toutes les ~0,7 s
  avec l'OCR ML Kit (sur l'appareil, hors-ligne). Pas de bouton à presser : dès que le code de la carte est lu
  deux fois de suite, la carte est recherchée, le téléphone vibre et on peut l'ajouter d'un geste,
  puis enchaîner la suivante.
  - One Piece : code `OP05-119`, `ST10-001`, `EB01-001`, `PRB01-001`, `P-042`
  - Riftbound : code `OGN-202/298`
  - Pokémon : numéro `136/189`, `TG05/TG30`… et code d'extension s'il est imprimé (`SV4a`, `SSP EN`)
  - Jeu « Auto » : le jeu est déduit du format du code. Langue détectée (japonais, coréen, EN/FR…).
- **Recherche** par nom, par jeu et par langue.
- **Fiche carte** : image, prix automatiques (quand l'API en fournit) et boutons vers les 4 sites.
- **Collection** locale (quantités, valeur estimée).

## Lancer l'app

👉 **Pas développeur ? Suivez le guide pas à pas [LANCER.md](LANCER.md).**

L'OCR ML Kit est un module natif : l'app ne tourne **pas dans Expo Go**, il faut un *development build*.

```bash
cd mobile
npm install
npx expo run:ios        # Mac + Xcode
npx expo run:android    # Android Studio / téléphone en USB
# ou dans le cloud, sans Mac :
npx eas build --profile development --platform all
```

Vérifications : `npm run typecheck` et `npm test` (tests de l'analyse OCR, des liens de prix et du stabilisateur).

## Organisation du code

| Dossier | Rôle |
| --- | --- |
| `src/app/` | Écrans (Expo Router) : accueil/recherche, scanner, fiche carte, collection |
| `src/lib/games/` | Un connecteur par jeu (même interface `GameProvider`) |
| `src/lib/scan/` | Lecture du code dans le texte OCR, stabilisation des lectures |
| `src/lib/prices/` | Liens vers Cardmarket / TCGplayer / CardTrader / eBay, format des prix |
| `src/lib/store.tsx` | Collection et réglages (stockage local) |

## Sources de données

| Jeu | Catalogue | Langues | Prix automatiques |
| --- | --- | --- | --- |
| Pokémon | [TCGdex](https://tcgdex.dev) (gratuit, sans clé) | FR, EN, JA, DE, ES, IT, PT, KO, ZH, ID, TH | Cardmarket (EUR) + TCGplayer (USD) |
| One Piece | [OPTCG API](https://optcgapi.com) (gratuit, sans clé) | noms en anglais ; images officielles EN/JA | TCGplayer (USD) |
| Riftbound | [Riftcodex](https://riftcodex.com) (gratuit, sans clé) | EN | — |

⚠️ Le réseau de l'environnement où ce code a été écrit bloquait ces API : les formats de réponse
de **OPTCG API** et **Riftcodex** ont été codés de façon défensive mais sont à vérifier sur un vrai appareil
(fichiers `src/lib/games/onepiece.ts` et `riftbound.ts`). TCGdex est la source déjà utilisée par l'appli web.

Les 4 boutons de prix sont des **liens de recherche** : ils marchent tout de suite, sans clé d'API,
et pourront porter un identifiant d'affiliation (eBay Partner Network, Cardmarket, CardTrader).

## Prochaines étapes

1. **Reconnaissance visuelle** (cartes sans code lisible, reflets, cartes japonaises anciennes) :
   réutiliser l'approche de l'appli web (`../card-index.json` = embeddings CLIP quantifiés) avec un modèle
   embarqué (`onnxruntime-react-native` ou TFLite), un index par jeu téléchargé à la demande.
   Combiner image + OCR donne le meilleur taux de reconnaissance.
2. **Backend de prix** (indispensable pour les vrais prix multi-sites — les clés ne doivent pas être dans l'app) :
   - Cardmarket API (compte pro/partenaire requis),
   - TCGplayer API (accès développeur restreint),
   - CardTrader API (jeton gratuit avec un compte),
   - eBay Browse API (prix des annonces en cours ; ventes réalisées = accès Marketplace Insights restreint).
   Le backend agrège, met en cache (1×/jour) et stocke l'historique → graphiques d'évolution.
3. **Catalogues complets multi-langues** One Piece (JA/FR/ZH) et Riftbound (FR/ZH) :
   importer les listes officielles dans le backend, avec correspondance par code carte.
4. Comptes + synchronisation, listes (wishlist, decks, échanges), export CSV, mode sombre/clair.
5. Publication : comptes Apple Developer (99 $/an) et Google Play (25 $), icônes, politique de confidentialité.

## Points juridiques

Pokémon, One Piece et Riftbound sont des marques de leurs ayants droit (The Pokémon Company, Bandai,
Riot Games). Les images de cartes servent à l'identification ; ne pas utiliser leurs logos comme marque
de l'app, et respecter les conditions d'utilisation de chaque API et place de marché.
