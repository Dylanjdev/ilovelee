import {
  EVENT_PAGE_DATA_SCRIPT_ID,
  eventCanonicalUrl,
  eventHasEnded,
  eventIdFromPath,
  eventPageMetadata,
  eventPath,
  formatEventSchedule,
  googleMapsEventUrl,
  PUBLIC_EVENT_COLUMNS,
  safeEventWebsiteUrl,
  serializeEmbeddedEvent,
} from '../src/lib/eventDirectory.js'
import {
  serializeCalendarStructuredData,
  serializeEventStructuredData,
} from '../src/structuredData.js'

const siteOrigin = 'https://discoverleeva.com'
const eventSitemapPath = '/event-sitemap.xml'
const eventSitemapLimit = 1000

const navigation = [
  ['/', 'Home'],
  ['/visitor-info/', 'Visitor Info'],
  ['/guide-to-lee-county-virginia/', 'Guide'],
  ['/articles/', 'Stories'],
  ['/community-assistance-lee-county-va/', 'Community Help'],
  ['/calendar/', 'Calendar'],
  ['/artisans/', 'Artisans'],
  ['/heritage/', 'Heritage'],
  ['/map/', 'Map'],
  ['/directory/', 'Directory'],
  ['/lodging/', 'Lodging'],
  ['/outdoors/', 'Outdoors'],
  ['/towns/', 'Towns'],
  ['/weddings/', 'Weddings'],
]

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function escapeXml(value) {
  return escapeHtml(value).replaceAll('&#39;', '&apos;')
}

function renderNavigation() {
  return navigation.map(([href, label]) => (
    `<a href="${href}"${href === '/calendar/' ? ' class="active"' : ''}>${escapeHtml(label)}</a>`
  )).join('')
}

function renderFooterNavigation() {
  return navigation
    .filter(([href]) => ['/', '/visitor-info/', '/articles/', '/map/', '/directory/', '/lodging/', '/outdoors/'].includes(href))
    .map(([href, label]) => `<a href="${href}">${escapeHtml(label)}</a>`)
    .join('')
}

function renderLayout(content) {
  return `<div id="top" class="site-wrap" data-static-route-shell>
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <header class="top-nav">
      <a href="/" class="brand-mark"><img src="/ilovelee.webp" alt="I Love Lee Virginia tourism logo" width="44" height="44" /><span>I Love Lee</span></a>
      <nav id="primary-navigation" aria-label="Primary">${renderNavigation()}</nav>
    </header>
    <main id="main-content">${content}</main>
    <footer class="page-footer">
      <div class="footer-inner">
        <div class="footer-main">
          <div class="footer-brand"><p>I Love Lee</p><span>Plan your trip through Virginia’s westernmost county.</span></div>
          <div class="footer-column"><p class="footer-heading">Visit</p><a href="tel:+12765488871">(276) 548-8871</a><a href="mailto:tourism@leecountyva.gov">tourism@leecountyva.gov</a><span>33640 Main Street, Jonesville, VA 24263</span></div>
          <nav class="footer-column footer-nav" aria-label="Footer"><p class="footer-heading">Explore</p>${renderFooterNavigation()}</nav>
        </div>
        <div class="footer-bottom"><span>&copy; 2026 I Love Lee · discoverleeva.com · All Rights Reserved.</span></div>
      </div>
    </footer>
  </div>`
}

