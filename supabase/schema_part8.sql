-- Part 8: a feed of the newest plants on public shelves (everyone, or only people you follow).
-- In the SQL Editor choose New query, select all, paste, Run. Safe to run more than once.
-- Run Part 7 first. Only shelves that are already public ever show up.

create or replace function public.list_feed(p_following boolean default false)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x.j order by x.created_at desc), '[]'::jsonb) from (
    select p.created_at, jsonb_build_object(
      'uid', p.id,
      'plant_name', p.plant_name,
      'genus', p.genus,
      'purchase_stage', p.purchase_stage,
      'for_sale', p.for_sale,
      'sold', p.sold,
      'asking_price', p.asking_price,
      'slug', pr.public_slug,
      'shelf_name', pr.shelf_name,
      'added', p.created_at,
      'photo', case when pr.show_photos then
        (select ph.path from public.plant_photos ph where ph.plant_id = p.id order by ph.position, ph.created_at limit 1)
        else null end
    ) as j
    from public.plants p
    join public.profiles pr on pr.id = p.user_id
    where pr.is_public = true
      and p.user_id is distinct from auth.uid()
      and (not p_following or exists (select 1 from public.follows f where f.followed_id = pr.id and f.follower_id = auth.uid()))
    order by p.created_at desc
    limit 60
  ) x;
$$;
revoke all on function public.list_feed(boolean) from public;
grant execute on function public.list_feed(boolean) to authenticated;
