import { NavLink } from 'react-router-dom'
import logo from '../assets/logo.png'

const navLinks = [
  { to: '/', label: 'Home' },
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

function Layout({ children }) {
  return (
    <div className="site-wrap">
      <header className="top-nav">
        <NavLink to="/" className="brand-mark">
          <img src={logo} alt="Lee County Tourism" />
          <span>Lee County Tourism</span>
        </NavLink>
        <nav aria-label="Primary">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  )
}

export default Layout
