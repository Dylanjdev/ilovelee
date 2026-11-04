import { useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import articleMarkdown from '../content/appalachian-mountain-road-trip.md?raw'
import { articles } from '../articles'
import cumberlandGap from '../assets/cgap.webp'
import './ArticlePage.css'

const article = articles[0]
const articleBody = articleMarkdown
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

function ArticlePage() {
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
          src={cumberlandGap}
          alt="Morning fog rolling through the Appalachian ridges at Cumberland Gap"
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
            <span aria-current="page">Appalachian Mountain Road Trip</span>
          </nav>
          <p className="story-kicker">Road trip guide · Cumberland Gap</p>
          <h1>{article.title}</h1>
          <p className="story-deck">{article.excerpt}</p>
          <p className="story-byline">By {article.author} · <time dateTime={article.datePublished}>{formatDate(article.datePublished)}</time></p>
        </div>
      </header>

      <p className="story-photo-note">Morning fog over the Cumberland Gap region in Lee County, Virginia.</p>

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
