export const articles = [
  {
    slug: 'family-vacations-in-virginia',
    path: '/articles/family-vacations-in-virginia',
    title: 'Family Vacations in Virginia: Where to Go and What to Do',
    shortTitle: 'Family Vacations in Virginia',
    description:
      'Plan a family vacation in Virginia by region, compare mountain, coastal and history trips, and follow a three-day Lee County family itinerary.',
    excerpt:
      'Compare Virginia’s best regions for families, match activities to your children’s ages, and plan three easygoing days in Lee County.',
    heroImage:
      'https://media.babylovegrowth.ai/blog-images/organization-28977/1793774934898_Family-looking-across-Cumberland-Gap-mountains.jpeg',
    heroAlt: 'Family looking across the Cumberland Gap mountains',
    photoNote: 'A family takes in the mountain views of the Cumberland Gap region.',
    cardLabel: 'Family travel',
    kicker: 'Family vacation guide · Virginia',
    datePublished: '2026-11-06',
    dateModified: '2026-11-06',
    author: 'Discover Lee',
  },
  {
    slug: 'appalachian-mountain-road-trip',
    path: '/articles/appalachian-mountain-road-trip',
    title: 'Appalachian Mountain Road Trip: Routes, Timing and a Cumberland Gap Basecamp',
    shortTitle: 'Appalachian Mountain Road Trip',
    description:
      'Plan an Appalachian mountain road trip with scenic route comparisons, realistic drive times, a four-day Cumberland Gap itinerary, and practical mountain-road tips.',
    excerpt:
      'Compare the Appalachians’ classic scenic drives, understand real mountain travel times, and plan four days around Cumberland Gap and Lee County, Virginia.',
    heroImage:
      'https://media.babylovegrowth.ai/blog-images/organization-28977/1793774794323_Mountain-ridges-viewed-from-Cumberland-Gap.jpeg',
    heroAlt: 'Mountain ridges viewed from Cumberland Gap',
    photoNote: 'Morning fog over the Cumberland Gap region in Lee County, Virginia.',
    cardLabel: 'Road trips',
    kicker: 'Road trip guide · Cumberland Gap',
    datePublished: '2026-11-04',
    dateModified: '2026-11-04',
    author: 'Discover Lee',
  },
]

export const articleByPath = (pathname) =>
  articles.find((article) => article.path === pathname)
