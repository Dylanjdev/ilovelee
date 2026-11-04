export const articles = [
  {
    slug: 'appalachian-mountain-road-trip',
    path: '/articles/appalachian-mountain-road-trip',
    title: 'Appalachian Mountain Road Trip: Routes, Timing and a Cumberland Gap Basecamp',
    description:
      'Plan an Appalachian mountain road trip with scenic route comparisons, realistic drive times, a four-day Cumberland Gap itinerary, and practical mountain-road tips.',
    excerpt:
      'Compare the Appalachians’ classic scenic drives, understand real mountain travel times, and plan four days around Cumberland Gap and Lee County, Virginia.',
    heroImage:
      'https://media.babylovegrowth.ai/blog-images/organization-28977/1793774794323_Mountain-ridges-viewed-from-Cumberland-Gap.jpeg',
    heroAlt: 'Mountain ridges viewed from Cumberland Gap',
    datePublished: '2026-11-04',
    dateModified: '2026-11-04',
    author: 'Discover Lee',
  },
]

export const articleByPath = (pathname) =>
  articles.find((article) => article.path === pathname)
