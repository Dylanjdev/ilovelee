import assert from 'node:assert/strict'
import test from 'node:test'
import {
  eventCanonicalUrl,
  eventHasEnded,
  eventIdFromPath,
  eventPageMetadata,
  eventPath,
  eventSchemaEndDate,
  eventSchemaStartDate,
  formatEventSchedule,
} from './eventDirectory.js'

const event = {
  id: '95574fbc-657a-4918-9156-e4bc6ff8ccef',
  title: 'Wilderness Road Fall Festival',
  description: 'A community celebration with music, food, and local makers.',
  start_at: '2026-11-07T23:00:00+00:00',
  end_at: '2026-11-08T01:00:00+00:00',
  all_day: false,
  location_name: 'Wilderness Road State Park',
  address: '8051 Wilderness Road Trail, Ewing, VA 24248',
  is_recurring: true,
  recurrence_text: 'Every Saturday in November',
}

test('event paths combine a readable slug with the stable event id', () => {
  const path = eventPath(event)

  assert.equal(
    path,
    '/events/wilderness-road-fall-festival--95574fbc-657a-4918-9156-e4bc6ff8ccef',
  )
  assert.equal(eventIdFromPath(`${path}/`), event.id)
  assert.equal(eventCanonicalUrl(event), `https://discoverleeva.com${path}/`)
})

test('event metadata and schedules are search-friendly', () => {
  const metadata = eventPageMetadata(event)

  assert.match(metadata.title, /Lee County, VA Event/)
  assert.match(metadata.description, /Wilderness Road State Park/)
  assert.match(metadata.description, /Every Saturday in November/)
  assert.equal(metadata.description.length <= 155, true)
  assert.match(formatEventSchedule(event), /Saturday, November 7, 2026/)
  assert.equal(eventSchemaStartDate(event), event.start_at)
  assert.equal(eventSchemaEndDate(event), event.end_at)
})

test('all-day event schema uses date-only values', () => {
  const allDayEvent = {
    ...event,
    all_day: true,
    start_at: '2026-11-07T05:00:00+00:00',
    end_at: '2026-11-08T05:00:00+00:00',
  }

  assert.equal(eventSchemaStartDate(allDayEvent), '2026-11-07')
  assert.equal(eventSchemaEndDate(allDayEvent), '2026-11-08')
})

test('ended events remain renderable until their database record is removed', () => {
  assert.equal(eventHasEnded(event, new Date('2026-11-08T02:00:00Z')), true)
  assert.equal(eventHasEnded(event, new Date('2026-11-07T20:00:00Z')), false)
})
