-- Part 9: search plants across all public shelves.
-- In the SQL Editor choose New query, select all, paste, Run. Safe to run more than once.
-- Only shelves that are already public are searched.

create or replace function public.search_public_plants(p_q text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x.j order by x.nm), '[]'::jsonb) from (
    select p.plant_name as nm, jsonb_build_object(
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
    ) as j
    from public.plants p
    join public.profiles pr on pr.id = p.user_id
    where pr.is_public = true
      and length(trim(coalesce(p_q, ''))) >= 2
      and (p.plant_name ilike '%' || replace(replace(trim(p_q), '%', ''), '_', '') || '%'
        or coalesce(p.genus, '') ilike '%' || replace(replace(trim(p_q), '%', ''), '_', '') || '%'
        or coalesce(p.species, '') ilike '%' || replace(replace(trim(p_q), '%', ''), '_', '') || '%'
        or coalesce(p.cultivar, '') ilike '%' || replace(replace(trim(p_q), '%', ''), '_', '') || '%')
    order by p.plant_name
    limit 40
  ) x;
$$;
revoke all on function public.search_public_plants(text) from public;
grant execute on function public.search_public_plants(text) to authenticated;
