import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
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
const appShellHtml = await readFile(appShell, 'utf8')
const siteOrigin = 'https://discoverleeva.com'
const assetFiles = await readdir(join(distDir, 'assets'))

const findAsset = (prefix, extension) =>
  assetFiles.find((file) => file.startsWith(prefix) && file.endsWith(extension))

const pageRoutesChunk = findAsset('PageRoutes-', '.js')
const routeImagePrefixes = {
  '/artisans': 'crockettstudio-',
  '/heritage': 'wilder-',
  '/lodging': 'WolfeGilburt-',
  '/outdoors': 'stone--',
  '/towns': 'TownofJonesvile-',
  '/weddings': 'karlan-',
}

function getResourceHints(route) {
  const hints = []
  const routeImage = routeImagePrefixes[route]
    ? findAsset(routeImagePrefixes[route], '.webp')
    : undefined

  if (pageRoutesChunk) {
    hints.push(`<link rel="modulepreload" crossorigin href="/assets/${pageRoutesChunk}" />`)
  }

  if (routeImage) {
    hints.push(`<link rel="preload" as="image" type="image/webp" href="/assets/${routeImage}" fetchpriority="high" />`)
  }

  return hints.length ? `    ${hints.join('\n    ')}\n` : ''
}

await Promise.all(
  routes.map(async (route) => {
    const routeFile = join(distDir, route, 'index.html')
    const canonicalUrl = `${siteOrigin}${route}/`
    const routeHtml = appShellHtml
      .replace(/\s*<link rel="preload" as="image"[^>]*>/, '')
      .replace(
        /<link rel="canonical" href="[^"]*" \/>/,
        `<link rel="canonical" href="${canonicalUrl}" />`,
      )
      .replace(
        /<meta property="og:url" content="[^"]*" \/>/,
        `<meta property="og:url" content="${canonicalUrl}" />`,
      )
      .replace('  </head>', `${getResourceHints(route)}  </head>`)

    await mkdir(dirname(routeFile), { recursive: true })
    await writeFile(routeFile, routeHtml)
  }),
)
