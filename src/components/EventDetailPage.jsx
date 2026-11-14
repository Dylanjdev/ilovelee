import { useEffect, useMemo, useState } from 'react'
import {
  eventCanonicalUrl,
  eventHasEnded,
  eventPageMetadata,
  formatEventSchedule,
  googleMapsEventUrl,
  PUBLIC_EVENT_COLUMNS,
  readEmbeddedEvent,
  safeEventWebsiteUrl,
} from '../lib/eventDirectory'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { serializeEventStructuredData, STRUCTURED_DATA_SCRIPT_ID } from '../structuredData'

function updatePageMetadata(event) {
  const metadata = eventPageMetadata(event)
  const canonicalUrl = eventCanonicalUrl(event)

  document.title = metadata.title
  document.querySelector('meta[name="description"]')?.setAttribute('content', metadata.description)
  document.querySelector('meta[name="robots"]')?.setAttribute('content', 'index, follow')
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonicalUrl)
  document.querySelector('meta[property="og:type"]')?.setAttribute('content', 'website')
  document.querySelector('meta[property="og:url"]')?.setAttribute('content', canonicalUrl)
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', metadata.title)
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', metadata.description)
  document.querySelector('meta[property="og:image"]')?.setAttribute('content', metadata.imageUrl)
  document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', metadata.title)
  document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', metadata.description)
  document.querySelector('meta[name="twitter:image"]')?.setAttribute('content', metadata.imageUrl)

  let structuredDataScript = document.getElementById(STRUCTURED_DATA_SCRIPT_ID)
  if (!structuredDataScript) {
    structuredDataScript = document.createElement('script')
    structuredDataScript.id = STRUCTURED_DATA_SCRIPT_ID
    structuredDataScript.type = 'application/ld+json'
    document.head.appendChild(structuredDataScript)
  }
  structuredDataScript.textContent = serializeEventStructuredData(event)
}

function EventDetailPage({ eventId }) {
  const embeddedEvent = useMemo(() => readEmbeddedEvent(eventId), [eventId])
  const [event, setEvent] = useState(embeddedEvent)
  const [loading, setLoading] = useState(!embeddedEvent && isSupabaseConfigured)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase || event?.id === eventId) return undefined

    let active = true

    supabase
      .from('events')
      .select(PUBLIC_EVENT_COLUMNS)
      .eq('id', eventId)
      .eq('status', 'approved')
      .eq('is_published', true)
      .maybeSingle()
      .then(({ data, error: loadError }) => {
        if (!active) return

        if (loadError) {
          setError(loadError.message)
          setEvent(null)
        } else {
          setEvent(data ?? null)
        }
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [event?.id, eventId])

  useEffect(() => {
    if (event) {
      updatePageMetadata(event)
    } else if (!loading && !error) {
      document.title = 'Event No Longer Available | I Love Lee'
      document.querySelector('meta[name="description"]')?.setAttribute(
        'content',
        'This Lee County event is no longer published. Browse the calendar for current events and community happenings.',
      )
      document.querySelector('meta[name="robots"]')?.setAttribute('content', 'noindex, follow')
    }
  }, [error, event, loading])

  if (loading) {
    return (
      <div className="event-detail-page" aria-busy="true">
        <div className="event-detail-shell">
          <p className="event-detail-status" role="status">Loading event details…</p>
        </div>
      </div>
    )
  }

  if (!isSupabaseConfigured || error) {
    return (
      <div className="event-detail-page">
        <div className="event-detail-shell">
          <nav className="event-breadcrumbs" aria-label="Breadcrumb">
            <a href="/">Home</a><span aria-hidden="true">/</span><a href="/calendar/">Events</a>
          </nav>
          <section className="event-detail-message" role="alert">
            <p className="event-detail-eyebrow">Lee County Events</p>
            <h1>Event details could not load</h1>
            <p>{error || 'The events calendar is not connected.'}</p>
            <a className="event-primary-action" href="/calendar/">Return to the calendar</a>
          </section>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="event-detail-page">
        <div className="event-detail-shell">
          <nav className="event-breadcrumbs" aria-label="Breadcrumb">
            <a href="/">Home</a><span aria-hidden="true">/</span><a href="/calendar/">Events</a>
          </nav>
          <section className="event-detail-message">
            <p className="event-detail-eyebrow">Lee County Events</p>
            <h1>Event no longer available</h1>
            <p>This event may have been unpublished or removed after its ten-day archive period.</p>
            <a className="event-primary-action" href="/calendar/">Browse current events</a>
          </section>
        </div>
      </div>
    )
  }

  const websiteUrl = safeEventWebsiteUrl(event.website_url)
  const mapsUrl = googleMapsEventUrl(event)
  const hasEnded = eventHasEnded(event)

  return (
    <article className="event-detail-page">
      <div className="event-detail-shell">
        <nav className="event-breadcrumbs" aria-label="Breadcrumb">
          <a href="/">Home</a>
          <span aria-hidden="true">/</span>
          <a href="/calendar/">Events</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{event.title}</span>
        </nav>

        <header className="event-detail-hero">
          <p className="event-detail-eyebrow">{event.category || 'Lee County Event'}</p>
          <h1>{event.title}</h1>
          <p className="event-detail-schedule">{formatEventSchedule(event)}</p>
          {event.is_recurring && (
            <p className="event-recurring-notice">
              <strong>Recurring event.</strong>{' '}
              {event.recurrence_text || 'Check the organizer’s latest information for the next occurrence.'}
            </p>
          )}
          {hasEnded && !event.is_recurring && (
            <p className="event-ended-notice">
              This event has ended. Its details remain available for ten days after the event.
            </p>
          )}
          {hasEnded && event.is_recurring && (
            <p className="event-ended-notice">
              The most recently listed occurrence has ended. This recurring event page remains available.
            </p>
          )}
          {event.description && <p className="event-detail-description">{event.description}</p>}

          <div className="event-detail-actions">
            {websiteUrl && (
              <a className="event-primary-action" href={websiteUrl} target="_blank" rel="noopener noreferrer">
                Event website
              </a>
            )}
            {mapsUrl && (
              <a className="event-secondary-action" href={mapsUrl} target="_blank" rel="noopener noreferrer">
                Get directions
              </a>
            )}
          </div>
        </header>

        <div className="event-detail-grid">
          <section>
            <p className="event-detail-eyebrow">Date and time</p>
            <h2>Event schedule</h2>
            <p>{formatEventSchedule(event)}</p>
          </section>
          <section>
            <p className="event-detail-eyebrow">Location</p>
            <h2>{event.location_name || 'Lee County, Virginia'}</h2>
            {event.address && <p>{event.address}</p>}
            {mapsUrl && <a href={mapsUrl} target="_blank" rel="noopener noreferrer">Open in Google Maps</a>}
          </section>
        </div>

        <a className="event-calendar-return" href="/calendar/">← Back to the Lee County events calendar</a>
      </div>
    </article>
  )
}

export default EventDetailPage
