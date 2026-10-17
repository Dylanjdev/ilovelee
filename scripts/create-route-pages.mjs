import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { pageMetadata } from '../src/pageMetadata.js'
import { serializeStructuredData } from '../src/structuredData.js'

const routes = Object.keys(pageMetadata).filter((route) => route !== '/')

const distDir = 'dist'
const appShell = join(distDir, 'index.html')
const appShellHtml = await readFile(appShell, 'utf8')
const siteOrigin = 'https://discoverleeva.com'
const assetFiles = await readdir(join(distDir, 'assets'))
const legacyRedirects = {
  '/dine-shop': '/directory',
  '/dineandshop': '/directory',
}

const findAsset = (prefix, extension) =>
  assetFiles.find((file) => file.startsWith(prefix) && file.endsWith(extension))

const pageRoutesChunk = findAsset('PageRoutes-', '.js')
const ultimateGuideChunk = findAsset('UltimateGuide-', '.js')
const ultimateGuideStyles = findAsset('UltimateGuide-', '.css')
const communityAssistanceChunk = findAsset('CommunityAssistance-', '.js')
const communityAssistanceStyles = findAsset('CommunityAssistance-', '.css')
const routeImagePrefixes = {
  '/guide-to-lee-county-virginia': 'cgap-',
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

function injectStructuredData(html, route) {
  const structuredDataScript = `<script type="application/ld+json" id="site-structured-data">${serializeStructuredData(route)}</script>`
  const scriptPattern = /<script type="application\/ld\+json" id="site-structured-data">[\s\S]*?<\/script>/

  if (!scriptPattern.test(html)) {
    throw new Error('The site structured-data script was not found in the built app shell.')
  }

  return html.replace(scriptPattern, structuredDataScript)
}

function getResourceHints(route) {
  const hints = []
  const routeImage = routeImagePrefixes[route]
    ? findAsset(routeImagePrefixes[route], '.webp')
    : undefined

  if (pageRoutesChunk) {
    hints.push(`<link rel="modulepreload" crossorigin href="/assets/${pageRoutesChunk}" />`)
  }

  if (route === '/guide-to-lee-county-virginia' && ultimateGuideChunk) {
    hints.push(`<link rel="modulepreload" crossorigin href="/assets/${ultimateGuideChunk}" />`)
  }

  if (route === '/guide-to-lee-county-virginia' && ultimateGuideStyles) {
    hints.push(`<link rel="stylesheet" crossorigin href="/assets/${ultimateGuideStyles}" />`)
  }

  if (route === '/community-assistance-lee-county-va' && communityAssistanceChunk) {
    hints.push(`<link rel="modulepreload" crossorigin href="/assets/${communityAssistanceChunk}" />`)
  }

  if (route === '/community-assistance-lee-county-va' && communityAssistanceStyles) {
    hints.push(`<link rel="stylesheet" crossorigin href="/assets/${communityAssistanceStyles}" />`)
  }

  if (routeImage) {
    hints.push(`<link rel="preload" as="image" type="image/webp" href="/assets/${routeImage}" fetchpriority="high" />`)
  }

  return hints.length ? `    ${hints.join('\n    ')}\n` : ''
}

await writeFile(appShell, injectStructuredData(appShellHtml, '/'))

await Promise.all(
  routes.map(async (route) => {
    const routeFile = join(distDir, route, 'index.html')
    const canonicalUrl = `${siteOrigin}${route}/`
    const metadata = pageMetadata[route]
    const title = escapeHtml(metadata.title)
    const description = escapeHtml(metadata.description)
    const routeHtml = injectStructuredData(appShellHtml, route)
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

await Promise.all(
  Object.entries(legacyRedirects).map(async ([legacyRoute, destinationRoute]) => {
    const routeFile = join(distDir, legacyRoute, 'index.html')
    const destinationPath = `${destinationRoute}/`
    const canonicalUrl = `${siteOrigin}${destinationPath}`
    const redirectHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex, follow" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta http-equiv="refresh" content="0; url=${destinationPath}" />
    <title>Redirecting to the Lee County Business Directory</title>
    <script>window.location.replace(${JSON.stringify(destinationPath)} + window.location.search + window.location.hash)</script>
  </head>
  <body>
    <p><a href="${destinationPath}">Continue to the Lee County Business Directory</a></p>
  </body>
</html>
`

    await mkdir(dirname(routeFile), { recursive: true })
    await writeFile(routeFile, redirectHtml)
  }),
)
