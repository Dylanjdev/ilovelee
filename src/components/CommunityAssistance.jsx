import './CommunityAssistance.css'

const categoryLinks = [
  { href: '#food-assistance', label: 'Food banks & pantries' },
  { href: '#domestic-violence', label: 'Domestic violence support' },
  { href: '#utility-assistance', label: 'Utility bill assistance' },
  { href: '#housing-assistance', label: 'Rent & housing' },
  { href: '#clothing-essentials', label: 'Clothing & essentials' },
  { href: '#public-benefits', label: 'SNAP, Medicaid & childcare' },
  { href: '#medical-care', label: 'Medical care & coverage' },
  { href: '#senior-disability-help', label: 'Seniors & disabilities' },
  { href: '#emergency-contacts', label: 'Emergency contacts' },
  { href: '#get-help-faster', label: 'How to get help faster' },
]

const foodResources = [
  {
    name: 'Dryden Food Pantry',
    details: [
      { label: 'Location', value: 'State Road 726, Dryden, VA 24243' },
      { label: 'Phone', value: '(276) 546-1568', href: 'tel:+12765461568' },
      { label: 'Listed distribution hours', value: 'Saturday, 9:15–10:00 AM' },
    ],
    description:
      'Provides a local option for residents seeking food assistance in the Dryden area. Contact the pantry to confirm current hours and requirements.',
  },
  {
    name: 'Rose Hill Calvary Road Pantry',
    details: [
      { label: 'Address', value: '525 Calvary Road, Rose Hill, VA 24281' },
      { label: 'Phone', value: '(276) 445-4766', href: 'tel:+12764454766' },
    ],
    description:
      'A community food pantry serving the Rose Hill area. Call to ask about upcoming food distributions and what documentation, if any, is required.',
  },
  {
    name: 'Mount Carmel Baptist Church',
    details: [
      { label: 'Address', value: '179 Ben Lawson Drive, Pennington Gap, VA 24277' },
      { label: 'Phone', value: '(276) 393-4433', href: 'tel:+12763934433' },
    ],
    description:
      'Listed in regional food assistance directories as a potential food resource. Call to confirm current distribution arrangements and eligibility.',
  },
  {
    name: 'First Baptist Church of Pennington Gap',
    details: [
      { label: 'Address', value: '41851 East Morgan Avenue, Pennington Gap, VA 24277' },
      { label: 'Phone', value: '(276) 546-2586', href: 'tel:+12765462586' },
      { label: 'Reported schedule', value: 'Second and fourth Tuesdays of the month; confirm before visiting.' },
    ],
    description: 'Contact the church to ask about food pantry availability and community assistance.',
  },
  {
    name: 'First United Methodist Church of Pennington Gap',
    details: [
      { label: 'Address', value: '41880 East Morgan Avenue, Pennington Gap, VA 24277' },
      { label: 'Reported distribution', value: 'Last Tuesday of the month, 11 AM–12 PM; confirm the current schedule.' },
    ],
    description: 'Call ahead to confirm food distribution and any eligibility requirements.',
  },
]

function ExternalLink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

