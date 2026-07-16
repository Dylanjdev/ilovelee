-- I Love Lee business directory database setup
-- Run this file after supabase/calendar.sql in Supabase Dashboard > SQL Editor.
-- Calendar administrators are also directory administrators.

begin;

do $$
begin
  if to_regclass('public.calendar_admins') is null then
    raise exception 'Run supabase/calendar.sql before business_directory.sql.';
  end if;
end;
$$;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 140),
  category text not null check (
    category in ('restaurants', 'shops', 'groceries', 'lodging', 'services', 'other')
  ),
  description text check (description is null or char_length(description) <= 2000),
  address text not null check (char_length(btrim(address)) between 1 and 300),
  phone text check (phone is null or char_length(phone) <= 50),
  business_email text check (
    business_email is null
    or (char_length(business_email) <= 254 and position('@' in business_email) > 1)
  ),
  website_url text check (
    website_url is null
    or (char_length(website_url) <= 500 and website_url ~* '^https?://[^[:space:]]+$')
  ),
  logo_path text check (
    logo_path is null
    or logo_path ~ '^[0-9a-f-]{36}/logo-[0-9A-Za-z-]+[.](png|jpg|jpeg|webp)$'
  ),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep this file rerunnable for projects that installed the directory before logo support.
alter table public.businesses
  add column if not exists logo_path text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'businesses_logo_path_check'
      and conrelid = 'public.businesses'::regclass
  ) then
    alter table public.businesses
      add constraint businesses_logo_path_check check (
        logo_path is null
        or logo_path ~ '^[0-9a-f-]{36}/logo-[0-9A-Za-z-]+[.](png|jpg|jpeg|webp)$'
      );
  end if;
end;
$$;

-- Submitter contact details are intentionally kept out of the public businesses table.
create table if not exists public.business_submission_contacts (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  contact_name text not null check (char_length(btrim(contact_name)) between 1 and 140),
  contact_email text not null check (
    char_length(contact_email) <= 254 and position('@' in contact_email) > 1
  ),
  created_at timestamptz not null default now()
);

create index if not exists businesses_status_name_idx
  on public.businesses (status, name);
create index if not exists businesses_status_category_name_idx
  on public.businesses (status, category, name);

-- No business rows are seeded here. The directory displays only records stored in Supabase.

-- Remove the 19 fixed-ID starter rows inserted by earlier versions of this setup.
-- Normal submissions use random UUIDs and cannot match these legacy IDs.
delete from public.businesses
where id in (
  select (
    '00000000-0000-4000-8000-' || lpad(starter_number::text, 12, '0')
  )::uuid
  from generate_series(1, 19) as legacy_seed(starter_number)
);

create or replace function private.set_business_updated_at()
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

  return new;
end;
$$;

drop trigger if exists set_business_updated_at on public.businesses;
create trigger set_business_updated_at
before update on public.businesses
for each row execute function private.set_business_updated_at();

