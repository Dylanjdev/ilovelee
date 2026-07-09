import { useEffect, useMemo, useState } from 'react'
import './DineShopPlaces.css'

const overpassEndpoints = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
]
const cachePrefix = 'lee-county-overpass'
const cacheDurationMs = 24 * 60 * 60 * 1000
const inflightRequests = new Map()
const loadingCardCount = 9

const fallbackPlaces = [
  {
    id: 'fallback-lee-theatre',
    name: 'Lee Theatre',
    category: 'Theatre',
    groups: ['services'],
    address: 'Pennington Gap, VA',
    website: 'https://www.leetheatre.org/',
  },
  {
    id: 'fallback-crockett-studio',
    name: 'Crockett Studio',
    category: 'Artisan studio',
    groups: ['shops'],
    address: 'Caylor, Lee County, VA',
    phone: '276-445-4967',
    website: 'mailto:sscrockett@peoplepc.com',
  },
  {
    id: 'fallback-wolfe-gilbert-house',
    name: 'Wolfe-Gilbert House',
    category: 'Lodging',
    groups: ['lodging'],
    address: '193 Wolfe-Gilbert Rd., Dryden, VA 24243',
    phone: '276-220-4169',
    website: 'https://www.vacationlee.com/',
  },
  {
    id: 'fallback-mothers-place',
    name: "Mother's Place",
    category: 'Lodging',
    groups: ['lodging'],
    address: '1054 Big Hill Rd, Pennington Gap, VA 24277',
    phone: '276-220-4169',
    website: 'http://www.vacationlee.com/',
  },
  {
    id: 'fallback-leeman-field',
    name: 'Leeman Field RV Park and Campground',
    category: 'Campground',
    groups: ['lodging'],
    address: 'Pennington Gap, VA',
    phone: '276-298-5177',
    website: 'https://townofpenningtonva.gov/campground-information/',
  },
  {
    id: 'fallback-wilderness-road-campground',
    name: 'Wilderness Road Campground',
    category: 'Campground',
    groups: ['lodging'],
    address: 'Cumberland Gap National Historical Park',
    phone: '606-248-2817',
    website: 'https://www.nps.gov/cuga/index.htm',
  },
  {
    id: 'fallback-wilderness-road-primitive-camping',
    name: 'Wilderness Road State Park Primitive Group Camping',
    category: 'Campground',
    groups: ['lodging'],
    address: '8051 Wilderness Road, Ewing, VA 24248',
    phone: '276-445-3065',
    website: 'https://www.dcr.virginia.gov/state-parks/wilderness-road',
  },
  {
    id: 'fallback-rock-bottom',
    name: 'Rock Bottom Horse Camp',
    category: 'Campground',
    groups: ['lodging'],
    address: '375 Cherokee Hills Ln, Ewing, VA 24248',
    phone: '276-445-6676',
    website: 'https://www.rockbottomhorsecamp.com/',
  },
  {
    id: 'fallback-floras-retreats',
    name: "Flora's Retreats",
    category: 'Lodging',
    groups: ['lodging'],
    address: '290 Spyglass Dr., Jonesville, VA 24263',
    phone: '812-881-4355',
    website: 'https://www.florasretreats.com/',
  },
  {
    id: 'fallback-home-place',
    name: 'The Home Place',
    category: 'Lodging',
    groups: ['lodging'],
    address: 'Pennington Gap, VA',
    website: 'https://www.airbnb.com/rooms/669810163221412690',
  },
  {
    id: 'fallback-hb-cabin',
    name: 'H&B Cabin and Farm at Wilder Bent',
    category: 'Lodging',
    groups: ['lodging'],
    address: 'Wilder Bent Drive, Jonesville, VA 24263',
    website: 'https://airbnb.com/h/hbcabinandfarm',
  },
  {
    id: 'fallback-cedar-hill',
    name: 'Cedar Hills Country Club',
    category: 'Local stop',
    groups: ['services'],
    address: 'Jonesville, VA',
    phone: '276-346-1535',
  },
  {
    id: 'fallback-town-of-jonesville',
    name: 'Town of Jonesville',
    category: 'Community office',
    groups: ['services'],
    address: '842 Park Street, Jonesville, VA 24263',
    phone: '276-346-1151',
    website: 'http://www.townofjonesville.org/',
  },
  {
    id: 'fallback-town-of-pennington-gap',
    name: 'Town of Pennington Gap',
    category: 'Community office',
    groups: ['services'],
    address: 'Pennington Gap, VA',
    phone: '276-546-1177',
    website: 'http://www.townofpenningtonva.gov/',
  },
  {
    id: 'fallback-karlan-mansion',
    name: 'Karlan Mansion at Wilderness Road State Park',
    category: 'Event venue',
    groups: ['services'],
    address: 'Ewing, VA',
    phone: '276-445-3065',
    website: 'https://www.dcr.virginia.gov/state-parks/wilderness-road',
  },
  {
    id: 'fallback-thomas-walker-pavilion',
    name: 'Thomas Walker Park Pavilion',
    category: 'Event venue',
    groups: ['services'],
    address: 'Ewing, VA',
    phone: '606-246-1075',
  },
  {
    id: 'fallback-historical-lee-theatre',
    name: 'Historical Lee Theatre',
    category: 'Event venue',
    groups: ['services'],
    address: 'Pennington Gap, VA',
    phone: '276-546-4000',
    website: 'https://www.leetheatre.org/',
  },
  {
    id: 'fallback-stone-mountain-spearhead',
    name: 'Stone Mountain Spearhead Trail',
    category: 'Outdoor recreation',
    groups: ['services'],
    address: 'Lee County, VA',
    website: 'https://www.spearheadtrails.com/pages/stone-mountain',
  },
  {
    id: 'fallback-cumberland-gap-park',
    name: 'Cumberland Gap National Historical Park',
    category: 'Outdoor recreation',
    groups: ['services'],
    address: 'Cumberland Gap Region',
    website: 'https://www.nps.gov/cuga/index.htm',
  },
  {
    id: 'fallback-lake-keokee',
    name: 'Lake Keokee',
    category: 'Outdoor recreation',
    groups: ['services'],
    address: 'Keokee, VA',
    website: 'https://dwr.virginia.gov/waterbody/lake-keokee/',
  },
]

