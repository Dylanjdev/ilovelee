import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { cloudflare } from '@cloudflare/vite-plugin'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const execFileAsync = promisify(execFile)
const projectDir = fileURLToPath(new URL('.', import.meta.url))
const routePagesScript = fileURLToPath(
  new URL('./scripts/create-route-pages.mjs', import.meta.url),
)

function routePages() {
  return {
    name: 'generate-route-pages',
    apply: 'build',
    applyToEnvironment(environment) {
      return environment.name === 'client'
    },
    async writeBundle({ dir }) {
      if (!dir) {
        throw new Error('The client build output directory is not configured.')
      }

      const { stdout, stderr } = await execFileAsync(
        process.execPath,
        [routePagesScript, dir],
        { cwd: projectDir, env: process.env },
      )

      if (stdout) process.stdout.write(stdout)
      if (stderr) process.stderr.write(stderr)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), routePages(), cloudflare()],
})
