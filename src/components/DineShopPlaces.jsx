import { useCallback, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import './DineShopPlaces.css'

const categories = [
  { id: 'all', label: 'All' },
  { id: 'restaurants', label: 'Restaurants' },
  { id: 'shops', label: 'Shops' },
  { id: 'groceries', label: 'Groceries' },
  { id: 'lodging', label: 'Lodging' },
  { id: 'services', label: 'Services' },
  { id: 'other', label: 'Other' },
]

const reviewStatuses = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
]

const logoBucket = 'business-logos'
const maxLogoSize = 2 * 1024 * 1024
const logoFileExtensions = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const businessColumns = [
  'id',
  'name',
  'category',
  'description',
  'address',
  'phone',
  'business_email',
  'website_url',
  'logo_path',
  'status',
  'reviewed_at',
  'created_at',
  'updated_at',
].join(',')

const emptySubmission = {
  name: '',
  category: 'restaurants',
  description: '',
  address: '',
  phone: '',
  business_email: '',
  website_url: '',
  submitter_name: '',
  submitter_email: '',
  company: '',
}

function categoryLabel(categoryId) {
  return categories.find((category) => category.id === categoryId)?.label ?? 'Other'
}

function safeWebsiteUrl(value) {
  if (!value) return null

  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

function normalizeWebsiteUrl(value) {
  const trimmedValue = value.trim()
  if (!trimmedValue) return null

  const candidate = /^https?:\/\//i.test(trimmedValue) ? trimmedValue : `https://${trimmedValue}`
  const normalizedUrl = safeWebsiteUrl(candidate)

  if (!normalizedUrl) {
    throw new Error('Enter a valid website address.')
  }

  return normalizedUrl
}

function validateLogoFile(file) {
  if (!file) return

  if (!logoFileExtensions[file.type]) {
    throw new Error('Upload a JPG, PNG, or WebP logo.')
  }

  if (file.size > maxLogoSize) {
    throw new Error('The logo must be 2 MB or smaller.')
  }
}

function createLogoPath(businessId, file) {
  const extension = logoFileExtensions[file.type]
  const uniqueId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${businessId}/logo-${uniqueId}.${extension}`
}

function businessLogoUrl(logoPath) {
  if (!logoPath || !supabase) return null
  return supabase.storage.from(logoBucket).getPublicUrl(logoPath).data.publicUrl
}

function googleMapsUrl(business) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${business.name}, ${business.address}`,
  )}`
}

function submissionContact(business) {
  const contact = business.business_submission_contacts
  return Array.isArray(contact) ? contact[0] : contact
}

function LoadingCards() {
  return (
    <div className="places-grid places-grid-loading" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <article className="place-card place-card-skeleton" key={index}>
          <div>
            <span className="skeleton-line skeleton-kicker" />
            <span className="skeleton-line skeleton-title" />
            <span className="skeleton-line skeleton-address" />
          </div>
          <div className="place-meta">
            <span className="skeleton-pill" />
            <span className="skeleton-pill" />
          </div>
          <span className="skeleton-button" />
        </article>
      ))}
    </div>
  )
}

function BusinessSubmissionForm({ onCancel, onSubmitted }) {
  const [form, setForm] = useState(emptySubmission)
  const [logoFile, setLogoFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      validateLogoFile(logoFile)

      // A filled honeypot is treated as a successful submission without writing spam.
      if (form.company) {
        onSubmitted()
        return
      }

      const { data: businessId, error: submitError } = await supabase.rpc('submit_business_listing', {
        p_name: form.name.trim(),
        p_category: form.category,
        p_description: form.description.trim() || null,
        p_address: form.address.trim(),
        p_phone: form.phone.trim() || null,
        p_business_email: form.business_email.trim() || null,
        p_website_url: normalizeWebsiteUrl(form.website_url),
        p_submitter_name: form.submitter_name.trim(),
        p_submitter_email: form.submitter_email.trim(),
      })

      if (submitError) throw submitError
      if (!businessId) throw new Error('The submission was saved without a business ID.')

      if (logoFile) {
        const logoPath = createLogoPath(businessId, logoFile)
        const { error: uploadError } = await supabase.storage
          .from(logoBucket)
          .upload(logoPath, logoFile, {
            cacheControl: '3600',
            contentType: logoFile.type,
            upsert: false,
          })

        let logoError = uploadError

        if (!logoError) {
          const { error: attachError } = await supabase.rpc('attach_business_logo', {
            p_business_id: businessId,
            p_logo_path: logoPath,
          })
          logoError = attachError
        }

        if (logoError) {
          setForm(emptySubmission)
          setLogoFile(null)
          onSubmitted(
            'Your business was submitted, but the logo could not be attached. An administrator can add it while reviewing the listing.',
          )
          return
        }
      }

      setForm(emptySubmission)
      setLogoFile(null)
      onSubmitted()
    } catch (submitError) {
      setError(submitError.message || 'Your business could not be submitted.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="directory-form-card" aria-labelledby="business-submission-title">
      <div className="directory-card-heading">
        <div>
          <p className="directory-eyebrow">Free local listing</p>
          <h2 id="business-submission-title">Get your business listed</h2>
          <p>Send us the details below. Your listing will appear after an administrator approves it.</p>
        </div>
        <button type="button" className="directory-button button-quiet" onClick={onCancel}>
          Close
        </button>
      </div>

      <form className="directory-form" onSubmit={handleSubmit}>
        <div className="directory-form-grid">
          <label>
            <span>Business name</span>
            <input
              type="text"
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              maxLength="140"
              required
            />
          </label>

          <label>
            <span>Category</span>
            <select
              value={form.category}
              onChange={(event) => updateField('category', event.target.value)}
            >
              {categories.slice(1).map((category) => (
                <option value={category.id} key={category.id}>{category.label}</option>
              ))}
            </select>
          </label>

          <label className="field-wide">
            <span>Business address</span>
            <input
              type="text"
              value={form.address}
              onChange={(event) => updateField('address', event.target.value)}
              maxLength="300"
              placeholder="Street, town, state, and ZIP code"
              required
            />
          </label>

          <label>
            <span>Business phone</span>
            <input
              type="tel"
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              maxLength="50"
            />
          </label>

          <label>
            <span>Public business email</span>
            <input
              type="email"
              value={form.business_email}
              onChange={(event) => updateField('business_email', event.target.value)}
              maxLength="254"
            />
          </label>

          <label className="field-wide">
            <span>Website</span>
            <input
              type="text"
              inputMode="url"
              value={form.website_url}
              onChange={(event) => updateField('website_url', event.target.value)}
              maxLength="500"
              placeholder="https://example.com"
            />
          </label>

          <label className="field-wide">
            <span>Business description</span>
            <textarea
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              maxLength="2000"
              rows="5"
            />
          </label>

          <label className="field-wide logo-upload-field">
            <span>Business logo <small>Optional · JPG, PNG, or WebP · 2 MB maximum</small></span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                setLogoFile(event.target.files?.[0] ?? null)
                setError('')
              }}
            />
          </label>
        </div>

        <fieldset className="submitter-fields">
          <legend>Your contact information</legend>
          <p>This information is only visible to directory administrators.</p>
          <div className="directory-form-grid">
            <label>
              <span>Your name</span>
              <input
                type="text"
                value={form.submitter_name}
                onChange={(event) => updateField('submitter_name', event.target.value)}
                maxLength="140"
                required
              />
            </label>
            <label>
              <span>Your email</span>
              <input
                type="email"
                value={form.submitter_email}
                onChange={(event) => updateField('submitter_email', event.target.value)}
                maxLength="254"
                required
              />
            </label>
          </div>
        </fieldset>

        <label className="directory-honeypot" aria-hidden="true">
          <span>Company</span>
          <input
            type="text"
            value={form.company}
            onChange={(event) => updateField('company', event.target.value)}
            tabIndex="-1"
            autoComplete="off"
          />
        </label>

        {error && <p className="directory-message message-error" role="alert">{error}</p>}

        <div className="directory-form-actions">
          <button type="submit" className="directory-button button-primary" disabled={submitting}>
            {submitting ? 'Sending…' : 'Submit for approval'}
          </button>
          <button type="button" className="directory-button button-quiet" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  )
}

function BusinessEditor({ business, onCancel, onSaved }) {
  const [form, setForm] = useState(() => ({
    name: business.name,
    category: business.category,
    description: business.description ?? '',
    address: business.address,
    phone: business.phone ?? '',
    business_email: business.business_email ?? '',
    website_url: business.website_url ?? '',
    status: business.status,
  }))
  const [logoFile, setLogoFile] = useState(null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const contact = submissionContact(business)
  const currentLogoUrl = businessLogoUrl(business.logo_path)

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    let uploadedLogoPath = null

    try {
      validateLogoFile(logoFile)

      if (logoFile) {
        uploadedLogoPath = createLogoPath(business.id, logoFile)
        const { error: uploadError } = await supabase.storage
          .from(logoBucket)
          .upload(uploadedLogoPath, logoFile, {
            cacheControl: '3600',
            contentType: logoFile.type,
            upsert: false,
          })

        if (uploadError) throw uploadError
      }

      const payload = {
        name: form.name.trim(),
        category: form.category,
        description: form.description.trim() || null,
        address: form.address.trim(),
        phone: form.phone.trim() || null,
        business_email: form.business_email.trim() || null,
        website_url: normalizeWebsiteUrl(form.website_url),
        logo_path: uploadedLogoPath ?? (removeLogo ? null : business.logo_path),
        status: form.status,
      }

      const { error: saveError } = await supabase
        .from('businesses')
        .update(payload)
        .eq('id', business.id)

      if (saveError) throw saveError

      if (business.logo_path && payload.logo_path !== business.logo_path) {
        await supabase.storage.from(logoBucket).remove([business.logo_path])
      }

      onSaved('Business information updated.')
    } catch (saveError) {
      if (uploadedLogoPath) {
        await supabase.storage.from(logoBucket).remove([uploadedLogoPath])
      }
      setError(saveError.message || 'The business could not be updated.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="directory-editor" aria-labelledby="business-editor-title">
      <div className="directory-card-heading">
        <div>
          <p className="directory-eyebrow">Directory editor</p>
          <h3 id="business-editor-title">Edit {business.name}</h3>
        </div>
        <button type="button" className="directory-button button-quiet" onClick={onCancel}>
          Close
        </button>
      </div>

      {contact && (
        <div className="submission-contact">
          <strong>Submitted by {contact.contact_name}</strong>
          <a href={`mailto:${contact.contact_email}`}>{contact.contact_email}</a>
        </div>
      )}

      <form className="directory-form" onSubmit={handleSubmit}>
        <div className="directory-form-grid">
          <label>
            <span>Business name</span>
            <input
              type="text"
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              maxLength="140"
              required
            />
          </label>

          <label>
            <span>Category</span>
            <select value={form.category} onChange={(event) => updateField('category', event.target.value)}>
              {categories.slice(1).map((category) => (
                <option value={category.id} key={category.id}>{category.label}</option>
              ))}
            </select>
          </label>

          <label className="field-wide">
            <span>Address</span>
            <input
              type="text"
              value={form.address}
              onChange={(event) => updateField('address', event.target.value)}
              maxLength="300"
              required
            />
          </label>

          <label>
            <span>Phone</span>
            <input
              type="tel"
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              maxLength="50"
            />
          </label>

          <label>
            <span>Public email</span>
            <input
              type="email"
              value={form.business_email}
              onChange={(event) => updateField('business_email', event.target.value)}
              maxLength="254"
            />
          </label>

          <label className="field-wide">
            <span>Website</span>
            <input
              type="text"
              inputMode="url"
              value={form.website_url}
              onChange={(event) => updateField('website_url', event.target.value)}
              maxLength="500"
            />
          </label>

          <label className="field-wide">
            <span>Description</span>
            <textarea
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              maxLength="2000"
              rows="5"
            />
          </label>

          <div className="field-wide logo-editor-field">
            <div>
              <strong>Business logo</strong>
              <span>JPG, PNG, or WebP · 2 MB maximum</span>
            </div>
            {currentLogoUrl && !removeLogo && !logoFile && (
              <img src={currentLogoUrl} alt={`${business.name} current logo`} />
            )}
            <label className="logo-file-label">
              <span>{business.logo_path ? 'Replace logo' : 'Upload logo'}</span>
              <input
                key={removeLogo ? 'remove-logo' : 'keep-logo'}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  setLogoFile(event.target.files?.[0] ?? null)
                  setRemoveLogo(false)
                  setError('')
                }}
              />
            </label>
            {logoFile && <span className="selected-logo-name">Selected: {logoFile.name}</span>}
            {business.logo_path && (
              <label className="remove-logo-check">
                <input
                  type="checkbox"
                  checked={removeLogo}
                  onChange={(event) => {
                    setRemoveLogo(event.target.checked)
                    if (event.target.checked) setLogoFile(null)
                  }}
                />
                <span>Remove the current logo</span>
              </label>
            )}
          </div>

          <label>
            <span>Listing status</span>
            <select value={form.status} onChange={(event) => updateField('status', event.target.value)}>
              {reviewStatuses.map((status) => (
                <option value={status.id} key={status.id}>{status.label}</option>
              ))}
            </select>
          </label>
        </div>

        {error && <p className="directory-message message-error" role="alert">{error}</p>}

        <div className="directory-form-actions">
          <button type="submit" className="directory-button button-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button type="button" className="directory-button button-quiet" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  )
}

function AdminLogin({ onSignedIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(signInError.message)
    } else {
      setPassword('')
      onSignedIn(data.session)
    }
    setSubmitting(false)
  }

  return (
    <form className="directory-login" onSubmit={handleSubmit}>
      <div>
        <p className="directory-eyebrow">Authorized users</p>
        <h2>Directory sign in</h2>
        <p>Use the same administrator account used to manage the calendar.</p>
      </div>
      <label>
        <span>Email</span>
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label>
        <span>Password</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      {error && <p className="directory-message message-error" role="alert">{error}</p>}
      <button type="submit" className="directory-button button-primary" disabled={submitting}>
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}

function DirectoryAdminPanel({
  session,
  sessionLoading,
  accessLoading,
  isAdmin,
  businesses,
  loading,
  error,
  onSignedIn,
  onSignOut,
  onChanged,
}) {
  const [activeStatus, setActiveStatus] = useState('pending')
  const [editingBusiness, setEditingBusiness] = useState(null)
  const [notice, setNotice] = useState('')
  const [updatingId, setUpdatingId] = useState(null)

  const statusCounts = useMemo(
    () => Object.fromEntries(
      reviewStatuses.map((status) => [
        status.id,
        businesses.filter((business) => business.status === status.id).length,
      ]),
    ),
    [businesses],
  )

  const visibleBusinesses = useMemo(
    () => businesses.filter((business) => business.status === activeStatus),
    [activeStatus, businesses],
  )

  const updateStatus = async (business, status) => {
    setUpdatingId(business.id)
    setNotice('')

    const { error: updateError } = await supabase
      .from('businesses')
      .update({ status })
      .eq('id', business.id)

    if (updateError) {
      setNotice(`Could not update ${business.name}: ${updateError.message}`)
    } else {
      setNotice(`${business.name} was ${status === 'approved' ? 'approved' : 'rejected'}.`)
      await onChanged()
    }
    setUpdatingId(null)
  }

  const deleteBusiness = async (business) => {
    const confirmed = window.confirm(
      `Permanently delete ${business.name}? This cannot be undone.`,
    )
    if (!confirmed) return

    setUpdatingId(business.id)
    setNotice('')

    const { data: deletedBusiness, error: deleteError } = await supabase
      .from('businesses')
      .delete()
      .eq('id', business.id)
      .select('id')
      .maybeSingle()

    if (deleteError || !deletedBusiness) {
      setNotice(
        `Could not delete ${business.name}: ${deleteError?.message || 'The listing was not found or access was denied.'}`,
      )
      setUpdatingId(null)
      return
    }

    let logoCleanupError = null
    if (business.logo_path) {
      const { error: removeError } = await supabase.storage
        .from(logoBucket)
        .remove([business.logo_path])
      logoCleanupError = removeError
    }

    setNotice(
      logoCleanupError
        ? `${business.name} was deleted. Its old logo could not be removed from Storage.`
        : `${business.name} was permanently deleted.`,
    )
    await onChanged()
    setUpdatingId(null)
  }

  const handleSaved = async (message) => {
    setEditingBusiness(null)
    setNotice(message)
    await onChanged()
  }

  if (sessionLoading) {
    return <p className="admin-access-status" role="status">Checking directory access…</p>
  }

  if (!session) {
    return <AdminLogin onSignedIn={onSignedIn} />
  }

  if (accessLoading) {
    return <p className="admin-access-status" role="status">Checking directory access…</p>
  }

  if (!isAdmin) {
    return (
      <div className="directory-access-denied" role="alert">
        <div>
          <strong>This account does not have directory access.</strong>
          <p>Directory access is available to approved calendar administrators.</p>
        </div>
        <button type="button" className="directory-button button-quiet" onClick={onSignOut}>Sign out</button>
      </div>
    )
  }

  return (
    <div className="directory-admin-content">
      <div className="directory-admin-account">
        <div>
          <p className="directory-eyebrow">Directory administrator</p>
          <strong>{session.user.email}</strong>
        </div>
        <button type="button" className="directory-button button-quiet" onClick={onSignOut}>Sign out</button>
      </div>

      {notice && (
        <p
          className={`directory-message${notice.startsWith('Could not') ? ' message-error' : ' message-success'}`}
          role="status"
        >
          {notice}
        </p>
      )}

      {editingBusiness ? (
        <BusinessEditor
          key={editingBusiness.id}
          business={editingBusiness}
          onCancel={() => setEditingBusiness(null)}
          onSaved={handleSaved}
        />
      ) : (
        <>
          <div className="review-toolbar" role="group" aria-label="Submission status">
            {reviewStatuses.map((status) => (
              <button
                type="button"
                className={activeStatus === status.id ? 'active' : undefined}
                aria-pressed={activeStatus === status.id}
                onClick={() => setActiveStatus(status.id)}
                key={status.id}
              >
                {status.label} <span>{statusCounts[status.id] ?? 0}</span>
              </button>
            ))}
          </div>

          {loading && <p className="admin-access-status" role="status">Loading business submissions…</p>}
          {error && <p className="directory-message message-error" role="alert">{error}</p>}

          {!loading && !error && visibleBusinesses.length === 0 && (
            <div className="directory-empty-state">
              <h3>No {activeStatus} listings</h3>
              <p>Listings with this status will appear here.</p>
            </div>
          )}

          {!loading && !error && visibleBusinesses.length > 0 && (
            <div className="review-list">
              {visibleBusinesses.map((business) => {
                const contact = submissionContact(business)
                const isUpdating = updatingId === business.id
                const logoUrl = businessLogoUrl(business.logo_path)

                return (
                  <article className="review-card" key={business.id}>
                    <div className="review-card-heading">
                      <div className="review-business-identity">
                        {logoUrl && <img src={logoUrl} alt={`${business.name} logo`} />}
                        <div>
                          <p className="place-category">{categoryLabel(business.category)}</p>
                          <h3>{business.name}</h3>
                        </div>
                      </div>
                      <span className={`status-badge status-${business.status}`}>{business.status}</span>
                    </div>
                    <p>{business.address}</p>
                    {business.description && <p>{business.description}</p>}
                    {contact && (
                      <p className="review-submitter">
                        Submitted by {contact.contact_name} ·{' '}
                        <a href={`mailto:${contact.contact_email}`}>{contact.contact_email}</a>
                      </p>
                    )}
                    <div className="review-actions">
                      <button
                        type="button"
                        className="directory-button button-quiet"
                        onClick={() => setEditingBusiness(business)}
                      >
                        Edit information
                      </button>
                      {business.status !== 'approved' && (
                        <button
                          type="button"
                          className="directory-button button-approve"
                          onClick={() => updateStatus(business, 'approved')}
                          disabled={isUpdating}
                        >
                          {isUpdating ? 'Saving…' : 'Approve'}
                        </button>
                      )}
                      {business.status !== 'rejected' && (
                        <button
                          type="button"
                          className="directory-button button-reject"
                          onClick={() => updateStatus(business, 'rejected')}
                          disabled={isUpdating}
                        >
                          Reject
                        </button>
                      )}
                      <button
                        type="button"
                        className="directory-button button-delete"
                        onClick={() => deleteBusiness(business)}
                        disabled={isUpdating}
                      >
                        {isUpdating ? 'Working…' : 'Delete listing'}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function PublicBusinessCard({ business }) {
  const websiteUrl = safeWebsiteUrl(business.website_url)
  const logoUrl = businessLogoUrl(business.logo_path)

  return (
    <article className="place-card">
      {logoUrl && (
        <div className="place-logo-frame">
          <img src={logoUrl} alt={`${business.name} logo`} loading="lazy" decoding="async" />
        </div>
      )}
      <div>
        <p className="place-category">{categoryLabel(business.category)}</p>
        <h2>{business.name}</h2>
        {business.description && <p>{business.description}</p>}
        <a
          className="place-address-link"
          href={googleMapsUrl(business)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {business.address}
        </a>
      </div>
      <div className="place-meta">
        {business.phone && (
          <a href={`tel:${business.phone.replace(/[^\d+]/g, '')}`}>{business.phone}</a>
        )}
        {business.business_email && (
          <a href={`mailto:${business.business_email}`}>Email</a>
        )}
        {websiteUrl && (
          <a href={websiteUrl} target="_blank" rel="noopener noreferrer">Website</a>
        )}
      </div>
      <a
        className="place-map-link"
        href={googleMapsUrl(business)}
        target="_blank"
        rel="noopener noreferrer"
      >
        View on Google Maps
      </a>
    </article>
  )
}

function DineShopPlaces() {
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [loadError, setLoadError] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [submissionOpen, setSubmissionOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [session, setSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(isSupabaseConfigured)
  const [adminUserId, setAdminUserId] = useState(null)
  const [accessCheckedFor, setAccessCheckedFor] = useState(null)
  const [adminBusinesses, setAdminBusinesses] = useState([])
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState('')

  const isAdmin = Boolean(session?.user && adminUserId === session.user.id)
  const accessLoading = Boolean(session?.user && accessCheckedFor !== session.user.id)

  const loadBusinesses = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setLoadError('')

    const { data, error } = await supabase
      .from('businesses')
      .select(businessColumns)
      .eq('status', 'approved')
      .order('name', { ascending: true })

    if (error) {
      setBusinesses([])
      setLoadError(error.message)
    } else {
      setBusinesses(data ?? [])
    }
    setLoading(false)
  }, [])

  const loadAdminBusinesses = useCallback(async () => {
    if (!supabase || !isAdmin) return
    setAdminLoading(true)
    setAdminError('')

    const { data, error } = await supabase
      .from('businesses')
      .select(`${businessColumns},business_submission_contacts(contact_name,contact_email,created_at)`)
      .order('created_at', { ascending: false })

    if (error) {
      setAdminBusinesses([])
      setAdminError(error.message)
    } else {
      setAdminBusinesses(data ?? [])
    }
    setAdminLoading(false)
  }, [isAdmin])

  useEffect(() => {
    const loadTimer = window.setTimeout(loadBusinesses, 0)
    return () => window.clearTimeout(loadTimer)
  }, [loadBusinesses])

  useEffect(() => {
    if (!supabase) return undefined

    let active = true
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setSessionLoading(false)
      if (!nextSession) {
        setAdminUserId(null)
        setAccessCheckedFor(null)
      }
    })

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setSessionLoading(false)
    })

    return () => {
      active = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!supabase || !session?.user) return undefined

    let active = true
    const userId = session.user.id

    supabase
      .from('calendar_admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        setAdminUserId(Boolean(data) && !error ? userId : null)
        setAccessCheckedFor(userId)
      })

    return () => {
      active = false
    }
  }, [session])

  useEffect(() => {
    if (!isAdmin || !adminOpen) return undefined

    const loadTimer = window.setTimeout(loadAdminBusinesses, 0)
    return () => window.clearTimeout(loadTimer)
  }, [adminOpen, isAdmin, loadAdminBusinesses])

  const visibleBusinesses = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return businesses.filter((business) => {
      const matchesCategory = activeCategory === 'all' || business.category === activeCategory
      const matchesSearch = !normalizedSearch || [
        business.name,
        business.description,
        business.address,
      ].some((value) => value?.toLowerCase().includes(normalizedSearch))

      return matchesCategory && matchesSearch
    })
  }, [activeCategory, businesses, search])

  const handleSubmissionComplete = (message) => {
    setSubmissionOpen(false)
    setNotice(message || 'Thank you. Your business was submitted and is waiting for administrator approval.')
    if (isAdmin) loadAdminBusinesses()
  }

  const handleAdminChanged = async () => {
    await Promise.all([loadBusinesses(), loadAdminBusinesses()])
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setAdminBusinesses([])
  }

  return (
    <section className="places-panel" aria-label="Lee County dining and shopping businesses">
      <div className="directory-action-bar">
        <div>
          <strong>Own or manage a Lee County business?</strong>
          <span>Submit a free listing for review by the directory administrator.</span>
        </div>
        <div className="directory-action-buttons">
          <button
            type="button"
            className="directory-button button-primary"
            onClick={() => {
              setSubmissionOpen((open) => !open)
              setNotice('')
            }}
            disabled={!isSupabaseConfigured}
          >
            {submissionOpen ? 'Close form' : 'Get your business listed'}
          </button>
          <button
            type="button"
            className="directory-button button-quiet"
            aria-expanded={adminOpen}
            aria-controls="directory-admin-panel"
            onClick={() => setAdminOpen((open) => !open)}
            disabled={!isSupabaseConfigured}
          >
            {isAdmin ? 'Manage directory' : 'Admin sign in'}
          </button>
        </div>
      </div>

      {!isSupabaseConfigured && (
        <div className="directory-connection-notice" role="status">
          <strong>Connect Supabase to use the business directory.</strong>
          <span>Run the directory SQL and add the project URL and publishable key to the environment.</span>
        </div>
      )}

      {notice && <p className="directory-message message-success" role="status">{notice}</p>}

      {submissionOpen && isSupabaseConfigured && (
        <BusinessSubmissionForm
          onCancel={() => setSubmissionOpen(false)}
          onSubmitted={handleSubmissionComplete}
        />
      )}

      {adminOpen && isSupabaseConfigured && (
        <section id="directory-admin-panel" className="directory-admin-panel" aria-label="Directory administration">
          <DirectoryAdminPanel
            session={session}
            sessionLoading={sessionLoading}
            accessLoading={accessLoading}
            isAdmin={isAdmin}
            businesses={adminBusinesses}
            loading={adminLoading}
            error={adminError}
            onSignedIn={setSession}
            onSignOut={handleSignOut}
            onChanged={handleAdminChanged}
          />
        </section>
      )}

      <div className="directory-search-row">
        <div className="places-toolbar" role="group" aria-label="Business categories">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={activeCategory === category.id}
              className={activeCategory === category.id ? 'active' : undefined}
              onClick={() => setActiveCategory(category.id)}
            >
              {category.label}
            </button>
          ))}
        </div>
        <label className="directory-search">
          <span className="visually-hidden">Search businesses</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search businesses"
          />
        </label>
      </div>

      {loading && (
        <>
          <p className="places-status" role="status">Loading approved Lee County businesses…</p>
          <LoadingCards />
        </>
      )}

      {!loading && loadError && (
        <div className="places-message" role="alert">
          <h2>Business listings could not load</h2>
          <p>{loadError}</p>
          <button type="button" onClick={loadBusinesses}>Try again</button>
        </div>
      )}

      {!loading && !loadError && (
        <>
          <div className="places-summary" aria-live="polite">
            <div>
              <p>{visibleBusinesses.length} approved {visibleBusinesses.length === 1 ? 'listing' : 'listings'}</p>
              <span>Listings are submitted locally and reviewed before publication.</span>
            </div>
            <button type="button" onClick={loadBusinesses}>Refresh listings</button>
          </div>

          {visibleBusinesses.length === 0 ? (
            <div className="places-message">
              <h2>No approved businesses found</h2>
              <p>Try another category or search, or submit a local business for approval.</p>
            </div>
          ) : (
            <div className="places-grid">
              {visibleBusinesses.map((business) => (
                <PublicBusinessCard business={business} key={business.id} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default DineShopPlaces