function ResourceCard({ name, details = [], description, children, links = [] }) {
  return (
    <article className="assistance-resource">
      <h3>{name}</h3>
      {details.length > 0 && (
        <dl className="resource-details">
          {details.map((detail) => (
            <div key={`${detail.label}-${detail.value}`}>
              <dt>{detail.label}</dt>
              <dd>
                {detail.href ? <a href={detail.href}>{detail.value}</a> : detail.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {description && <p>{description}</p>}
      {children}
      {links.length > 0 && (
        <div className="resource-actions">
          {links.map((link) => (
            <ExternalLink key={link.href} href={link.href}>{link.label}</ExternalLink>
          ))}
        </div>
      )}
    </article>
  )
}

function CommunityAssistance() {
  return (
    <div className="assistance-directory">
      <p className="assistance-overview">
        DiscoverLeeVA.com has compiled this community assistance directory to help residents of Pennington Gap, Jonesville, Dryden, Rose Hill, Ewing and surrounding communities connect with local nonprofits, food pantries, government programs and regional support organizations. Use the categories below to find food assistance, domestic violence services, emergency housing, utility bill assistance, clothing, medical coverage and other resources. Contact organizations directly to confirm eligibility, availability and current hours.
      </p>

      <aside className="help-now-panel" aria-labelledby="help-now-title">
        <div>
          <p className="help-now-kicker">Free, confidential referrals</p>
          <h2 id="help-now-title">Need help finding the right program?</h2>
          <p>Call 211 for community-service referrals throughout Virginia.</p>
        </div>
        <div className="help-now-actions">
          <a className="primary-help-action" href="tel:211">Call 211</a>
          <ExternalLink href="https://211virginia.org/">Visit 211 Virginia</ExternalLink>
        </div>
      </aside>

      <nav className="assistance-jump-nav" aria-labelledby="directory-categories-title">
        <p id="directory-categories-title">Find help by category</p>
        <ol>
          {categoryLinks.map((link, index) => (
            <li key={link.href}>
              <a href={link.href}>
                <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                {link.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="assistance-sections">
        <section className="assistance-section reveal" id="food-assistance" aria-labelledby="food-assistance-title">
          <div className="assistance-section-heading">
            <span aria-hidden="true">01</span>
            <div>
              <p>Groceries & meals</p>
              <h2 id="food-assistance-title">Food Banks and Food Pantries in Lee County, VA</h2>
            </div>
          </div>
          <p className="section-lede">
            If you need groceries or emergency food assistance, the following community food resources may be able to help. Distribution schedules and eligibility requirements can change, so call before visiting whenever a phone number is available.
          </p>
          <div className="assistance-resource-grid">
            {foodResources.map((resource) => <ResourceCard key={resource.name} {...resource} />)}
          </div>
          <ResourceCard
            name="Additional Food Assistance"
            links={[
              { label: 'Find food with Feeding Southwest Virginia', href: 'https://feedingswva.org/map-directory/' },
              { label: 'Virginia food assistance', href: 'https://www.dss.virginia.gov/relief/food-assistance/' },
              { label: 'Apply through CommonHelp', href: 'https://commonhelp.virginia.gov/access/' },
            ]}
          >
            <p><strong>Feeding Southwest Virginia</strong> maintains a regional directory of food pantries and meal programs.</p>
            <p>Residents may also qualify for the Supplemental Nutrition Assistance Program (SNAP), commonly called food stamps. SNAP applications are available through Virginia CommonHelp.</p>
          </ResourceCard>
        </section>

        <section className="assistance-section reveal" id="domestic-violence" aria-labelledby="domestic-violence-title">
          <div className="assistance-section-heading">
            <span aria-hidden="true">02</span>
            <div>
              <p>Confidential advocacy</p>
              <h2 id="domestic-violence-title">Domestic Violence and Sexual Assault Support</h2>
            </div>
          </div>
          <p className="section-lede">
            If you or someone you know is experiencing domestic violence, sexual assault, stalking or abuse, confidential support and safety planning are available. You do not have to navigate an unsafe situation alone.
          </p>
          <div className="assistance-resource-grid">
            <ResourceCard
              name="Virginia Statewide Sexual and Domestic Violence Hotline"
              details={[
                { label: 'Phone', value: '1-800-838-8238', href: 'tel:+18008388238' },
                { label: 'Text', value: '804-793-9999', href: 'sms:+18047939999' },
                { label: 'Availability', value: '24 hours a day, seven days a week' },
              ]}
              description="Trained advocates can provide confidential support and referrals to local services, emergency shelter and other resources."
              links={[{ label: 'Virginia domestic violence services', href: 'https://www.dss.virginia.gov/supporting-families/domestic-violence/' }]}
            />
            <ResourceCard
              name="Lee County Domestic Violence Program"
              details={[
                { label: 'Phone', value: '(276) 346-4239', href: 'tel:+12763464239' },
                { label: 'Mailing address', value: 'P.O. Box 177, Jonesville, VA 24263' },
                { label: 'Physical address listed', value: '33640 Main Street, Suite U101, Jonesville, VA 24263' },
                { label: 'Sheriff’s Office', value: '(276) 346-7753', href: 'tel:+12763467753' },
              ]}
              description="The Lee County Sheriff’s Office lists a domestic violence program that helps connect victims with local support and advocacy. Call to discuss available services and referral options."
              links={[{ label: 'Lee County Sheriff’s Office program', href: 'https://sheriffalertsystem.wixsite.com/lcso/domestic-violence' }]}
            />
            <ResourceCard
              name="Family Crisis Support Services"
              details={[
                { label: 'Phone', value: '(276) 679-7240', href: 'tel:+12766797240' },
                { label: 'Address', value: '5668 Freedom Boulevard, Norton, VA 24273' },
              ]}
              description="Family Crisis Support Services provides regional support for people affected by domestic violence, sexual assault and related crises. Ask about emergency shelter, advocacy, safety planning and services available to Lee County residents."
              links={[{ label: 'Visit Family Crisis Support Services', href: 'https://www.family-crisis.com/' }]}
            />
          </div>
          <div className="urgent-safety-note" role="note">
            <strong>If you are in immediate danger, call <a href="tel:911">911</a>.</strong>
            <span>If your phone or online activity may be monitored by an abusive person, use a safer device when possible.</span>
          </div>
        </section>

        <section className="assistance-section reveal" id="utility-assistance" aria-labelledby="utility-assistance-title">
          <div className="assistance-section-heading">
            <span aria-hidden="true">03</span>
            <div>
              <p>Electricity & heating</p>
              <h2 id="utility-assistance-title">Electric, Heating and Utility Bill Assistance</h2>
            </div>
          </div>
          <p className="section-lede">If you are behind on your electric bill, facing a disconnection notice or struggling to pay for heating, contact these organizations to ask about assistance programs.</p>
          <div className="assistance-resource-grid">
            <ResourceCard
              name="Appalachian Community Action Agency (AppCAA)"
              details={[
                { label: 'Lee County office', value: '119 Hill Street, Jonesville, VA 24263' },
                { label: 'Phone', value: '(276) 346-0054', href: 'tel:+12763460054' },
              ]}
              description="AppCAA serves Southwest Virginia, including Lee County. Its programs include housing counseling, financial education and assistance initiatives that may help households experiencing financial hardship. Ask about current utility assistance, housing stabilization, weatherization and other available programs. Funding, eligibility and application periods vary."
              links={[
                { label: 'Visit AppCAA', href: 'https://appcaa.org/' },
                { label: 'Lee County programs', href: 'https://appcaa.org/programs/service-area/lee-county-virginia/' },
              ]}
            />
            <ResourceCard
              name="Lee County Department of Social Services"
              details={[
                { label: 'Address', value: '108 Hill Street, Jonesville, VA 24263' },
                { label: 'Phone', value: '(276) 346-1010', href: 'tel:+12763461010' },
              ]}
              description="The department administers or helps residents access energy assistance and other public benefits. Ask about heating assistance, cooling assistance and emergency energy programs."
              links={[{ label: 'Visit Lee County DSS', href: 'https://www.leecountydss.com/' }]}
            />
            <ResourceCard
              name="Virginia Energy Assistance"
              description="Eligible households may qualify for heating, cooling or crisis assistance, depending on the program and application period."
              links={[{ label: 'Explore Virginia energy assistance', href: 'https://www.dss.virginia.gov/relief/ea/' }]}
            />
          </div>
          <p className="assistance-tip"><strong>Tip:</strong> If your electricity is about to be disconnected, explain the deadline when contacting an agency. Have your utility bill, account information, identification, proof of residence and income information available if requested. Assistance is not guaranteed and depends on eligibility and funding.</p>
        </section>

        <section className="assistance-section reveal" id="housing-assistance" aria-labelledby="housing-assistance-title">
          <div className="assistance-section-heading">
            <span aria-hidden="true">04</span>
            <div>
              <p>Rent & shelter</p>
              <h2 id="housing-assistance-title">Rent Assistance, Affordable Housing and Homelessness</h2>
            </div>
          </div>
          <p className="section-lede">If you are facing eviction, struggling to pay rent or need an affordable place to live, start with the following organizations.</p>
          <div className="assistance-resource-grid">
            <ResourceCard
              name="Lee County Redevelopment and Housing Authority"
              details={[
                { label: 'Address', value: '1223 Chappell Drive, Jonesville, VA 24263' },
                { label: 'Phone', value: '(276) 346-3910', href: 'tel:+12763463910' },
              ]}
              description="Contact the housing authority about affordable housing opportunities, public housing and Housing Choice Voucher programs, commonly known as Section 8. Ask whether applications are currently being accepted and whether waiting lists are open."
            />
            <ResourceCard
              name="Appalachian Community Action Agency (AppCAA)"
              details={[
                { label: 'Address', value: '119 Hill Street, Jonesville, VA 24263' },
                { label: 'Phone', value: '(276) 346-0054', href: 'tel:+12763460054' },
              ]}
              description="AppCAA offers free housing counseling focused on rental counseling, financial literacy, housing stability, preventing homelessness and helping households understand their housing options. Contact the agency to ask about current emergency financial assistance or housing-related programs."
              links={[{ label: 'Visit AppCAA', href: 'https://appcaa.org/' }]}
            />
            <ResourceCard
              name="Family Crisis Support Services"
              details={[{ label: 'Phone', value: '(276) 679-7240', href: 'tel:+12766797240' }]}
              description="Contact this regional agency if homelessness or housing instability is connected to domestic violence, sexual assault or another crisis. Ask about current shelter and housing support for Lee County residents."
              links={[{ label: 'Visit Family Crisis Support Services', href: 'https://www.family-crisis.com/' }]}
            />
            <ResourceCard
              name="211 Virginia"
              details={[{ label: 'Phone', value: 'Dial 211', href: 'tel:211' }]}
              description="211 can connect people with housing referrals, shelters, rent assistance programs and other community resources."
              links={[{ label: 'Search 211 Virginia', href: 'https://211virginia.org/' }]}
            />
          </div>
          <p className="assistance-caution"><strong>Important:</strong> Contacting an agency does not guarantee financial assistance or immediate housing. Programs may have income limits, documentation requirements, waiting lists or limited funding.</p>
        </section>

        <section className="assistance-section reveal" id="clothing-essentials" aria-labelledby="clothing-essentials-title">
          <div className="assistance-section-heading">
            <span aria-hidden="true">05</span>
            <div>
              <p>Everyday necessities</p>
              <h2 id="clothing-essentials-title">Clothing, Hygiene Products and Household Essentials</h2>
            </div>
          </div>
          <p className="section-lede">Families experiencing hardship may need clothing, shoes, personal hygiene supplies, baby items or other household necessities.</p>
          <div className="assistance-resource-grid">
            <ResourceCard
              name="Harmony’s Hope Closet"
              details={[{ label: 'Address listed', value: '134 State Road T-1128, Pennington Gap, VA 24277' }]}
              description="A local community resource associated with clothing and assistance initiatives. Current contact information and operating hours were not independently confirmed. Verify the location and available services before visiting."
            />
            <ResourceCard
              name="Ladies of Lee SWVA"
              details={[
                { label: 'Phone listed', value: '(276) 299-0089', href: 'tel:+12762990089' },
                { label: 'Location', value: 'Lee County area' },
              ]}
              description="Contact the organization to ask whether clothing, family necessities, seasonal drives or other community assistance are currently available."
            />
            <ResourceCard
              name="AppCAA"
              details={[{ label: 'Phone', value: '(276) 346-0054', href: 'tel:+12763460054' }]}
              description="Ask about current family support programs and referrals for household necessities. Availability varies by program and location."
              links={[{ label: 'Visit AppCAA', href: 'https://appcaa.org/' }]}
            />
          </div>
          <p className="assistance-tip">For additional clothing closets and household assistance, dial <a href="tel:211">211</a> or search <ExternalLink href="https://211virginia.org/">211 Virginia</ExternalLink>.</p>
        </section>

        <section className="assistance-section reveal" id="public-benefits" aria-labelledby="public-benefits-title">
          <div className="assistance-section-heading">
            <span aria-hidden="true">06</span>
            <div>
              <p>Public benefits</p>
              <h2 id="public-benefits-title">SNAP, Medicaid, Childcare and Financial Benefits</h2>
            </div>
          </div>
          <p className="section-lede">The Lee County Department of Social Services is an important starting point for residents seeking public benefits.</p>
          <div className="assistance-resource-grid">
            <ResourceCard
              name="Lee County Department of Social Services"
              details={[
                { label: 'Address', value: '108 Hill Street, Jonesville, VA 24263' },
                { label: 'Phone', value: '(276) 346-1010', href: 'tel:+12763461010' },
              ]}
              links={[{ label: 'Visit Lee County DSS', href: 'https://www.leecountydss.com/' }]}
            >
              <p>Ask about the following programs:</p>
              <ul className="resource-list">
                <li><strong>SNAP:</strong> Grocery assistance for eligible households.</li>
                <li><strong>Medicaid:</strong> Health coverage for eligible individuals and families.</li>
                <li><strong>TANF:</strong> Temporary cash assistance for qualifying families with children.</li>
                <li><strong>Energy Assistance:</strong> Eligible heating and cooling expenses.</li>
                <li><strong>Childcare assistance:</strong> Help with childcare costs for eligible families.</li>
                <li><strong>Adult and Child Protective Services:</strong> Assistance with concerns involving abuse, neglect or exploitation.</li>
                <li><strong>Adult services:</strong> Referrals and support for eligible older adults and vulnerable adults.</li>
              </ul>
            </ResourceCard>
            <ResourceCard
              name="Apply Online Through Virginia CommonHelp"
              description="The online portal allows residents to explore eligibility and apply for several public benefit programs. For local benefits application guidance, call the Lee County Department of Social Services at (276) 346-1010."
              links={[{ label: 'Apply through CommonHelp', href: 'https://commonhelp.virginia.gov/access/' }]}
            />
          </div>
        </section>

        <section className="assistance-section reveal" id="medical-care" aria-labelledby="medical-care-title">
          <div className="assistance-section-heading">
            <span aria-hidden="true">07</span>
            <div>
              <p>Health resources</p>
              <h2 id="medical-care-title">Medical Care and Health Coverage</h2>
            </div>
          </div>
          <p className="section-lede">If you need help finding healthcare or understanding coverage options, these resources can help you get started.</p>
          <div className="assistance-resource-grid">
            <ResourceCard
              name="Lee County Department of Social Services"
              details={[
                { label: 'Phone', value: '(276) 346-1010', href: 'tel:+12763461010' },
                { label: 'Address', value: '108 Hill Street, Jonesville, VA 24263' },
              ]}
              description="Contact the department about Medicaid eligibility and available public benefit programs."
            />
            <ResourceCard
              name="Virginia CommonHelp"
              description="Use the portal to explore healthcare coverage and other assistance programs."
              links={[{ label: 'Open Virginia CommonHelp', href: 'https://commonhelp.virginia.gov/access/' }]}
            />
            <ResourceCard
              name="211 Virginia"
              details={[{ label: 'Phone', value: 'Dial 211', href: 'tel:211' }]}
              description="Ask for referrals to community clinics, healthcare services, prescription assistance, mental health resources and other medical support in or near Lee County."
              links={[{ label: 'Search 211 Virginia', href: 'https://211virginia.org/' }]}
            />
          </div>
          <p className="assistance-caution">For a medical emergency, call <a href="tel:911">911</a> or go to the nearest emergency department.</p>
        </section>

        <section className="assistance-section reveal" id="senior-disability-help" aria-labelledby="senior-disability-help-title">
          <div className="assistance-section-heading">
            <span aria-hidden="true">08</span>
            <div>
              <p>Specialized support</p>
              <h2 id="senior-disability-help-title">Help for Seniors, People with Disabilities and Caregivers</h2>
            </div>
          </div>
          <p className="section-lede">Older adults, people with disabilities and their caregivers may qualify for specialized services and public benefits.</p>
          <div className="assistance-resource-grid">
            <ResourceCard
              name="Lee County Department of Social Services"
              details={[{ label: 'Phone', value: '(276) 346-1010', href: 'tel:+12763461010' }]}
              description="Ask about adult services, protective services, eligible in-home support, auxiliary grants and referrals for older adults or vulnerable individuals."
            />
            <ResourceCard
              name="AppCAA"
              details={[{ label: 'Phone', value: '(276) 346-0054', href: 'tel:+12763460054' }]}
              description="Ask about housing counseling, weatherization and any currently available programs that could help an eligible household remain safe and stable."
              links={[{ label: 'Visit AppCAA', href: 'https://appcaa.org/' }]}
            />
            <ResourceCard
              name="211 Virginia"
              details={[{ label: 'Phone', value: 'Dial 211', href: 'tel:211' }]}
              description="Request referrals for disability support, caregiver resources, transportation, meal programs and other community services."
              links={[{ label: 'Search 211 Virginia', href: 'https://211virginia.org/' }]}
            />
          </div>
        </section>

        <section className="assistance-section reveal" id="emergency-contacts" aria-labelledby="emergency-contacts-title">
          <div className="assistance-section-heading">
            <span aria-hidden="true">09</span>
            <div>
              <p>Save these numbers</p>
              <h2 id="emergency-contacts-title">Emergency and Community Resource Contacts</h2>
            </div>
          </div>
          <p className="section-lede">Keep these numbers available if you need help quickly.</p>
          <ul className="contact-list">
            <li><span>Emergency police, fire or medical assistance</span><a href="tel:911">911</a></li>
            <li><span>Virginia domestic and sexual violence hotline</span><a href="tel:+18008388238">1-800-838-8238</a></li>
            <li><span>Virginia domestic violence text line</span><a href="sms:+18047939999">804-793-9999</a></li>
            <li><span>Lee County Sheriff’s Office</span><a href="tel:+12763467753">(276) 346-7753</a></li>
            <li><span>Lee County Department of Social Services</span><a href="tel:+12763461010">(276) 346-1010</a></li>
            <li><span>AppCAA</span><a href="tel:+12763460054">(276) 346-0054</a></li>
            <li><span>Family Crisis Support Services</span><a href="tel:+12766797240">(276) 679-7240</a></li>
            <li><span>Virginia community resource referrals</span><a href="tel:211">211</a></li>
            <li><span>Virginia CommonHelp</span><ExternalLink href="https://commonhelp.virginia.gov/access/">Apply online</ExternalLink></li>
          </ul>
        </section>

        <section className="assistance-section reveal" id="get-help-faster" aria-labelledby="get-help-faster-title">
          <div className="assistance-section-heading">
            <span aria-hidden="true">10</span>
            <div>
              <p>Prepare before you call</p>
              <h2 id="get-help-faster-title">How to Get Help Faster</h2>
            </div>
          </div>
          <p className="section-lede">When contacting a food pantry, nonprofit or government assistance office, it can help to have the following information available:</p>
          <ol className="document-checklist">
            <li>Your name and contact information.</li>
            <li>Your Lee County address or proof of residency, if requested.</li>
            <li>Household size and income information.</li>
            <li>A copy of the bill, eviction notice or other document related to your emergency.</li>
            <li>Identification and any relevant benefit or account information.</li>
          </ol>
          <p>Not every organization requires all these documents. Call first to find out what is needed.</p>
          <p>If one organization cannot help, ask whether it can refer you to another agency that serves Lee County residents.</p>
        </section>
      </div>

      <section className="directory-update-panel reveal" aria-labelledby="directory-update-title">
        <div>
          <p className="section-label">Community resource</p>
          <h2 id="directory-update-title">Help Keep This Directory Updated</h2>
        </div>
        <p>Community assistance programs change as funding, staff, distribution schedules and eligibility requirements change. DiscoverLeeVA.com aims to make it easier for residents to find local support when they need it most.</p>
        <p>If you represent a nonprofit, church, food pantry, government agency or community organization in Lee County, Virginia, please <a href="mailto:tourism@leecountyva.gov?subject=Community%20assistance%20directory%20update">contact DiscoverLeeVA.com</a> with updated contact information, service details or new assistance programs.</p>
        <p className="directory-disclaimer"><strong>Disclaimer:</strong> This directory is provided for informational purposes and is not a guarantee of services, eligibility, funding or availability. Please contact each organization directly to confirm current details. Inclusion does not imply endorsement by DiscoverLeeVA.com.</p>
        <p className="directory-reviewed">Page last reviewed: <time dateTime="2026-10">October 2026</time></p>
      </section>
    </div>
  )
}

export default CommunityAssistance
