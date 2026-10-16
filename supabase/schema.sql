-- TCGMarket : sauvegarde de la collection de chaque compte (Supabase → SQL Editor → coller → Run).
-- Une ligne par utilisateur ; chacun ne peut lire et modifier que la sienne.

create table if not exists public.collections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '[]'::jsonb,
  settings jsonb,
  updated_at timestamptz not null default now()
);

alter table public.collections enable row level security;

drop policy if exists "lire sa collection" on public.collections;
create policy "lire sa collection" on public.collections
  for select using ((select auth.uid()) = user_id);

drop policy if exists "créer sa collection" on public.collections;
create policy "créer sa collection" on public.collections
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "modifier sa collection" on public.collections;
create policy "modifier sa collection" on public.collections
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Signalements « Signaler un problème » : tout le monde peut en envoyer, personne ne peut les relire depuis l'app
-- (lecture depuis le tableau de bord Supabase : Table Editor → reports).
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  topic text,
  message text not null,
  email text,
  card jsonb,
  version text,
  app_lang text,
  user_id uuid default auth.uid()
);
alter table public.reports enable row level security;
drop policy if exists "envoyer un signalement" on public.reports;
create policy "envoyer un signalement" on public.reports
  for insert to anon, authenticated with check (char_length(message) between 1 and 5000);

-- Pseudos (« @pseudo ») : un par compte, unique, 3 à 20 caractères (lettres minuscules, chiffres, « _ » et « . »).
-- Chacun lit et modifie le sien ; la disponibilité d'un pseudo se vérifie sans voir les autres comptes.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_.]{3,20}$'),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "lire son profil" on public.profiles;
create policy "lire son profil" on public.profiles
  for select using ((select auth.uid()) = user_id);
drop policy if exists "créer son profil" on public.profiles;
create policy "créer son profil" on public.profiles
  for insert with check ((select auth.uid()) = user_id);
drop policy if exists "modifier son profil" on public.profiles;
create policy "modifier son profil" on public.profiles
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function public.username_available(name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profiles where username = lower(name));
$$;
grant execute on function public.username_available(text) to anon, authenticated;

-- À la création du compte, le pseudo choisi (métadonnée « username ») devient son profil ; un pseudo déjà pris
-- fait échouer l'inscription (aucun compte n'est créé).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.raw_user_meta_data ? 'username' then
    insert into public.profiles (user_id, username) values (new.id, lower(new.raw_user_meta_data ->> 'username'));
  end if;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
