import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assignBusinessSlugs,
  businessPageMetadata,
  businessPath,
  businessSlugFromPath,
  createBusinessSlugBase,
  extractBusinessLocality,
  parseBusinessAddress,
} from './businessDirectory.js'

test('business slugs combine the name and Lee County community', () => {
  const business = {
    name: "BB's Bakery & Cafe",
    address: '123 Main Street, Pennington Gap, VA 24277',
  }

  assert.equal(extractBusinessLocality(business.address), 'Pennington Gap')
  assert.equal(createBusinessSlugBase(business), 'bbs-bakery-and-cafe-pennington-gap')
})

test('duplicate business slugs receive deterministic record suffixes', () => {
  const businesses = assignBusinessSlugs([
    { id: 'aaaaaaaa-1111', name: 'Mountain Market', address: 'Jonesville, VA 24263' },
    { id: 'bbbbbbbb-2222', name: 'Mountain Market', address: 'Jonesville, VA 24263' },
  ])

  assert.equal(businesses[0].slug, 'mountain-market-jonesville-aaaaaaaa')
  assert.equal(businesses[1].slug, 'mountain-market-jonesville-bbbbbbbb')
})

test('business routes and metadata are search-friendly', () => {
  const business = assignBusinessSlugs([{
    id: '1',
    name: 'Fannon Brothers Tire Co.',
    category: 'services',
    address: 'Jonesville, VA 24263',
  }])[0]

  assert.equal(businessPath(business), '/directory/fannon-brothers-tire-co-jonesville')
  assert.equal(businessSlugFromPath(`${businessPath(business)}/`), business.slug)
  assert.match(businessPageMetadata(business).title, /Local Service in Jonesville, VA/)
  assert.match(businessPageMetadata(business).description, /address, contact details, website, and directions/)
})

test('business descriptions stay within a useful search-snippet range', () => {
  const shortDescription = businessPageMetadata({
    name: 'Lee Shop',
    category: 'shops',
    address: 'Jonesville, VA 24263',
    description: 'Local gifts.',
  }).description
  const longDescription = businessPageMetadata({
    name: 'Cumberland Mountain Mercantile',
    category: 'shops',
    address: 'Pennington Gap, VA 24277',
    description: 'Handmade Appalachian gifts and locally produced goods. '.repeat(12),
  }).description

  assert.equal(shortDescription.length >= 120, true)
  assert.equal(shortDescription.length <= 150, true)
  assert.equal(longDescription.length <= 150, true)
})

test('structured addresses use the ZIP code rather than a numeric street address', () => {
  const address = parseBusinessAddress('39255 Veterans Memorial Hwy, Pennington Gap, VA 24277')

  assert.equal(address.streetAddress, '39255 Veterans Memorial Hwy')
  assert.equal(address.addressLocality, 'Pennington Gap')
  assert.equal(address.postalCode, '24277')
})
