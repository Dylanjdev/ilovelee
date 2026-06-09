import './SectionPage.css'

function SectionPage({ title, description }) {
  return (
    <div className="section-page">
      <div className="section-shell">
        <p className="section-label">Coming Soon</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </div>
  )
}

export default SectionPage
