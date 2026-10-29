import { useEffect, useMemo, useState } from 'react'
import {
  assignBusinessSlugs,
  businessCanonicalUrl,
  businessCategoryLabel,
  businessPageMetadata,
  extractBusinessLocality,
  googleMapsBusinessUrl,
} from '../lib/businessDirectory'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { serializeBusinessStructuredData, STRUCTURED_DATA_SCRIPT_ID } from '../structuredData'
import './BusinessDetailPage.css'

const publicBusinessColumns = [
  'id',
  'name',
  'category',
  'description',
  'address',
  'phone',
  'business_email',
  'website_url',
  'logo_path',
  'updated_at',
].join(',')

function safeWebsiteUrl(value) {
  if (!value) return null

  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

function logoUrlForPath(logoPath) {
  if (!logoPath || !supabase) return null
  return supabase.storage.from('business-logos').getPublicUrl(logoPath).data.publicUrl
}

function updatePageMetadata(business) {
  const metadata = businessPageMetadata(business)
  const canonicalUrl = businessCanonicalUrl(business)

  document.title = metadata.title
  document.querySelector('meta[name="description"]')?.setAttribute('content', metadata.description)
  document.querySelector('meta[name="robots"]')?.setAttribute('content', 'index, follow')
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonicalUrl)
  document.querySelector('meta[property="og:type"]')?.setAttribute('content', 'business.business')
  document.querySelector('meta[property="og:url"]')?.setAttribute('content', canonicalUrl)
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', metadata.title)
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', metadata.description)
  document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', metadata.title)
  document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', metadata.description)

  let structuredDataScript = document.getElementById(STRUCTURED_DATA_SCRIPT_ID)
  if (!structuredDataScript) {
    structuredDataScript = document.createElement('script')
    structuredDataScript.id = STRUCTURED_DATA_SCRIPT_ID
    structuredDataScript.type = 'application/ld+json'
    document.head.appendChild(structuredDataScript)
  }
  structuredDataScript.textContent = serializeBusinessStructuredData(business)
}

function BusinessDetailLoading() {
  return (
    <div className="business-detail-page" aria-busy="true">
      <div className="business-detail-shell">
        <p className="business-detail-status" role="status">Loading business details…</p>
      </div>
    </div>
  )
}

function BusinessDetailPage({ slug }) {
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase) return undefined

    let active = true

    supabase
      .from('businesses')
      .select(publicBusinessColumns)
      .eq('status', 'approved')
      .order('name', { ascending: true })
      .then(({ data, error: loadError }) => {
        if (!active) return

        if (loadError) {
          setError(loadError.message)
          setBusiness(null)
        } else {
          const businesses = assignBusinessSlugs(data).map((item) => ({
            ...item,
            logo_url: logoUrlForPath(item.logo_path),
          }))
          setBusiness(businesses.find((item) => item.slug === slug) ?? null)
        }
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [slug])

  useEffect(() => {
    if (business) {
      updatePageMetadata(business)
    } else if (!loading && !error) {
      document.title = 'Business Not Found | I Love Lee'
      document.querySelector('meta[name="description"]')?.setAttribute(
        'content',
        'This Lee County business listing could not be found. Browse the business directory for current listings.',
      )
      document.querySelector('meta[name="robots"]')?.setAttribute('content', 'noindex, follow')
    }
  }, [business, error, loading])

  const websiteUrl = useMemo(() => safeWebsiteUrl(business?.website_url), [business?.website_url])

  if (loading) return <BusinessDetailLoading />

  if (!isSupabaseConfigured || error) {
    return (
      <div className="business-detail-page">
        <div className="business-detail-shell">
          <nav className="business-breadcrumbs" aria-label="Breadcrumb">
            <a href="/">Home</a><span aria-hidden="true">/</span><a href="/directory/">Business Directory</a>
          </nav>
          <section className="business-detail-message" role="alert">
            <p className="business-detail-eyebrow">Lee County Business Directory</p>
            <h1>Business details could not load</h1>
            <p>{error || 'The business directory is not connected.'}</p>
            <a className="business-primary-action" href="/directory/">Return to the directory</a>
          </section>
        </div>
      </div>
    )
  }

  if (!business) {
    return (
      <div className="business-detail-page">
        <div className="business-detail-shell">
          <nav className="business-breadcrumbs" aria-label="Breadcrumb">
            <a href="/">Home</a><span aria-hidden="true">/</span><a href="/directory/">Business Directory</a>
          </nav>
          <section className="business-detail-message">
            <p className="business-detail-eyebrow">Lee County Business Directory</p>
            <h1>Business listing not found</h1>
            <p>This listing may have moved or may no longer be published.</p>
            <a className="business-primary-action" href="/directory/">Browse current businesses</a>
          </section>
        </div>
      </div>
    )
  }

  const locality = extractBusinessLocality(business.address)
  const mapsUrl = googleMapsBusinessUrl(business)
  const phoneHref = business.phone ? `tel:${business.phone.replace(/[^\d+]/g, '')}` : null

  return (
    <article className="business-detail-page">
      <div className="business-detail-shell">
        <nav className="business-breadcrumbs" aria-label="Breadcrumb">
          <a href="/">Home</a>
          <span aria-hidden="true">/</span>
          <a href="/directory/">Business Directory</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{business.name}</span>
        </nav>

        <div className="business-detail-hero">
          <div className="business-detail-copy">
            <p className="business-detail-eyebrow">{businessCategoryLabel(business.category)}</p>
            <h1>{business.name}</h1>
            {locality && <p className="business-detail-location">{locality}, Virginia</p>}
            {business.description && <p className="business-detail-description">{business.description}</p>}

            <div className="business-detail-actions">
              {phoneHref && <a className="business-primary-action" href={phoneHref}>Call {business.phone}</a>}
              <a className="business-secondary-action" href={mapsUrl} target="_blank" rel="noopener noreferrer">
                Get directions
              </a>
              {websiteUrl && (
                <a className="business-secondary-action" href={websiteUrl} target="_blank" rel="noopener noreferrer">
                  Visit website
                </a>
              )}
            </div>
          </div>

          {business.logo_url ? (
            <div className="business-detail-logo">
              <img src={business.logo_url} alt={`${business.name} logo`} />
            </div>
          ) : (
            <div className="business-detail-monogram" aria-hidden="true">
              {business.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="business-contact-grid">
          <section>
            <p className="business-detail-eyebrow">Address</p>
            <h2>Visit {business.name}</h2>
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer">{business.address}</a>
          </section>

          <section>
            <p className="business-detail-eyebrow">Contact</p>
            <h2>Get in touch</h2>
            <div className="business-contact-links">
              {business.phone && <a href={phoneHref}>{business.phone}</a>}
              {business.business_email && <a href={`mailto:${business.business_email}`}>{business.business_email}</a>}
              {websiteUrl && <a href={websiteUrl} target="_blank" rel="noopener noreferrer">Official website</a>}
              {!business.phone && !business.business_email && !websiteUrl && <span>Use the address for current contact information.</span>}
            </div>
          </section>
        </div>

        <a className="business-directory-return" href="/directory/">← Back to all Lee County businesses</a>
      </div>
    </article>
  )
}

export default BusinessDetailPage
