import assert from 'node:assert/strict'
import test from 'node:test'
import { parseEventCsv } from './eventCsv.js'

const categories = ['Community', 'Live Music', 'Arts & Culture']

test('parses spreadsheet-friendly dates, times, aliases, and quoted fields', () => {
  const csv = [
    'Event Title,Category,Start Date,Start Time,End Time,All Day,Location,Description',
    'Market,Community,9/5/2026,9 AM,1:30 PM,No,Town Hall,"Local vendors, food, and crafts"',
    'Art Show,Arts and Culture,2026-09-06,,,Yes,Gallery,"First line\nSecond line"',
  ].join('\r\n')

  const result = parseEventCsv(csv, { categories, maxEvents: 100 })

  assert.deepEqual(result.errors, [])
  assert.equal(result.events.length, 2)
  assert.equal(result.events[0].start_date, '2026-09-05')
  assert.equal(result.events[0].start_time, '09:00')
  assert.equal(result.events[0].end_date, '2026-09-05')
  assert.equal(result.events[0].end_time, '13:30')
  assert.equal(result.events[0].location_name, 'Town Hall')
  assert.equal(result.events[1].category, 'Arts & Culture')
  assert.equal(result.events[1].all_day, true)
  assert.equal(result.events[1].description, 'First line\nSecond line')
})

test('reports required columns and row-specific validation errors', () => {
  const missingColumns = parseEventCsv('category,start_time\nCommunity,6 PM', {
    categories,
    maxEvents: 100,
  })
  assert.match(missingColumns.errors[0], /title/)
  assert.match(missingColumns.errors[1], /start_date/)

  const invalidRow = parseEventCsv('title,start_date,start_time\nConcert,not-a-date,25:00', {
    categories,
    maxEvents: 100,
  })
  assert.match(invalidRow.errors[0], /^Row 2:/)
})

test('enforces the batch limit and catches malformed quoted fields', () => {
  const tooManyRows = ['title,start_date,start_time', 'One,2026-09-01,18:00', 'Two,2026-09-02,18:00'].join('\n')
  const limited = parseEventCsv(tooManyRows, { categories, maxEvents: 1 })
  assert.match(limited.errors[0], /maximum is 1/)

  const malformed = parseEventCsv('title,start_date\n"Unclosed,2026-09-01', {
    categories,
    maxEvents: 100,
  })
  assert.match(malformed.errors[0], /unclosed quoted field/)
})