function renderEventContent(event) {
  const websiteUrl = safeEventWebsiteUrl(event.website_url)
  const mapsUrl = googleMapsEventUrl(event)
  const endedNotice = eventHasEnded(event)
    ? event.is_recurring
      ? '<p class="event-ended-notice">The most recently listed occurrence has ended. This recurring event page remains available.</p>'
      : '<p class="event-ended-notice">This event has ended. Its details remain available for ten days after the event.</p>'
    : ''
  const recurringNotice = event.is_recurring
    ? `<p class="event-recurring-notice"><strong>Recurring event.</strong> ${escapeHtml(event.recurrence_text || 'Check the organizer’s latest information for the next occurrence.')}</p>`
    : ''
  const description = event.description
    ? `<p class="event-detail-description">${escapeHtml(event.description)}</p>`
    : ''
  const eventWebsite = websiteUrl
    ? `<a class="event-primary-action" href="${escapeHtml(websiteUrl)}" rel="noopener noreferrer">Event website</a>`
    : ''
  const directions = mapsUrl
    ? `<a class="event-secondary-action" href="${escapeHtml(mapsUrl)}" rel="noopener noreferrer">Get directions</a>`
    : ''
  const locationLink = mapsUrl
    ? `<a href="${escapeHtml(mapsUrl)}" rel="noopener noreferrer">Open in Google Maps</a>`
    : ''

  return `<article class="event-detail-page">
    <div class="event-detail-shell">
      <nav class="event-breadcrumbs" aria-label="Breadcrumb">
        <a href="/">Home</a><span aria-hidden="true">/</span><a href="/calendar/">Events</a><span aria-hidden="true">/</span><span aria-current="page">${escapeHtml(event.title)}</span>
      </nav>
      <header class="event-detail-hero">
        <p class="event-detail-eyebrow">${escapeHtml(event.category || 'Lee County Event')}</p>
        <h1>${escapeHtml(event.title)}</h1>
        <p class="event-detail-schedule">${escapeHtml(formatEventSchedule(event))}</p>
        ${recurringNotice}${endedNotice}${description}
        <div class="event-detail-actions">${eventWebsite}${directions}</div>
      </header>
      <div class="event-detail-grid">
        <section><p class="event-detail-eyebrow">Date and time</p><h2>Event schedule</h2><p>${escapeHtml(formatEventSchedule(event))}</p></section>
        <section><p class="event-detail-eyebrow">Location</p><h2>${escapeHtml(event.location_name || 'Lee County, Virginia')}</h2>${event.address ? `<p>${escapeHtml(event.address)}</p>` : ''}${locationLink}</section>
      </div>
      <a class="event-calendar-return" href="/calendar/">← Back to the Lee County events calendar</a>
    </div>
  </article>`
}

function renderGoneContent() {
  return `<div class="event-detail-page">
    <div class="event-detail-shell">
      <nav class="event-breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/calendar/">Events</a></nav>
      <section class="event-detail-message">
        <p class="event-detail-eyebrow">Lee County Events</p>
        <h1>Event no longer available</h1>
        <p>This event may have been unpublished or removed after its ten-day archive period.</p>
        <a class="event-primary-action" href="/calendar/">Browse current events</a>
      </section>
    </div>
  </div>`
}

function supabaseHeaders(env) {
  return {
    accept: 'application/json',
    apikey: env.SUPABASE_PUBLISHABLE_KEY,
    authorization: `Bearer ${env.SUPABASE_PUBLISHABLE_KEY}`,
  }
}

function assertSupabaseConfigured(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Supabase Worker bindings are not configured.')
  }
}

async function loadEvent(eventId, env) {
  assertSupabaseConfigured(env)
  const query = new URLSearchParams({
    select: PUBLIC_EVENT_COLUMNS,
    id: `eq.${eventId}`,
    status: 'eq.approved',
    is_published: 'eq.true',
    limit: '1',
  })
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/events?${query}`, {
    headers: supabaseHeaders(env),
  })

  if (!response.ok) {
    throw new Error(`Supabase event request failed with HTTP ${response.status}.`)
  }

  const events = await response.json()
  return events[0] ?? null
}

async function loadPublishedEvents(env) {
  assertSupabaseConfigured(env)
  const query = new URLSearchParams({
    select: PUBLIC_EVENT_COLUMNS,
    status: 'eq.approved',
    is_published: 'eq.true',
    order: 'start_at.asc',
    limit: String(eventSitemapLimit),
  })
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/events?${query}`, {
    headers: supabaseHeaders(env),
  })

  if (!response.ok) {
    throw new Error(`Supabase event sitemap request failed with HTTP ${response.status}.`)
  }

  return response.json()
}

function currentCalendarEvents(events) {
  const now = new Date()
  return events
    .filter((event) => event.is_recurring || !eventHasEnded(event, now))
    .slice(0, 50)
}

