const categoryLabels = {
  restaurants: 'Restaurant',
  shops: 'Shop',
  groceries: 'Grocery Store',
  lodging: 'Lodging',
  services: 'Local Service',
  other: 'Local Business',
}

const knownLocalities = [
  'Pennington Gap',
  'Stickleyville',
  'Saint Charles',
  'St. Charles',
  'St Charles',
  'Jonesville',
  'Rose Hill',
  'Blackwater',
  'Ben Hur',
  'Dryden',
  'Keokee',
  'Ewing',
]

const siteOrigin = 'https://discoverleeva.com'

export function businessCategoryLabel(category) {
  return categoryLabels[category] ?? categoryLabels.other
}

export function slugifyBusinessValue(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function extractBusinessLocality(address) {
  const normalizedAddress = String(address ?? '').replace(/\s+/g, ' ').trim()
  if (!normalizedAddress) return ''

  const knownLocality = knownLocalities.find((locality) => {
    const escapedLocality = locality.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`\\b${escapedLocality.replace(/\s+/g, '\\s+')}\\b`, 'i').test(normalizedAddress)
  })

  if (knownLocality) {
    return knownLocality.includes('Charles') ? 'St. Charles' : knownLocality
  }

  const parts = normalizedAddress.split(',').map((part) => part.trim()).filter(Boolean)
  const stateIndex = parts.findIndex((part) => /^(?:VA|Virginia)(?:\s+\d{5}(?:-\d{4})?)?$/i.test(part))

  if (stateIndex > 0) return parts[stateIndex - 1]
  return ''
}

export function createBusinessSlugBase(business) {
  const nameSlug = slugifyBusinessValue(business?.name) || 'local-business'
  const localitySlug = slugifyBusinessValue(extractBusinessLocality(business?.address) || 'Lee County')

  return localitySlug && !nameSlug.endsWith(`-${localitySlug}`)
    ? `${nameSlug}-${localitySlug}`
    : nameSlug
}

export function assignBusinessSlugs(businesses) {
  const records = (businesses ?? []).map((business) => ({
    ...business,
    slug: createBusinessSlugBase(business),
  }))
  const slugCounts = records.reduce((counts, business) => {
    counts.set(business.slug, (counts.get(business.slug) ?? 0) + 1)
    return counts
  }, new Map())

  return records.map((business, index) => {
    if (slugCounts.get(business.slug) === 1) return business

    const uniqueSuffix = String(business.id ?? index + 1)
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 8)
      .toLowerCase()

    return { ...business, slug: `${business.slug}-${uniqueSuffix || index + 1}` }
  })
}

export function businessPath(business) {
  return `/directory/${business.slug || createBusinessSlugBase(business)}`
}

export function businessSlugFromPath(pathname) {
  const match = String(pathname ?? '').match(/^\/directory\/([^/]+)\/?$/)
  if (!match) return null

  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

function shorten(value, maximumLength) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  if (text.length <= maximumLength) return text

  const shortened = text.slice(0, maximumLength - 1).replace(/\s+\S*$/, '')
  return `${shortened || text.slice(0, maximumLength - 1)}…`
}

export function businessPageMetadata(business) {
  const category = businessCategoryLabel(business?.category)
  const locality = extractBusinessLocality(business?.address)
  const location = locality ? `${locality}, VA` : 'Lee County, VA'
  const title = shorten(`${business?.name || 'Local Business'} | ${category} in ${location}`, 68)
  const descriptionLead = `${business?.name || 'This business'} is listed as a ${category.toLowerCase()} in ${location}.`
  const description = business?.description
    ? `${descriptionLead} ${business.description}`
    : `${descriptionLead} Find its address, phone number, website, and directions in the I Love Lee business directory.`

  return {
    title,
    description: shorten(description, 158),
  }
}

export function businessCanonicalUrl(business) {
  return `${siteOrigin}${businessPath(business)}/`
}

export function googleMapsBusinessUrl(business) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${business?.name ?? ''}, ${business?.address ?? ''}`,
  )}`
}

export function parseBusinessAddress(address) {
  const fullAddress = String(address ?? '').replace(/\s+/g, ' ').trim()
  const locality = extractBusinessLocality(fullAddress)
  const postalCodes = [...fullAddress.matchAll(/\b\d{5}(?:-\d{4})?\b/g)]
  const postalCode = postalCodes.at(-1)?.[0]
  const parts = fullAddress.split(',').map((part) => part.trim()).filter(Boolean)
  const localityIndex = locality
    ? parts.findIndex((part) => part.toLowerCase() === locality.toLowerCase())
    : -1

  return {
    streetAddress: localityIndex > 0 ? parts.slice(0, localityIndex).join(', ') : fullAddress,
    addressLocality: locality || undefined,
    addressRegion: 'VA',
    postalCode,
    addressCountry: 'US',
  }
}
