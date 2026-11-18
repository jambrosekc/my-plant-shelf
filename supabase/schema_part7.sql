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
