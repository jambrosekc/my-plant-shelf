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
