-- I Love Lee artisan directory database setup
-- Run this file after supabase/calendar.sql in Supabase Dashboard > SQL Editor.
-- Calendar administrators are also artisan directory administrators.

begin;

do $$
begin
  if to_regclass('public.calendar_admins') is null
    or to_regprocedure('private.is_calendar_admin()') is null then
    raise exception 'Run supabase/calendar.sql before artisan_directory.sql.';
  end if;
end;
$$;

create table if not exists public.artisans (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 140),
  craft text not null check (char_length(btrim(craft)) between 1 and 100),
  description text not null check (char_length(btrim(description)) between 1 and 2000),
  location text not null check (char_length(btrim(location)) between 1 and 200),
  phone text check (phone is null or char_length(phone) <= 50),
  artisan_email text check (
    artisan_email is null
    or (char_length(artisan_email) <= 254 and position('@' in artisan_email) > 1)
  ),
  website_url text check (
    website_url is null
    or (char_length(website_url) <= 500 and website_url ~* '^https?://[^[:space:]]+$')
  ),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Submitter contact information is private and is never selected with public profiles.
create table if not exists public.artisan_submission_contacts (
  artisan_id uuid primary key references public.artisans (id) on delete cascade,
  contact_name text not null check (char_length(btrim(contact_name)) between 1 and 140),
  contact_email text not null check (
    char_length(contact_email) <= 254 and position('@' in contact_email) > 1
  ),
  created_at timestamptz not null default now()
);

create table if not exists public.artisan_images (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans (id) on delete cascade,
  storage_path text not null unique check (
    storage_path ~ '^[0-9a-f-]{36}/work-[0-9A-Za-z-]+[.](png|jpg|jpeg|webp)$'
  ),
  alt_text text not null check (char_length(btrim(alt_text)) between 1 and 160),
  sort_order smallint not null default 0 check (sort_order between 0 and 5),
  created_at timestamptz not null default now(),
  unique (artisan_id, sort_order)
);

create index if not exists artisans_status_name_idx
  on public.artisans (status, name);
create index if not exists artisans_status_created_at_idx
  on public.artisans (status, created_at desc);
create index if not exists artisan_images_artisan_sort_idx
  on public.artisan_images (artisan_id, sort_order);

-- No artisan records are seeded. Only approved Supabase records appear on the site.

create or replace function private.set_artisan_updated_at()
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

drop trigger if exists set_artisan_updated_at on public.artisans;
create trigger set_artisan_updated_at
before update on public.artisans
for each row execute function private.set_artisan_updated_at();

