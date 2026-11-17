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