const categories = [
  {
    id: 'all',
    label: 'All',
    filters: [
      '["amenity"~"^(restaurant|cafe|fast_food|bar|pub|ice_cream|marketplace|bank|fuel|pharmacy|clinic|dentist|veterinary|post_office|library|theatre|cinema|arts_centre|community_centre)$"]',
      '["shop"]',
      '["craft"]',
      '["tourism"~"^(hotel|motel|guest_house|hostel|chalet|camp_site|caravan_site|attraction|museum|gallery|information)$"]',
    ],
  },
  {
    id: 'restaurants',
    label: 'Restaurants',
    filters: ['["amenity"~"^(restaurant|cafe|fast_food|bar|pub|ice_cream)$"]'],
  },
  {
    id: 'shops',
    label: 'Shops',
    filters: ['["shop"]', '["craft"]'],
  },
  {
    id: 'groceries',
    label: 'Groceries',
    filters: ['["shop"~"^(supermarket|convenience|grocery|greengrocer|bakery|butcher|deli)$"]'],
  },
  {
    id: 'lodging',
    label: 'Lodging',
    filters: ['["tourism"~"^(hotel|motel|guest_house|hostel|chalet|camp_site|caravan_site)$"]'],
  },
  {
    id: 'services',
    label: 'Services',
    filters: [
      '["amenity"~"^(bank|fuel|pharmacy|clinic|dentist|veterinary|post_office|library|community_centre)$"]',
      '["office"]',
    ],
  },
]

