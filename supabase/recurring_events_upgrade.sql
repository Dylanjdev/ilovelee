-- Add permanent recurring-event pages to an existing calendar installation.
-- Run this file in Supabase Dashboard > SQL Editor before deploying the site.

begin;

alter table public.events
  add column if not exists is_recurring boolean not null default false,
  add column if not exists recurrence_text text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_recurrence_text_length_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_recurrence_text_length_check check (
        recurrence_text is null or char_length(recurrence_text) <= 160
      );
  end if;
end;
$$;

commit;

-- IMPORTANT: Add this condition to the WHERE clause in the existing scheduled
-- cleanup function that deletes events ten days after they end:
--
--   and is_recurring = false
--
-- Example cleanup predicate:
--
--   where coalesce(end_at, start_at) < now() - interval '10 days'
--     and is_recurring = false;
--
-- Recurring events can still be removed manually by an administrator.
