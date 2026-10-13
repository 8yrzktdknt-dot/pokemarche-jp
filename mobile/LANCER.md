# Installer l'app sur son téléphone (sans être développeur)

L'app est fabriquée **dans le cloud par Expo** (gratuit), puis installée sur le téléphone.
Il faut un ordinateur (Windows ou Mac) uniquement pour lancer la fabrication. Comptez 30 minutes la première fois.

## 1. Préparer l'ordinateur (une seule fois)

1. Installer **Node.js** : sur https://nodejs.org, télécharger la version « LTS » et l'installer (Suivant, Suivant…).
2. Créer un compte gratuit sur **https://expo.dev** (bouton *Sign up*). Notez l'e-mail et le mot de passe.
3. Télécharger le projet : sur https://github.com/8yrzktdknt-dot/pokemarche-jp, bouton vert **Code** → **Download ZIP**,
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

## iPhone

Apple n'autorise pas l'installation libre d'apps. Deux possibilités :

- **Compte Apple Developer** (99 $/an, https://developer.apple.com) : même procédure avec
  `npx eas-cli build --profile preview --platform ios` ; Expo guide l'enregistrement de l'iPhone.
  C'est aussi ce compte qui permettra de publier sur l'App Store.
- **Un Mac avec Xcode** (gratuit) : l'app s'installe sur l'iPhone branché en USB, mais doit être réinstallée tous les 7 jours.

## En cas de problème

Copiez le message d'erreur (ou faites une capture d'écran) et envoyez-le-moi.
