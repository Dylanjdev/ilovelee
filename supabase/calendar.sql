-- I Love Lee calendar database setup
-- Run this entire file once in Supabase Dashboard > SQL Editor.
--
-- IMPORTANT: This script automatically makes every Supabase Auth user a
-- calendar administrator. Before using it, disable public signups under:
-- Authentication > Sign In / Providers > Email > Allow new users to sign up.
-- After that, create approved users manually under Authentication > Users.

begin;

create schema if not exists private;
revoke all on schema private from public;

create table if not exists public.calendar_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Automatically grant calendar access whenever an Auth user is created.
-- SECURITY DEFINER allows the Auth trigger to insert into this protected table.
create or replace function public.add_new_calendar_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.calendar_admins (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.add_new_calendar_admin() from public, anon, authenticated;

drop trigger if exists add_new_calendar_admin on auth.users;
create trigger add_new_calendar_admin
after insert on auth.users
for each row execute function public.add_new_calendar_admin();

-- Grant access to Auth users that existed before this trigger was installed.
insert into public.calendar_admins (user_id)
select id from auth.users
on conflict (user_id) do nothing;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  description text check (description is null or char_length(description) <= 4000),
  start_at timestamptz not null,
  end_at timestamptz,
  all_day boolean not null default false,
  location_name text check (location_name is null or char_length(location_name) <= 160),
  address text check (address is null or char_length(address) <= 240),
  website_url text,
  category text not null default 'Community',
  is_published boolean not null default false,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_end_after_start check (end_at is null or end_at > start_at)
);

create index if not exists events_start_at_idx on public.events (start_at);
create index if not exists events_end_at_idx on public.events (end_at);
create index if not exists events_published_start_at_idx
  on public.events (start_at)
  where is_published = true;

create or replace function private.set_calendar_event_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_calendar_event_updated_at on public.events;
create trigger set_calendar_event_updated_at
before update on public.events
for each row execute function private.set_calendar_event_updated_at();

create or replace function private.is_calendar_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.calendar_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_calendar_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_calendar_admin() to authenticated;

alter table public.events enable row level security;
alter table public.calendar_admins enable row level security;

revoke all on table public.events from anon, authenticated;
revoke all on table public.calendar_admins from anon, authenticated;
grant select on table public.events to anon;
grant select, insert, update, delete on table public.events to authenticated;
grant select on table public.calendar_admins to authenticated;

drop policy if exists "Published events are public" on public.events;
create policy "Published events are public"
on public.events
for select
to anon, authenticated
using (is_published = true);

drop policy if exists "Calendar admins can read every event" on public.events;
create policy "Calendar admins can read every event"
on public.events
for select
to authenticated
using ((select private.is_calendar_admin()));

drop policy if exists "Calendar admins can create events" on public.events;
create policy "Calendar admins can create events"
on public.events
for insert
to authenticated
with check ((select private.is_calendar_admin()));

drop policy if exists "Calendar admins can update events" on public.events;
create policy "Calendar admins can update events"
on public.events
for update
to authenticated
using ((select private.is_calendar_admin()))
with check ((select private.is_calendar_admin()));

drop policy if exists "Calendar admins can delete events" on public.events;
create policy "Calendar admins can delete events"
on public.events
for delete
to authenticated
using ((select private.is_calendar_admin()));

drop policy if exists "Admins can read their own membership" on public.calendar_admins;
create policy "Admins can read their own membership"
on public.calendar_admins
for select
to authenticated
using ((select auth.uid()) = user_id);

commit;

-- FUTURE USER WORKFLOW:
-- 1. Create or invite an approved user in Authentication > Users.
-- 2. The add_new_calendar_admin trigger grants access automatically.
-- 3. The user signs in from the website's Calendar page.
--
-- To revoke calendar access without deleting the Auth user, run:
--
-- delete from public.calendar_admins
-- where user_id = (
--   select id from auth.users where lower(email) = lower('person@example.com')
-- );
