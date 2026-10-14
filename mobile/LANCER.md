# Installer l'app sur son téléphone (sans être développeur)

L'app est fabriquée **dans le cloud par Expo** (gratuit), puis installée sur le téléphone.
Il faut un ordinateur (Windows ou Mac) uniquement pour lancer la fabrication.
**iPhone + Mac : allez directement à la section « iPhone avec un Mac ».** Comptez 30 minutes la première fois.

## Le plus simple : la version web (gratuit, tout téléphone)

1. Sur l'iPhone, ouvrir **Safari** à l'adresse https://bananaintrouble.github.io/tcgmarket/app/
2. Toucher le bouton **Partager** (carré avec une flèche), puis **Sur l'écran d'accueil**.
3. Ouvrir **PokéMarket** depuis l'écran d'accueil et autoriser la caméra pour scanner.

Sur Android : ouvrir l'adresse dans Chrome, menu ⋮ → **Ajouter à l'écran d'accueil**.

Les sections suivantes servent à fabriquer la vraie app (App Store / Play Store).

## 1. Préparer l'ordinateur (une seule fois)

1. Installer **Node.js** : sur https://nodejs.org, télécharger la version « LTS » et l'installer (Suivant, Suivant…).
2. Créer un compte gratuit sur **https://expo.dev** (bouton *Sign up*). Notez l'e-mail et le mot de passe.
3. Télécharger le projet : sur https://github.com/BananaInTrouble/tcgmarket, bouton vert **Code** → **Download ZIP**,
   puis décompresser le fichier (clic droit → *Extraire tout* sur Windows, double-clic sur Mac).

## 2. Ouvrir un terminal dans le dossier `mobile`

- **Windows** : ouvrir le dossier décompressé, puis le dossier `mobile`. Cliquer dans la barre d'adresse en haut,
  taper `cmd` et appuyer sur Entrée. Une fenêtre noire s'ouvre, déjà placée dans le bon dossier.
- **Mac** : ouvrir l'app **Terminal**, taper `cd ` (avec un espace), glisser le dossier `mobile` dans la fenêtre, appuyer sur Entrée.

## 3. Fabriquer l'app Android

Taper ces commandes une par une (Entrée après chacune, attendre la fin avant la suivante) :

```
npm install
npx eas-cli login
npx eas-cli build --profile preview --platform android
```

- `login` demande l'e-mail et le mot de passe Expo.
- Pendant le `build`, répondre **Y** (oui) à toutes les questions (créer le projet, générer la clé Android…).
- La fabrication prend 10 à 20 minutes. À la fin, un **lien** et un **QR code** s'affichent
  (on les retrouve aussi sur https://expo.dev, rubrique *Builds*).

## 4. Installer sur le téléphone Android

1. Scanner le QR code avec l'appareil photo du téléphone (ou ouvrir le lien).
2. Télécharger le fichier `.apk` et l'ouvrir.
3. Si Android bloque : autoriser l'installation « depuis cette source » (le téléphone propose le réglage).
4. Ouvrir **TCG Scanner**, autoriser la caméra, et scanner une carte.

## iPhone avec un Mac (gratuit)

L'app est fabriquée directement sur le Mac puis installée sur l'iPhone branché en USB.
Avec un identifiant Apple gratuit, l'app fonctionne **7 jours** ; il suffit ensuite de refaire l'étape 5.

1. **Xcode** : l'installer depuis l'App Store du Mac (gros téléchargement, prévoir 30 à 60 min).
   L'ouvrir une fois, accepter la licence et laisser installer les composants iOS proposés.
   Puis menu **Xcode → Réglages → Comptes → +** et ajouter votre identifiant Apple.
2. **Node.js** : installer la version « LTS » depuis https://nodejs.org.
3. **Le projet** : sur https://github.com/BananaInTrouble/tcgmarket, bouton vert **Code → Download ZIP**,
   puis double-cliquer sur le ZIP pour le décompresser.
4. **L'iPhone** : le brancher au Mac en USB, le déverrouiller et toucher **Se fier à cet ordinateur**.
5. **Fabriquer et installer** : ouvrir l'app **Terminal**, taper `cd ` (avec un espace), glisser le dossier `mobile`
   dans la fenêtre, appuyer sur Entrée, puis taper ces commandes une par une :

   ```
   npm install
   npx expo run:ios --device --configuration Release
   ```

   - Choisir votre iPhone dans la liste (flèches du clavier puis Entrée).
   - Si on vous propose d'installer **CocoaPods**, répondre **Y** (oui). Le mot de passe demandé est celui du Mac.
   - Si on vous demande une équipe de signature (*team*), choisir celle à votre nom (*Personal Team*).
   - La première fabrication prend 10 à 20 minutes.
6. **Première ouverture** : si l'iPhone affiche « Développeur non approuvé », aller dans
   **Réglages → Général → VPN et gestion de l'appareil**, toucher votre identifiant Apple puis **Faire confiance**.
   Si l'iPhone demande d'activer le **Mode développeur** : **Réglages → Confidentialité et sécurité → Mode développeur**,
   l'activer et redémarrer.

« Release » met tout le contenu dans l'app : elle fonctionne ensuite sans le Mac.

## iPhone sans Mac

Il faut un **compte Apple Developer** (99 $/an, https://developer.apple.com), qui permettra aussi de publier
sur l'App Store : `npx eas-cli build --profile preview --platform ios` depuis n'importe quel ordinateur,
Expo guide l'enregistrement de l'iPhone.

## En cas de problème

Copiez le message d'erreur (ou faites une capture d'écran) et envoyez-le-moi.
