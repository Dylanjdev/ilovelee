import assert from 'node:assert/strict'
import test from 'node:test'
import { pageMetadata } from '../pageMetadata.js'
import {
  canonicalUrlForPath,
  createBusinessStructuredData,
  createCalendarStructuredData,
  createEventStructuredData,
  createStructuredData,
  serializeBusinessStructuredData,
  serializeEventStructuredData,
  serializeStructuredData,
} from '../structuredData.js'

function nodeByType(data, type) {
  return data['@graph'].find((node) => node['@type'] === type)
}

test('home page describes the organization, website, destination, and page', () => {
  const data = createStructuredData('/')

  assert.equal(data['@context'], 'https://schema.org')
  assert.equal(nodeByType(data, 'Organization').name, 'I Love Lee')
  assert.equal(nodeByType(data, 'WebSite').url, 'https://discoverleeva.com/')
  assert.equal(nodeByType(data, 'TouristDestination').name, 'Lee County, Virginia')
  assert.equal(nodeByType(data, 'WebPage').mainEntity['@id'], 'https://discoverleeva.com/#lee-county')
  assert.equal(nodeByType(data, 'BreadcrumbList'), undefined)
})

test('interior collection pages include canonical page and breadcrumb data', () => {
  const data = createStructuredData('/directory/')
  const page = nodeByType(data, 'CollectionPage')
  const breadcrumb = nodeByType(data, 'BreadcrumbList')

  assert.equal(page.url, 'https://discoverleeva.com/directory/')
  assert.equal(page.name, pageMetadata['/directory'].title)
  assert.equal(breadcrumb.itemListElement.length, 2)
  assert.deepEqual(breadcrumb.itemListElement[1], {
    '@type': 'ListItem',
    position: 2,
    name: 'Business Directory',
    item: 'https://discoverleeva.com/directory/',
  })
})

test('every known route serializes as valid JSON-LD with its canonical URL', () => {
  Object.keys(pageMetadata).forEach((route) => {
    const serialized = serializeStructuredData(route)
    const parsed = JSON.parse(serialized)
    const page = parsed['@graph'].find((node) => node['@id']?.endsWith('#webpage'))

    assert.equal(page.url, canonicalUrlForPath(route))
    assert.equal(serialized.includes('</script'), false)
  })
})

test('every primary page description fits a useful search-snippet range', () => {
  Object.entries(pageMetadata).forEach(([route, metadata]) => {
    assert.ok(metadata.description.length >= 120, `${route} description is too short`)
    assert.ok(metadata.description.length <= 160, `${route} description is too long`)
  })
})

test('community assistance page exposes its categories as the main entity', () => {
  const data = createStructuredData('/community-assistance-lee-county-va')
  const page = nodeByType(data, 'CollectionPage')
  const categories = nodeByType(data, 'ItemList')

  assert.equal(page.dateModified, '2026-10-17')
  assert.equal(page.mainEntity['@id'], categories['@id'])
  assert.equal(categories.numberOfItems, 10)
  assert.equal(categories.itemListElement[0].url, 'https://discoverleeva.com/community-assistance-lee-county-va/#food-assistance')
})

test('business pages include local business schema and three-level breadcrumbs', () => {
  const business = {
    id: 'business-1',
    slug: 'bbs-bakery-and-cafe-pennington-gap',
    name: "BB's Bakery & Cafe",
    category: 'restaurants',
    description: 'Fresh baked goods and cafe favorites.',
    address: '123 Main Street, Pennington Gap, VA 24277',
    phone: '276-555-0100',
    website_url: 'https://example.com/',
    updated_at: '2026-10-29T12:00:00Z',
  }
  const data = createBusinessStructuredData(business)
  const page = nodeByType(data, 'WebPage')
  const localBusiness = nodeByType(data, 'Restaurant')
  const breadcrumb = nodeByType(data, 'BreadcrumbList')

  assert.equal(page.url, 'https://discoverleeva.com/directory/bbs-bakery-and-cafe-pennington-gap/')
  assert.equal(page.mainEntity['@id'], localBusiness['@id'])
  assert.equal(page.dateModified, '2026-10-29')
  assert.equal(localBusiness.address.addressLocality, 'Pennington Gap')
  assert.equal('category' in localBusiness, false)
  assert.equal(localBusiness.hasMap.startsWith('https://www.google.com/maps/search/'), true)
  assert.equal(breadcrumb.itemListElement.length, 3)
  assert.equal(JSON.parse(serializeBusinessStructuredData(business))['@graph'].length > 0, true)
})

test('event pages include Event schema and three-level breadcrumbs', () => {
  const event = {
    id: '95574fbc-657a-4918-9156-e4bc6ff8ccef',
    title: 'Wilderness Road Fall Festival',
    description: 'A community celebration with music, food, and local makers.',
    start_at: '2026-11-07T23:00:00+00:00',
    end_at: '2026-11-08T01:00:00+00:00',
    all_day: false,
    location_name: 'Wilderness Road State Park',
    address: '8051 Wilderness Road Trail, Ewing, VA 24248',
    website_url: 'https://example.com/festival',
    is_recurring: true,
    recurrence_text: 'Every Saturday in November',
    updated_at: '2026-11-01T12:00:00Z',
  }
  const data = createEventStructuredData(event)
  const page = nodeByType(data, 'WebPage')
  const eventNode = nodeByType(data, 'Event')
  const breadcrumb = nodeByType(data, 'BreadcrumbList')

  assert.equal(page.mainEntity['@id'], eventNode['@id'])
  assert.equal(page.dateModified, '2026-11-01')
  assert.equal(eventNode.startDate, event.start_at)
  assert.equal(eventNode.location.address.addressLocality, 'Ewing')
  assert.equal(eventNode.eventStatus, 'https://schema.org/EventScheduled')
  assert.match(eventNode.description, /Every Saturday in November/)
  assert.equal(breadcrumb.itemListElement.length, 3)
  assert.equal(JSON.parse(serializeEventStructuredData(event))['@graph'].length > 0, true)
})

test('calendar schema exposes current event pages as an ItemList', () => {
  const events = [{
    id: '95574fbc-657a-4918-9156-e4bc6ff8ccef',
    title: 'Wilderness Road Fall Festival',
  }]
  const data = createCalendarStructuredData(events)
  const calendar = nodeByType(data, 'CollectionPage')
  const eventList = nodeByType(data, 'ItemList')

  assert.equal(calendar.mainEntity['@id'], eventList['@id'])
  assert.equal(eventList.numberOfItems, 1)
  assert.match(eventList.itemListElement[0].url, /^https:\/\/discoverleeva\.com\/events\//)
})

test('article routes include Article schema in their generated JSON-LD', () => {
  const articleRoutes = Object.entries(pageMetadata).filter(([, metadata]) => metadata.article)

  assert.equal(articleRoutes.length, 4)
  articleRoutes.forEach(([route, metadata]) => {
    const data = createStructuredData(route)
    const article = nodeByType(data, 'Article')
    const page = nodeByType(data, 'WebPage')

    assert.equal(article.headline, metadata.article.headline)
    assert.equal(article.mainEntityOfPage['@id'], page['@id'])
    assert.equal(page.mainEntity['@id'], article['@id'])
  })
})
