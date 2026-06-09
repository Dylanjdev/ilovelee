import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './components/Home'
import SectionPage from './components/SectionPage'

const pages = [
  {
    path: '/calendar',
    title: 'Calendar',
    description: 'Upcoming events, festivals, live performances, and community happenings across Lee County.',
  },
  {
    path: '/artisans',
    title: 'Artisans',
    description: 'Meet makers, craftspeople, and creative businesses rooted in Appalachian tradition.',
  },
  {
    path: '/heritage',
    title: 'Heritage',
    description: 'Discover stories, landmarks, and local history connected to the Cumberland Gap region.',
  },
  {
    path: '/map',
    title: 'Map',
    description: 'Navigate attractions, towns, parks, and scenic stops with a county-wide map view.',
  },
  {
    path: '/dine-shop',
    title: 'Dine & Shop',
    description: 'Find local restaurants, cafes, gift shops, and small businesses to explore during your visit.',
  },
  {
    path: '/lodging',
    title: 'Lodging',
    description: 'Browse places to stay, from cozy rentals to convenient overnight options.',
  },
  {
    path: '/outdoors',
    title: 'Outdoors',
    description: 'Plan your time on trails, overlooks, ATV routes, and recreation areas.',
  },
  {
    path: '/towns',
    title: 'Towns',
    description: 'Get to know the communities that shape the character and hospitality of Lee County.',
  },
  {
    path: '/weddings',
    title: 'Weddings',
    description: 'Explore venues and local services for mountain weddings and celebrations.',
  },
]

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        {pages.map((page) => (
          <Route
            key={page.path}
            path={page.path}
            element={<SectionPage title={page.title} description={page.description} />}
          />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
