import type { CardLang } from './types.ts';

export type AppLang = 'fr' | 'en';

const fr = {
  'tab.extensions': 'Extensions',
  'tab.search': 'Rechercher',
  'tab.scan': 'Scanner',
  'tab.home': 'Accueil',
  'tab.account': 'Compte',
  'title.collection': 'Ma collection',
  'title.card': 'Carte',
  'title.set': 'Extension',

  'common.all': 'Tous',
  'common.loading': 'Chargement…',
  'common.close': 'Fermer',
  'common.filterList': 'Filtrer la liste',
  'common.cards': '{n} carte|{n} cartes',
  'common.noResult': 'Aucune carte trouvée',
  'common.showMore': 'Afficher plus ({n} restantes)',
  'common.unavailable': 'Indisponible : {e}',

  'lang.cards': 'Langue des cartes',
  'lang.sets': 'Langue des extensions',
  'lang.app': "Langue de l'app",

  'search.placeholder.pokemon': 'Nom ou code (ex. Pikachu, M6 110)',
  'search.placeholder.onepiece': 'Nom ou code (ex. OP05-119)',
  'search.placeholder.riftbound': 'Nom de la carte',
  'search.bloc': 'Bloc',
  'search.allBlocs': 'Tous les blocs',
  'search.set': 'Extension',
  'search.allSets': 'Toutes les extensions',
  'search.rarity': 'Rareté',
  'search.allRarities': 'Toutes les raretés',
  'search.sort': 'Trier par',
  'search.hint': 'Tape un nom ou un code, ou choisis un bloc, une extension ou une rareté.',
  'facet.color': 'Couleur',
  'facet.category': 'Catégorie',
  'facet.domain': 'Domaine',
  'facet.type': 'Type',
  'sort.relevance': 'Pertinence',
  'sort.name': 'Nom (A→Z)',
  'sort.number': 'Numéro',
  'sort.price-desc': 'Prix décroissant',
  'sort.price-asc': 'Prix croissant',

  'ext.none': 'Aucune extension dans cette langue pour le moment.',
  'set.summary': '{code} · {n} cartes · {owned} possédée(s)',

  'card.add': 'Ajouter',
  'card.prices': 'Prix',
  'card.noPrice': 'Pas de prix automatique pour cette carte : consulte les sites ci-dessous.',
  'card.seeOn': 'Voir sur',

  'scan.frame': 'Place toute la carte dans le cadre',
  'scan.loadingAi': "Préparation de l'IA de reconnaissance…",
  'scan.downloadAi': "Téléchargement de l'IA… {p} %",
  'scan.searching': 'Recherche de la carte…',
  'scan.unsure': 'Pas certain : choisis la bonne carte',
  'scan.found': 'Carte reconnue',
  'scan.added': '{name} ajoutée — carte suivante !',
  'scan.addedCount': '{n} ajoutée(s) →',
  'scan.ignore': 'Ignorer et continuer',
  'scan.cameraNeeded': 'La caméra est nécessaire pour scanner tes cartes.',
  'scan.allowCamera': 'Autoriser la caméra',
  'scan.back': 'Retour',
  'scan.noIndex': "Reconnaissance par l'image indisponible (catalogue introuvable).",
  'scan.cameraTip': 'Astuce : dans Réglages › Safari › Appareil photo, choisis « Autoriser » pour ne plus avoir la question.',

  'dash.hello': 'Bonjour',
  'dash.empty': 'Ta collection est vide',
  'dash.emptyText': "Scanne tes cartes avec le bouton appareil photo, ou parcours les extensions pour les ajouter.",
  'dash.scan': 'Scanner une carte',
  'dash.browse': 'Parcourir les extensions',
  'dash.value': 'Valeur estimée de la collection',
  'dash.unpriced': '{n} carte(s) sans prix',
  'dash.cards': 'Cartes',
  'dash.unique': 'Cartes uniques',
  'dash.games': 'Jeux',
  'dash.byGame': 'Par jeu',
  'dash.top': 'Les plus précieuses',
  'dash.langs': 'Langues',
  'dash.rarities': 'Raretés',
  'dash.recent': 'Derniers ajouts',
  'dash.seeAll': 'Voir toute ma collection',
  'dash.note': 'Valeurs indicatives (Cardmarket, TCGplayer), converties dans ta devise au taux du jour.',

  'acc.trainer': 'Dresseur',
  'acc.inCollection': '{n} carte(s) dans la collection',
  'acc.profile': 'Profil',
  'acc.nickname': 'Ton pseudo',
  'acc.soon': "Bientôt : connexion (Apple, Google, e-mail) pour retrouver ta collection sur tous tes appareils. Pour l'instant, elle est enregistrée sur cet appareil uniquement.",
  'acc.prefs': 'Préférences',
  'acc.currency': 'Devise',
  'acc.defaultGame': 'Jeu par défaut',
  'acc.collection': 'Collection',
  'acc.see': 'Voir ma collection',
  'acc.clear': 'Vider la collection',
  'acc.clearConfirm': 'Supprimer toutes les cartes de la collection ?',
  'acc.footer': 'PokéMarket · données TCGdex, OPTCG API et Riftcodex. Pokémon, One Piece et Riftbound sont des marques de leurs ayants droit.',
  'coll.count': '{n} carte(s)',
  'coll.value': 'Valeur estimée : {v}',
  'coll.empty': 'Scanne ta première carte !',
};

type Key = keyof typeof fr;

