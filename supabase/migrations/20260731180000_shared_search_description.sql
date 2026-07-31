alter table public.search_groups
  add column if not exists description text
  check (description is null or char_length(description) <= 240);
