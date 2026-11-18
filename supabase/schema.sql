-- My Plant Shelf: database setup.
-- Paste this whole file into Supabase > SQL Editor > New query, then press Run.
-- Safe to run more than once.

-- 1. One profile per person (holds the shelf name)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  shelf_name text not null default 'My Shelf',
  created_at timestamptz not null default now()
);

-- 2. Plants. Every row belongs to one user.
create table if not exists public.plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plant_id text,
  plant_name text not null,
  genus text,
  species text,
  cultivar text,
  variant text,
  seller_name text,
  sourced_from text,
  purchase_date date,
  purchase_price numeric,
  order_id text,
  purchase_stage text,
  grown_from text,
  lineage text,
  soil_likes text,
  ph text,
  light text,
  watering_needs text,
  soil_medium text,
  temp numeric,
  humidity numeric,
  last_watered date,
  water_every_days integer,
  have_it boolean not null default false,
  labeled boolean not null default false,
  shipping boolean not null default false,
  to_print boolean not null default false,
  to_repot boolean not null default false,
  to_water boolean not null default false,
  notes text,
  for_sale boolean not null default false,
  asking_price numeric,
  sold boolean not null default false,
  sold_date date,
  sold_price numeric,
  sold_to text,
  sale_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plants_user_idx on public.plants(user_id);

-- 3. Each person can only see and change their own rows
alter table public.profiles enable row level security;
alter table public.plants enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own plants" on public.plants;
create policy "own plants" on public.plants
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4. Make a profile automatically when someone signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, shelf_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'shelf_name', ''), 'My Shelf'))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Give each new plant the next Plant ID (P0001, P0002, ...) if none was supplied
create or replace function public.assign_plant_id()
returns trigger language plpgsql as $$
declare n integer;
begin
  if new.plant_id is null or new.plant_id = '' then
    select coalesce(max(substring(plant_id from 2)::integer), 0) + 1 into n
    from public.plants
    where user_id = new.user_id and plant_id ~ '^P[0-9]+$';
    new.plant_id := 'P' || lpad(n::text, 4, '0');
  end if;
  return new;
end $$;

drop trigger if exists plants_assign_id on public.plants;
create trigger plants_assign_id
  before insert on public.plants
  for each row execute function public.assign_plant_id();

-- 6. Keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists plants_touch on public.plants;
create trigger plants_touch
  before update on public.plants
  for each row execute function public.touch_updated_at();
-- Part 3: public sharing (private by default).
-- In the SQL Editor choose New query, select all, paste, Run. Safe to run more than once.

alter table public.profiles add column if not exists is_public boolean not null default false;
alter table public.profiles add column if not exists show_prices boolean not null default false;
alter table public.profiles add column if not exists public_slug text;

update public.profiles
  set public_slug = substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)
  where public_slug is null;

alter table public.profiles
  alter column public_slug set default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);

create unique index if not exists profiles_public_slug_idx on public.profiles(public_slug);

-- The public page reads through this function only. It returns safe columns,
-- never seller, order id or notes, and hides what you paid unless show_prices is on.
create or replace function public.get_public_shelf(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  prof record;
  result jsonb;
begin
  select id, shelf_name, show_prices into prof
  from public.profiles
  where public_slug = p_slug and is_public = true;

  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'shelf_name', prof.shelf_name,
    'show_prices', prof.show_prices,
    'plants', coalesce(jsonb_agg(jsonb_build_object(
      'plant_name', p.plant_name,
      'genus', p.genus,
      'species', p.species,
      'cultivar', p.cultivar,
      'variant', p.variant,
      'purchase_stage', p.purchase_stage,
      'have_it', p.have_it,
      'shipping', p.shipping,
      'for_sale', p.for_sale,
      'sold', p.sold,
      'asking_price', p.asking_price,
      'purchase_price', case when prof.show_prices then p.purchase_price else null end
    ) order by p.plant_name), '[]'::jsonb)
  ) into result
  from public.plants p
  where p.user_id = prof.id;

  return result;
end $$;

revoke all on function public.get_public_shelf(text) from public;
grant execute on function public.get_public_shelf(text) to anon, authenticated;

