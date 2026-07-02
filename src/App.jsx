import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './components/Home'
import SectionPage from './components/SectionPage'
import DineShopPlaces from './components/DineShopPlaces'
import crockettStudio from './assets/crockettstudio.webp'
import cumberlandGap from './assets/cgap.webp'
import wildernessRoad from './assets/wilder.webp'
import whiteRocks from './assets/whiterock.webp'
import stoneFace from './assets/stoneface.webp'
import coalHeritage from './assets/coal.webp'

const heritageSections = [
  {
    title: 'A County with Revolutionary Roots',
    image: wildernessRoad,
    imageAlt: 'Historic Wilderness Road scene in Lee County',
    paragraphs: [
      'Lee County was established in 1792 from part of Russell County and later expanded with land from Scott County. It was named after Henry “Light-Horse Harry” Lee, a celebrated cavalry commander during the American Revolution and Governor of Virginia from 1791 to 1794.',
      'As Virginia’s westernmost county, Lee County has long served as a crossroads between the eastern United States and the expanding American frontier.',
    ],
  },
  {
    title: 'Cumberland Gap National Historical Park',
    image: cumberlandGap,
    imageAlt: 'Cumberland Gap National Historical Park landscape',
    paragraphs: [
      'For thousands of years, the Cumberland Gap served as one of the most important natural passages through the Appalachian Mountains.',
      'Long before European settlement, Indigenous peoples, including Cherokee, Shawnee, Delaware, and many other nations, used the Gap as a migration route, trading corridor, and hunting pathway. Large herds of buffalo, elk, and deer also traveled through the pass, creating well-worn trails that later became the foundation for the Wilderness Road.',
      'In 1750, explorer Thomas Walker became one of the first recorded Europeans to document the Gap, naming it after the Duke of Cumberland. Twenty-five years later, Daniel Boone helped blaze the famous Wilderness Road, allowing an estimated 200,000 to 300,000 settlers to move west into Kentucky between 1775 and 1810.',
    ],
    listTitle: 'Today, the National Historical Park offers',
    items: [
      'Nearly 70 miles of hiking trails',
      'Gap Cave guided tours',
      'The historic Hensley Settlement',
      'Scenic overlooks',
      'Visitor center museum',
      'Wildlife viewing and photography',
    ],
  },
  {
    title: 'The Boone Expedition',
    paragraphs: [
      'In October 1773, tragedy struck when Daniel Boone’s eldest son, James Boone, and several companions were killed during an attack by a coalition of Delaware, Shawnee, and Cherokee warriors near Wallen Creek.',
      'The incident occurred during Boone’s first attempt to settle Kentucky and forced the expedition to retreat, delaying permanent settlement for nearly two years.',
    ],
  },
  {
    title: 'Martin’s Station',
    paragraphs: [
      'In 1769, frontiersman Joseph Martin attempted to establish one of the earliest settlements in Powell Valley.',
      'After conflict with Native American groups, the settlement was abandoned. Martin returned in 1775 and built a fortified community known as Martin’s Station, consisting of cabins connected by defensive stockades.',
      'Although abandoned the following year, the fort became an important chapter in Virginia’s frontier history. Visitors today can experience a full-scale reconstruction at Wilderness Road State Park, where living history interpreters demonstrate frontier life throughout the year.',
    ],
  },
  {
    title: 'Wilderness Road State Park',
    paragraphs: [
      'Located in Ewing, the park preserves one of America’s most important migration routes. The park regularly hosts reenactments, educational programs, and special events celebrating Virginia’s frontier heritage.',
    ],
    listTitle: 'Visitors can enjoy',
    items: [
      'Living history demonstrations',
      'Frontier museum exhibits',
      'Historic Martin’s Station',
      'Award-winning theater presentation',
      'Seasonal festivals',
      'Hiking and family activities',
    ],
  },
  {
    title: 'Hensley Settlement',
    paragraphs: [
      'Hidden atop Brush Mountain sits Hensley Settlement, one of the best-preserved early 20th-century Appalachian communities in America.',
      'Founded by the Hensley and Gibbons families, the isolated mountain settlement remained largely self-sufficient for decades. Residents farmed, raised livestock, built their own homes, and lived without many modern conveniences.',
      'The final resident left the mountain in 1951, preserving a remarkable snapshot of Appalachian life. Guided ranger tours are available seasonally.',
    ],
  },
  {
    title: 'White Rocks',
    image: whiteRocks,
    imageAlt: 'White Rocks overlook above Powell Valley',
    paragraphs: [
      'One of Lee County’s most recognizable natural landmarks, White Rocks rises dramatically above the Cumberland Mountains.',
      'These towering limestone cliffs overlook Powell Valley and have served as a landmark for travelers since the days of the Wilderness Road. Today, White Rocks remains one of Southwest Virginia’s premier scenic overlooks and photography destinations.',
    ],
  },
  {
    title: 'Stone Face Rock',
    image: stoneFace,
    imageAlt: 'Stone Face Rock near Pennington Gap',
    paragraphs: [
      'Located near Pennington Gap, Stone Face Rock resembles the profile of a human face carved into the mountainside.',
      'Local folklore suggests it honors a Cherokee leader, while geologists attribute the formation to centuries of natural weathering and erosion. Regardless of its origin, it has become one of Lee County’s most photographed natural landmarks.',
    ],
  },
  {
    title: 'Ely Mound',
    paragraphs: [
      'The Ely Mound is Virginia’s best-preserved Native American ceremonial mound. Constructed between A.D. 1200 and 1650, it reflects the sophisticated societies that flourished throughout the Appalachian region before European contact.',
      'Archaeological research conducted in 1877 helped disprove the once-popular “Lost Race” theory by demonstrating that the mound was built by the ancestors of present-day Native American peoples. The mound remains one of Virginia’s most significant archaeological sites.',
    ],
  },
  {
    title: 'Historic Jonesville',
    paragraphs: [
      'Jonesville became Lee County’s county seat in 1794 and was named for early settler Frederick Jones.',
      'During the Civil War, Union forces burned the courthouse in 1864. The current courthouse, completed in 1933, continues to serve as the center of county government. Jonesville remains the historic heart of Lee County.',
    ],
  },
  {
    title: 'The Birthplace of Osteopathic Medicine',
    paragraphs: [
      'Andrew Taylor Still was born near Lee County’s Natural Bridge on August 6, 1828.',
      'Still developed the principles of osteopathic medicine and founded the first osteopathic medical school in Kirksville, Missouri, in 1892. Today, physicians holding the D.O. degree continue his legacy throughout the United States.',
    ],
  },
  {
    title: 'Jonesville Methodist Campground',
    paragraphs: [
      'Established in 1810, this historic campground became an important gathering place for early Methodist worship in Southwest Virginia.',
      'Its iconic wooden auditorium, completed in 1828, still stands today and remains one of Virginia’s oldest surviving camp meeting structures.',
    ],
  },
  {
    title: 'Coal Mining Heritage',
    image: coalHeritage,
    imageAlt: 'Lee County Coal Heritage Memorial',
    paragraphs: [
      'Coal mining shaped generations of families throughout Lee County and Central Appalachia.',
      'The Coal Miners Memorial in St. Charles honors the miners whose hard work powered industries across America while recognizing those who lost their lives in the mines. It stands as a tribute to the resilience, sacrifice, and strength of Appalachian communities.',
    ],
  },
  {
    title: 'Appalachian African-American Cultural Center',
    paragraphs: [
      'Located in the former African American elementary school in Pennington Gap, the Cultural Center preserves the history, heritage, and contributions of African Americans in Southwest Virginia.',
    ],
    listTitle: 'Visitors can explore',
    items: [
      'Historic one-room classroom exhibits',
      'African American literature collection',
      'Local historical archives',
      'Community heritage displays',
      'Tours available by appointment',
    ],
  },
  {
    title: 'Home to Influential Americans',
    paragraphs: [
      'Lee County has produced individuals whose influence reached far beyond Southwest Virginia.',
    ],
    items: [
      'Andrew Taylor Still, founder of osteopathic medicine',
      'C. Bascom Slemp, who served as Secretary to President Calvin Coolidge beginning in 1923',
      'Earl Taylor and the Stoney Mountain Boys, among the earliest nationally recognized bluegrass performers and one of the first bluegrass bands to perform at Carnegie Hall',
    ],
  },
]

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
    label: 'Wilderness Road Artisan Trail',
    features: [
      {
        title: 'Crockett Studio',
        location: 'Caylor, Lee County',
        image: crockettStudio,
        imageAlt: 'Crockett Studio artwork and countryside view',
        description:
          'Located on the Wilderness Road Artisan Trail in Caylor, Crockett Studio features paintings inspired by the Virginia countryside. The studio sits near the Chadwell Station Trailhead in Cumberland Gap National Historical Park, with a view from the windows that feels like part of the work.',
        note: 'Open by appointment.',
        phone: '276-445-4967',
        email: 'sscrockett@peoplepc.com',
      },
    ],
  },
  {
    path: '/heritage',
    title: 'Heritage',
    description:
      'Discover the rich heritage of Lee County, where history, natural beauty, and Appalachian culture come together in the far southwest corner of Virginia.',
    label: 'Lee County History',
    intro:
      'From the first peoples who traveled through the Cumberland Gap thousands of years ago to the pioneers who helped shape America’s westward expansion, Lee County has played a significant role in our nation’s story.',
    sections: heritageSections,
  },
  {
    path: '/map',
    title: 'Map',
    description: 'Navigate Lee County, towns, parks, attractions, and scenic stops with a county-wide map view.',
    label: 'County Map',
    intro:
      'Use the map below to explore Lee County, Virginia and orient your trip around the county’s towns, mountain corridors, parks, and nearby regional landmarks.',
    mapEmbed: {
      title: 'Google map of Lee County, Virginia',
      src: 'https://www.google.com/maps?q=Lee%20County%2C%20Virginia&output=embed',
      link: 'https://www.google.com/maps/search/?api=1&query=Lee%20County%2C%20Virginia',
      linkLabel: 'Open Lee County in Google Maps',
    },
  },
  {
    path: '/dine-shop',
    title: 'Dine & Shop',
    description: 'Find Lee County restaurants, cafes, shops, stores, lodging, and local services with live OpenStreetMap data.',
    label: 'OpenStreetMap Directory',
    intro:
      'Browse businesses and visitor stops mapped around Lee County. Results come from OpenStreetMap through the free Overpass API and update as the community improves the map.',
    content: <DineShopPlaces />,
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
            element={<SectionPage {...page} />}
          />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