-- Public visitors submit through this function. It always creates a pending profile
-- and stores the submitter's contact information in the protected contact table.
create or replace function public.submit_artisan_listing(
  p_name text,
  p_craft text,
  p_description text,
  p_location text,
  p_phone text,
  p_artisan_email text,
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
  new_artisan_id uuid;
  normalized_artisan_email text;
  normalized_submitter_email text;
  normalized_website_url text;
begin
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 140 then
    raise exception 'Enter an artisan or studio name.';
  end if;

  if char_length(btrim(coalesce(p_craft, ''))) not between 1 and 100 then
    raise exception 'Enter the type of craft.';
  end if;

  if char_length(btrim(coalesce(p_description, ''))) not between 1 and 2000 then
    raise exception 'Enter a description of 2,000 characters or fewer.';
  end if;

  if char_length(btrim(coalesce(p_location, ''))) not between 1 and 200 then
    raise exception 'Enter a Lee County location.';
  end if;

  if char_length(btrim(coalesce(p_phone, ''))) > 50 then
    raise exception 'The phone number must be 50 characters or fewer.';
  end if;

  normalized_artisan_email := nullif(lower(btrim(coalesce(p_artisan_email, ''))), '');
  if normalized_artisan_email is not null
    and (
      char_length(normalized_artisan_email) > 254
      or position('@' in normalized_artisan_email) <= 1
    ) then
    raise exception 'Enter a valid public email address.';
  end if;

  normalized_website_url := nullif(btrim(coalesce(p_website_url, '')), '');
  if normalized_website_url is not null
    and (
      char_length(normalized_website_url) > 500
      or normalized_website_url !~* '^https?://[^[:space:]]+$'
    ) then
    raise exception 'Enter a valid website address beginning with http:// or https://.';
  end if;

  if char_length(btrim(coalesce(p_submitter_name, ''))) not between 1 and 140 then
    raise exception 'Enter your name.';
  end if;

  normalized_submitter_email := lower(btrim(coalesce(p_submitter_email, '')));
  if char_length(normalized_submitter_email) > 254
    or position('@' in normalized_submitter_email) <= 1 then
    raise exception 'Enter a valid contact email.';
  end if;

  insert into public.artisans (
    name,
    craft,
    description,
    location,
    phone,
    artisan_email,
    website_url,
    status
  )
  values (
    btrim(p_name),
    btrim(p_craft),
    btrim(p_description),
    btrim(p_location),
    nullif(btrim(coalesce(p_phone, '')), ''),
    normalized_artisan_email,
    normalized_website_url,
    'pending'
  )
  returning id into new_artisan_id;

  insert into public.artisan_submission_contacts (
    artisan_id,
    contact_name,
    contact_email
  )
  values (
    new_artisan_id,
    btrim(p_submitter_name),
    normalized_submitter_email
  );

  return new_artisan_id;
end;
$$;

revoke all on function public.submit_artisan_listing(
  text, text, text, text, text, text, text, text, text
) from public;
grant execute on function public.submit_artisan_listing(
  text, text, text, text, text, text, text, text, text
) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'artisan-work',
  'artisan-work',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Recent submitters may upload only beneath the UUID returned by the submission
-- function. Administrators may upload beneath any artisan UUID.
create or replace function private.can_upload_artisan_work(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      p_object_name ~ '^[0-9a-f-]{36}/work-[0-9A-Za-z-]+[.](png|jpg|jpeg|webp)$'
      and exists (
        select 1
        from public.artisans
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

revoke all on function private.can_upload_artisan_work(text) from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.can_upload_artisan_work(text) to anon, authenticated;

-- Connect uploaded objects to a recent pending profile. The function verifies that
-- every object exists and enforces the six-image portfolio limit.
create or replace function public.attach_artisan_work(
  p_artisan_id uuid,
  p_images jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  artisan_name text;
  existing_image_count integer;
  image_data jsonb;
  image_number integer;
  image_path text;
  image_alt_text text;
begin
  if p_images is null
    or jsonb_typeof(p_images) <> 'array'
    or jsonb_array_length(p_images) not between 1 and 6 then
    raise exception 'Attach between one and six work photos.';
  end if;

  select name
  into artisan_name
  from public.artisans
  where id = p_artisan_id
    and status = 'pending'
    and created_at > now() - interval '30 minutes';

  if not found then
    raise exception 'The artisan submission could not be found or is no longer accepting uploads.';
  end if;

  select count(*)
  into existing_image_count
  from public.artisan_images
  where artisan_id = p_artisan_id;

  if existing_image_count + jsonb_array_length(p_images) > 6 then
    raise exception 'An artisan profile can include no more than six work photos.';
  end if;

  for image_data, image_number in
    select value, ordinality::integer
    from jsonb_array_elements(p_images) with ordinality
  loop
    image_path := image_data ->> 'storage_path';
    image_alt_text := btrim(coalesce(image_data ->> 'alt_text', ''));

    if image_path !~ '^[0-9a-f-]{36}/work-[0-9A-Za-z-]+[.](png|jpg|jpeg|webp)$'
      or split_part(image_path, '/', 1) <> p_artisan_id::text then
      raise exception 'A work photo path is invalid.';
    end if;

    if char_length(image_alt_text) not between 1 and 160 then
      raise exception 'Each work photo needs a description of 160 characters or fewer.';
    end if;

    if not exists (
      select 1
      from storage.objects
      where bucket_id = 'artisan-work'
        and name = image_path
    ) then
      raise exception 'An uploaded work photo could not be found.';
    end if;

    insert into public.artisan_images (
      artisan_id,
      storage_path,
      alt_text,
      sort_order
    )
    values (
      p_artisan_id,
      image_path,
      image_alt_text,
      existing_image_count + image_number - 1
    );
  end loop;
end;
$$;

revoke all on function public.attach_artisan_work(uuid, jsonb) from public;
grant execute on function public.attach_artisan_work(uuid, jsonb) to anon, authenticated;

drop policy if exists "Recent submissions can upload artisan work" on storage.objects;
create policy "Recent submissions can upload artisan work"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'artisan-work'
  and (select private.can_upload_artisan_work(name))
);

drop policy if exists "Approved artisan work is public" on storage.objects;
create policy "Approved artisan work is public"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'artisan-work'
  and exists (
    select 1
    from public.artisan_images
    join public.artisans on artisans.id = artisan_images.artisan_id
    where artisan_images.storage_path = storage.objects.name
      and artisans.status = 'approved'
  )
);

drop policy if exists "Artisan admins can read all work" on storage.objects;
create policy "Artisan admins can read all work"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'artisan-work'
  and (select private.is_calendar_admin())
);

drop policy if exists "Artisan admins can delete work" on storage.objects;
create policy "Artisan admins can delete work"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'artisan-work'
  and (select private.is_calendar_admin())
);

