import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import Layout from './components/Layout'
import Home from './components/Home'
import './components/SectionPage.css'

const PageRoutes = lazy(() => import('./PageRoutes.jsx'))

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
const pageTitles = {
  '/': 'I Love Lee | Lee County Virginia Tourism',
  '/calendar': 'Calendar | I Love Lee',
  '/artisans': 'Artisans | I Love Lee',
  '/heritage': 'Heritage | I Love Lee',
  '/map': 'Map | I Love Lee',
  '/dine-shop': 'Dine & Shop | I Love Lee',
  '/lodging': 'Lodging | I Love Lee',
  '/outdoors': 'Outdoors | I Love Lee',
  '/towns': 'Towns | I Love Lee',
  '/weddings': 'Weddings | I Love Lee',
}
const routeFallbacks = {
  '/calendar': {
    label: 'Lee County Events',
    title: 'Calendar',
    description: 'Upcoming events, festivals, live performances, and community happenings across Lee County.',
  },
  '/artisans': {
    label: 'Wilderness Road Artisan Trail',
    title: 'Artisans',
    description: 'Meet makers, craftspeople, and creative businesses rooted in Appalachian tradition.',
  },
  '/heritage': {
    label: 'Lee County History',
    title: 'Heritage',
    description: 'Discover the rich heritage of Lee County, where history, natural beauty, and Appalachian culture come together in the far southwest corner of Virginia.',
  },
  '/map': {
    label: 'County Map',
    title: 'Map',
    description: 'Navigate Lee County, towns, parks, attractions, and scenic stops with a county-wide map view.',
  },
  '/dine-shop': {
    label: 'Lee County Business Directory',
    title: 'Dine & Shop',
    description: 'Find approved Lee County restaurants, cafes, shops, stores, lodging, and local services.',
  },
  '/lodging': {
    label: 'Places to Stay',
    title: 'Lodging',
    description: 'Browse places to stay, from cozy rentals to convenient overnight options.',
  },
  '/outdoors': {
    label: 'Outdoor Recreation',
    title: 'Outdoors',
    description: 'Plan your time on trails, overlooks, ATV routes, and recreation areas.',
  },
  '/towns': {
    label: 'Lee County Communities',
    title: 'Towns',
    description: 'Get to know the communities that shape the character and hospitality of Lee County.',
  },
  '/weddings': {
    label: 'Wedding Venues',
    title: 'Weddings',
    description: 'Explore venues and local services for mountain weddings and celebrations.',
  },
}

function RouteFallback({ pathname }) {
  const route = routeFallbacks[pathname] ?? {
    label: 'I Love Lee',
    title: 'Page Not Found',
    description: 'Return home to keep exploring Lee County.',
  }

  return (
    <div className="section-page" aria-busy="true">
      <div className="section-shell">
        <div className="section-page-header">
          <p className="section-label">{route.label}</p>
          <h1>{route.title}</h1>
          <p>{route.description}</p>
        </div>
        <div className="route-loading" role="status">
          <span className="visually-hidden">Loading page content…</span>
        </div>
      </div>
    </div>
  )
}

function normalizePath(path) {
  if (!path || path === '/') {
    return '/'
  }

  return path.replace(/\/+$/, '') || '/'
}

function getCurrentPath() {
  const pathname = window.location.pathname
  const withoutBase = basePath && pathname.startsWith(basePath)
    ? pathname.slice(basePath.length)
    : pathname

  return normalizePath(withoutBase)
}

function toHref(path) {
  const normalizedPath = normalizePath(path)

  return `${basePath}${normalizedPath === '/' ? '/' : normalizedPath}`
}

function App() {
  const [pathname, setPathname] = useState(getCurrentPath)
  const hasNavigated = useRef(false)

  const navigate = (path) => {
    const normalizedPath = normalizePath(path)

    if (normalizedPath === pathname) return
    window.history.pushState({}, '', toHref(normalizedPath))
    setPathname(normalizedPath)
  }

  useEffect(() => {
    const handlePopState = () => setPathname(getCurrentPath())

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    const canonicalPath = pathname === '/' ? '/' : `${pathname}/`
    const canonicalUrl = new URL(canonicalPath, 'https://discoverleeva.com').href

    document.title = pageTitles[pathname] ?? 'Page Not Found | I Love Lee'
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonicalUrl)
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', canonicalUrl)
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })

    if (hasNavigated.current) {
      document.getElementById('main-content')?.focus({ preventScroll: true })
    } else {
      hasNavigated.current = true
    }
  }, [pathname])

  useEffect(() => {
    const mainContent = document.getElementById('main-content')
    const revealSelector = '.reveal, .feature-card, .heritage-section'

    if (!mainContent) return undefined

    const getAnimatedElements = (node) => {
      if (!(node instanceof Element)) return []

      return [
        ...(node.matches(revealSelector) ? [node] : []),
        ...node.querySelectorAll(revealSelector),
      ]
    }

    if (!('IntersectionObserver' in window)) {
      const showElements = (node) => {
        getAnimatedElements(node).forEach((element) => element.classList.add('is-visible'))
      }

      showElements(mainContent)
      const mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => mutation.addedNodes.forEach(showElements))
      })
      mutationObserver.observe(mainContent, { childList: true, subtree: true })

      return () => mutationObserver.disconnect()
    }

    let revealIndex = 0
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
    )

    const observeElements = (node) => {
      getAnimatedElements(node).forEach((element) => {
        element.style.setProperty('--reveal-delay', `${Math.min(revealIndex % 8, 7) * 70}ms`)
        revealIndex += 1
        observer.observe(element)
      })
    }

    observeElements(mainContent)
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => mutation.addedNodes.forEach(observeElements))
    })
    mutationObserver.observe(mainContent, { childList: true, subtree: true })

    return () => {
      mutationObserver.disconnect()
      observer.disconnect()
    }
  }, [pathname])

  return (
    <Layout currentPath={pathname} navigate={navigate} toHref={toHref}>
      {pathname === '/' ? (
        <Home />
      ) : (
        <Suspense fallback={<RouteFallback pathname={pathname} />}>
          <PageRoutes pathname={pathname} />
        </Suspense>
      )}
    </Layout>
  )
}

export default App
