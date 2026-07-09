import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const routes = [
  '/calendar',
  '/artisans',
  '/heritage',
  '/map',
  '/dine-shop',
  '/lodging',
  '/outdoors',
  '/towns',
  '/weddings',
]

const distDir = 'dist'
const appShell = join(distDir, 'index.html')

await Promise.all(
  routes.map(async (route) => {
    const routeFile = join(distDir, route, 'index.html')

    await mkdir(dirname(routeFile), { recursive: true })
    await copyFile(appShell, routeFile)
  }),
)
