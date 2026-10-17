import './TownCommunities.css'

const communityGroups = [
  {
    title: 'Unincorporated Communities',
    description: 'Lee County is also home to many smaller communities and locally recognized place names.',
    items: [
      { name: 'Benedict-Leona Mines' },
      { name: 'Ben Hur' },
      { name: 'Blackwater' },
      { name: 'Bonny Blue' },
      { name: 'Gibson Station' },
      { name: 'Woodway' },
      { name: 'And many others across the county' },
    ],
  },
  {
    title: 'Historic Ghost Town',
    description: 'A historic community site remembered in Lee County place references.',
    items: [{ name: 'Robbins' }],
  },
]

const sources = [
  {
    label: 'U.S. Census place geography',
    href: 'https://tigerweb.geo.census.gov/tigerwebmain/Files/acs26/tigerweb_acs26_cdp_va.html',
  },
  {
    label: 'Virginia’s 2022 St. Charles act',
    href: 'https://law.lis.virginia.gov/uncodifiedactssub/2022/session1/chapter90/',
  },
  {
    label: 'Additional populated-place references',
    href: 'https://en.wikipedia.org/wiki/Category:Populated_places_in_Lee_County,_Virginia',
  },
]

function TownCommunities() {
  return (
    <section className="community-directory" aria-labelledby="community-directory-title">
      <div className="community-directory-heading">
        <p>Across the county</p>
        <h2 id="community-directory-title">More Lee County communities</h2>
        <span>
          The profiles above introduce Lee County’s incorporated towns and current
          census-designated places. Many smaller communities and historic place names
          add to the county’s character.
        </span>
      </div>

      <div className="community-group-grid">
        {communityGroups.map((group) => (
          <article className="community-group" key={group.title}>
            <h3>{group.title}</h3>
            <p>{group.description}</p>
            <ul>
              {group.items.map((item) => (
                <li key={item.name}>
                  {item.href ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`View ${item.name} place information on Google`}
                    >
                      {item.name}
                    </a>
                  ) : (
                    <span className="community-name">{item.name}</span>
                  )}
                  {item.note && <span className="community-note">{item.note}</span>}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="community-sources" aria-label="Community information sources">
        <strong>Sources</strong>
        <div>
          {sources.map((source) => (
            <a key={source.href} href={source.href} target="_blank" rel="noopener noreferrer">
              {source.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

export default TownCommunities