function renderCalendarSeoSection(events) {
  if (events.length === 0) {
    return `<section class="heritage-section static-calendar-events" aria-labelledby="current-events-heading">
      <h2 id="current-events-heading">Current Lee County events</h2>
      <p>No approved upcoming events are currently listed. Check back for festivals, live music, family activities, outdoor programs, public meetings, and seasonal celebrations.</p>
    </section>`
  }

  return `<section class="heritage-section static-calendar-events" aria-labelledby="current-events-heading">
    <h2 id="current-events-heading">Upcoming and recurring Lee County events</h2>
    <p>Open an event for its current date, time, venue, address, description, and organizer website.</p>
    <ul class="static-event-links">
      ${events.map((event) => {
        const recurrence = event.recurrence_text
          ? `<span class="static-event-recurrence">Recurring: ${escapeHtml(event.recurrence_text)}</span>`
          : event.is_recurring ? '<span class="static-event-recurrence">Recurring event</span>' : ''
        const location = [event.location_name, event.address].filter(Boolean).join(' — ')
        const description = event.description
          ? `<p>${escapeHtml(event.description.slice(0, 240))}${event.description.length > 240 ? '…' : ''}</p>`
          : ''
        return `<li>
          <h3><a href="${eventPath(event)}/">${escapeHtml(event.title)}</a></h3>
          <span>${escapeHtml(formatEventSchedule(event))}</span>
          ${recurrence}
          ${location ? `<span>${escapeHtml(location)}</span>` : ''}
          ${description}
        </li>`
      }).join('')}
    </ul>
  </section>`
}

function withCalendarSeo(response, events) {
  const headers = new Headers(response.headers)
  headers.set('cache-control', 'public, max-age=0, must-revalidate')
  headers.set('content-type', 'text/html; charset=UTF-8')
  const htmlResponse = new Response(response.body, { status: 200, headers })
  const currentEvents = currentCalendarEvents(events)
  const structuredData = serializeCalendarStructuredData(currentEvents)

  return new HTMLRewriter()
    .on('script#site-structured-data', {
      element(element) {
        element.setInnerContent(structuredData, { html: true })
      },
    })
    .on('#main-content', {
      element(element) {
        element.append(renderCalendarSeoSection(currentEvents), { html: true })
      },
    })
    .transform(htmlResponse)
}

function withPageMetadata(response, page, { rootHtml, structuredData = '{}', embeddedEvent, status = 200 }) {
  const headers = new Headers(response.headers)
  headers.set('cache-control', 'public, max-age=0, must-revalidate')
  headers.set('content-type', 'text/html; charset=UTF-8')
  if (status >= 400) headers.set('x-robots-tag', 'noindex, follow')

  const htmlResponse = new Response(response.body, { status, headers })
  const setAttribute = (name, value) => ({
    element(element) {
      element.setAttribute(name, value)
    },
  })
  const rewriter = new HTMLRewriter()
    .on('title', { element(element) { element.setInnerContent(page.title) } })
    .on('meta[name="description"]', setAttribute('content', page.description))
    .on('meta[name="robots"]', setAttribute('content', status >= 400 ? 'noindex, follow' : 'index, follow'))
    .on('link[rel="canonical"]', setAttribute('href', page.canonicalUrl))
    .on('meta[property="og:type"]', setAttribute('content', 'website'))
    .on('meta[property="og:url"]', setAttribute('content', page.canonicalUrl))
    .on('meta[property="og:title"]', setAttribute('content', page.title))
    .on('meta[property="og:description"]', setAttribute('content', page.description))
    .on('meta[property="og:image"]', setAttribute('content', page.imageUrl || `${siteOrigin}/ilovelee.webp`))
    .on('meta[property="og:image:alt"]', setAttribute('content', page.title))
    .on('meta[name="twitter:title"]', setAttribute('content', page.title))
    .on('meta[name="twitter:description"]', setAttribute('content', page.description))
    .on('meta[name="twitter:image"]', setAttribute('content', page.imageUrl || `${siteOrigin}/ilovelee.webp`))
    .on('meta[name="twitter:image:alt"]', setAttribute('content', page.title))
    .on('script#site-structured-data', {
      element(element) {
        element.setInnerContent(structuredData, { html: true })
        if (embeddedEvent) {
          element.after(
            `<script type="application/json" id="${EVENT_PAGE_DATA_SCRIPT_ID}">${serializeEmbeddedEvent(embeddedEvent)}</script>`,
            { html: true },
          )
        }
      },
    })
    .on('#root', { element(element) { element.setInnerContent(rootHtml, { html: true }) } })

  return rewriter.transform(htmlResponse)
}

async function loadHtmlTemplate(request, env) {
  const templateUrl = new URL('/calendar/', request.url)
  const templateRequest = new Request(templateUrl, {
    headers: { accept: 'text/html' },
  })
  const response = await env.ASSETS.fetch(templateRequest)
  if (!response.ok) throw new Error(`Event HTML template failed with HTTP ${response.status}.`)
  return response
}

