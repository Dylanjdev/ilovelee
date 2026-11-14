import { bindings, defineConfig } from 'cf/config'
import { loadEnv } from 'vite'

const env = loadEnv('production', process.cwd(), '')
const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || ''
const supabasePublishableKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  ''

export default defineConfig({
  worker: {
    name: 'ilovelee',
    entrypoint: './worker/index.js',
    compatibilityDate: '2026-11-13',
    compatibilityFlags: ['nodejs_compat'],
    domains: ['discoverleeva.com'],
    env: {
      ASSETS: bindings.assets(),
      SUPABASE_URL: bindings.text(supabaseUrl),
      SUPABASE_PUBLISHABLE_KEY: bindings.text(supabasePublishableKey),
    },
    observability: {
      enabled: true,
      logs: {
        enabled: true,
        headSamplingRate: 1,
      },
      traces: {
        enabled: true,
        headSamplingRate: 0.01,
      },
    },
    assets: {
      htmlHandling: 'force-trailing-slash',
      notFoundHandling: 'single-page-application',
      runWorkerFirst: ['/calendar', '/calendar/', '/events', '/events/*', '/event-sitemap.xml'],
    },
  },
})
