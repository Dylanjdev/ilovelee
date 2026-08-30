import assert from 'node:assert/strict'
import test from 'node:test'
import {
  googleCalendarSubscriptionUrl,
  toWebcalUrl,
} from './calendarSubscription.js'

const feedUrl = 'https://project.supabase.co/functions/v1/calendar-feed'

test('toWebcalUrl creates a calendar subscription URL', () => {
  assert.equal(
    toWebcalUrl(feedUrl),
    'webcal://project.supabase.co/functions/v1/calendar-feed',
  )
})

test('googleCalendarSubscriptionUrl passes Google a webcal feed', () => {
  const accountChooserUrl = new URL(googleCalendarSubscriptionUrl(feedUrl))
  const subscriptionUrl = new URL(accountChooserUrl.searchParams.get('continue'))

  assert.equal(accountChooserUrl.origin, 'https://accounts.google.com')
  assert.equal(accountChooserUrl.pathname, '/AccountChooser')
  assert.equal(subscriptionUrl.origin, 'https://calendar.google.com')
  assert.equal(subscriptionUrl.pathname, '/calendar/u/0/r')
  assert.equal(
    subscriptionUrl.searchParams.get('cid'),
    'webcal://project.supabase.co/functions/v1/calendar-feed',
  )
})
