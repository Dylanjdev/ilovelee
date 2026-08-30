import { buildICalendar } from '../_shared/icalendar.js'

const EVENT_COLUMNS = [
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
  'created_at',
  'updated_at',
].join(',')

const commonHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600',
  'X-Content-Type-Options': 'nosniff',
}

const calendarHeaders = {
  ...commonHeaders,
  'Content-Disposition': 'inline; filename="lee-county-events.ics"',
  'Content-Type': 'text/calendar; charset=utf-8',
}

function publicSupabaseKey() {
  const publishableKeys = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')
  if (publishableKeys) {
    const keys = JSON.parse(publishableKeys)
    if (keys.default) return keys.default
  }

  return Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
}

async function contentEtag(content: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content))
  const hexDigest = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

  return `"${hexDigest}"`
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: commonHeaders })

  if (!['GET', 'HEAD'].includes(request.method)) {
    return new Response('Method not allowed.', {
      status: 405,
      headers: {
        ...commonHeaders,
        Allow: 'GET, HEAD, OPTIONS',
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = publicSupabaseKey()
    if (!supabaseUrl || !supabaseKey) throw new Error('Supabase environment is not configured.')

    const eventsUrl = new URL('/rest/v1/events', supabaseUrl)
    eventsUrl.searchParams.set('select', EVENT_COLUMNS)
    eventsUrl.searchParams.set('status', 'eq.approved')
    eventsUrl.searchParams.set('is_published', 'eq.true')
    eventsUrl.searchParams.set('order', 'start_at.asc')

    const eventsResponse = await fetch(eventsUrl, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    })

    if (!eventsResponse.ok) {
      const detail = await eventsResponse.text()
      throw new Error(`Event query failed (${eventsResponse.status}): ${detail}`)
    }

    const events = await eventsResponse.json()
    const wantsJson = new URL(request.url).searchParams.get('format') === 'json'
    const responseBody = wantsJson
      ? JSON.stringify(events)
      : buildICalendar(events, {
          calendarUrl: new URL('/functions/v1/calendar-feed', supabaseUrl).href,
        })
    const etag = await contentEtag(responseBody)
    const responseHeaders = {
      ...(wantsJson
        ? { ...commonHeaders, 'Content-Type': 'application/json; charset=utf-8' }
        : calendarHeaders),
      ETag: etag,
    }

    if (request.headers.get('If-None-Match') === etag) {
      return new Response(null, { status: 304, headers: responseHeaders })
    }

    return new Response(request.method === 'HEAD' ? null : responseBody, {
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('Calendar feed failed:', error)
    return new Response('The calendar feed is temporarily unavailable.', {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  }
})
