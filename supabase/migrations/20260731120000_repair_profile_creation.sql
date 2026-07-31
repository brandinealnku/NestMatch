-- Repair profile creation for every Auth signup method and existing Auth users.
-- The trigger is provider-agnostic: password, Magic Link, and OAuth all insert
-- into auth.users and therefore follow this path.
create or replace function private.new_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists auth_user_profile on auth.users;
create trigger auth_user_profile
  after insert on auth.users
  for each row execute function private.new_profile();

-- Repair accounts created while the trigger was absent without touching any
-- existing profile, including a completed display name.
insert into public.profiles (id)
select u.id
from auth.users as u
left join public.profiles as p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

alter table public.profiles enable row level security;

-- Existing profile_read/profile_update policies retain own-profile access.
-- This narrow fallback lets the client repair only its authenticated user's
-- row if an operational issue ever leaves it missing again.
drop policy if exists profile_own_insert on public.profiles;
create policy profile_own_insert
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);
