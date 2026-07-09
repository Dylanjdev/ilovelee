import './SectionPage.css'

function SectionPage({
  title,
  description,
  label = 'Coming Soon',
  intro,
  features = [],
  sections = [],
  mapEmbed,
  content,
}) {
  const hasFeatures = features.length > 0
  const hasSections = sections.length > 0

  return (
    <div className="section-page">
      <div className="section-shell">
        <div className="section-page-header">
          <p className="section-label">{label}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>

        {intro && <p className="section-intro">{intro}</p>}

        {mapEmbed && (
          <section className="map-embed-section" aria-label={mapEmbed.title}>
            <iframe
              title={mapEmbed.title}
              src={mapEmbed.src}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
            {mapEmbed.link && (
              <a
                className="map-open-link"
                href={mapEmbed.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                {mapEmbed.linkLabel ?? 'Open in Google Maps'}
              </a>
            )}
          </section>
        )}

        {content}

        {hasFeatures && (
          <div className="feature-list">
            {features.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <div className="feature-media-frame">
                  {feature.video ? (
                    <video
                      className="feature-media"
                      src={feature.video}
                      aria-label={feature.videoLabel ?? feature.imageAlt}
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <img
                      className="feature-media"
                      src={feature.image}
                      alt={feature.imageAlt}
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                  {feature.credit && (
                    <p className="feature-credit">
                      Credit:{' '}
                      <a href={feature.credit.href} target="_blank" rel="noopener noreferrer">
                        {feature.credit.label}
                      </a>
                    </p>
                  )}
                </div>
                <div className="feature-copy">
                  {feature.location && <p className="feature-location">{feature.location}</p>}
                  <h2>{feature.title}</h2>
                  <p>{feature.description}</p>
                  {feature.address && <p className="feature-address">{feature.address}</p>}
                  {feature.note && <p className="feature-note">{feature.note}</p>}
                  <div className="feature-actions">
                    {feature.phone && <a href={`tel:+1${feature.phone.replace(/\D/g, '')}`}>{feature.phone}</a>}
                    {feature.email && <a href={`mailto:${feature.email}`}>{feature.email}</a>}
                    {feature.links?.map((link) => (
                      <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {hasSections && (
          <div className="heritage-story">
            {sections.map((section) => (
              <article
                className={`heritage-section${section.image ? ' has-image' : ''}`}
                key={section.title}
              >
                {section.image && (
                  <img src={section.image} alt={section.imageAlt ?? ''} loading="lazy" decoding="async" />
                )}
                <div className="heritage-section-copy">
                  <h2>{section.title}</h2>
                  {section.paragraphs?.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.items && (
                    <div className="heritage-list-block">
                      {section.listTitle && <h3>{section.listTitle}</h3>}
                      <ul>
                        {section.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SectionPage
