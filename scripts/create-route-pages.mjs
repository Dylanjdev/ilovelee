import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { pageMetadata } from '../src/pageMetadata.js'

const routes = Object.keys(pageMetadata).filter((route) => route !== '/')

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

const escapeHtml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')

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
    const metadata = pageMetadata[route]
    const title = escapeHtml(metadata.title)
    const description = escapeHtml(metadata.description)
    const routeHtml = appShellHtml
      .replace(/\s*<link rel="preload" as="image"[^>]*>/, '')
      .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
      .replace(
        /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
        `<meta name="description" content="${description}" />`,
      )
      .replace(
        /<link rel="canonical" href="[^"]*" \/>/,
        `<link rel="canonical" href="${canonicalUrl}" />`,
      )
      .replace(
        /<meta property="og:url" content="[^"]*" \/>/,
        `<meta property="og:url" content="${canonicalUrl}" />`,
      )
      .replace(
        /<meta property="og:title" content="[^"]*" \/>/,
        `<meta property="og:title" content="${title}" />`,
      )
      .replace(
        /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
        `<meta property="og:description" content="${description}" />`,
      )
      .replace(
        /<meta name="twitter:title" content="[^"]*" \/>/,
        `<meta name="twitter:title" content="${title}" />`,
      )
      .replace(
        /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/,
        `<meta name="twitter:description" content="${description}" />`,
      )
      .replace('  </head>', `${getResourceHints(route)}  </head>`)

    await mkdir(dirname(routeFile), { recursive: true })
    await writeFile(routeFile, routeHtml)
  }),
)
