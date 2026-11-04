import { articles } from '../articles'
import cumberlandGap from '../assets/cgap.webp'
import './ArticlePage.css'

const formatDate = (value) => new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
}).format(new Date(`${value}T12:00:00Z`))

function ArticlesIndex() {
  return (
    <div className="articles-index">
      <div className="articles-index-grid">
        {articles.map((article) => (
          <article className="article-card" key={article.slug}>
            <a className="article-card-image" href={`${article.path}/`} aria-label={`Read ${article.title}`}>
              <img
                src={cumberlandGap}
                alt="Morning fog rolling through the Appalachian ridges at Cumberland Gap"
                width="1440"
                height="810"
                loading="eager"
                decoding="async"
              />
            </a>
            <div className="article-card-copy">
              <p className="article-card-meta">Road trips · {formatDate(article.datePublished)}</p>
              <h2><a href={`${article.path}/`}>{article.title}</a></h2>
              <p>{article.excerpt}</p>
              <a className="article-card-link" href={`${article.path}/`}>Read the guide <span aria-hidden="true">→</span></a>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export default ArticlesIndex
