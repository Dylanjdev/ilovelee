import { articles } from '../articles'
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
        {articles.map((article, index) => (
          <article className="article-card" key={article.slug}>
            <a className="article-card-image" href={`${article.path}/`} aria-label={`Read ${article.title}`}>
              <img
                src={article.heroImage}
                alt={article.heroAlt}
                width="1440"
                height="810"
                loading={index === 0 ? 'eager' : 'lazy'}
                decoding="async"
              />
            </a>
            <div className="article-card-copy">
              <p className="article-card-meta">{article.cardLabel} · {formatDate(article.datePublished)}</p>
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