-- Part 4: choose what visitors can see on your public page.
-- In the SQL Editor choose New query, select all, paste, Run. Safe to run more than once.
-- Everything new is OFF by default, so nothing becomes public until you turn it on.

alter table public.profiles add column if not exists show_seller boolean not null default false;
alter table public.profiles add column if not exists show_soil boolean not null default false;
alter table public.profiles add column if not exists show_conditions boolean not null default false;
alter table public.profiles add column if not exists show_lineage boolean not null default false;
alter table public.profiles add column if not exists show_notes boolean not null default false;

create or replace function public.get_public_shelf(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  prof record;
  result jsonb;
begin
  select id, shelf_name, show_prices, show_seller, show_soil, show_conditions, show_lineage, show_notes into prof
  from public.profiles
  where public_slug = p_slug and is_public = true;

  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'shelf_name', prof.shelf_name,
    'show_prices', prof.show_prices,
    'plants', coalesce(jsonb_agg(jsonb_build_object(
      'plant_name', p.plant_name,
      'genus', p.genus,
      'species', p.species,
      'cultivar', p.cultivar,
      'variant', p.variant,
      'purchase_stage', p.purchase_stage,
      'have_it', p.have_it,
      'shipping', p.shipping,
      'for_sale', p.for_sale,
      'sold', p.sold,
      'asking_price', p.asking_price,
      'purchase_price', case when prof.show_prices then p.purchase_price else null end,
      'seller_name', case when prof.show_seller then p.seller_name else null end,
      'sourced_from', case when prof.show_seller then p.sourced_from else null end,
      'soil_medium', case when prof.show_soil then p.soil_medium else null end,
      'soil_likes', case when prof.show_soil then p.soil_likes else null end,
      'ph', case when prof.show_soil then p.ph else null end,
      'light', case when prof.show_conditions then p.light else null end,
      'temp', case when prof.show_conditions then p.temp else null end,
      'humidity', case when prof.show_conditions then p.humidity else null end,
      'watering_needs', case when prof.show_conditions then p.watering_needs else null end,
      'last_watered', case when prof.show_conditions then p.last_watered else null end,
      'water_every_days', case when prof.show_conditions then p.water_every_days else null end,
      'grown_from', case when prof.show_lineage then p.grown_from else null end,
      'lineage', case when prof.show_lineage then p.lineage else null end,
      'notes', case when prof.show_notes then p.notes else null end
    ) order by p.plant_name), '[]'::jsonb)
  ) into result
  from public.plants p
  where p.user_id = prof.id;

  return result;
end $$;

revoke all on function public.get_public_shelf(text) from public;
grant execute on function public.get_public_shelf(text) to anon, authenticated;

-- Part 5: plant photos.
-- In the SQL Editor choose New query, select all, paste, Run. Safe to run more than once.
-- Photos are off on the public page until you switch "Show photos" on in the Share tab.

alter table public.profiles add column if not exists show_photos boolean not null default false;

-- Storage bucket. Files are named user-id/plant-id/random-id.jpg, so the links cannot be guessed.
insert into storage.buckets (id, name, public)
values ('plant-photos', 'plant-photos', true)
on conflict (id) do nothing;

