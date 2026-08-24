import { useEffect, useRef, useState } from 'react'
import logo from '../assets/ilovelee.webp'

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/visitor-info', label: 'Visitor Info' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/artisans', label: 'Artisans' },
  { to: '/heritage', label: 'Heritage' },
  { to: '/map', label: 'Map' },
  { to: '/dine-shop', label: 'Dine & Shop' },
  { to: '/lodging', label: 'Lodging' },
  { to: '/outdoors', label: 'Outdoors' },
  { to: '/towns', label: 'Towns' },
  { to: '/weddings', label: 'Weddings' },
]

function Layout({ children, currentPath, navigate, toHref }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuButtonRef = useRef(null)

  useEffect(() => {
    if (!isMenuOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isMenuOpen])

  const handleInternalClick = (event, to) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return
    }

    event.preventDefault()
    setIsMenuOpen(false)
    navigate(to)
  }

  return (
    <div id="top" className="site-wrap">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="top-nav">
        <a href={toHref('/')} className="brand-mark" onClick={(event) => handleInternalClick(event, '/')}>
          <img src={logo} alt="I Love Lee Virginia tourism logo" width="44" height="44" />
          <span>I Love Lee</span>
        </a>
        <button
          ref={menuButtonRef}
          type="button"
          className="menu-toggle"
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMenuOpen}
          aria-controls="primary-navigation"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
        <nav
          id="primary-navigation"
          className={isMenuOpen ? 'menu-open' : undefined}
          aria-label="Primary"
        >
          {navLinks.map(({ to, label }) => (
            <a
              key={to}
              href={toHref(to)}
              className={currentPath === to ? 'active' : undefined}
              aria-current={currentPath === to ? 'page' : undefined}
              onClick={(event) => handleInternalClick(event, to)}
            >
              {label}
            </a>
          ))}
        </nav>
      </header>
      <main id="main-content" tabIndex="-1">{children}</main>
      <footer className="page-footer">
        <div className="footer-inner">
          <div className="footer-main">
            <div className="footer-brand">
              <p>I Love Lee</p>
              <span>Plan your trip through Virginia&apos;s westernmost county.</span>
            </div>
            <div className="footer-column">
              <p className="footer-heading">Visit</p>
              <a href="tel:+12765488871">(276) 548-8871</a>
              <a href="mailto:tourism@leecountyva.gov">tourism@leecountyva.gov</a>
              <span>33640 Main Street, Jonesville, VA 24263</span>
            </div>
            <nav className="footer-column footer-nav" aria-label="Footer">
              <p className="footer-heading">Explore</p>
              <a href={toHref('/visitor-info')} onClick={(event) => handleInternalClick(event, '/visitor-info')}>Visitor Info</a>
              <a href={toHref('/map')} onClick={(event) => handleInternalClick(event, '/map')}>Map</a>
              <a href={toHref('/lodging')} onClick={(event) => handleInternalClick(event, '/lodging')}>Lodging</a>
              <a href={toHref('/outdoors')} onClick={(event) => handleInternalClick(event, '/outdoors')}>Outdoors</a>
              <a href={toHref('/dine-shop')} onClick={(event) => handleInternalClick(event, '/dine-shop')}>Dine & Shop</a>
            </nav>
            <div className="footer-column footer-social">
              <p className="footer-heading">Connect</p>
              <a
                className="facebook-link"
                href="https://www.facebook.com/iloveleevirginia"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow I Love Lee Virginia on Facebook"
              >
                <span className="facebook-mark" aria-hidden="true">f</span>
                <span>Facebook</span>
              </a>
              <a className="footer-top-link" href="#top">Back to Top</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span>&copy; 2026 I Love Lee · discoverleeva.com · All Rights Reserved.</span>
            <a
              className="builder-credit"
              href="https://smithdigitals.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Built By Smith Digitals LLC
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout
