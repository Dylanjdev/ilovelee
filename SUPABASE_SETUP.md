# Supabase calendar setup

The calendar is already wired to Supabase. Visitors can read published events. Only users listed in `calendar_admins` can create, edit, publish, unpublish, or delete events.

## 1. Create the project and database

1. Create a project at [Supabase](https://supabase.com/dashboard).
2. In the project dashboard, open **SQL Editor** and choose **New query**.
3. Copy all of [`supabase/calendar.sql`](supabase/calendar.sql) into the editor and click **Run**.

The SQL creates the `events` and `calendar_admins` tables, indexes, an automatic `updated_at` trigger, grants, and Row Level Security policies. Do not disable RLS.

## 2. Create each calendar user

1. Open **Authentication > URL Configuration**.
2. Set **Site URL** to `https://discoverleeva.com/calendar`.
3. Add these **Redirect URLs**:

```text
https://discoverleeva.com/calendar
https://discoverleeva.com/calendar/
http://localhost:5173/calendar
http://127.0.0.1:5173/calendar
```

4. Open **Authentication > Users**.
5. Choose **Add user > Send invitation** and enter the person's email.
6. The person opens the email link, arrives on the Calendar page, and creates a password in the form that opens automatically.
7. The database trigger automatically adds the new Auth user to `calendar_admins`. No additional SQL is needed.

You can alternatively choose **Create new user** and assign a password yourself. Invited and manually created Auth users receive the same calendar permissions.

Before creating users, open **Authentication > Sign In / Providers > Email** and turn off **Allow new users to sign up**. This is required because every Auth user receives calendar access automatically. The site intentionally has no public sign-up form.

To remove someone's calendar access without deleting their login:

```sql
delete from public.calendar_admins
where user_id = (
  select id from auth.users
  where lower(email) = lower('you@example.com')
);
```

## 3. Connect the site locally

1. In Supabase, open the project's **Connect** dialog.
2. Copy the **Project URL** and **Publishable key**. A legacy anon key also works, but never use a secret key or `service_role` key in this website.
3. Copy `.env.example` to `.env.local` and enter the two values:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

4. Restart the Vite development server after changing environment variables:

```bash
npm run dev
```

Open `/calendar`, choose **Sign in to manage events**, and use the account created above. Invitation links open the password-creation form automatically. Supabase stores and refreshes the session in browser local storage, so the user remains signed in on that device until they sign out or the session is revoked.

## 4. Add the production values to GitHub Pages

This repository's Pages workflow is prepared to inject the Supabase values during the build.

1. Open the GitHub repository and go to **Settings > Secrets and variables > Actions**.
2. On the **Variables** tab, create `VITE_SUPABASE_URL` with the Project URL.
3. On the **Secrets** tab, create `VITE_SUPABASE_PUBLISHABLE_KEY` with the Publishable key.
4. Push to `main` or manually run the **Deploy to GitHub Pages** workflow.

Vite embeds both values in the browser bundle. That is expected for a Supabase publishable key; security comes from the SQL grants and RLS policies. A secret or `service_role` key must never be added here.

## 5. Recommended Auth settings

- Require passwords of at least 12 characters and a mix of character types.
- Keep public email signups disabled. Every Auth user is automatically granted calendar access.
- Create only approved calendar users through **Authentication > Users**.
- If access must be revoked immediately, remove the `calendar_admins` row and use **Authentication > Users** to sign the user out or delete/ban the account.

## Event fields

The editor supports title, category, start/end date and time, all-day events, venue, address, website, description, and draft/published status. Times are saved and displayed in `America/New_York` (Eastern Time). Draft events are visible only to calendar admins.
