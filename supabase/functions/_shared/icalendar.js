const EVENT_TIME_ZONE = 'America/New_York'
const textEncoder = new TextEncoder()

const eventDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: EVENT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function dateKeyInEventTimeZone(value) {
  const parts = Object.fromEntries(
    eventDateFormatter
      .formatToParts(new Date(value))
      .map((part) => [part.type, part.value]),
  )

  return `${parts.year}${parts.month}${parts.day}`
}

function nextDateKey(dateKey) {
  const year = Number(dateKey.slice(0, 4))
  const month = Number(dateKey.slice(4, 6))
  const day = Number(dateKey.slice(6, 8))
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1))

  return [
    nextDate.getUTCFullYear(),
    String(nextDate.getUTCMonth() + 1).padStart(2, '0'),
    String(nextDate.getUTCDate()).padStart(2, '0'),
  ].join('')
}

function formatUtcDateTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid calendar date: ${value}`)

  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function escapeText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
}

function safeHttpUrl(value) {
  if (!value) return null

  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

// RFC 5545 lines are limited to 75 octets. Continuation lines begin with a
// space, so they have room for 74 octets of content. Iterate by Unicode code
// point to avoid splitting a multi-byte character.
export function foldICalendarLine(line) {
  const foldedLines = []
  let segment = ''
  let segmentBytes = 0
  let byteLimit = 75

  for (const character of line) {
    const characterBytes = textEncoder.encode(character).length
    if (segment && segmentBytes + characterBytes > byteLimit) {
      foldedLines.push(segment)
      segment = ''
      segmentBytes = 0
      byteLimit = 74
    }
    segment += character
    segmentBytes += characterBytes
  }

  foldedLines.push(segment)
  return foldedLines.join('\r\n ')
}

function eventSequence(event) {
  const lastChange = new Date(event.updated_at ?? event.created_at ?? event.start_at).getTime()
  return Number.isNaN(lastChange) ? 0 : Math.max(0, Math.floor(lastChange / 1000))
}

function eventLines(event) {
  const createdAt = event.created_at ?? event.updated_at ?? event.start_at
  const updatedAt = event.updated_at ?? createdAt
  const lines = [
    'BEGIN:VEVENT',
    `UID:${event.id}@discoverleeva.com`,
    `DTSTAMP:${formatUtcDateTime(createdAt)}`,
    `CREATED:${formatUtcDateTime(createdAt)}`,
    `LAST-MODIFIED:${formatUtcDateTime(updatedAt)}`,
    `SEQUENCE:${eventSequence(event)}`,
    'STATUS:CONFIRMED',
    `SUMMARY:${escapeText(event.title)}`,
  ]

  if (event.all_day) {
    const startDate = dateKeyInEventTimeZone(event.start_at)
    const inclusiveEndDate = event.end_at
      ? dateKeyInEventTimeZone(event.end_at)
      : startDate
    lines.push(`DTSTART;VALUE=DATE:${startDate}`)
    lines.push(`DTEND;VALUE=DATE:${nextDateKey(inclusiveEndDate)}`)
  } else {
    lines.push(`DTSTART:${formatUtcDateTime(event.start_at)}`)
    if (event.end_at) lines.push(`DTEND:${formatUtcDateTime(event.end_at)}`)
  }

  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`)

  const location = [event.location_name, event.address].filter(Boolean).join(', ')
  if (location) lines.push(`LOCATION:${escapeText(location)}`)
  if (event.category) lines.push(`CATEGORIES:${escapeText(event.category)}`)

  const websiteUrl = safeHttpUrl(event.website_url)
  if (websiteUrl) lines.push(`URL:${websiteUrl}`)

  lines.push('END:VEVENT')
  return lines
}

export function buildICalendar(events, options = {}) {
  const calendarName = options.calendarName ?? 'Lee County Community Events'
  const calendarUrl = safeHttpUrl(options.calendarUrl)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//I Love Lee//Lee County Community Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    `NAME:${escapeText(calendarName)}`,
    'X-WR-TIMEZONE:America/New_York',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ]

  if (calendarUrl) lines.push(`SOURCE;VALUE=URI:${calendarUrl}`)

  for (const event of events) lines.push(...eventLines(event))
  lines.push('END:VCALENDAR')

  return `${lines.map(foldICalendarLine).join('\r\n')}\r\n`
}
