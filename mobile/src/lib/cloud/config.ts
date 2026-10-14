/**
 * Projet Supabase (comptes et sauvegarde des collections). L'adresse et la clé « publishable » sont publiques
 * par conception : la base n'autorise chaque utilisateur qu'à lire et écrire ses propres données (règles RLS,
 * voir supabase/schema.sql). Vides tant que le projet n'est pas créé : l'app reste alors sans compte.
 */
export const SUPABASE_URL = '';
export const SUPABASE_KEY = '';

/** Fournisseurs de connexion activés dans le projet (Apple : abonnement Apple Developer requis). */
export const PROVIDERS = { email: true, google: true, apple: false };

export const cloudEnabled = () => !!SUPABASE_URL && !!SUPABASE_KEY;
