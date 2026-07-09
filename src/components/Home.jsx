import { useEffect, useState } from 'react'
import logo from '../assets/logo.webp'
import leecobridge from '../assets/leecobridge.webp'
import whiterock from '../assets/whiterock.webp'
import sandcaves from '../assets/sandcavee.webp'
import stoneface from '../assets/stoneface.webp'
import ceaderhill from '../assets/ceaderhill.webp'
import leeTheatre from '../assets/LeeThee.webp'
import stone from '../assets/stone.webp'
import cgap from '../assets/cgap.webp'
import keeokee from '../assets/keeokee.webp'
import coal from '../assets/coal.webp'
import justoff from '../assets/justoff.webp'
import wilder from '../assets/wilder.webp'
import ilovelee from '../assets/ilovelee.webp'
import leeco1 from '../assets/leeco1.webp'
import leeco2 from '../assets/leeco2.webp'
import leeco3 from '../assets/leeco3.webp'
import leeco4 from '../assets/leeco4.webp'
import leeco5 from '../assets/leeco5.webp'
import leeco6 from '../assets/leeco6.webp'
import visitorGuidePdf from '../assets/Lee County Virginia.pdf'
import './Home.css'

const destinations = [
	{
		name: 'White Rocks Overlook',
		location: 'Rose Hill, Lee County',
		file: 'whiterock.webp',
		image: whiterock,
		link: 'https://share.google/8QLWpznBGsCLVRV2G',
		detail: 'Three miles of absolute splendor, one of the most photographed spots in Lee County and a beacon for locals. Worth the drive any time of year. Want to stand on top? The trail begins at Thomas Walker Civic Park.',
	},
	{
		name: 'Sand Caves',
		location: 'Ewing, Lee County',
		file: 'sandcavvee.webp',
		image: sandcaves,
		link: 'https://gohikevirginia.com/sand-cave-hike/',
		detail: 'A unique natural feature and popular family stop.',
	},
	{
		name: 'Stone Face Rock',
		location: 'Pennington Gap, Lee County',
		image: stoneface,
		link: 'https://share.google/FEZySf93tEm87VOsd',
		detail: 'A signature landmark known for dramatic scenery.',
	},
	{
		name: 'Cedar Hill Country Club',
		location: 'Jonesville, Lee County',
		file: 'ceaderhill.webp',
		image: ceaderhill,
		link: 'https://share.google/F6e7uqD0OEB5MpAi8',
		detail: 'Relaxed recreation with mountain surroundings.',
	},
	{
		name: 'Stone Mountain ATV Trail',
		file: 'spearheadtrailsstpaul.jpg',
		image: stone,
		link: 'https://www.spearheadtrails.com/pages/stone-mountain',
		detail: 'Adventure routes and multi-day riding opportunities.',
	},
	{
		name: 'Cumberland Gap National Park',
		image: cgap,
		link: 'https://www.nps.gov/cuga/index.htm',
		detail: 'Regional heritage and iconic mountain passages.',
	},
	{
		name: 'Lake Keokee Loop',
		location: 'Keokee, Lee County',
		image: keeokee,
		link: 'https://dwr.virginia.gov/waterbody/lake-keokee/#overview',
		detail: 'Circle a 92-acre mountain lake on a 3.7-mile loop used for hiking, fishing, picnics, and wildlife watching. The area includes a paved launch ramp and fishing for largemouth bass, bluegill, redear sunfish, and channel catfish.',
	},
	{
		name: 'Lee Theatre',
		location: 'Pennington Gap, Lee County',
		image: leeTheatre,
		link: 'https://www.leetheatre.org/',
		detail: 'Community entertainment in a historic downtown setting.',
	},
	{
		name: 'Lee County Coal Heritage Memorial',
		location: 'Lee County, Virginia',
		image: coal,
		imageFit: 'contain',
		link: 'https://share.google/4RzK5GOlDctjm3K2Z',
		detail: 'A simple, meaningful memorial honoring Lee County coal heritage and the hardworking men, women, and children whose labor shaped Central Appalachia. It also remembers those who were lost while providing for their families.',
	},
]

const initialDestinationCount = 6

