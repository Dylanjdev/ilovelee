const siteOrigin = 'https://discoverleeva.com'
const host = 'discoverleeva.com'
const key = '4cfa8c3659bc2b99046dac368ff0a445'
const keyLocation = `${siteOrigin}/${key}.txt`

const [keyResponse, sitemapResponse, eventSitemapResponse] = await Promise.all([
  fetch(keyLocation, { headers: { accept: 'text/plain' } }),
  fetch(`${siteOrigin}/sitemap.xml`, { headers: { accept: 'application/xml' } }),
  fetch(`${siteOrigin}/event-sitemap.xml`, { headers: { accept: 'application/xml' } }),
])

if (!keyResponse.ok || (await keyResponse.text()).trim() !== key) {
  throw new Error(`IndexNow key verification failed at ${keyLocation}.`)
}

if (!sitemapResponse.ok) {
  throw new Error(`Could not load the deployed sitemap: HTTP ${sitemapResponse.status}.`)
}

if (!eventSitemapResponse.ok) {
  throw new Error(`Could not load the deployed event sitemap: HTTP ${eventSitemapResponse.status}.`)
}

const [sitemap, eventSitemap] = await Promise.all([
  sitemapResponse.text(),
  eventSitemapResponse.text(),
])
const urlList = [...new Set(
  [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g), ...eventSitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => match[1]),
)]

if (urlList.length === 0) {
  throw new Error('The deployed sitemap did not contain any URLs.')
}

const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key, keyLocation, urlList }),
})

if (![200, 202].includes(response.status)) {
  const details = (await response.text()).trim()
  throw new Error(`IndexNow submission failed: HTTP ${response.status}${details ? ` — ${details}` : ''}`)
}

console.log(`Submitted ${urlList.length} sitemap URLs to IndexNow (HTTP ${response.status}).`)