const tagLabels = {
  amenity: {
    restaurant: 'Restaurant',
    cafe: 'Cafe',
    fast_food: 'Fast food',
    bar: 'Bar',
    pub: 'Pub',
    ice_cream: 'Ice cream',
    fuel: 'Fuel',
    bank: 'Bank',
    pharmacy: 'Pharmacy',
    clinic: 'Clinic',
    dentist: 'Dentist',
    veterinary: 'Veterinary',
    library: 'Library',
    post_office: 'Post office',
    community_centre: 'Community center',
  },
  tourism: {
    hotel: 'Hotel',
    motel: 'Motel',
    guest_house: 'Guest house',
    camp_site: 'Campground',
    attraction: 'Attraction',
    museum: 'Museum',
    gallery: 'Gallery',
    information: 'Visitor information',
  },
}

function buildOverpassQuery(filters) {
  const selectors = filters
    .flatMap((filter) => [
      `node${filter}(area.leeCounty);`,
      `way${filter}(area.leeCounty);`,
      `relation${filter}(area.leeCounty);`,
    ])
    .join('\n')

  return `
    [out:json][timeout:25];
    area
      ["boundary"="administrative"]
      ["admin_level"="6"]
      ["wikidata"="Q514008"]->.leeCounty;
    (
      ${selectors}
    );
    out center tags;
  `
}

function getCacheKey(categoryId) {
  return `${cachePrefix}:${categoryId}`
}

function getFallbackPlaces(categoryId) {
  if (categoryId === 'all') {
    return fallbackPlaces
  }

  if (categoryId === 'restaurants' || categoryId === 'groceries') {
    return []
  }

  return fallbackPlaces.filter((place) => place.groups?.includes(categoryId))
}

function readCachedPlaces(categoryId, { allowExpired = false } = {}) {
  try {
    const rawCache = window.localStorage.getItem(getCacheKey(categoryId))
    if (!rawCache) {
      return null
    }

    const cache = JSON.parse(rawCache)
    if (!allowExpired && Date.now() - cache.savedAt > cacheDurationMs) {
      return null
    }

    return cache.places
  } catch {
    return null
  }
}

function writeCachedPlaces(categoryId, places) {
  try {
    window.localStorage.setItem(
      getCacheKey(categoryId),
      JSON.stringify({
        savedAt: Date.now(),
        places,
      }),
    )
  } catch {
    // Caching is helpful, but the directory still works if storage is unavailable.
  }
}

function clearCachedPlaces(categoryId) {
  try {
    window.localStorage.removeItem(getCacheKey(categoryId))
  } catch {
    // Refresh still works if storage is unavailable; it will just skip clearing.
  }
}

function titleCase(value) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getCategoryLabel(tags) {
  if (tags.amenity) {
    return tagLabels.amenity[tags.amenity] ?? titleCase(tags.amenity)
  }

  if (tags.shop) {
    return titleCase(tags.shop)
  }

  if (tags.tourism) {
    return tagLabels.tourism[tags.tourism] ?? titleCase(tags.tourism)
  }

  if (tags.craft) {
    return titleCase(tags.craft)
  }

  if (tags.office) {
    return `${titleCase(tags.office)} office`
  }

  return 'Local business'
}

function getAddress(tags) {
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ')
  const locality = [tags['addr:city'], tags['addr:state'], tags['addr:postcode']].filter(Boolean).join(', ')

  return [street, locality].filter(Boolean).join(' • ')
}

function getGoogleMapsUrl(place) {
  const addressQuery = place.address?.replace(/\s•\s/g, ', ')
  const query = addressQuery
    ? [place.name, addressQuery].filter(Boolean).join(', ')
    : [place.name, place.lat && place.lon ? `${place.lat},${place.lon}` : 'Lee County, Virginia'].filter(Boolean).join(', ')

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

function getWebsiteLabel(value) {
  if (value?.startsWith('mailto:')) {
    return 'Email'
  }

  return 'Website'
}

function normalizeElement(element) {
  const tags = element.tags ?? {}
  const lat = element.lat ?? element.center?.lat
  const lon = element.lon ?? element.center?.lon
  const place = {
    id: `${element.type}-${element.id}`,
    name: tags.name,
    category: getCategoryLabel(tags),
    address: getAddress(tags),
    phone: tags.phone ?? tags['contact:phone'],
    website: tags.website ?? tags['contact:website'],
    lat,
    lon,
  }

  return {
    ...place,
    googleMapsUrl: getGoogleMapsUrl(place),
  }
}

async function requestOverpass(query) {
  const errors = []

  for (const endpoint of overpassEndpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8',
        },
        body: query,
      })

      if (response.ok) {
        return response.json()
      }

      errors.push(`${new URL(endpoint).hostname} returned ${response.status}`)
    } catch (error) {
      errors.push(`${new URL(endpoint).hostname}: ${error.message}`)
    }
  }

  throw new Error(errors.join('; '))
}

