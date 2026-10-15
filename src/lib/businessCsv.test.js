import assert from 'node:assert/strict'
import test from 'node:test'
import { parseBusinessCsv } from './businessCsv.js'

const categories = [
  { id: 'restaurants', label: 'Restaurants' },
  { id: 'shops', label: 'Shops' },
  { id: 'groceries', label: 'Groceries' },
  { id: 'lodging', label: 'Lodging' },
  { id: 'services', label: 'Services' },
  { id: 'other', label: 'Other' },
]

test('parses business aliases, category labels, websites, and quoted fields', () => {
  const csv = [
    'Business Name,Category,Business Address,Business Phone,Public Email,Website,Description',
    'Mountain Cafe,Restaurant,"12 Main St, Jonesville, VA",276-555-0100,HELLO@example.com,mountain.example,"Coffee, lunch, and pie"',
    'Trail Supply,Shops,34 Park Rd,,,,"First line\nSecond line"',
  ].join('\r\n')

  const result = parseBusinessCsv(csv, { categories, maxBusinesses: 100 })

  assert.deepEqual(result.errors, [])
  assert.equal(result.businesses.length, 2)
  assert.equal(result.businesses[0].category, 'restaurants')
  assert.equal(result.businesses[0].address, '12 Main St, Jonesville, VA')
  assert.equal(result.businesses[0].business_email, 'hello@example.com')
  assert.equal(result.businesses[0].website_url, 'https://mountain.example/')
  assert.equal(result.businesses[1].description, 'First line\nSecond line')
})

test('reports required columns and row-specific validation errors', () => {
  const missingColumns = parseBusinessCsv('name,phone\nCafe,276-555-0100', {
    categories,
    maxBusinesses: 100,
  })
  assert.match(missingColumns.errors[0], /category/)
  assert.match(missingColumns.errors[1], /address/)

  const invalidRow = parseBusinessCsv(
    'name,category,address,email\nCafe,Unknown,Main Street,not-an-email',
    { categories, maxBusinesses: 100 },
  )
  assert.match(invalidRow.errors[0], /^Row 2:/)
})

test('enforces the batch limit and catches malformed quoted fields', () => {
  const tooManyRows = [
    'name,category,address',
    'One,Other,1 Main St',
    'Two,Other,2 Main St',
  ].join('\n')
  const limited = parseBusinessCsv(tooManyRows, { categories, maxBusinesses: 1 })
  assert.match(limited.errors[0], /maximum is 1/)

  const malformed = parseBusinessCsv('name,category,address\n"Unclosed,Other,Main St', {
    categories,
    maxBusinesses: 100,
  })
  assert.match(malformed.errors[0], /unclosed quoted field/)
})
