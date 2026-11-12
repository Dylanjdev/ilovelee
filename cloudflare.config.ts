import { defineConfig } from 'cf/config'

export default defineConfig({
  worker: {
    name: 'ilovelee',
    compatibilityDate: '2026-11-12',
    domains: ['discoverleeva.com'],
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
    },
  },
})
