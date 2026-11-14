import { articleByPath } from './articles.js'

export const siteNavigation = [
  ['/', 'Home'],
  ['/visitor-info', 'Visitor Info'],
  ['/guide-to-lee-county-virginia', 'Travel Guide'],
  ['/articles', 'Travel Stories'],
  ['/community-assistance-lee-county-va', 'Community Help'],
  ['/calendar', 'Events Calendar'],
  ['/artisans', 'Artisans'],
  ['/heritage', 'History & Heritage'],
  ['/map', 'Map & Directions'],
  ['/directory', 'Business Directory'],
  ['/lodging', 'Places to Stay'],
  ['/outdoors', 'Outdoor Recreation'],
  ['/towns', 'Towns & Communities'],
  ['/weddings', 'Wedding Venues'],
]

export const siteOverviewParagraphs = [
  'Lee County is Virginia’s westernmost county, set between Kentucky and Tennessee in the Cumberland Gap region. Visitors come for Appalachian mountain scenery, outdoor recreation, frontier history, welcoming small towns, local food, and community events. Jonesville is the county seat, Pennington Gap is the largest town, and the surrounding communities each offer a distinct place to stop, explore, and spend time.',
  'Use I Love Lee to plan a day trip, weekend, or longer Southwest Virginia getaway. The guide connects places to stay, trails and overlooks, restaurants and shops, artisans, events, historic attractions, wedding venues, maps, and practical visitor information. Start with the sections below, then follow the directory and story links for detailed addresses, trip ideas, current contact information, and directions.',
]