function serviceUnavailable(error, pathname) {
  console.error(JSON.stringify({
    message: 'event route unavailable',
    error: error instanceof Error ? error.message : String(error),
    path: pathname,
  }))
  return new Response('Event details are temporarily unavailable.', {
    status: 503,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'text/plain; charset=UTF-8',
      'retry-after': '300',
      'x-robots-tag': 'noindex, follow',
    },
  })
}

async function handleEventPage(request, env) {
  const url = new URL(request.url)
  if (url.pathname === '/events' || url.pathname === '/events/') {
    return Response.redirect(new URL('/calendar/', request.url), 301)
  }

  const eventId = eventIdFromPath(url.pathname)
  if (!eventId) {
    return new Response('Event not found.', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=UTF-8', 'x-robots-tag': 'noindex, follow' },
    })
  }

  let event
  try {
    event = await loadEvent(eventId, env)
  } catch (error) {
    return serviceUnavailable(error, url.pathname)
  }

  if (!event) {
    if (request.method === 'HEAD') {
      return new Response(null, {
        status: 410,
        headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, follow' },
      })
    }

    try {
      const template = await loadHtmlTemplate(request, env)
      return withPageMetadata(template, {
        title: 'Event No Longer Available | I Love Lee',
        description: 'This Lee County event is no longer published. Browse the calendar for current events and community happenings.',
        canonicalUrl: new URL(url.pathname, siteOrigin).href,
      }, {
        rootHtml: renderLayout(renderGoneContent()),
        status: 410,
      })
    } catch (error) {
      return serviceUnavailable(error, url.pathname)
    }
  }

  const canonicalUrl = eventCanonicalUrl(event)
  if (url.pathname !== new URL(canonicalUrl).pathname) {
    return Response.redirect(canonicalUrl, 301)
  }

  if (request.method === 'HEAD') {
    return new Response(null, {
      status: 200,
      headers: { 'cache-control': 'public, max-age=0, must-revalidate', 'content-type': 'text/html; charset=UTF-8' },
    })
  }

  try {
    const template = await loadHtmlTemplate(request, env)
    return withPageMetadata(template, {
      ...eventPageMetadata(event),
      canonicalUrl,
    }, {
      embeddedEvent: event,
      rootHtml: renderLayout(renderEventContent(event)),
      structuredData: serializeEventStructuredData(event),
    })
  } catch (error) {
    return serviceUnavailable(error, url.pathname)
  }
}

async function handleEventSitemap(request, env) {
  const url = new URL(request.url)
  let events
  try {
    events = await loadPublishedEvents(env)
  } catch (error) {
    return serviceUnavailable(error, url.pathname)
  }

  const entries = events.map((event) => {
    const lastModified = event.updated_at
      ? `\n    <lastmod>${escapeXml(String(event.updated_at).slice(0, 10))}</lastmod>`
      : ''
    return `  <url>\n    <loc>${escapeXml(eventCanonicalUrl(event))}</loc>${lastModified}\n  </url>`
  }).join('\n')
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}${entries ? '\n' : ''}</urlset>\n`
  const headers = {
    'cache-control': 'public, max-age=0, must-revalidate',
    'content-type': 'application/xml; charset=UTF-8',
  }

  return new Response(request.method === 'HEAD' ? null : sitemap, { status: 200, headers })
}

async function handleCalendarLanding(request, env) {
  const url = new URL(request.url)
  if (url.pathname === '/calendar') {
    return Response.redirect(new URL('/calendar/', request.url), 301)
  }

  const template = await loadHtmlTemplate(request, env)
  if (request.method === 'HEAD') {
    return new Response(null, { status: template.status, headers: template.headers })
  }

  try {
    const events = await loadPublishedEvents(env)
    return withCalendarSeo(template, events)
  } catch (error) {
    console.error(JSON.stringify({
      message: 'calendar SEO event list unavailable',
      error: error instanceof Error ? error.message : String(error),
      path: url.pathname,
    }))
    return template
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response('Method not allowed.', {
        status: 405,
        headers: { allow: 'GET, HEAD' },
      })
    }

    if (url.pathname === eventSitemapPath) {
      return handleEventSitemap(request, env)
    }

    if (url.pathname === '/calendar' || url.pathname === '/calendar/') {
      return handleCalendarLanding(request, env)
    }

    if (url.pathname === '/events' || url.pathname.startsWith('/events/')) {
      return handleEventPage(request, env)
    }

    return env.ASSETS.fetch(request)
  },
}
