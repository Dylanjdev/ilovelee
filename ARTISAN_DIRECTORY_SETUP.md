# Supabase artisan directory setup

The Artisans page now reads approved profiles from Supabase. Visitors can submit an artisan and up to six work photos for review without creating an account, and calendar administrators can approve, reject, or delete submissions from the Artisans page.

## Install the database schema

Complete [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md) first. The artisan directory reuses the calendar administrator accounts and the site's existing Supabase environment values.

In Supabase Dashboard, open **SQL Editor**, create a new query, paste the complete contents of [`supabase/artisan_directory.sql`](supabase/artisan_directory.sql), and run it.

The script creates:

- `artisans`, which stores public profile information and review status.
- `artisan_submission_contacts`, which keeps submitter names and emails private.
- `artisan_images`, which connects accessible work-photo descriptions to artisan profiles.
- `submit_artisan_listing(...)`, a public function that always creates a pending profile.
- `attach_artisan_work(...)`, which safely connects recent uploads to a pending submission.
- A private `artisan-work` Storage bucket for up to six JPG, PNG, or WebP images of 5 MB each.
- Row Level Security policies that expose only approved profiles and work photos to visitors.

The script does not seed any artisans and is safe to rerun. Do not disable Row Level Security and do not add a `service_role` key to the website.

## Review submissions

1. Open `/artisans`.
2. Choose **Admin sign in**.
3. Sign in with an approved calendar administrator account.
4. Use the Pending, Approved, and Rejected tabs to review profiles.
5. Approve, reject, or permanently delete each submission.

Approved profiles and their work galleries appear publicly as soon as the page reloads. Pending and rejected profiles, work photos, and submitter contact information remain visible only to administrators.

## Production spam protection

The form includes a honeypot and uses a narrow database function that prevents visitors from approving their own profiles. Before promoting it broadly, add CAPTCHA-backed server-side rate limiting to reduce automated submissions.
