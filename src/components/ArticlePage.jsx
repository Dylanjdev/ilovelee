import { useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import roadTripMarkdown from '../content/appalachian-mountain-road-trip.md?raw'
import familyVacationsMarkdown from '../content/family-vacations-in-virginia.md?raw'
import mountainCampingMarkdown from '../content/mountain-camping-virginia.md?raw'
import motorcycleTripsMarkdown from '../content/virginia-motorcycle-trips.md?raw'
import './ArticlePage.css'

const articleMarkdownBySlug = {
  'appalachian-mountain-road-trip': roadTripMarkdown,
  'family-vacations-in-virginia': familyVacationsMarkdown,
  'mountain-camping-virginia': mountainCampingMarkdown,
  'virginia-motorcycle-trips': motorcycleTripsMarkdown,
}

const getArticleBody = (article) => articleMarkdownBySlug[article.slug]
  .replace(/^# .+\n+/, '')
  .replace(/^!\[[^\]]*\]\([^\n]+\)\n+/, '')

const slugify = (value) => String(value)
  .toLowerCase()
  .replace(/[’']/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '')

const textFromChildren = (children) => (
  Array.isArray(children) ? children.join('') : children
)

const formatDate = (value) => new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
}).format(new Date(`${value}T12:00:00Z`))

function ArticlePage({ article }) {
  const articleBody = getArticleBody(article)

  useEffect(() => {
    const anchor = decodeURIComponent(window.location.hash.slice(1))
    if (!anchor) return undefined

    const timeout = window.setTimeout(() => {
      document.getElementById(anchor)?.scrollIntoView()
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [])

  return (
    <article className="story-page">
      <header className="story-masthead">
        <img
          className="story-masthead-image"
          src={article.heroImage}
          alt={article.heroAlt}
          width="1440"
          height="810"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
        <div className="story-masthead-shade" />
        <div className="story-masthead-content">
          <nav className="story-breadcrumbs" aria-label="Breadcrumb">
            <a href="/">Home</a><span aria-hidden="true">/</span>
            <a href="/articles/">Travel Stories</a><span aria-hidden="true">/</span>
            <span aria-current="page">{article.shortTitle}</span>
          </nav>
          <p className="story-kicker">{article.kicker}</p>
          <h1>{article.title}</h1>
          <p className="story-deck">{article.excerpt}</p>
          <p className="story-byline">By {article.author} · <time dateTime={article.datePublished}>{formatDate(article.datePublished)}</time></p>
        </div>
      </header>

      <p className="story-photo-note">{article.photoNote}</p>

      <div className="story-body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h2: ({ children }) => <h2 id={slugify(textFromChildren(children))}>{children}</h2>,
            h3: ({ children }) => <h3 id={slugify(textFromChildren(children))}>{children}</h3>,
            a: ({ href, children }) => {
              const isExternal = href?.startsWith('http') && !href.startsWith('https://discoverleeva.com')
              return <a href={href} {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{children}</a>
            },
            img: ({ src, alt }) => (
              <img src={src} alt={alt || ''} loading="lazy" decoding="async" />
            ),
          }}
        >
          {articleBody}
        </ReactMarkdown>
      </div>
    </article>
  )
}

export default ArticlePage
