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