async function fetchPlacesForCategory(categoryId, filters) {
  const cacheKey = getCacheKey(categoryId)

  if (!inflightRequests.has(cacheKey)) {
    inflightRequests.set(
      cacheKey,
      requestOverpass(buildOverpassQuery(filters))
        .then((data) => {
          const places = Array.from(
            new Map(
              (data.elements ?? [])
                .filter((element) => element.tags?.name)
                .map(normalizeElement)
                .map((place) => [place.name.toLowerCase(), place]),
            ).values(),
          ).sort((a, b) => a.name.localeCompare(b.name))

          writeCachedPlaces(categoryId, places)

          return {
            places,
            source: 'overpass',
          }
        })
        .finally(() => {
          inflightRequests.delete(cacheKey)
        }),
    )
  }

  return inflightRequests.get(cacheKey)
}

function DineShopPlaces() {
  const [activeCategory, setActiveCategory] = useState(categories[0].id)
  const [places, setPlaces] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [dataSource, setDataSource] = useState('')
  const [refreshRequest, setRefreshRequest] = useState({ count: 0, force: false })

  const activeFilters = useMemo(
    () => categories.find((category) => category.id === activeCategory)?.filters ?? categories[0].filters,
    [activeCategory],
  )

  useEffect(() => {
    let isCurrent = true

    async function fetchPlaces() {
      setStatus('loading')
      setError('')

      try {
        const result = await fetchPlacesForCategory(activeCategory, activeFilters)

        if (!isCurrent) {
          return
        }

        setPlaces(result.places)
        setDataSource(result.source)
        setStatus('ready')
      } catch (placesError) {
        if (!isCurrent) {
          return
        }

        const stalePlaces = readCachedPlaces(activeCategory, { allowExpired: true })

        if (stalePlaces) {
          setPlaces(stalePlaces)
          setDataSource('stale-cache')
          setError(placesError.message)
          setStatus('ready')
          return
        }

        setPlaces(getFallbackPlaces(activeCategory))
        setDataSource('fallback')
        setError(placesError.message)
        setStatus('ready')
      }
    }

    fetchPlaces()

    return () => {
      isCurrent = false
    }
  }, [activeCategory, activeFilters, refreshRequest])

  function refreshPlaces() {
    clearCachedPlaces(activeCategory)
    setRefreshRequest(({ count }) => ({ count: count + 1, force: true }))
  }

  function selectCategory(categoryId) {
    if (categoryId === activeCategory) {
      return
    }

    setPlaces([])
    setStatus('loading')
    setActiveCategory(categoryId)
  }

  return (
    <section className="places-panel" aria-label="Lee County dining and shopping businesses">
      <div className="places-toolbar" role="group" aria-label="Business categories">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            aria-pressed={activeCategory === category.id}
            className={activeCategory === category.id ? 'active' : undefined}
            onClick={() => selectCategory(category.id)}
          >
            {category.label}
          </button>
        ))}
      </div>

      {status === 'loading' && (
        <div className="places-status places-loader" role="status" aria-live="polite">
          <div id="wifi-loader" aria-hidden="true">
            <svg className="circle-outer" viewBox="0 0 86 86">
              <circle className="back" cx="43" cy="43" r="40" />
              <circle className="front" cx="43" cy="43" r="40" />
              <circle className="new" cx="43" cy="43" r="40" />
            </svg>
            <svg className="circle-middle" viewBox="0 0 60 60">
              <circle className="back" cx="30" cy="30" r="27" />
              <circle className="front" cx="30" cy="30" r="27" />
            </svg>
            <svg className="circle-inner" viewBox="0 0 34 34">
              <circle className="back" cx="17" cy="17" r="14" />
              <circle className="front" cx="17" cy="17" r="14" />
            </svg>
            <div className="text" data-text="Searching" />
          </div>
          <div className="places-loader-copy">
            <p>Mapping Lee County businesses...</p>
            <span>OpenStreetMap is checking restaurants, shops, lodging, and local stops.</span>
          </div>
        </div>
      )}

      {status === 'loading' && (
        <div className="places-grid places-grid-loading" aria-hidden="true">
          {Array.from({ length: loadingCardCount }, (_, index) => (
            <article className="place-card place-card-skeleton" key={index}>
              <div>
                <span className="skeleton-line skeleton-kicker" />
                <span className="skeleton-line skeleton-title" />
                <span className="skeleton-line skeleton-address" />
              </div>
              <div className="place-meta">
                <span className="skeleton-pill" />
                <span className="skeleton-pill" />
              </div>
              <span className="skeleton-button" />
            </article>
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="places-message">
          <h2>Business listings could not load</h2>
          <p>OpenStreetMap data is temporarily unavailable. {error}</p>
          <button type="button" onClick={refreshPlaces}>
            Try again
          </button>
        </div>
      )}

      {status === 'ready' && (
        <>
          <div className="places-summary">
            <div>
              <p>
                {places.length}{' '}
                {dataSource === 'fallback' ? 'local starter listings' : 'OpenStreetMap listings'} for this category
              </p>
              <span>
                {dataSource === 'cache' && 'Loaded from saved OpenStreetMap results.'}
                {dataSource === 'fallback' && 'Showing local starter listings. Refresh to try live OpenStreetMap data.'}
                {dataSource === 'stale-cache' && 'Showing saved results while Overpass is rate-limited.'}
                {dataSource === 'overpass' && 'Listings come from open map data and can be improved by the community.'}
              </span>
            </div>
            <button type="button" onClick={refreshPlaces}>
              Refresh listings
            </button>
          </div>
          <div className="places-osm-note">
            <p>
              Businesses are listed automatically from OpenStreetMap. If your business is not shown here, add it to the
              map and get listed for free.
            </p>
            <a
              href="https://www.openstreetmap.org/search?query=lee+county+va&zoom=18&minlon=-83.03079485893251&minlat=36.757036160455385&maxlon=-83.02307009696962&maxlat=36.76014345478498#map=10/36.7434/-83.2235"
              target="_blank"
              rel="noopener noreferrer"
            >
              Add your business
            </a>
          </div>

          {places.length === 0 ? (
            <div className="places-message">
              <h2>No local starter listings found</h2>
              <p>Refresh to try live OpenStreetMap data, try another category, or add missing local businesses to OpenStreetMap.</p>
            </div>
          ) : (
            <div className="places-grid">
              {places.map((place) => (
                <article className="place-card" key={place.id}>
                  <div>
                    <p className="place-category">{place.category}</p>
                    <h2>{place.name}</h2>
                    {place.address && (
                      <a
                        className="place-address-link"
                        href={place.googleMapsUrl ?? getGoogleMapsUrl(place)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {place.address}
                      </a>
                    )}
                  </div>
                  <div className="place-meta">
                    {place.phone && <a href={`tel:${place.phone.replace(/[^\d+]/g, '')}`}>{place.phone}</a>}
                    {place.website && (
                      <a href={place.website} target="_blank" rel="noopener noreferrer">
                        {getWebsiteLabel(place.website)}
                      </a>
                    )}
                  </div>
                  <a
                    className="place-map-link"
                    href={place.googleMapsUrl ?? getGoogleMapsUrl(place)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View on Google Maps
                  </a>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default DineShopPlaces
