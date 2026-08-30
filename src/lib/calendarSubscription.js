export function toWebcalUrl(feedUrl) {
  return feedUrl.replace(/^https?:\/\//i, 'webcal://')
}

export function googleCalendarSubscriptionUrl(feedUrl) {
  const googleCalendarUrl = new URL('https://calendar.google.com/calendar/u/0/r')
  googleCalendarUrl.searchParams.set('cid', toWebcalUrl(feedUrl))

  // Google otherwise drops the subscription URL when the visitor is signed out.
  const accountChooserUrl = new URL('https://accounts.google.com/AccountChooser')
  accountChooserUrl.searchParams.set('continue', googleCalendarUrl.href)
  return accountChooserUrl.href
}