const partnerLogos = [
	{ image: leeco1, alt: 'Lee County tourism partner logo 1' },
	{ image: leeco2, alt: 'Lee County tourism partner logo 2', href: 'https://www.proartva.org/' },
	{ image: leeco3, alt: 'Lee County tourism partner logo 3', href: 'https://www.virginia.org/' },
	{ image: leeco4, alt: 'Lee County tourism partner logo 4', href: 'https://thecrookedroadva.com/' },
	{ image: leeco5, alt: 'Lee County tourism partner logo 5', href: 'https://heartofappalachia.com/' },
	{ image: leeco6, alt: 'Lee County tourism partner logo 6', href: 'https://vca.virginia.gov/' },
]

function Home() {
	const [showMoreDestinations, setShowMoreDestinations] = useState(false)
	const [loadDeferredMedia, setLoadDeferredMedia] = useState(false)
	const visibleDestinations = showMoreDestinations
		? destinations
		: destinations.slice(0, initialDestinationCount)

	useEffect(() => {
		let timeoutId

		const scheduleMedia = () => {
			timeoutId = window.setTimeout(() => setLoadDeferredMedia(true), 450)
		}

		if (document.readyState === 'complete') {
			scheduleMedia()
		} else {
			window.addEventListener('load', scheduleMedia, { once: true })
		}

		return () => {
			window.removeEventListener('load', scheduleMedia)
			window.clearTimeout(timeoutId)
		}
	}, [])

	return (
		<div className="home-page">
			<section className="hero-band">
				<div className="section-shell hero-layout">
					<div className="hero-content">
						<p className="hero-label">Welcome to Lee County, Virginia</p>
						<h1>Your Mountain Basecamp for Scenic Roads, Outdoor Adventure, and Local Stories</h1>
						<p>
							Set in the far southwest corner of the Commonwealth, Lee County is
							where Appalachian landscapes and community tradition come together.
						</p>
						<div className="hero-cta">
							<a href="#destinations">Browse Places</a>
							<a href="#visit">Plan Your Visit</a>
						</div>
					</div>

					<div className="hero-visual">
						<img
							src={leecobridge}
							alt="Scenic bridge in Lee County, Virginia"
							width="500"
							height="335"
							decoding="async"
							fetchPriority="high"
							loading="eager"
						/>
						<div className="hero-card">
							<p>Trip notes</p>
							<strong>Far southwest Virginia</strong>
							<span>Overlooks, trails, heritage, and mountain-town stops.</span>
						</div>
						<div className="hero-stats" aria-label="Lee County trip highlights">
							<span>Scenic overlooks</span>
							<span>Outdoor routes</span>
							<span>Small-town stops</span>
						</div>
					</div>
				</div>
			</section>

			<section className="quick-strip reveal" aria-label="Key highlights">
				<p><span>01</span> White Rocks</p>
				<p><span>02</span> Wilderness Road State Park</p>
				<p><span>03</span> Stone Mountain ATV Trail</p>
				<p><span>04</span> Cumberland Gap Region</p>
			</section>

			<section id="destinations" className="destinations-section reveal section-shell">
				<div className="destinations-header">
					<div className="section-heading">
						<h2>Places to See Across Lee County</h2>
						<p>
							Build a day around overlooks, trails, historic landmarks, live
							performances, and easygoing stops tucked into the mountains.
						</p>
					</div>
				</div>

				<div className="destination-list">
					{visibleDestinations.map((destination, i) => (
						(() => {
							const isNewCard = showMoreDestinations && i >= initialDestinationCount

							return (
								<div
									key={destination.name}
									className={`dest-wrap reveal${isNewCard ? ' dest-new-card' : ''}`}
									style={{ animationDelay: `${i * 0.06}s` }}
								>
									<div className="dest-overlay">
										<div className="dest-label-strip">
											<span className="dest-region">Lee County, VA</span>
											<h3>{destination.name}</h3>
										</div>
										<div
											className={`dest-image${destination.imageFit === 'contain' ? ' dest-image-contain' : ''}`}
											style={{
												backgroundImage: loadDeferredMedia
													? `url(${destination.image ?? logo})`
													: undefined,
											}}
											aria-hidden="true"
										/>
										<div className="dest-dots" aria-hidden="true">
											<div className="dest-dot" />
											<div className="dest-dot" />
											<div className="dest-dot" />
										</div>
									</div>
									<div className="dest-text">
										<h3>{destination.name}</h3>
										{destination.location && <p className="dest-location">{destination.location}</p>}
										<p>{destination.detail}</p>
										<a className="dest-map-link" href={destination.link} target="_blank" rel="noopener noreferrer">
											Explore this stop
										</a>
									</div>
								</div>
							)
						})()
					))}
					{!showMoreDestinations && (
						<div className="dest-view-more reveal">
							<button type="button" onClick={() => setShowMoreDestinations(true)}>View More</button>
						</div>
					)}
				</div>
			</section>

			<section id="visit" className="brochure-section reveal">
				<div className="section-shell brochure-inner">
					<div>
						<p className="section-kicker">Visitor Guide</p>
						<h2>Request the New Lee County Visitor Guide</h2>
						<p>
							For a free copy by mail, call{' '}
							<a href="tel:+12763467766">(276) 346-7766</a> or{' '}
							<a href="mailto:tourism@leecountyva.gov">email tourism staff</a>.
						</p>
					</div>
					<a
						className="brochure-download"
						href={visitorGuidePdf}
						target="_blank"
						rel="noopener noreferrer"
					>
						View the Visitor Guide PDF
					</a>
				</div>
			</section>

			<section id="story" className="story-section reveal section-shell">
				<div className="story-image-wrap">
					<img
						className="story-main-image"
						src={justoff}
						alt="Scenic view just off the Wilderness Road"
						loading="lazy"
						decoding="async"
					/>
					<div className="story-inset-image">
						<img src={wilder} alt="Wilderness Road historic scene" loading="lazy" decoding="async" />
						<span>Wilderness Road heritage</span>
					</div>
				</div>
				<div className="story-copy">
					<p className="story-kicker">Just off the Wilderness Road</p>
					<h2>Mountain scenery, local stories, and room to wander.</h2>
					<p>
						Lee County invites you to slow down and discover the communities,
						landmarks, and local stories that have shaped the Cumberland Gap
						region for generations.
					</p>
					<p>
						From mountain overlooks and winding trails to historic places,
						performances, and small-town stops, this guide helps you find your
						way through one of Appalachia&apos;s most scenic corners.
					</p>
					<a
						href="https://justoffthewildernessroad.com/Main/Welcome.html/"
						className="learn-link"
						target="_blank"
						rel="noopener noreferrer"
					>
						Read More About the Region
					</a>
				</div>
			</section>

			<section id="contact" className="contact-section reveal section-shell">
				<div className="section-heading">
					<h2>Contact Lee County Tourism</h2>
					<p>Need help planning the trip? Reach out to the tourism office.</p>
				</div>
				<div className="contact-layout">
					<div className="contact-image">
						<img src={ilovelee} alt="I Love Lee County tourism graphic" loading="lazy" decoding="async" />
					</div>
					<div className="contact-grid">
						<div>
							<p className="contact-label">Address</p>
							<p>33640 Main Street • Jonesville, VA 24263</p>
						</div>
						<div>
							<p className="contact-label">Phone</p>
							<p>
								<a href="tel:+12765488871">(276) 548-8871</a>
							</p>
						</div>
						<div>
							<p className="contact-label">Fax</p>
							<p>
								<a href="tel:+12763464016">(276) 346-4016</a>
							</p>
						</div>
						<div>
							<p className="contact-label">Email</p>
							<p>
								<a href="mailto:tourism@leecountyva.gov">tourism@leecountyva.gov</a>
							</p>
						</div>
					</div>
				</div>
			</section>

			<section className="partners-section reveal section-shell">
				<h2>Tourism and Regional Partners</h2>
				<div className="partner-grid">
					{partnerLogos.map((partner) => (
						partner.href ? (
							<a
								key={partner.alt}
								className="partner-badge"
								href={partner.href}
								target="_blank"
								rel="noopener noreferrer"
							>
								<img src={partner.image} alt={partner.alt} loading="lazy" decoding="async" />
							</a>
						) : (
						<div key={partner.alt} className="partner-badge">
							<img src={partner.image} alt={partner.alt} loading="lazy" decoding="async" />
						</div>
						)
					))}
				</div>
			</section>

		</div>
	)
}

export default Home
