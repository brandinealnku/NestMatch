-- v0.4 shared notes. Matches and notifications are still database-created only.
alter table public.matches add constraint matches_id_group_unique unique (id, group_id);

create table public.match_notes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null,
  group_id uuid not null,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000 and body = btrim(body)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint match_notes_match_group_fkey foreign key (match_id, group_id)
    references public.matches(id, group_id) on delete cascade
);
create index match_notes_match_created_idx on public.match_notes(match_id, created_at);
create index match_notes_group_idx on public.match_notes(group_id);
create trigger match_notes_updated before update on public.match_notes
  for each row execute function private.set_updated_at();
alter table public.match_notes enable row level security;

create policy match_notes_read on public.match_notes for select to authenticated
  using (private.is_group_member(group_id));
create policy match_notes_create on public.match_notes for insert to authenticated
  with check (
    author_id = auth.uid() and private.is_group_member(group_id)
    and exists (select 1 from public.matches m where m.id = match_id and m.group_id = group_id and m.status = 'active')
  );
create policy match_notes_update on public.match_notes for update to authenticated
  using (author_id = auth.uid() and private.is_group_member(group_id))
  with check (author_id = auth.uid() and private.is_group_member(group_id));
create policy match_notes_delete on public.match_notes for delete to authenticated
  using (author_id = auth.uid() and private.is_group_member(group_id));

-- Realtime publications still apply RLS to authenticated subscribers.
do $$ begin alter publication supabase_realtime add table public.matches; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.match_notes; exception when duplicate_object then null; end $$;
