import { pageMetadata } from './pageMetadata.js'
import {
  businessCanonicalUrl,
  businessPageMetadata,
  businessPath,
  googleMapsBusinessUrl,
  parseBusinessAddress,
} from './lib/businessDirectory.js'

export const STRUCTURED_DATA_SCRIPT_ID = 'site-structured-data'

const siteOrigin = 'https://discoverleeva.com'
const homeUrl = `${siteOrigin}/`
const organizationId = `${homeUrl}#organization`
const websiteId = `${homeUrl}#website`
const destinationId = `${homeUrl}#lee-county`

const collectionPages = new Set([
  '/articles',
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
  '/articles': 'Travel Stories',
  '/articles/mountain-camping-virginia': 'Mountain Camping in Virginia',
  '/articles/virginia-motorcycle-trips': 'Virginia Motorcycle Trips',
  '/articles/appalachian-mountain-road-trip': 'Appalachian Mountain Road Trip',
  '/articles/family-vacations-in-virginia': 'Family Vacations in Virginia',
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

export function createStructuredData(pathname, metadataOverride) {
  const normalizedPath = normalizePath(pathname)
  const canonicalUrl = canonicalUrlForPath(normalizedPath)
  const metadata = metadataOverride ?? pageMetadata[normalizedPath] ?? {
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

  if (metadata.article) {
    const articleId = `${canonicalUrl}#article`

    webPage.mainEntity = { '@id': articleId }
    graph.push({
      '@type': 'Article',
      '@id': articleId,
      headline: metadata.article.headline,
      description: metadata.description,
      image: metadata.imageUrl,
      datePublished: metadata.article.datePublished,
      dateModified: metadata.article.dateModified,
      author: {
        '@type': 'Organization',
        '@id': organizationId,
        name: metadata.article.author,
      },
      publisher: { '@id': organizationId },
      mainEntityOfPage: { '@id': pageId },
      about: { '@id': destinationId },
      inLanguage: 'en-US',
    })
  }

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

export function serializeStructuredData(pathname, metadataOverride) {
  return JSON.stringify(createStructuredData(pathname, metadataOverride)).replaceAll('<', '\\u003c')
}

const businessSchemaTypes = {
  restaurants: 'Restaurant',
  shops: 'Store',
  groceries: 'GroceryStore',
  lodging: 'LodgingBusiness',
  services: 'ProfessionalService',
  other: 'LocalBusiness',
}

export function createBusinessStructuredData(business) {
  const metadata = businessPageMetadata(business)
  const path = businessPath(business)
  const canonicalUrl = businessCanonicalUrl(business)
  const data = createStructuredData(path, metadata)
  const webPage = data['@graph'].find((node) => node['@id'] === `${canonicalUrl}#webpage`)
  const breadcrumb = data['@graph'].find((node) => node['@type'] === 'BreadcrumbList')
  const businessId = `${canonicalUrl}#business`
  const localBusiness = {
    '@type': businessSchemaTypes[business.category] ?? 'LocalBusiness',
    '@id': businessId,
    name: business.name,
    description: business.description || metadata.description,
    url: canonicalUrl,
    address: {
      '@type': 'PostalAddress',
      ...parseBusinessAddress(business.address),
    },
    telephone: business.phone || undefined,
    email: business.business_email || undefined,
    image: business.logo_url || undefined,
    hasMap: googleMapsBusinessUrl(business),
    areaServed: {
      '@type': 'AdministrativeArea',
      name: 'Lee County, Virginia',
    },
  }

  if (business.website_url) {
    localBusiness.sameAs = [business.website_url]
  }

  webPage.mainEntity = { '@id': businessId }
  if (business.updated_at) {
    webPage.dateModified = String(business.updated_at).slice(0, 10)
  }

  breadcrumb.itemListElement = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: homeUrl,
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Business Directory',
      item: `${siteOrigin}/directory/`,
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: business.name,
      item: canonicalUrl,
    },
  ]

  data['@graph'].push(localBusiness)
  return data
}

export function serializeBusinessStructuredData(business) {
  return JSON.stringify(createBusinessStructuredData(business)).replaceAll('<', '\\u003c')
}
