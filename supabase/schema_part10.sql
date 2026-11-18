-- Part 10: two switches. "Profile visible" (on by default) lets other collectors find and follow you in Discover.
-- "Share my plants" (the existing public switch) is the only thing that shows plants. Plants stay private unless shared.
-- In the SQL Editor choose New query, select all, paste, Run. Safe to run more than once. Run Parts 7 to 9 first.

alter table public.profiles add column if not exists profile_public boolean not null default true;

-- Discover: every visible profile. Plant counts only for shelves that share their plants.
create or replace function public.list_public_shelves()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'owner_id', pr.id,
    'slug', pr.public_slug,
    'shelf_name', pr.shelf_name,
    'shared', pr.is_public,
    'plant_count', case when pr.is_public then (select count(*) from public.plants p where p.user_id = pr.id) else null end,
    'for_sale', case when pr.is_public then (select count(*) from public.plants p where p.user_id = pr.id and p.for_sale and not p.sold) else 0 end,
    'followers', (select count(*) from public.follows f where f.followed_id = pr.id),
    'following', exists (select 1 from public.follows f where f.followed_id = pr.id and f.follower_id = auth.uid())
  ) order by pr.shelf_name), '[]'::jsonb)
  from public.profiles pr
  where pr.profile_public = true or pr.is_public = true;
$$;
revoke all on function public.list_public_shelves() from public;
grant execute on function public.list_public_shelves() to anon, authenticated;

-- A single shelf page: full when plants are shared, header only when just the profile is visible.
create or replace function public.get_public_shelf(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  prof record;
  result jsonb;
begin
  select id, shelf_name, is_public, show_prices, show_seller, show_soil, show_conditions, show_lineage, show_notes, show_photos into prof
  from public.profiles
  where public_slug = p_slug and (is_public = true or profile_public = true);

  if not found then
    return null;
  end if;

  -- Profile is visible but the plants are not shared.
  if not prof.is_public then
    return jsonb_build_object('owner_id', prof.id, 'shelf_name', prof.shelf_name, 'shared', false, 'show_prices', false, 'plants', '[]'::jsonb);
  end if;

  select jsonb_build_object(
    'owner_id', prof.id,
    'shared', true,
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
