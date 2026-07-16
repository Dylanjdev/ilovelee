# Supabase business directory setup

The Dine & Shop page now uses Supabase as its only directory source. Visitors can submit a business for review, public visitors can read approved listings, and calendar administrators can approve, reject, and edit business information.

## 1. Install the database schema

The business directory reuses the administrator accounts created for the calendar. Complete [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md) first.

In Supabase Dashboard, open **SQL Editor**, create a new query, paste the complete contents of [`supabase/business_directory.sql`](supabase/business_directory.sql), and run it once.

The script creates:

- `businesses`, containing the public listing information and review status.
- `business_submission_contacts`, containing private submitter contact information.
- `submit_business_listing(...)`, a public submission function that always creates a pending listing.
- A public `business-logos` Storage bucket restricted to JPG, PNG, and WebP files up to 2 MB.
- Row Level Security policies that expose only approved businesses to public visitors.

The setup does not seed any businesses. The public directory displays only approved records already stored in Supabase.

Do not disable Row Level Security and do not put a secret or `service_role` key in the website.

### Is the SQL safe to rerun?

Yes. The script does not drop the calendar, Auth users, events, or real submitted/admin-created business rows. It creates missing directory objects, adds missing logo support, refreshes directory functions and security policies, and creates or updates the `business-logos` bucket configuration. It deletes only the 19 fixed-ID starter rows created by an earlier version of this setup.

Run the complete current SQL file again if an earlier version of the business directory was already installed. The script runs in a transaction, so an error rolls back that run instead of leaving a partial migration.

Rerunning the complete current file removes those legacy starter rows automatically. Editing the local SQL file alone does not change an existing Supabase database; the updated file must be run in Supabase SQL Editor.

## 2. Connect the website

The directory uses the same environment values as the calendar:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Restart the Vite server after changing environment variables.

## 3. Review submissions

1. Open `/dine-shop`.
2. Choose **Admin sign in**.
3. Sign in with an approved calendar administrator account.
4. Review the Pending, Approved, and Rejected tabs.
5. Approve or reject a submission directly, choose **Edit information**, or permanently delete a listing after confirming the deletion.

Approved records appear in the public directory immediately. Rejected and pending records remain visible only to administrators. Submitters can include an optional logo, and administrators can upload, replace, or remove it while editing a listing. Deleting a listing also removes its private submission contact record and attempts to remove its stored logo.

## Production spam protection

The form includes a honeypot and uses a narrow database function that prevents visitors from self-approving listings. Before promoting the form broadly, add a CAPTCHA-backed Supabase Edge Function or equivalent server-side rate limiting to reduce automated submission spam.