-- Public visitors use this narrow function instead of receiving direct table insert access.
-- It always creates a pending record and keeps submitter details private.
create or replace function public.submit_business_listing(
  p_name text,
  p_category text,
  p_description text,
  p_address text,
  p_phone text,
  p_business_email text,
  p_website_url text,
  p_submitter_name text,
  p_submitter_email text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_business_id uuid;
begin
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 140 then
    raise exception 'Enter a business name.';
  end if;

  if p_category is null or p_category not in (
    'restaurants', 'shops', 'groceries', 'lodging', 'services', 'other'
  ) then
    raise exception 'Choose a valid business category.';
  end if;

  if char_length(btrim(coalesce(p_address, ''))) not between 1 and 300 then
    raise exception 'Enter a business address.';
  end if;

  if char_length(btrim(coalesce(p_submitter_name, ''))) not between 1 and 140 then
    raise exception 'Enter your name.';
  end if;

  if char_length(coalesce(p_submitter_email, '')) > 254
    or position('@' in coalesce(p_submitter_email, '')) <= 1 then
    raise exception 'Enter a valid contact email.';
  end if;

  insert into public.businesses (
    name,
    category,
    description,
    address,
    phone,
    business_email,
    website_url,
    status
  )
  values (
    btrim(p_name),
    p_category,
    nullif(btrim(coalesce(p_description, '')), ''),
    btrim(p_address),
    nullif(btrim(coalesce(p_phone, '')), ''),
    nullif(lower(btrim(coalesce(p_business_email, ''))), ''),
    nullif(btrim(coalesce(p_website_url, '')), ''),
    'pending'
  )
  returning id into new_business_id;

  insert into public.business_submission_contacts (business_id, contact_name, contact_email)
  values (
    new_business_id,
    btrim(p_submitter_name),
    lower(btrim(p_submitter_email))
  );

  return new_business_id;
end;
$$;

revoke all on function public.submit_business_listing(
  text, text, text, text, text, text, text, text, text
) from public;
grant execute on function public.submit_business_listing(
  text, text, text, text, text, text, text, text, text
) to anon, authenticated;

-- Confirm that a newly submitted business owns the logo object path it uploaded.
create or replace function public.attach_business_logo(
  p_business_id uuid,
  p_logo_path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_logo_path !~ '^[0-9a-f-]{36}/logo-[0-9A-Za-z-]+[.](png|jpg|jpeg|webp)$'
    or split_part(p_logo_path, '/', 1) <> p_business_id::text then
    raise exception 'The logo path is invalid.';
  end if;

  update public.businesses
  set logo_path = p_logo_path
  where id = p_business_id
    and status = 'pending'
    and logo_path is null
    and created_at > now() - interval '30 minutes';

  if not found then
    raise exception 'The logo could not be attached to this submission.';
  end if;
end;
$$;

revoke all on function public.attach_business_logo(uuid, text) from public;
grant execute on function public.attach_business_logo(uuid, text) to anon, authenticated;

-- Storage calls use this helper to allow a recent submitter to upload only beneath
-- the UUID returned for their pending business. Directory admins may upload for any listing.
create or replace function private.can_upload_business_logo(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      p_object_name ~ '^[0-9a-f-]{36}/logo-[0-9A-Za-z-]+[.](png|jpg|jpeg|webp)$'
      and exists (
        select 1
        from public.businesses
        where id::text = split_part(p_object_name, '/', 1)
          and status = 'pending'
          and created_at > now() - interval '30 minutes'
      )
    )
    or exists (
      select 1
      from public.calendar_admins
      where user_id = auth.uid()
    );
$$;

revoke all on function private.can_upload_business_logo(text) from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.can_upload_business_logo(text) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-logos',
  'business-logos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Recent submissions can upload a business logo" on storage.objects;
create policy "Recent submissions can upload a business logo"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'business-logos'
  and (select private.can_upload_business_logo(name))
);

drop policy if exists "Directory admins can read business logo objects" on storage.objects;
create policy "Directory admins can read business logo objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'business-logos'
  and (select private.is_calendar_admin())
);

drop policy if exists "Directory admins can update business logos" on storage.objects;
create policy "Directory admins can update business logos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'business-logos'
  and (select private.is_calendar_admin())
)
with check (
  bucket_id = 'business-logos'
  and (select private.is_calendar_admin())
);

drop policy if exists "Directory admins can delete business logos" on storage.objects;
create policy "Directory admins can delete business logos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'business-logos'
  and (select private.is_calendar_admin())
);

alter table public.businesses enable row level security;
alter table public.business_submission_contacts enable row level security;

revoke all on table public.businesses from anon, authenticated;
revoke all on table public.business_submission_contacts from anon, authenticated;

grant select on table public.businesses to anon;
grant select, insert, update, delete on table public.businesses to authenticated;
grant select on table public.business_submission_contacts to authenticated;

drop policy if exists "Approved businesses are public" on public.businesses;
create policy "Approved businesses are public"
on public.businesses
for select
to anon, authenticated
using (status = 'approved');

drop policy if exists "Directory admins can read every business" on public.businesses;
create policy "Directory admins can read every business"
on public.businesses
for select
to authenticated
using ((select private.is_calendar_admin()));

drop policy if exists "Directory admins can create businesses" on public.businesses;
create policy "Directory admins can create businesses"
on public.businesses
for insert
to authenticated
with check ((select private.is_calendar_admin()));

drop policy if exists "Directory admins can update businesses" on public.businesses;
create policy "Directory admins can update businesses"
on public.businesses
for update
to authenticated
using ((select private.is_calendar_admin()))
with check ((select private.is_calendar_admin()));

drop policy if exists "Directory admins can delete businesses" on public.businesses;
create policy "Directory admins can delete businesses"
on public.businesses
for delete
to authenticated
using ((select private.is_calendar_admin()));

drop policy if exists "Directory admins can read submission contacts"
  on public.business_submission_contacts;
create policy "Directory admins can read submission contacts"
on public.business_submission_contacts
for select
to authenticated
using ((select private.is_calendar_admin()));

commit;
