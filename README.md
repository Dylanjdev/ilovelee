# I Love Lee

<https://discoverleeva.com/>

This is a Vite/React site backed by Supabase. The frontend is configured for
Cloudflare Workers Static Assets; Supabase continues to provide authentication,
database, storage, and the calendar feed function.

## Local development

Use a supported Node.js release (Node 24.22 is recommended), then install and
start the Vite development server:

```sh
npm install
cp .env.example .env
npm run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env`. These are
Vite build-time values. The Supabase publishable key is intended for browser use;
do not put a Supabase service-role key in this project.

## Cloudflare deployment

The Cloudflare Vite plugin builds the site into Cloudflare's Build Output
format. The build also generates route-specific HTML and approved business
pages so the existing SEO output is preserved.

```sh
npx cf auth login
npm run deploy:check
npm run deploy
```

The first deploy uses the Worker's `workers.dev` address and does not change the
live domain. After verifying that deployment, add `discoverleeva.com` to the
Cloudflare account, activate its zone, and add the following property inside the
`worker` object in `cloudflare.config.ts`:

```ts
domains: ['discoverleeva.com'],
```

Deploy again to attach the production domain. Keep the existing GoDaddy/GitHub
Pages DNS records in place until the Cloudflare zone is active and the Worker
has been verified.

For Cloudflare Builds, configure these build variables in the dashboard:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_CALENDAR_FEED_URL` (optional)

Use `npm run build` for a production build and `npm run preview` to serve the
built Cloudflare output locally.

## Supabase setup

Calendar database and login setup: [SUPABASE_SETUP.md](SUPABASE_SETUP.md)

Business directory setup: [BUSINESS_DIRECTORY_SETUP.md](BUSINESS_DIRECTORY_SETUP.md)

Artisan directory setup: [ARTISAN_DIRECTORY_SETUP.md](ARTISAN_DIRECTORY_SETUP.md)
