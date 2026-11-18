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
