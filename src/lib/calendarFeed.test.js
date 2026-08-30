import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildICalendar,
  foldICalendarLine,
} from '../../supabase/functions/_shared/icalendar.js'

const baseEvent = {
  id: '1b4141e6-59d4-4fb1-8912-99ef777a64de',
  title: 'Lee County Celebration',
  description: 'Music and food',
  start_at: '2026-09-04T22:00:00.000Z',
  end_at: '2026-09-05T00:00:00.000Z',
  all_day: false,
  location_name: 'Lee Theatre',
  address: '41676 W Morgan Avenue, Pennington Gap, VA',
  website_url: 'https://example.com/event',
  category: 'Arts & Culture',
  created_at: '2026-08-20T12:00:00.000Z',
  updated_at: '2026-08-21T12:00:00.000Z',
}

test('buildICalendar creates a stable, refreshable timed event', () => {
  const calendar = buildICalendar([baseEvent], {
    calendarUrl: 'https://project.supabase.co/functions/v1/calendar-feed',
  })

  assert.match(calendar, /^BEGIN:VCALENDAR\r\nVERSION:2\.0\r\n/)
  assert.match(calendar, /UID:1b4141e6-59d4-4fb1-8912-99ef777a64de@discoverleeva\.com\r\n/)
  assert.match(calendar, /DTSTART:20260904T220000Z\r\n/)
  assert.match(calendar, /DTEND:20260905T000000Z\r\n/)
  assert.match(calendar, /LAST-MODIFIED:20260821T120000Z\r\n/)
  assert.match(calendar, /URL:https:\/\/example\.com\/event\r\n/)
  assert.match(calendar, /SOURCE;VALUE=URI:https:\/\/project\.supabase\.co\/functions\/v1\/calendar-feed/)
  assert.match(calendar, /END:VCALENDAR\r\n$/)
})

test('buildICalendar uses exclusive end dates for inclusive all-day event dates', () => {
  const calendar = buildICalendar([{
    ...baseEvent,
    all_day: true,
    start_at: '2026-11-01T04:00:00.000Z',
    end_at: '2026-11-03T04:59:00.000Z',
  }])

  assert.match(calendar, /DTSTART;VALUE=DATE:20261101\r\n/)
  assert.match(calendar, /DTEND;VALUE=DATE:20261103\r\n/)
})

test('buildICalendar escapes text so event content cannot add calendar properties', () => {
  const calendar = buildICalendar([{
    ...baseEvent,
    title: 'Market, music; fun\\games\nATTENDEE:bad@example.com',
  }])

  assert.match(calendar, /SUMMARY:Market\\, music\\; fun\\\\games\\nATTENDEE:bad@example\.com/)
  assert.doesNotMatch(calendar, /\r\nATTENDEE:bad@example\.com/)
})

test('foldICalendarLine limits every physical line to 75 UTF-8 octets', () => {
  const folded = foldICalendarLine(`DESCRIPTION:${'Blue Ridge 🎻 '.repeat(20)}`)
  const physicalLines = folded.split('\r\n')

  assert.ok(physicalLines.length > 1)
  assert.ok(physicalLines.slice(1).every((line) => line.startsWith(' ')))
  assert.ok(physicalLines.every((line) => new TextEncoder().encode(line).length <= 75))
})
