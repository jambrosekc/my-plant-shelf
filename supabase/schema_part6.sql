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