const en: Record<Key, string> = {
  'tab.extensions': 'Sets',
  'tab.search': 'Search',
  'tab.scan': 'Scan',
  'tab.home': 'Home',
  'tab.account': 'Account',
  'title.collection': 'My collection',
  'title.card': 'Card',
  'title.set': 'Set',

  'common.all': 'All',
  'common.loading': 'Loading…',
  'common.close': 'Close',
  'common.filterList': 'Filter the list',
  'common.cards': '{n} card|{n} cards',
  'common.noResult': 'No card found',
  'common.showMore': 'Show more ({n} left)',
  'common.unavailable': 'Unavailable: {e}',

  'lang.cards': 'Card language',
  'lang.sets': 'Set language',
  'lang.app': 'App language',

  'search.placeholder.pokemon': 'Name or code (e.g. Pikachu, M6 110)',
  'search.placeholder.onepiece': 'Name or code (e.g. OP05-119)',
  'search.placeholder.riftbound': 'Card name',
  'search.bloc': 'Series',
  'search.allBlocs': 'All series',
  'search.set': 'Set',
  'search.allSets': 'All sets',
  'search.rarity': 'Rarity',
  'search.allRarities': 'All rarities',
  'search.sort': 'Sort by',
  'search.hint': 'Type a name or a code, or pick a series, a set or a rarity.',
  'facet.color': 'Color',
  'facet.category': 'Category',
  'facet.domain': 'Domain',
  'facet.type': 'Type',
  'sort.relevance': 'Relevance',
  'sort.name': 'Name (A→Z)',
  'sort.number': 'Number',
  'sort.price-desc': 'Price: high to low',
  'sort.price-asc': 'Price: low to high',

  'ext.none': 'No set in this language yet.',
  'set.summary': '{code} · {n} cards · {owned} owned',

  'card.add': 'Add',
  'card.prices': 'Prices',
  'card.noPrice': 'No automatic price for this card: check the sites below.',
  'card.seeOn': 'See on',

  'scan.frame': 'Fit the whole card in the frame',
  'scan.loadingAi': 'Getting the recognition AI ready…',
  'scan.downloadAi': 'Downloading the AI… {p} %',
  'scan.searching': 'Looking for the card…',
  'scan.unsure': 'Not sure: pick the right card',
  'scan.found': 'Card recognized',
  'scan.added': '{name} added — next card!',
  'scan.addedCount': '{n} added →',
  'scan.ignore': 'Ignore and continue',
  'scan.cameraNeeded': 'The camera is needed to scan your cards.',
  'scan.allowCamera': 'Allow camera',
  'scan.back': 'Back',
  'scan.noIndex': 'Image recognition unavailable (catalog not found).',
  'scan.cameraTip': 'Tip: in Settings › Safari › Camera, choose “Allow” to stop being asked.',

  'dash.hello': 'Hello',
  'dash.empty': 'Your collection is empty',
  'dash.emptyText': 'Scan your cards with the camera button, or browse the sets to add them.',
  'dash.scan': 'Scan a card',
  'dash.browse': 'Browse sets',
  'dash.value': 'Estimated collection value',
  'dash.unpriced': '{n} card(s) without a price',
  'dash.cards': 'Cards',
  'dash.unique': 'Unique cards',
  'dash.games': 'Games',
  'dash.byGame': 'By game',
  'dash.top': 'Most valuable',
  'dash.langs': 'Languages',
  'dash.rarities': 'Rarities',
  'dash.recent': 'Recently added',
  'dash.seeAll': 'See my whole collection',
  'dash.note': "Indicative values (Cardmarket, TCGplayer), converted to your currency at today's rate.",

  'acc.trainer': 'Trainer',
  'acc.inCollection': '{n} card(s) in the collection',
  'acc.profile': 'Profile',
  'acc.nickname': 'Your nickname',
  'acc.soon': 'Coming soon: sign-in (Apple, Google, email) to find your collection on all your devices. For now it is saved on this device only.',
  'acc.prefs': 'Preferences',
  'acc.currency': 'Currency',
  'acc.defaultGame': 'Default game',
  'acc.collection': 'Collection',
  'acc.see': 'See my collection',
  'acc.clear': 'Empty the collection',
  'acc.clearConfirm': 'Remove every card from the collection?',
  'acc.footer': 'PokéMarket · data from TCGdex, OPTCG API and Riftcodex. Pokémon, One Piece and Riftbound are trademarks of their owners.',
  'coll.count': '{n} card(s)',
  'coll.value': 'Estimated value: {v}',
  'coll.empty': 'Scan your first card!',
};

const DICT: Record<AppLang, Record<Key, string>> = { fr, en };

export type TKey = Key;
export type T = (key: TKey, vars?: Record<string, string | number>) => string;

/** Traduction ; « a|b » choisit le singulier ou le pluriel selon {n}. */
export function translate(lang: AppLang, key: TKey, vars: Record<string, string | number> = {}): string {
  let s = DICT[lang][key] ?? DICT.fr[key] ?? key;
  if (s.includes('|')) {
    const [one, many] = s.split('|');
    s = Number(vars.n) > 1 ? many : one;
  }
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

export const LANG_LABELS: Record<AppLang, Record<CardLang, string>> = {
  fr: {
    fr: 'Français', en: 'Anglais', ja: 'Japonais', de: 'Allemand', es: 'Espagnol', it: 'Italien', pt: 'Portugais',
    ko: 'Coréen', 'zh-tw': 'Chinois trad.', 'zh-cn': 'Chinois simpl.', id: 'Indonésien', th: 'Thaï',
  },
  en: {
    fr: 'French', en: 'English', ja: 'Japanese', de: 'German', es: 'Spanish', it: 'Italian', pt: 'Portuguese',
    ko: 'Korean', 'zh-tw': 'Chinese (trad.)', 'zh-cn': 'Chinese (simpl.)', id: 'Indonesian', th: 'Thai',
  },
};
