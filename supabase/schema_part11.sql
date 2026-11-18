-- Part 11: give existing accounts a readable username (and share link) based on their shelf name.
-- In the SQL Editor choose New query, select all, paste, Run.
-- Only touches accounts that still have the random number-and-letter username. Anyone who already picked one is left alone.
-- "Gitplantywithjess" becomes gitplantywithjess. If that is taken, it becomes gitplantywithjess2, and so on.
-- Old random links stop working for the accounts that change.

do $$
declare
  r record;
  base text;
  cand text;
  n int;
begin
  for r in
    select id, shelf_name from public.profiles
    where public_slug ~ '^[0-9a-f]{12}$'
    order by created_at
  loop
    base := left(regexp_replace(lower(coalesce(r.shelf_name, '')), '[^a-z0-9]', '', 'g'), 26);
    if length(base) < 3 then continue; end if;
    cand := base;
    n := 1;
    while exists (select 1 from public.profiles where public_slug = cand and id <> r.id) loop
      n := n + 1;
      cand := base || n::text;
    end loop;
    update public.profiles set public_slug = cand where id = r.id;
  end loop;
end $$;

-- Shows who has what now.
select shelf_name, public_slug from public.profiles order by shelf_name;
