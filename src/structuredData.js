import { pageMetadata } from './pageMetadata.js'

export const STRUCTURED_DATA_SCRIPT_ID = 'site-structured-data'

const siteOrigin = 'https://discoverleeva.com'
const homeUrl = `${siteOrigin}/`
const organizationId = `${homeUrl}#organization`
const websiteId = `${homeUrl}#website`
const destinationId = `${homeUrl}#lee-county`

const collectionPages = new Set([
  '/calendar',
  '/artisans',
  '/community-assistance-lee-county-va',
  '/directory',
  '/lodging',
  '/outdoors',
  '/towns',
  '/weddings',
])

const breadcrumbNames = {
  '/visitor-info': 'Visitor Information',
  '/guide-to-lee-county-virginia': 'Ultimate Guide to Lee County',
  '/community-assistance-lee-county-va': 'Community Assistance Directory',
  '/calendar': 'Events Calendar',
  '/artisans': 'Artisans',
  '/heritage': 'History & Heritage',
  '/map': 'Map & Directions',
  '/directory': 'Business Directory',
  '/lodging': 'Places to Stay',
  '/outdoors': 'Outdoor Recreation',
  '/towns': 'Lee County Towns',
  '/weddings': 'Wedding Venues',
}

function normalizePath(pathname) {
  if (!pathname || pathname === '/') return '/'
  return `/${pathname.replace(/^\/+|\/+$/g, '')}`
}

export function canonicalUrlForPath(pathname) {
  const normalizedPath = normalizePath(pathname)
  return normalizedPath === '/' ? homeUrl : `${siteOrigin}${normalizedPath}/`
}

export function createStructuredData(pathname) {
  const normalizedPath = normalizePath(pathname)
  const canonicalUrl = canonicalUrlForPath(normalizedPath)
  const metadata = pageMetadata[normalizedPath] ?? {
    title: 'Page Not Found | I Love Lee',
    description: 'Return home to keep exploring Lee County, Virginia.',
  }
  const pageId = `${canonicalUrl}#webpage`
  const breadcrumbId = `${canonicalUrl}#breadcrumb`

  const organization = {
    '@type': 'Organization',
    '@id': organizationId,
    name: 'I Love Lee',
    alternateName: 'Lee County, Virginia Tourism',
    url: homeUrl,
    logo: {
      '@type': 'ImageObject',
      '@id': `${homeUrl}#logo`,
      url: `${siteOrigin}/logo.png`,
      contentUrl: `${siteOrigin}/logo.png`,
      width: 1024,
      height: 1024,
      caption: 'I Love Lee',
    },
    image: `${siteOrigin}/ilovelee.webp`,
    email: 'tourism@leecountyva.gov',
    telephone: '+1-276-548-8871',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '33640 Main Street',
      addressLocality: 'Jonesville',
      addressRegion: 'VA',
      postalCode: '24263',
      addressCountry: 'US',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'tourism information',
      telephone: '+1-276-548-8871',
      email: 'tourism@leecountyva.gov',
      areaServed: 'US-VA',
      availableLanguage: 'English',
    },
    areaServed: { '@id': destinationId },
    sameAs: ['https://www.facebook.com/iloveleevirginia'],
  }

  const website = {
    '@type': 'WebSite',
    '@id': websiteId,
    url: homeUrl,
    name: 'I Love Lee',
    alternateName: ['Discover Lee VA', 'I Love Lee Virginia'],
    description: pageMetadata['/'].description,
    publisher: { '@id': organizationId },
    inLanguage: 'en-US',
  }

  const destination = {
    '@type': 'TouristDestination',
    '@id': destinationId,
    name: 'Lee County, Virginia',
    description:
      'Virginia’s westernmost county, known for Appalachian scenery, outdoor recreation, historic sites, community events, and mountain towns.',
    url: homeUrl,
    image: `${siteOrigin}/ilovelee.webp`,
    containedInPlace: {
      '@type': 'State',
      name: 'Virginia',
      containedInPlace: {
        '@type': 'Country',
        name: 'United States',
      },
    },
  }

  const webPage = {
    '@type': collectionPages.has(normalizedPath) ? 'CollectionPage' : 'WebPage',
    '@id': pageId,
    url: canonicalUrl,
    name: metadata.title,
    description: metadata.description,
    isPartOf: { '@id': websiteId },
    about: { '@id': destinationId },
    publisher: { '@id': organizationId },
    inLanguage: 'en-US',
  }

  const graph = [organization, website, destination, webPage]

  if (normalizedPath === '/community-assistance-lee-county-va') {
    const assistanceSectionsId = `${canonicalUrl}#assistance-categories`
    const assistanceSections = [
      ['Food banks and food pantries', 'food-assistance'],
      ['Domestic violence and sexual assault support', 'domestic-violence'],
      ['Electric, heating and utility bill assistance', 'utility-assistance'],
      ['Rent assistance, affordable housing and homelessness', 'housing-assistance'],
      ['Clothing, hygiene products and household essentials', 'clothing-essentials'],
      ['SNAP, Medicaid, childcare and financial benefits', 'public-benefits'],
      ['Medical care and health coverage', 'medical-care'],
      ['Help for seniors, people with disabilities and caregivers', 'senior-disability-help'],
      ['Emergency and community resource contacts', 'emergency-contacts'],
      ['How to get help faster', 'get-help-faster'],
    ]

    webPage.dateModified = '2026-10-17'
    webPage.mainEntity = { '@id': assistanceSectionsId }
    graph.push({
      '@type': 'ItemList',
      '@id': assistanceSectionsId,
      name: 'Lee County, Virginia community assistance categories',
      numberOfItems: assistanceSections.length,
      itemListElement: assistanceSections.map(([name, anchor], index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name,
        url: `${canonicalUrl}#${anchor}`,
      })),
    })
  }

  if (normalizedPath === '/') {
    webPage.mainEntity = { '@id': destinationId }
  } else {
    webPage.breadcrumb = { '@id': breadcrumbId }
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': breadcrumbId,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: homeUrl,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: breadcrumbNames[normalizedPath] ?? metadata.title,
          item: canonicalUrl,
        },
      ],
    })
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  }
}

export function serializeStructuredData(pathname) {
  return JSON.stringify(createStructuredData(pathname)).replaceAll('<', '\\u003c')
}