drop policy if exists "photos upload own folder" on storage.objects;
create policy "photos upload own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'plant-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "photos delete own folder" on storage.objects;
create policy "photos delete own folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'plant-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- One row per photo.
create table if not exists public.plant_photos (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  path text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists plant_photos_plant_idx on public.plant_photos(plant_id);

alter table public.plant_photos enable row level security;
drop policy if exists "own photos" on public.plant_photos;
create policy "own photos" on public.plant_photos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Public page function: now also returns photo paths when show_photos is on.
create or replace function public.get_public_shelf(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  prof record;
  result jsonb;
begin
  select id, shelf_name, show_prices, show_seller, show_soil, show_conditions, show_lineage, show_notes, show_photos into prof
  from public.profiles
  where public_slug = p_slug and is_public = true;

  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'shelf_name', prof.shelf_name,
    'show_prices', prof.show_prices,
    'plants', coalesce(jsonb_agg(jsonb_build_object(
      'plant_name', p.plant_name,
      'genus', p.genus,
      'species', p.species,
      'cultivar', p.cultivar,
      'variant', p.variant,
      'purchase_stage', p.purchase_stage,
      'have_it', p.have_it,
      'shipping', p.shipping,
      'for_sale', p.for_sale,
      'sold', p.sold,
      'asking_price', p.asking_price,
      'purchase_price', case when prof.show_prices then p.purchase_price else null end,
      'seller_name', case when prof.show_seller then p.seller_name else null end,
      'sourced_from', case when prof.show_seller then p.sourced_from else null end,
      'soil_medium', case when prof.show_soil then p.soil_medium else null end,
      'soil_likes', case when prof.show_soil then p.soil_likes else null end,
      'ph', case when prof.show_soil then p.ph else null end,
      'light', case when prof.show_conditions then p.light else null end,
      'temp', case when prof.show_conditions then p.temp else null end,
      'humidity', case when prof.show_conditions then p.humidity else null end,
      'watering_needs', case when prof.show_conditions then p.watering_needs else null end,
      'last_watered', case when prof.show_conditions then p.last_watered else null end,
      'water_every_days', case when prof.show_conditions then p.water_every_days else null end,
      'grown_from', case when prof.show_lineage then p.grown_from else null end,
      'lineage', case when prof.show_lineage then p.lineage else null end,
      'notes', case when prof.show_notes then p.notes else null end,
      'photos', case when prof.show_photos then
        (select coalesce(jsonb_agg(ph.path order by ph.position, ph.created_at), '[]'::jsonb) from public.plant_photos ph where ph.plant_id = p.id)
        else '[]'::jsonb end
    ) order by p.plant_name), '[]'::jsonb)
  ) into result
  from public.plants p
  where p.user_id = prof.id;

  return result;
end $$;

revoke all on function public.get_public_shelf(text) from public;
grant execute on function public.get_public_shelf(text) to anon, authenticated;
-- Part 6: the "what to show" switches + pick your username at sign-up (it becomes your public link).
-- In the SQL Editor choose New query, select all, paste, Run. Safe to run more than once.
-- This does NOT replace the public-page function, so photos keep working. Skip Part 4.

alter table public.profiles add column if not exists show_seller boolean not null default false;
alter table public.profiles add column if not exists show_soil boolean not null default false;
alter table public.profiles add column if not exists show_conditions boolean not null default false;
alter table public.profiles add column if not exists show_lineage boolean not null default false;
alter table public.profiles add column if not exists show_notes boolean not null default false;
alter table public.profiles add column if not exists show_photos boolean not null default false;

-- Lets the sign-up form check a username before the account exists.
create or replace function public.username_available(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profiles where public_slug = lower(p_name));
$$;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- New accounts use the username they picked as their public link, if it is valid and free.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  slug text := regexp_replace(lower(coalesce(new.raw_user_meta_data->>'username', '')), '[^a-z0-9_-]', '', 'g');
  nm text := coalesce(nullif(new.raw_user_meta_data->>'shelf_name', ''), 'My Shelf');
begin
  if length(slug) >= 3 and length(slug) <= 30
     and not exists (select 1 from public.profiles where public_slug = slug) then
    insert into public.profiles (id, shelf_name, public_slug) values (new.id, nm, slug)
    on conflict (id) do nothing;
  else
    insert into public.profiles (id, shelf_name) values (new.id, nm)
    on conflict (id) do nothing;
  end if;
  return new;
end $$;
-- Part 7: Discover public shelves, follow people, heart plants, see your favorites.
-- In the SQL Editor choose New query, select all, paste, Run. Safe to run more than once.
-- Run Part 6 first if you have not. Nothing new is shown about anyone unless their shelf is already public.

create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id)
);
alter table public.follows enable row level security;
drop policy if exists "own follows" on public.follows;
create policy "own follows" on public.follows
  for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);

