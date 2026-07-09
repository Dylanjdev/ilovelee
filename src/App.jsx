import { useEffect, useState } from 'react'
import Layout from './components/Layout'
import Home from './components/Home'
import PageRoutes from './PageRoutes.jsx'

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')

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
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])

  useEffect(() => {
    const animatedElements = document.querySelectorAll('.reveal, .feature-card, .heritage-section')

    if (!('IntersectionObserver' in window)) {
      animatedElements.forEach((element) => element.classList.add('is-visible'))
      return undefined
    }

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

    animatedElements.forEach((element, index) => {
      element.style.setProperty('--reveal-delay', `${Math.min(index % 8, 7) * 70}ms`)
      observer.observe(element)
    })

    return () => observer.disconnect()
  }, [pathname])

  return (
    <Layout currentPath={pathname} navigate={navigate} toHref={toHref}>
      {pathname === '/' ? (
        <Home />
      ) : (
        <PageRoutes pathname={pathname} />
      )}
    </Layout>
  )
}

export default App
