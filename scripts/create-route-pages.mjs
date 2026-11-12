import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'
import { pageMetadata } from '../src/pageMetadata.js'
import {
  assignBusinessSlugs,
  businessCanonicalUrl,
  businessCategoryLabel,
  businessPageMetadata,
  businessPath,
  extractBusinessLocality,
  googleMapsBusinessUrl,
} from '../src/lib/businessDirectory.js'
import { serializeBusinessStructuredData, serializeStructuredData } from '../src/structuredData.js'

const routes = Object.keys(pageMetadata).filter((route) => route !== '/')

const distDir = process.argv[2] || 'dist'
const appShell = join(distDir, 'index.html')
const appShellHtml = await readFile(appShell, 'utf8')
const siteOrigin = 'https://discoverleeva.com'
const env = loadEnv('production', process.cwd(), '')
const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL
const supabasePublishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY
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
const businessDetailChunk = findAsset('BusinessDetailPage-', '.js')
const businessDetailStyles = findAsset('BusinessDetailPage-', '.css')
const routeImagePrefixes = {
  '/guide-to-lee-county-virginia': 'cgap-',
  '/heritage': 'wilder-',
  '/lodging': 'WolfeGilburt-',
  '/outdoors': 'stone--',
  '/towns': 'TownofJonesvile-',
  '/weddings': 'karlan-',
}

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')

const escapeXml = (value) => escapeHtml(value).replaceAll("'", '&apos;')

function injectStructuredData(html, route, business) {
  const serializedData = business
    ? serializeBusinessStructuredData(business)
    : serializeStructuredData(route)
  const structuredDataScript = `<script type="application/ld+json" id="site-structured-data">${serializedData}</script>`
  const scriptPattern = /<script type="application\/ld\+json" id="site-structured-data">[\s\S]*?<\/script>/

  if (!scriptPattern.test(html)) {
    throw new Error('The site structured-data script was not found in the built app shell.')
  }

  return html.replace(scriptPattern, structuredDataScript)
}

function getResourceHints(route) {
  const hints = []
  const isBusinessDetail = route.startsWith('/directory/')
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

  if (isBusinessDetail && businessDetailChunk) {
    hints.push(`<link rel="modulepreload" crossorigin href="/assets/${businessDetailChunk}" />`)
  }

  if (isBusinessDetail && businessDetailStyles) {
    hints.push(`<link rel="stylesheet" crossorigin href="/assets/${businessDetailStyles}" />`)
  }

  if (routeImage) {
    hints.push(`<link rel="preload" as="image" type="image/webp" href="/assets/${routeImage}" fetchpriority="high" />`)
  }

  return hints.length ? `    ${hints.join('\n    ')}\n` : ''
}

function applyPageMetadata(html, { title, description, canonicalUrl, ogType = 'website', imageUrl }) {
  const escapedTitle = escapeHtml(title)
  const escapedDescription = escapeHtml(description)

  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${escapedTitle}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
      `<meta name="description" content="${escapedDescription}" />`,
    )
    .replace(
      /<link rel="canonical" href="[^"]*" \/>/,
      `<link rel="canonical" href="${canonicalUrl}" />`,
    )
    .replace(
      /<meta property="og:type" content="[^"]*" \/>/,
      `<meta property="og:type" content="${ogType}" />`,
    )
    .replace(
      /<meta property="og:url" content="[^"]*" \/>/,
      `<meta property="og:url" content="${canonicalUrl}" />`,
    )
    .replace(
      /<meta property="og:title" content="[^"]*" \/>/,
      `<meta property="og:title" content="${escapedTitle}" />`,
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
      `<meta property="og:description" content="${escapedDescription}" />`,
    )
    .replace(
      /<meta name="twitter:title" content="[^"]*" \/>/,
      `<meta name="twitter:title" content="${escapedTitle}" />`,
    )
    .replace(
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/,
      `<meta name="twitter:description" content="${escapedDescription}" />`,
    )
    .replace(
      /<meta property="og:image" content="[^"]*" \/>/,
      `<meta property="og:image" content="${escapeHtml(imageUrl || `${siteOrigin}/ilovelee.webp`)}" />`,
    )
    .replace(
      /<meta name="twitter:image" content="[^"]*" \/>/,
      `<meta name="twitter:image" content="${escapeHtml(imageUrl || `${siteOrigin}/ilovelee.webp`)}" />`,
    )
}

async function loadApprovedBusinesses() {
  if (!supabaseUrl || !supabasePublishableKey) {
    console.warn('Skipping generated business pages because Supabase build credentials are not configured.')
    return []
  }

  const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase
    .from('businesses')
    .select('id,name,category,description,address,phone,business_email,website_url,logo_path,updated_at')
    .eq('status', 'approved')
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`Could not load approved businesses for static page generation: ${error.message}`)
  }

  return assignBusinessSlugs(data ?? []).map((business) => ({
    ...business,
    logo_url: business.logo_path
      ? `${supabaseUrl}/storage/v1/object/public/business-logos/${business.logo_path
        .split('/')
        .map(encodeURIComponent)
        .join('/')}`
      : null,
  }))
}

