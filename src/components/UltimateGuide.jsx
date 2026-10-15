import guideMarkdown from '../content/ultimate-guide-to-lee-county.md?raw'
import cumberlandGap from '../assets/cgap.webp'
import wildernessRoad from '../assets/wilder.webp'
import whiteRocks from '../assets/whiterock.webp'
import sandCave from '../assets/sandcavee.webp'
import stoneFace from '../assets/stoneface.webp'
import stoneMountainTrail from '../assets/stone.webp'
import lakeKeokee from '../assets/keeokee.webp'
import powellRiver from '../assets/powellriver.webp'
import townOfJonesville from '../assets/TownofJonesvile.webp'
import townOfPenningtonGap from '../assets/townofpenningtongap.webp'
import './UltimateGuide.css'

const sectionImages = {
  'Wilderness Road State Park': {
    src: wildernessRoad,
    alt: 'Wilderness Road State Park in Lee County, Virginia',
    width: 678,
    height: 382,
    caption: 'Wilderness Road State Park brings the region’s frontier history into the landscape.',
  },
  'White Rocks Overlook': {
    src: whiteRocks,
    alt: 'View from White Rocks Overlook above Powell Valley',
    width: 1360,
    height: 765,
    caption: 'White Rocks rises above Powell Valley and the surrounding Appalachian ridges.',
  },
  'Sand Cave': {
    src: sandCave,
    alt: 'Sand Cave in Cumberland Gap National Historical Park',
    width: 800,
    height: 445,
    caption: 'Sand Cave is a striking sandstone rockshelter in the park’s backcountry.',
  },
  'Stone Face Rock': {
    src: stoneFace,
    alt: 'Great Stone Face Rock near Pennington Gap, Virginia',
    width: 640,
    height: 400,
    caption: 'Great Stone Face Rock is one of Lee County’s most recognizable roadside landmarks.',
  },
  'Stone Mountain ATV Trail': {
    src: stoneMountainTrail,
    alt: 'Stone Mountain ATV Trail in Lee County, Virginia',
    width: 1024,
    height: 683,
    caption: 'Stone Mountain ATV Trail offers a different way to explore Lee County’s mountain terrain.',
  },
  'Lake Keokee and Outdoor Recreation': {
    src: lakeKeokee,
    alt: 'Lake Keokee surrounded by forest in Lee County, Virginia',
    width: 1200,
    height: 900,
    caption: 'Lake Keokee offers a quiet setting for fishing and time outdoors.',
  },
  'The Powell River': {
    src: powellRiver,
    alt: 'Powell River winding through Lee County, Virginia',
    width: 1920,
    height: 1080,
    caption: 'The Powell River adds paddling, fishing, and wildlife viewing to a mountain itinerary.',
  },
  'Things to Do in Jonesville, Virginia': {
    src: townOfJonesville,
    alt: 'Main Street in Jonesville, Virginia',
    width: 1400,
    height: 930,
    caption: 'Jonesville is Lee County’s historic county seat and a natural base for exploring the area.',
  },
  'Things to Do in Pennington Gap, Virginia': {
    src: townOfPenningtonGap,
    alt: 'Pennington Gap, Virginia, surrounded by mountains',
    width: 500,
    height: 332,
    caption: 'Pennington Gap connects local culture, businesses, and outdoor recreation.',
  },
}

