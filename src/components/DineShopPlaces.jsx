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

function normalizeElement(element) {
  const tags = element.tags ?? {}
  const lat = element.lat ?? element.center?.lat
  const lon = element.lon ?? element.center?.lon
  const osmType = element.type === 'way' ? 'way' : element.type === 'relation' ? 'relation' : 'node'

  return {
    id: `${element.type}-${element.id}`,
    name: tags.name,
    category: getCategoryLabel(tags),
    address: getAddress(tags),
    phone: tags.phone ?? tags['contact:phone'],
    website: tags.website ?? tags['contact:website'],
    lat,
    lon,
    osmUrl: `https://www.openstreetmap.org/${osmType}/${element.id}`,
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

async function fetchPlacesForCategory(categoryId, filters, { forceRefresh = false } = {}) {
  const cacheKey = getCacheKey(categoryId)
  const cachedPlaces = forceRefresh ? null : readCachedPlaces(categoryId)

  if (cachedPlaces) {
    return {
      places: cachedPlaces,
      source: 'cache',
    }
  }

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
  const [status, setStatus] = useState('idle')
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
        const result = await fetchPlacesForCategory(activeCategory, activeFilters, {
          forceRefresh: refreshRequest.force,
        })

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

        setDataSource('')
        setError(placesError.message)
        setStatus('error')
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

  return (
    <section className="places-panel" aria-label="Lee County dining and shopping businesses">
      <div className="places-toolbar" role="tablist" aria-label="Business categories">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            role="tab"
            aria-selected={activeCategory === category.id}
            className={activeCategory === category.id ? 'active' : undefined}
            onClick={() => setActiveCategory(category.id)}
          >
            {category.label}
          </button>
        ))}
      </div>

      {status === 'loading' && <p className="places-status">Loading Lee County businesses from OpenStreetMap...</p>}

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
              <p>{places.length} OpenStreetMap listings for this category</p>
              <span>
                {dataSource === 'cache' && 'Loaded from saved OpenStreetMap results.'}
                {dataSource === 'stale-cache' && 'Showing saved results while Overpass is rate-limited.'}
                {dataSource === 'overpass' && 'Listings come from open map data and can be improved by the community.'}
              </span>
            </div>
            <button type="button" onClick={refreshPlaces}>
              Refresh listings
            </button>
          </div>

          {places.length === 0 ? (
            <div className="places-message">
              <h2>No listings found</h2>
              <p>Try another category or add missing local businesses to OpenStreetMap.</p>
            </div>
          ) : (
            <div className="places-grid">
              {places.map((place) => (
                <article className="place-card" key={place.id}>
                  <div>
                    <p className="place-category">{place.category}</p>
                    <h2>{place.name}</h2>
                    {place.address && <p>{place.address}</p>}
                  </div>
                  <div className="place-meta">
                    {place.phone && <a href={`tel:${place.phone.replace(/[^\d+]/g, '')}`}>{place.phone}</a>}
                    {place.website && (
                      <a href={place.website} target="_blank" rel="noopener noreferrer">
                        Website
                      </a>
                    )}
                  </div>
                  <a className="place-map-link" href={place.osmUrl} target="_blank" rel="noopener noreferrer">
                    View on OpenStreetMap
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
