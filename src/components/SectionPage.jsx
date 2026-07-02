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
                <img src={feature.image} alt={feature.imageAlt} />
                <div className="feature-copy">
                  {feature.location && <p className="feature-location">{feature.location}</p>}
                  <h2>{feature.title}</h2>
                  <p>{feature.description}</p>
                  {feature.note && <p className="feature-note">{feature.note}</p>}
                  <div className="feature-actions">
                    {feature.phone && <a href={`tel:+1${feature.phone.replace(/\D/g, '')}`}>{feature.phone}</a>}
                    {feature.email && <a href={`mailto:${feature.email}`}>{feature.email}</a>}
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
                  <img src={section.image} alt={section.imageAlt ?? ''} />
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