function renderBusinessPageContent(business) {
  const category = escapeHtml(businessCategoryLabel(business.category))
  const locality = escapeHtml(extractBusinessLocality(business.address))
  const name = escapeHtml(business.name)
  const description = business.description
    ? `<p class="business-detail-description">${escapeHtml(business.description)}</p>`
    : ''
  const logo = business.logo_url
    ? `<div class="business-detail-logo"><img src="${escapeHtml(business.logo_url)}" alt="${name} logo" /></div>`
    : `<div class="business-detail-monogram" aria-hidden="true">${escapeHtml(business.name.charAt(0).toUpperCase())}</div>`
  const phoneHref = business.phone ? business.phone.replace(/[^\d+]/g, '') : ''
  const phoneAction = business.phone
    ? `<a class="business-primary-action" href="tel:${escapeHtml(phoneHref)}">Call ${escapeHtml(business.phone)}</a>`
    : ''
  const websiteAction = business.website_url
    ? `<a class="business-secondary-action" href="${escapeHtml(business.website_url)}" rel="noopener noreferrer">Visit website</a>`
    : ''
  const emailLink = business.business_email
    ? `<a href="mailto:${escapeHtml(business.business_email)}">${escapeHtml(business.business_email)}</a>`
    : ''
  const websiteLink = business.website_url
    ? `<a href="${escapeHtml(business.website_url)}" rel="noopener noreferrer">Official website</a>`
    : ''
  const noDirectContact = !business.phone && !business.business_email && !business.website_url
    ? '<span>Use the address for current contact information.</span>'
    : ''
  const mapsUrl = escapeHtml(googleMapsBusinessUrl(business))

  return `<article class="business-detail-page">
    <div class="business-detail-shell">
      <nav class="business-breadcrumbs" aria-label="Breadcrumb">
        <a href="/">Home</a><span aria-hidden="true">/</span><a href="/directory/">Business Directory</a><span aria-hidden="true">/</span><span aria-current="page">${name}</span>
      </nav>
      <div class="business-detail-hero">
        <div class="business-detail-copy">
          <p class="business-detail-eyebrow">${category}</p>
          <h1>${name}</h1>
          ${locality ? `<p class="business-detail-location">${locality}, Virginia</p>` : ''}
          ${description}
          <div class="business-detail-actions">
            ${phoneAction}
            <a class="business-secondary-action" href="${mapsUrl}" rel="noopener noreferrer">Get directions</a>
            ${websiteAction}
          </div>
        </div>
        ${logo}
      </div>
      <div class="business-contact-grid">
        <section>
          <p class="business-detail-eyebrow">Address</p>
          <h2>Visit ${name}</h2>
          <a href="${mapsUrl}" rel="noopener noreferrer">${escapeHtml(business.address)}</a>
        </section>
        <section>
          <p class="business-detail-eyebrow">Contact</p>
          <h2>Get in touch</h2>
          <div class="business-contact-links">
            ${business.phone ? `<a href="tel:${escapeHtml(phoneHref)}">${escapeHtml(business.phone)}</a>` : ''}
            ${emailLink}${websiteLink}${noDirectContact}
          </div>
        </section>
      </div>
      <a class="business-directory-return" href="/directory/">← Back to all Lee County businesses</a>
    </div>
  </article>`
}

const approvedBusinesses = await loadApprovedBusinesses()

await writeFile(appShell, injectStructuredData(appShellHtml, '/'))

await Promise.all(
  routes.map(async (route) => {
    const routeFile = join(distDir, route, 'index.html')
    const canonicalUrl = `${siteOrigin}${route}/`
    const metadata = pageMetadata[route]
    const routeHtml = applyPageMetadata(injectStructuredData(appShellHtml, route), {
      ...metadata,
      canonicalUrl,
    })
      .replace(/\s*<link rel="preload" as="image"[^>]*>/, '')
      .replace('  </head>', `${getResourceHints(route)}  </head>`)

    await mkdir(dirname(routeFile), { recursive: true })
    await writeFile(routeFile, routeHtml)
  }),
)

await Promise.all(
  approvedBusinesses.map(async (business) => {
    const route = businessPath(business)
    const routeFile = join(distDir, route, 'index.html')
    const canonicalUrl = businessCanonicalUrl(business)
    const metadata = businessPageMetadata(business)
    const routeHtml = applyPageMetadata(injectStructuredData(appShellHtml, route, business), {
      ...metadata,
      canonicalUrl,
      ogType: 'business.business',
    })
      .replace(/\s*<link rel="preload" as="image"[^>]*>/, '')
      .replace('<div id="root"></div>', `<div id="root">${renderBusinessPageContent(business)}</div>`)
      .replace('  </head>', `${getResourceHints(route)}  </head>`)

    await mkdir(dirname(routeFile), { recursive: true })
    await writeFile(routeFile, routeHtml)
  }),
)

if (approvedBusinesses.length > 0) {
  const sitemapPath = join(distDir, 'sitemap.xml')
  const sitemap = await readFile(sitemapPath, 'utf8')
  const businessEntries = approvedBusinesses.map((business) => {
    const lastModified = business.updated_at
      ? `\n    <lastmod>${escapeXml(String(business.updated_at).slice(0, 10))}</lastmod>`
      : ''
    return `  <url>\n    <loc>${escapeXml(businessCanonicalUrl(business))}</loc>${lastModified}\n  </url>`
  })

  await writeFile(
    sitemapPath,
    sitemap.replace(/\s*<\/urlset>\s*$/, `\n${businessEntries.join('\n')}\n</urlset>\n`),
  )
}

console.log(`Generated ${approvedBusinesses.length} dedicated business pages.`)

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