create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  plant_id uuid not null references public.plants(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, plant_id)
);
alter table public.favorites enable row level security;
drop policy if exists "own favorites" on public.favorites;
create policy "own favorites" on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Every public shelf, for the Discover screen.
create or replace function public.list_public_shelves()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'owner_id', pr.id,
    'slug', pr.public_slug,
    'shelf_name', pr.shelf_name,
    'plant_count', (select count(*) from public.plants p where p.user_id = pr.id),
    'for_sale', (select count(*) from public.plants p where p.user_id = pr.id and p.for_sale and not p.sold),
    'followers', (select count(*) from public.follows f where f.followed_id = pr.id),
    'following', exists (select 1 from public.follows f where f.followed_id = pr.id and f.follower_id = auth.uid())
  ) order by pr.shelf_name), '[]'::jsonb)
  from public.profiles pr
  where pr.is_public = true;
$$;
revoke all on function public.list_public_shelves() from public;
grant execute on function public.list_public_shelves() to anon, authenticated;

-- Plants you hearted (only ones on shelves that are still public).
create or replace function public.list_my_favorites()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'uid', p.id,
    'plant_name', p.plant_name,
    'genus', p.genus,
    'purchase_stage', p.purchase_stage,
    'for_sale', p.for_sale,
    'sold', p.sold,
    'asking_price', p.asking_price,
    'slug', pr.public_slug,
    'shelf_name', pr.shelf_name,
    'photo', case when pr.show_photos then
      (select ph.path from public.plant_photos ph where ph.plant_id = p.id order by ph.position, ph.created_at limit 1)
      else null end
  ) order by f.created_at desc), '[]'::jsonb)
  from public.favorites f
  join public.plants p on p.id = f.plant_id
  join public.profiles pr on pr.id = p.user_id
  where f.user_id = auth.uid() and pr.is_public = true;
$$;
revoke all on function public.list_my_favorites() from public;
grant execute on function public.list_my_favorites() to authenticated;

-- Public page function: now also returns the owner id and each plant's id (needed for follow and heart).
create or replace function public.get_public_shelf(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  prof record;
  result jsonb;
begin
  select id, shelf_name, show_prices, show_seller, show_soil, show_conditions, show_lineage, show_notes, show_photos into prof
  from public.profiles
  where public_slug = p_slug and is_public = true;

  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'owner_id', prof.id,
    'shelf_name', prof.shelf_name,
    'show_prices', prof.show_prices,
    'plants', coalesce(jsonb_agg(jsonb_build_object(
      'uid', p.id,
      'plant_name', p.plant_name,
      'genus', p.genus,
      'species', p.species,
      'cultivar', p.cultivar,
      'variant', p.variant,
      'purchase_stage', p.purchase_stage,
      'have_it', p.have_it,
      'shipping', p.shipping,
      'for_sale', p.for_sale,
      'sold', p.sold,
      'asking_price', p.asking_price,
      'purchase_price', case when prof.show_prices then p.purchase_price else null end,
      'seller_name', case when prof.show_seller then p.seller_name else null end,
      'sourced_from', case when prof.show_seller then p.sourced_from else null end,
      'soil_medium', case when prof.show_soil then p.soil_medium else null end,
      'soil_likes', case when prof.show_soil then p.soil_likes else null end,
      'ph', case when prof.show_soil then p.ph else null end,
      'light', case when prof.show_conditions then p.light else null end,
      'temp', case when prof.show_conditions then p.temp else null end,
      'humidity', case when prof.show_conditions then p.humidity else null end,
      'watering_needs', case when prof.show_conditions then p.watering_needs else null end,
      'last_watered', case when prof.show_conditions then p.last_watered else null end,
      'water_every_days', case when prof.show_conditions then p.water_every_days else null end,
      'grown_from', case when prof.show_lineage then p.grown_from else null end,
      'lineage', case when prof.show_lineage then p.lineage else null end,
      'notes', case when prof.show_notes then p.notes else null end,
      'photos', case when prof.show_photos then
        (select coalesce(jsonb_agg(ph.path order by ph.position, ph.created_at), '[]'::jsonb) from public.plant_photos ph where ph.plant_id = p.id)
        else '[]'::jsonb end
    ) order by p.plant_name), '[]'::jsonb)
  ) into result
  from public.plants p
  where p.user_id = prof.id;

  return result;
end $$;

revoke all on function public.get_public_shelf(text) from public;
grant execute on function public.get_public_shelf(text) to anon, authenticated;
