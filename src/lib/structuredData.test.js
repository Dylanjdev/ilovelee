import assert from 'node:assert/strict'
import test from 'node:test'
import { pageMetadata } from '../pageMetadata.js'
import {
  canonicalUrlForPath,
  createStructuredData,
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

test('community assistance page exposes its categories as the main entity', () => {
  const data = createStructuredData('/community-assistance-lee-county-va')
  const page = nodeByType(data, 'CollectionPage')
  const categories = nodeByType(data, 'ItemList')

  assert.equal(page.dateModified, '2026-10-17')
  assert.equal(page.mainEntity['@id'], categories['@id'])
  assert.equal(categories.numberOfItems, 10)
  assert.equal(categories.itemListElement[0].url, 'https://discoverleeva.com/community-assistance-lee-county-va/#food-assistance')
})
