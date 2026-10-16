/**
 * Projet Supabase (comptes et sauvegarde des collections). L'adresse et la clé « publishable » sont publiques
 * par conception : la base n'autorise chaque utilisateur qu'à lire et écrire ses propres données (règles RLS,
 * voir supabase/schema.sql). Vides tant que le projet n'est pas créé : l'app reste alors sans compte.
 */
export const SUPABASE_URL = 'https://pobettqrcmaqqtwvidlf.supabase.co';
export const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvYmV0dHFyY21hcXF0d3ZpZGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5Nzg0NzgsImV4cCI6MjEwNzU1NDQ3OH0.mBamLEvUqFob7-_CCwr44Y9WCSYDTgwfudQ_6TtPvnE';

/** Fournisseurs de connexion proposés : e-mail et mot de passe seulement (Google, Apple : désactivés). */
export const PROVIDERS = { email: true, google: false, apple: false };

export const cloudEnabled = () => !!SUPABASE_URL && !!SUPABASE_KEY;
