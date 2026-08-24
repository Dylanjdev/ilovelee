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
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_end_after_start check (end_at is null or end_at > start_at),
  constraint events_only_approved_can_be_published check (status = 'approved' or not is_published)
);

-- Keep this file rerunnable for calendars installed before public submissions.
alter table public.events
  add column if not exists status text not null default 'approved',
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users (id) on delete set null;

update public.events
set is_published = false
where status <> 'approved'
  and is_published = true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_status_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_status_check check (status in ('pending', 'approved', 'rejected'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_only_approved_can_be_published'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_only_approved_can_be_published check (
        status = 'approved' or not is_published
      );
  end if;
end;
$$;

-- Submitter details are private and never exposed with public calendar records.
create table if not exists public.event_submission_contacts (
  event_id uuid primary key references public.events (id) on delete cascade,
  contact_name text not null check (char_length(btrim(contact_name)) between 1 and 140),
  contact_email text not null check (
    char_length(contact_email) <= 254 and position('@' in contact_email) > 1
  ),
  created_at timestamptz not null default now()
);

create index if not exists events_start_at_idx on public.events (start_at);
create index if not exists events_end_at_idx on public.events (end_at);
drop index if exists public.events_published_start_at_idx;
create index events_published_start_at_idx
  on public.events (start_at)
  where is_published = true and status = 'approved';
create index if not exists events_status_created_at_idx
  on public.events (status, created_at desc);

create or replace function private.set_calendar_event_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();

  if new.status is distinct from old.status then
    if new.status in ('approved', 'rejected') then
      new.reviewed_at = now();
      new.reviewed_by = auth.uid();
    else
      new.reviewed_at = null;
      new.reviewed_by = null;
    end if;
  end if;

  if new.status <> 'approved' then
    new.is_published = false;
  end if;

  return new;
end;
$$;

drop trigger if exists set_calendar_event_updated_at on public.events;
create trigger set_calendar_event_updated_at
before update on public.events
for each row execute function private.set_calendar_event_updated_at();

-- Public visitors submit through this narrow function. It always creates an
-- unpublished pending event and stores contact information in the private table.
create or replace function public.submit_calendar_event(
  p_title text,
  p_description text,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_all_day boolean,
  p_location_name text,
  p_address text,
  p_website_url text,
  p_category text,
  p_submitter_name text,
  p_submitter_email text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_event_id uuid;
  normalized_website_url text;
begin
  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 120 then
    raise exception 'Enter an event title.';
  end if;

  if char_length(coalesce(p_description, '')) > 4000 then
    raise exception 'The description must be 4,000 characters or fewer.';
  end if;

  if p_start_at is null then
    raise exception 'Enter an event start date and time.';
  end if;

  if p_end_at is not null and p_end_at <= p_start_at then
    raise exception 'The event end must be after its start.';
  end if;

  if char_length(coalesce(p_location_name, '')) > 160 then
    raise exception 'The venue must be 160 characters or fewer.';
  end if;

  if char_length(coalesce(p_address, '')) > 240 then
    raise exception 'The address must be 240 characters or fewer.';
  end if;

  normalized_website_url := nullif(btrim(coalesce(p_website_url, '')), '');
  if normalized_website_url is not null and (
    char_length(normalized_website_url) > 500
    or normalized_website_url !~* '^https?://[^[:space:]]+$'
  ) then
    raise exception 'Enter a valid event website.';
  end if;

  if p_category is null or p_category not in (
    'Community',
    'Festival',
    'Live Music',
    'Arts & Culture',
    'Outdoors',
    'Family',
    'Government',
    'Other'
  ) then
    raise exception 'Choose a valid event category.';
  end if;

  if char_length(btrim(coalesce(p_submitter_name, ''))) not between 1 and 140 then
    raise exception 'Enter your name.';
  end if;

  if char_length(coalesce(p_submitter_email, '')) > 254
    or position('@' in coalesce(p_submitter_email, '')) <= 1 then
    raise exception 'Enter a valid contact email.';
  end if;

  insert into public.events (
    title,
    description,
    start_at,
    end_at,
    all_day,
    location_name,
    address,
    website_url,
    category,
    is_published,
    status,
    created_by
  )
  values (
    btrim(p_title),
    nullif(btrim(coalesce(p_description, '')), ''),
    p_start_at,
    p_end_at,
    coalesce(p_all_day, false),
    nullif(btrim(coalesce(p_location_name, '')), ''),
    nullif(btrim(coalesce(p_address, '')), ''),
    normalized_website_url,
    p_category,
    false,
    'pending',
    null
  )
  returning id into new_event_id;

  insert into public.event_submission_contacts (event_id, contact_name, contact_email)
  values (
    new_event_id,
    btrim(p_submitter_name),
    lower(btrim(p_submitter_email))
  );

  return new_event_id;
end;
$$;

revoke all on function public.submit_calendar_event(
  text, text, timestamptz, timestamptz, boolean, text, text, text, text, text, text
) from public;
grant execute on function public.submit_calendar_event(
  text, text, timestamptz, timestamptz, boolean, text, text, text, text, text, text
) to anon, authenticated;

-- Submit up to 100 events in one transaction. Reusing submit_calendar_event keeps
-- validation and the pending-only security rules identical for single and bulk submissions.
create or replace function public.submit_calendar_events(
  p_events jsonb,
  p_submitter_name text,
  p_submitter_email text
)
returns uuid[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_data jsonb;
  event_number integer := 0;
  new_event_id uuid;
  new_event_ids uuid[] := '{}'::uuid[];
begin
  if jsonb_typeof(p_events) is distinct from 'array' then
    raise exception 'Events must be provided as a list.';
  end if;

  if jsonb_array_length(p_events) not between 1 and 100 then
    raise exception 'Submit between 1 and 100 events at a time.';
  end if;

  for event_data in
    select value from jsonb_array_elements(p_events)
  loop
    event_number := event_number + 1;

    if jsonb_typeof(event_data) is distinct from 'object' then
      raise exception 'Event % must contain event details.', event_number;
    end if;

    begin
      select public.submit_calendar_event(
        p_title => event_data ->> 'title',
        p_description => event_data ->> 'description',
        p_start_at => nullif(event_data ->> 'start_at', '')::timestamptz,
        p_end_at => nullif(event_data ->> 'end_at', '')::timestamptz,
        p_all_day => coalesce(nullif(event_data ->> 'all_day', '')::boolean, false),
        p_location_name => event_data ->> 'location_name',
        p_address => event_data ->> 'address',
        p_website_url => event_data ->> 'website_url',
        p_category => event_data ->> 'category',
        p_submitter_name => p_submitter_name,
        p_submitter_email => p_submitter_email
      )
      into new_event_id;
    exception
      when others then
        raise exception 'Event %: %', event_number, sqlerrm;
    end;

    new_event_ids := array_append(new_event_ids, new_event_id);
  end loop;

  return new_event_ids;
end;
$$;

revoke all on function public.submit_calendar_events(jsonb, text, text) from public;
grant execute on function public.submit_calendar_events(jsonb, text, text)
  to anon, authenticated;

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
alter table public.event_submission_contacts enable row level security;

revoke all on table public.events from anon, authenticated;
revoke all on table public.calendar_admins from anon, authenticated;
revoke all on table public.event_submission_contacts from anon, authenticated;
grant select on table public.events to anon;
grant select, insert, update, delete on table public.events to authenticated;
grant select on table public.calendar_admins to authenticated;
grant select on table public.event_submission_contacts to authenticated;

drop policy if exists "Published events are public" on public.events;
create policy "Published events are public"
on public.events
for select
to anon, authenticated
using (is_published = true and status = 'approved');

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

drop policy if exists "Calendar admins can read event submission contacts"
  on public.event_submission_contacts;
create policy "Calendar admins can read event submission contacts"
on public.event_submission_contacts
for select
to authenticated
using ((select private.is_calendar_admin()));

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
