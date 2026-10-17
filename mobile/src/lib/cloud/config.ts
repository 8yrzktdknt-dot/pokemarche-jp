/**
 * Projet Supabase (comptes et sauvegarde des collections). L'adresse et la clé « publishable » sont publiques
 * par conception : la base n'autorise chaque utilisateur qu'à lire et écrire ses propres données (règles RLS,
 * voir supabase/schema.sql). Vides tant que le projet n'est pas créé : l'app reste alors sans compte.
 */
export const SUPABASE_URL = 'https://pobettqrcmaqqtwvidlf.supabase.co';
export const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvYmV0dHFyY21hcXF0d3ZpZGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5Nzg0NzgsImV4cCI6MjEwNzU1NDQ3OH0.mBamLEvUqFob7-_CCwr44Y9WCSYDTgwfudQ_6TtPvnE';

/** Fournisseurs de connexion activés dans le projet (Apple : abonnement Apple Developer requis). */
export const PROVIDERS = { email: true, google: true, apple: false };

export const cloudEnabled = () => !!SUPABASE_URL && !!SUPABASE_KEY;

/**
 * Clé publique des notifications (Web Push, norme VAPID) : publique par conception. La clé privée qui va avec n'est
 * connue que du robot d'envoi (secret GitHub VAPID_PRIVATE_KEY, voir tools/push/send.mjs).
 */
export const PUSH_PUBLIC_KEY = 'BNgW7V70tMAKXs2ClHRpHeiACvaWk9mPCxzgWksGokb2m8amJpKud5VXCzerPmsMDhjQMyGf1oDRx5O_4k0r8Rk';
