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
