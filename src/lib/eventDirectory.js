const siteOrigin = 'https://discoverleeva.com'
const eventTimeZone = 'America/New_York'

export const EVENT_PAGE_DATA_SCRIPT_ID = 'event-page-data'

export const PUBLIC_EVENT_COLUMNS = [
  'id',
  'title',
  'description',
  'start_at',
  'end_at',
  'all_day',
  'location_name',
  'address',
  'website_url',
  'category',
  'is_recurring',
  'recurrence_text',
  'is_published',
  'status',
  'updated_at',
].join(',')

const eventDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: eventTimeZone,
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

const eventTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: eventTimeZone,
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
})

const eventDateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: eventTimeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function shorten(value, maximumLength) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  if (text.length <= maximumLength) return text

  const shortened = text.slice(0, maximumLength - 1).replace(/\s+\S*$/, '')
  return `${shortened || text.slice(0, maximumLength - 1)}…`
}

function eventDateKey(value) {
  const parts = Object.fromEntries(
    eventDateKeyFormatter.formatToParts(new Date(value)).map((part) => [part.type, part.value]),
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function slugifyEventTitle(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function eventPath(event) {
  const titleSlug = slugifyEventTitle(event?.title) || 'lee-county-event'
  return `/events/${titleSlug}--${event?.id}`
}

export function eventIdFromPath(pathname) {
  const match = String(pathname ?? '').match(
    /^\/events\/[^/]+--([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/?$/i,
  )
  return match?.[1]?.toLowerCase() ?? null
}

export function eventCanonicalUrl(event) {
  return `${siteOrigin}${eventPath(event)}/`
}

export function eventPageMetadata(event) {
  const titleSuffix = ' | Lee County, VA Event'
  const title = `${shorten(event?.title || 'Lee County Event', 68 - titleSuffix.length)}${titleSuffix}`
  const date = event?.start_at ? eventDateFormatter.format(new Date(event.start_at)) : ''
  const location = event?.location_name || 'Lee County, Virginia'
  const lead = `Find details for ${event?.title || 'this Lee County event'}${date ? ` on ${date}` : ''} at ${location}.`
  const recurrenceLead = event?.recurrence_text
    ? `Recurring schedule: ${event.recurrence_text}. ${event.title || 'This Lee County event'} is held at ${location}. Confirm the next date and time.`
    : event?.is_recurring
      ? `This is a recurring Lee County event at ${location}. Find the next confirmed date, time, and organizer information.`
      : null
  const description = recurrenceLead || (event?.description
    ? `${lead} ${event.description}`
    : `${lead} View the schedule, location, and event website.`)

  return {
    title,
    description: shorten(description, 155),
    imageUrl: `${siteOrigin}/ilovelee.webp`,
  }
}

export function formatEventSchedule(event) {
  const start = new Date(event.start_at)
  const end = event.end_at ? new Date(event.end_at) : null
  const startDate = eventDateFormatter.format(start)
  const endDate = end ? eventDateFormatter.format(end) : null

  if (event.all_day) {
    return endDate && endDate !== startDate
      ? `${startDate} – ${endDate} · All day`
      : `${startDate} · All day`
  }

  const startTime = eventTimeFormatter.format(start)
  if (!end) return `${startDate} · ${startTime}`

  const endTime = eventTimeFormatter.format(end)
  return endDate === startDate
    ? `${startDate} · ${startTime}–${endTime}`
    : `${startDate} · ${startTime} – ${endDate} · ${endTime}`
}

export function eventSchemaStartDate(event) {
  return event.all_day ? eventDateKey(event.start_at) : String(event.start_at)
}

export function eventSchemaEndDate(event) {
  if (!event.end_at) return undefined
  return event.all_day ? eventDateKey(event.end_at) : String(event.end_at)
}

export function eventHasEnded(event, now = new Date()) {
  const comparisonDate = event.end_at || event.start_at
  return comparisonDate ? new Date(comparisonDate) < now : false
}

export function safeEventWebsiteUrl(value) {
  if (!value) return null

  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

export function googleMapsEventUrl(event) {
  const query = [event?.location_name, event?.address].filter(Boolean).join(', ')
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null
}

export function serializeEmbeddedEvent(event) {
  return JSON.stringify(event).replaceAll('<', '\\u003c')
}

export function readEmbeddedEvent(eventId) {
  if (typeof document === 'undefined' || !eventId) return null

  const script = document.getElementById(EVENT_PAGE_DATA_SCRIPT_ID)
  if (!script?.textContent) return null

  try {
    const event = JSON.parse(script.textContent)
    return event?.id === eventId ? event : null
  } catch {
    return null
  }
}
