-- Part 2 of 2: automatic profile, Plant IDs and updated_at.
-- Run Part 1 first. In the SQL Editor choose New query, select all, paste, Run.

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
