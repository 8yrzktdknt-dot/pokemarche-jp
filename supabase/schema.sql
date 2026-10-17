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

-- Profil public (lien « …/app/u/pseudo ») : désactivé par défaut. Lecture par tous, sans compte, par la fonction
-- public_profile : pseudo, photo, collection (sans les prix payés, ni ceux de chaque exemplaire) et cartes recherchées
-- (sans les prix cibles).
alter table public.profiles add column if not exists is_public boolean not null default false;

create or replace function public.public_profile(name text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'username', p.username,
    'since', p.created_at,
    'avatar', c.settings -> 'avatar',
    'collection', coalesce((select jsonb_agg(case when jsonb_typeof(e -> 'copies') = 'array'
        then jsonb_set(e - 'paid' - 'paidCurrency', '{copies}', coalesce((select jsonb_agg(x - 'paid' - 'paidCurrency') from jsonb_array_elements(e -> 'copies') x), '[]'::jsonb))
        else e - 'paid' - 'paidCurrency' end) from jsonb_array_elements(c.data) e), '[]'::jsonb),
    'wishlist', coalesce((select jsonb_agg(jsonb_build_object('card', w -> 'card')) from jsonb_array_elements(coalesce(c.settings -> 'wishlist', '[]'::jsonb)) w), '[]'::jsonb)
  )
  from public.profiles p
  left join public.collections c on c.user_id = p.user_id
  where p.username = lower(name) and p.is_public;
$$;
grant execute on function public.public_profile(text) to anon, authenticated;

-- Notifications sur le téléphone (Web Push), même appli fermée : un abonnement par appareil. Le robot qui met les
-- prix à jour (GitHub, tools/push/send.mjs) lit les abonnements et les listes de souhaits avec prix cible par
-- push_targets, protégée par un jeton dont seule l'empreinte figure ici (le jeton vient de la clé privée VAPID,
-- secret GitHub). Aucune lecture directe de la table : seulement ces fonctions.
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  lang text,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;

create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_lang text)
returns void language sql volatile security definer set search_path = '' as $$
  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth, lang)
  select p_endpoint, (select auth.uid()), p_p256dh, p_auth, p_lang where (select auth.uid()) is not null
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, lang = excluded.lang;
$$;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

create or replace function public.delete_push_subscription(p_endpoint text)
returns void language sql volatile security definer set search_path = '' as $$
  delete from public.push_subscriptions s where s.endpoint = p_endpoint and s.user_id = (select auth.uid());
$$;
grant execute on function public.delete_push_subscription(text) to authenticated;

create or replace function public.push_targets(token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if encode(sha256(convert_to(token, 'UTF8')), 'hex') <> '807d2d410571679501962a5d91e618669f456c71120933f0f05cbff4f8ca1719' then
    raise exception 'forbidden';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'user', s.user_id, 'endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth, 'lang', s.lang,
      'wishlist', coalesce((select jsonb_agg(w) from jsonb_array_elements(coalesce(c.settings -> 'wishlist', '[]'::jsonb)) w
        where jsonb_typeof(w -> 'target') = 'number'), '[]'::jsonb)))
    from public.push_subscriptions s
    left join public.collections c on c.user_id = s.user_id
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.push_targets(text) from public;
grant execute on function public.push_targets(text) to anon;

create or replace function public.push_forget(token text, p_endpoint text)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if encode(sha256(convert_to(token, 'UTF8')), 'hex') <> '807d2d410571679501962a5d91e618669f456c71120933f0f05cbff4f8ca1719' then
    raise exception 'forbidden';
  end if;
  delete from public.push_subscriptions s where s.endpoint = p_endpoint;
end;
$$;
revoke all on function public.push_forget(text, text) from public;
grant execute on function public.push_forget(text, text) to anon;