const pageCopy = {
  '/': {
    eyebrow: 'Virginia’s westernmost county',
    heading: 'Visit Lee County, Virginia',
    paragraphs: [
      'Discover the mountain views, historic routes, outdoor adventures, and close-knit communities of Lee County. Cumberland Gap National Historical Park, Wilderness Road State Park, White Rocks, Sand Cave, the Powell River, and Stone Mountain offer memorable ways to experience this corner of Southwest Virginia.',
      'Build a trip around Jonesville, Pennington Gap, Ewing, Rose Hill, St. Charles, Keokee, Dryden, and the county’s other communities. Browse lodging, local businesses, seasonal events, heritage sites, artisans, and practical travel resources before you arrive.',
    ],
  },
  '/visitor-info': {
    eyebrow: 'Plan your visit',
    heading: 'Lee County, Virginia Visitor Information',
    paragraphs: [
      'Find the practical details you need to reach Lee County and make the most of your time here. Review the county’s location, major highways, visitor-services contact information, nearby airports, popular attractions, and answers to common trip-planning questions.',
      'Lee County is reached primarily by U.S. Route 58 and U.S. Route 421. Use Jonesville, Virginia 24263 as a central destination, then consult the county map and individual attraction pages for the best route to parks, trailheads, lodging, restaurants, and communities.',
    ],
  },
  '/community-assistance-lee-county-va': {
    eyebrow: 'Local help and essential services',
    heading: 'Lee County, Virginia Community Assistance Directory',
    paragraphs: [
      'This directory connects Lee County residents and families with food assistance, housing support, utility help, healthcare, public benefits, clothing, emergency resources, and services for seniors, people with disabilities, and caregivers.',
      'Programs, hours, eligibility rules, and funding can change. Contact an organization before traveling, explain what kind of help you need, and ask what documents to bring. For immediate danger or a life-threatening emergency, call 911.',
    ],
  },
  '/guide-to-lee-county-virginia': {
    eyebrow: 'The complete local travel guide',
    heading: 'The Ultimate Guide to Lee County, Virginia',
    paragraphs: [
      'Plan your Lee County visit with an overview of the region’s best-known scenery, historic places, trails, communities, seasons, and cultural experiences. The guide brings together Cumberland Gap, the Wilderness Road, Appalachian heritage, and practical ideas for a relaxed mountain trip.',
      'Use the sample itinerary and linked resources to combine overlooks, parks, local meals, small-town stops, and overnight stays. Check current conditions and operating hours with the relevant park, venue, or business before setting out.',
    ],
  },
  '/articles': {
    eyebrow: 'Discover Lee journal',
    heading: 'Lee County Travel Stories and Trip Ideas',
    paragraphs: [
      'Read detailed travel guides for scenic drives, family vacations, motorcycle routes, outdoor adventures, and time in the Cumberland Gap region. Each story pairs broader Virginia trip planning with practical ways to make Lee County part of the route.',
      'The collection includes realistic drive times, suggested itineraries, seasonal considerations, and links to official visitor resources. Use these stories for inspiration, then confirm current road, weather, park, and business information before traveling.',
    ],
  },
  '/calendar': {
    eyebrow: 'What’s happening in Lee County',
    heading: 'Lee County Events Calendar',
    paragraphs: [
      'Find festivals, live music, community gatherings, family activities, outdoor programs, workshops, performances, and seasonal celebrations in Jonesville, Pennington Gap, and communities across Lee County.',
      'Event details can change, so review the organizer’s latest information before attending. Local organizations can also use the calendar tools to share an event and help residents and visitors discover what is happening throughout the county.',
      'Each approved listing has a dedicated event page with its confirmed date, Eastern Time schedule, venue, street address, description, recurring schedule when applicable, and organizer website. Upcoming and recurring event pages are linked below so residents, visitors, and search engines can discover current Lee County happenings.',
    ],
  },
  '/artisans': {
    eyebrow: 'Wilderness Road Artisan Trail',
    heading: 'Lee County Artisans and Local Makers',
    paragraphs: [
      'Meet artists, craftspeople, studios, and creative businesses rooted in Lee County and Appalachian tradition. Explore locally made work, learn about each artisan’s practice, and find public contact information for studio visits, commissions, and shopping.',
      'Availability and visiting hours vary by maker. Contact an artisan directly before traveling, especially when a studio is home-based or open by appointment, and use the linked map information to plan other local stops nearby.',
    ],
  },
  '/heritage': {
    eyebrow: 'Stories from the Cumberland Gap',
    heading: 'Lee County History and Appalachian Heritage',
    paragraphs: [
      'Explore the people, routes, places, and industries that shaped Lee County. The county’s story includes Indigenous history, the Cumberland Gap, Daniel Boone and the Wilderness Road, early settlements, Civil War events, coal communities, and generations of Appalachian culture.',
      'Historic parks, museums, memorials, architecture, and living-history programs make that past tangible. Use this overview to identify places to visit, then follow official links for current tours, programs, hours, and preservation guidance.',
    ],
  },
  '/map': {
    eyebrow: 'Find your way around the county',
    heading: 'Lee County Map and Visitor Directions',
    paragraphs: [
      'Locate Jonesville, Pennington Gap, Ewing, Rose Hill, St. Charles, Keokee, Dryden, Stickleyville, and other Lee County communities. Use the county map to understand where parks, attractions, lodging, restaurants, and scenic stops sit in relation to one another.',
      'Mountain travel can take longer than mileage alone suggests. Check current navigation and road conditions before leaving, allow extra time on winding routes, and confirm the exact address for rural trailheads, cabins, event venues, and small businesses.',
    ],
  },
  '/directory': {
    eyebrow: 'Eat, shop, stay, and find local services',
    heading: 'Lee County, Virginia Business Directory',
    paragraphs: [
      'Browse approved listings for restaurants, cafés, grocery stores, shops, lodging, and local services throughout Lee County. Each dedicated listing provides an address, category, directions, and available public contact information.',
      'Business hours, services, and availability may change. Open a listing for details, then contact the business or visit its official website before making a special trip. Lee County businesses can also submit a free listing for review.',
    ],
  },
  '/lodging': {
    eyebrow: 'Rest between mountain adventures',
    heading: 'Places to Stay in Lee County, Virginia',
    paragraphs: [
      'Explore cabins, vacation rentals, campgrounds, RV sites, historic properties, and convenient overnight options near Cumberland Gap, Wilderness Road State Park, Jonesville, Pennington Gap, and other Lee County destinations.',
      'Compare the setting and amenities that fit your trip, whether you want a quiet mountain retreat, a family basecamp, or easy access to trails and historic sites. Contact each property for current rates, policies, accessibility details, and availability.',
    ],
  },
  '/outdoors': {
    eyebrow: 'Trails, water, overlooks, and open space',
    heading: 'Outdoor Recreation in Lee County, Virginia',
    paragraphs: [
      'Plan hikes to White Rocks and Sand Cave, explore Cumberland Gap and Wilderness Road State Park, ride designated ATV routes, paddle or fish the Powell River, and discover lakes, campgrounds, wildlife, and scenic overlooks across Lee County.',
      'Conditions in the mountains can change quickly. Check forecasts, land-manager alerts, permits, trail rules, seasonal closures, and daylight before setting out. Carry water, use marked public access, and leave private property undisturbed.',
    ],
  },
  '/towns': {
    eyebrow: 'Get to know the county’s communities',
    heading: 'Jonesville, Pennington Gap, and Lee County Towns',
    paragraphs: [
      'Explore the communities that give Lee County its character, including Jonesville, Pennington Gap, St. Charles, Dryden, Ewing, Keokee, Rose Hill, Stickleyville, Ben Hur, and Blackwater. Each offers a different connection to local history, landscapes, businesses, and events.',
      'Use the community guide to plan small-town stops alongside parks and scenic drives. Check the events calendar and business directory for current places to eat, shop, stay, and spend time during your visit.',
    ],
  },
  '/weddings': {
    eyebrow: 'Celebrate in the mountains',
    heading: 'Lee County Wedding Venues and Celebration Spaces',
    paragraphs: [
      'Explore mountain-view venues, historic properties, outdoor settings, and local spaces for weddings and celebrations in Ewing, Jonesville, Pennington Gap, and across Lee County. The region offers distinctive Appalachian scenery and welcoming communities for an intimate gathering or a larger event.',
      'Contact venues directly to discuss capacity, dates, accessibility, weather plans, catering, alcohol policies, rentals, and other requirements. The business directory can help you find additional lodging, food, shopping, and local services for guests.',
    ],
  },
}

export function staticPageContentForRoute(route) {
  const article = articleByPath(route)

  if (article) {
    return {
      eyebrow: article.kicker,
      heading: article.title,
      paragraphs: [
        article.excerpt,
        article.description,
        'Use this travel story to compare routes and build an itinerary, then follow the official resources linked in the full article for current road conditions, park information, operating hours, safety guidance, and local trip-planning details.',
      ],
    }
  }

  return pageCopy[route]
}