alter table public.artisans enable row level security;
alter table public.artisan_submission_contacts enable row level security;
alter table public.artisan_images enable row level security;

revoke all on table public.artisans from anon, authenticated;
revoke all on table public.artisan_submission_contacts from anon, authenticated;
revoke all on table public.artisan_images from anon, authenticated;

grant select on table public.artisans to anon;
grant select, insert, update, delete on table public.artisans to authenticated;
grant select on table public.artisan_submission_contacts to authenticated;
grant select on table public.artisan_images to anon, authenticated;

drop policy if exists "Approved artisans are public" on public.artisans;
create policy "Approved artisans are public"
on public.artisans
for select
to anon, authenticated
using (status = 'approved');

drop policy if exists "Artisan admins can read every profile" on public.artisans;
create policy "Artisan admins can read every profile"
on public.artisans
for select
to authenticated
using ((select private.is_calendar_admin()));

drop policy if exists "Artisan admins can create profiles" on public.artisans;
create policy "Artisan admins can create profiles"
on public.artisans
for insert
to authenticated
with check ((select private.is_calendar_admin()));

drop policy if exists "Artisan admins can update profiles" on public.artisans;
create policy "Artisan admins can update profiles"
on public.artisans
for update
to authenticated
using ((select private.is_calendar_admin()))
with check ((select private.is_calendar_admin()));

drop policy if exists "Artisan admins can delete profiles" on public.artisans;
create policy "Artisan admins can delete profiles"
on public.artisans
for delete
to authenticated
using ((select private.is_calendar_admin()));

drop policy if exists "Artisan admins can read submission contacts"
  on public.artisan_submission_contacts;
create policy "Artisan admins can read submission contacts"
on public.artisan_submission_contacts
for select
to authenticated
using ((select private.is_calendar_admin()));

drop policy if exists "Approved artisan images are public" on public.artisan_images;
create policy "Approved artisan images are public"
on public.artisan_images
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.artisans
    where artisans.id = artisan_images.artisan_id
      and artisans.status = 'approved'
  )
);

drop policy if exists "Artisan admins can read every image" on public.artisan_images;
create policy "Artisan admins can read every image"
on public.artisan_images
for select
to authenticated
using ((select private.is_calendar_admin()));

commit;