const tableOfContentsTitles = new Set([
  'Where Is Lee County, Virginia?',
  'Why Should You Visit Lee County?',
  'Cumberland Gap National Historical Park',
  'Wilderness Road State Park',
  'Hiking in Lee County and the Cumberland Gap Region',
  'Scenic Drives Through Lee County',
  'Experience Appalachian Culture',
  'How Long Should You Spend in Lee County?',
  'A Perfect Weekend in Lee County, Virginia',
  'What Should You Pack for a Trip to Lee County?',
  'How to Stay Safe While Exploring the Mountains',
  'Start Planning Your Visit to Lee County, Virginia',
])

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function parseMarkdown(markdown) {
  const blocks = []
  let paragraphLines = []
  let activeList = null

  const flushParagraph = () => {
    if (!paragraphLines.length) return
    blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') })
    paragraphLines = []
  }

  const flushList = () => {
    if (!activeList) return
    blocks.push(activeList)
    activeList = null
  }

  markdown.trim().split('\n').forEach((line) => {
    const trimmed = line.trim()
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/)
    const unorderedMatch = trimmed.match(/^\*\s+(.+)$/)
    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/)

    if (!trimmed) {
      flushParagraph()
      flushList()
      return
    }

    if (headingMatch) {
      flushParagraph()
      flushList()
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2],
        id: slugify(headingMatch[2]),
      })
      return
    }

    if (trimmed === '---') {
      flushParagraph()
      flushList()
      blocks.push({ type: 'divider' })
      return
    }

    const listMatch = unorderedMatch ?? orderedMatch
    if (listMatch) {
      flushParagraph()
      const ordered = Boolean(orderedMatch)

      if (!activeList || activeList.ordered !== ordered) {
        flushList()
        activeList = { type: 'list', ordered, items: [] }
      }

      activeList.items.push(listMatch[1])
      return
    }

    flushList()
    paragraphLines.push(trimmed)
  })

  flushParagraph()
  flushList()
  return blocks
}

function getLinkDetails(url) {
  const parsedUrl = new URL(url)

  if (parsedUrl.hostname === 'loveleeva.com' || parsedUrl.hostname === 'www.loveleeva.com') {
    if (parsedUrl.pathname.startsWith('/directory')) {
      return { href: '/directory/', label: 'Browse the local directory', external: false }
    }

    if (parsedUrl.pathname.startsWith('/calendar')) {
      return { href: '/calendar/', label: 'View the events calendar', external: false }
    }
  }

  return { href: url, label: url, external: true }
}

function renderInline(text) {
  return text
    .split(/(\*\*.+?\*\*|https?:\/\/[^\s]+)/g)
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>
      }

      if (part.startsWith('http://') || part.startsWith('https://')) {
        const link = getLinkDetails(part)

        return (
          <a
            key={`${part}-${index}`}
            href={link.href}
            {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            {link.label}
          </a>
        )
      }

      return part
    })
}

const articleBlocks = parseMarkdown(guideMarkdown).slice(1)
const tableOfContents = articleBlocks.filter(
  (block) => block.type === 'heading' && block.level === 1 && tableOfContentsTitles.has(block.text),
)

function GuideImage({ image }) {
  return (
    <figure className="guide-inline-image">
      <img
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        loading="lazy"
        decoding="async"
      />
      <figcaption>{image.caption}</figcaption>
    </figure>
  )
}

function UltimateGuide() {
  let paragraphIndex = 0

  return (
    <article className="guide-article">
      <figure className="guide-hero">
        <img
          src={cumberlandGap}
          alt="Morning fog among the Appalachian ridges at Cumberland Gap"
          width="1440"
          height="810"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
        <figcaption>Mountain ridges and morning fog in the Cumberland Gap region.</figcaption>
      </figure>

      <nav className="guide-toc" aria-labelledby="guide-toc-title">
        <p id="guide-toc-title">In this guide</p>
        <ol>
          {tableOfContents.map((heading) => (
            <li key={heading.id}>
              <a href={`#${heading.id}`}>{heading.text}</a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="guide-body">
        {articleBlocks.map((block, blockIndex) => {
          if (block.type === 'heading') {
            const Heading = `h${Math.min(block.level + 1, 4)}`
            const image = sectionImages[block.text]

            return (
              <div className="guide-section-heading" key={`${block.id}-${blockIndex}`}>
                <Heading id={block.id}>{renderInline(block.text)}</Heading>
                {image && <GuideImage image={image} />}
              </div>
            )
          }

          if (block.type === 'list') {
            const List = block.ordered ? 'ol' : 'ul'

            return (
              <List key={`list-${blockIndex}`}>
                {block.items.map((item, itemIndex) => (
                  <li key={`${item}-${itemIndex}`}>{renderInline(item)}</li>
                ))}
              </List>
            )
          }

          if (block.type === 'divider') {
            return <hr key={`divider-${blockIndex}`} />
          }

          const isLead = paragraphIndex++ === 0

          return (
            <p className={isLead ? 'guide-lead' : undefined} key={`paragraph-${blockIndex}`}>
              {renderInline(block.text)}
            </p>
          )
        })}
      </div>
    </article>
  )
}

export default UltimateGuide
