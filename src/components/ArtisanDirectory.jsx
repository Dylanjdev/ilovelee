import { useCallback, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import './ArtisanDirectory.css'

const artisanColumns = [
  'id',
  'name',
  'craft',
  'description',
  'location',
  'phone',
  'artisan_email',
  'website_url',
  'status',
  'created_at',
].join(',')

const reviewStatuses = ['pending', 'approved', 'rejected']
const artisanWorkBucket = 'artisan-work'
const maxWorkImages = 6
const maxWorkImageSize = 5 * 1024 * 1024
const imageFileExtensions = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const emptySubmission = {
  name: '',
  craft: '',
  description: '',
  location: '',
  phone: '',
  artisanEmail: '',
  websiteUrl: '',
  submitterName: '',
  submitterEmail: '',
  company: '',
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

  return safeWebsiteUrl(
    /^https?:\/\//i.test(trimmedValue) ? trimmedValue : `https://${trimmedValue}`,
  )
}

function submissionContact(artisan) {
  const contact = artisan.artisan_submission_contacts
  return Array.isArray(contact) ? contact[0] : contact
}

async function addSignedImageUrls(artisans) {
  const imagePaths = artisans.flatMap((artisan) => (
    artisan.artisan_images?.map((image) => image.storage_path) ?? []
  ))

  if (imagePaths.length === 0) return artisans

  const { data, error } = await supabase.storage
    .from(artisanWorkBucket)
    .createSignedUrls(imagePaths, 60 * 60)

  if (error) return artisans

  const signedUrls = new Map(
    data
      .filter((image) => image.path && image.signedUrl)
      .map((image) => [image.path, image.signedUrl]),
  )

  return artisans.map((artisan) => ({
    ...artisan,
    artisan_images: (artisan.artisan_images ?? [])
      .map((image) => ({ ...image, signed_url: signedUrls.get(image.storage_path) ?? null }))
      .sort((first, second) => first.sort_order - second.sort_order),
  }))
}

function ArtisanSubmissionForm({ onCancel, onSubmitted }) {
  const [form, setForm] = useState(emptySubmission)
  const [workImages, setWorkImages] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const addWorkImages = (event) => {
    const selectedFiles = Array.from(event.target.files ?? [])
    event.target.value = ''
    setError('')

    if (workImages.length + selectedFiles.length > maxWorkImages) {
      setError(`Choose no more than ${maxWorkImages} work photos.`)
      return
    }

    const invalidFile = selectedFiles.find((file) => (
      !imageFileExtensions[file.type] || file.size > maxWorkImageSize
    ))
    if (invalidFile) {
      setError('Each work photo must be a JPG, PNG, or WebP file no larger than 5 MB.')
      return
    }

    setWorkImages((current) => [
      ...current,
      ...selectedFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        altText: '',
      })),
    ])
  }

  const updateImageAltText = (id, value) => {
    setWorkImages((current) => current.map((image) => (
      image.id === id ? { ...image, altText: value } : image
    )))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (form.company) {
      onSubmitted('Thank you. Your artisan profile was submitted for review.')
      return
    }

    const websiteUrl = normalizeWebsiteUrl(form.websiteUrl)
    if (form.websiteUrl.trim() && !websiteUrl) {
      setError('Enter a valid website address.')
      return
    }

    setSubmitting(true)
    const { data: artisanId, error: submissionError } = await supabase.rpc('submit_artisan_listing', {
      p_name: form.name.trim(),
      p_craft: form.craft.trim(),
      p_description: form.description.trim(),
      p_location: form.location.trim(),
      p_phone: form.phone.trim() || null,
      p_artisan_email: form.artisanEmail.trim() || null,
      p_website_url: websiteUrl,
      p_submitter_name: form.submitterName.trim(),
      p_submitter_email: form.submitterEmail.trim(),
    })

    if (submissionError) {
      setError(submissionError.message)
      setSubmitting(false)
      return
    }

    let imageNotice = ''
    if (workImages.length > 0) {
      const uploadResults = await Promise.all(workImages.map(async (image, imageIndex) => {
        const extension = imageFileExtensions[image.file.type]
        const storagePath = `${artisanId}/work-${crypto.randomUUID()}.${extension}`
        const { error: uploadError } = await supabase.storage
          .from(artisanWorkBucket)
          .upload(storagePath, image.file, {
            cacheControl: '3600',
            contentType: image.file.type,
            upsert: false,
          })

        return uploadError ? null : {
          storage_path: storagePath,
          alt_text: image.altText.trim() || `${form.name.trim()} work sample ${imageIndex + 1}`,
        }
      }))

      const uploadedImages = uploadResults.filter(Boolean)
      if (uploadedImages.length > 0) {
        const { error: attachmentError } = await supabase.rpc('attach_artisan_work', {
          p_artisan_id: artisanId,
          p_images: uploadedImages,
        })
        if (attachmentError) imageNotice = ' The profile was saved, but its work photos could not be attached.'
      }

      if (!imageNotice && uploadedImages.length !== workImages.length) {
        imageNotice = ' The profile was saved, but one or more work photos could not be uploaded.'
      }
    }

    setForm(emptySubmission)
    setWorkImages([])
    setSubmitting(false)
    onSubmitted(`Thank you. Your artisan profile was submitted for review.${imageNotice}`)
  }

  return (
    <section className="artisan-form-card" aria-labelledby="artisan-submission-title">
      <div className="artisan-heading">
        <div>
          <p className="artisan-eyebrow">Free local profile</p>
          <h2 id="artisan-submission-title">Submit an artisan</h2>
          <p>Submissions stay private until an administrator approves them.</p>
        </div>
        <button type="button" className="artisan-button button-quiet" onClick={onCancel}>
          Close form
        </button>
      </div>

      <form className="artisan-form" onSubmit={handleSubmit}>
        <div className="artisan-form-grid">
          <label>
            <span>Artisan or studio name</span>
            <input
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              maxLength="140"
              required
            />
          </label>
          <label>
            <span>Type of craft</span>
            <input
              value={form.craft}
              onChange={(event) => updateField('craft', event.target.value)}
              maxLength="100"
              placeholder="Pottery, painting, fiber art…"
              required
            />
          </label>
          <label className="field-wide">
            <span>Description</span>
            <textarea
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              maxLength="2000"
              rows="6"
              required
            />
          </label>
          <label className="field-wide">
            <span>Lee County location</span>
            <input
              value={form.location}
              onChange={(event) => updateField('location', event.target.value)}
              maxLength="200"
              placeholder="Town, community, studio address, or service area"
              required
            />
          </label>
          <label>
            <span>Public phone (optional)</span>
            <input
              type="tel"
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              maxLength="50"
            />
          </label>
          <label>
            <span>Public email (optional)</span>
            <input
              type="email"
              value={form.artisanEmail}
              onChange={(event) => updateField('artisanEmail', event.target.value)}
              maxLength="254"
            />
          </label>
          <label className="field-wide">
            <span>Website or social page (optional)</span>
            <input
              type="text"
              inputMode="url"
              value={form.websiteUrl}
              onChange={(event) => updateField('websiteUrl', event.target.value)}
              maxLength="500"
              placeholder="https://example.com"
            />
          </label>
          <div className="artisan-work-field field-wide">
            <div>
              <strong>Photos of your work (optional)</strong>
              <span>Upload up to six JPG, PNG, or WebP images, no larger than 5 MB each.</span>
            </div>
            <label className="artisan-file-picker">
              <span>{workImages.length > 0 ? 'Add more photos' : 'Choose work photos'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={addWorkImages}
                disabled={workImages.length >= maxWorkImages}
              />
            </label>
            {workImages.length > 0 && (
              <div className="artisan-selected-images">
                {workImages.map((image, imageIndex) => (
                  <div className="artisan-selected-image" key={image.id}>
                    <div>
                      <strong>{image.file.name}</strong>
                      <span>{(image.file.size / (1024 * 1024)).toFixed(1)} MB</span>
                    </div>
                    <label>
                      <span>Photo description {imageIndex + 1}</span>
                      <input
                        value={image.altText}
                        onChange={(event) => updateImageAltText(image.id, event.target.value)}
                        maxLength="160"
                        placeholder="Describe the work shown for visitors using screen readers"
                      />
                    </label>
                    <button
                      type="button"
                      className="artisan-remove-image"
                      onClick={() => setWorkImages((current) => current.filter((item) => item.id !== image.id))}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <fieldset className="artisan-submitter-fields">
          <legend>Submission contact</legend>
          <p>This information is visible only to administrators.</p>
          <div className="artisan-form-grid">
            <label>
              <span>Your name</span>
              <input
                value={form.submitterName}
                onChange={(event) => updateField('submitterName', event.target.value)}
                maxLength="140"
                required
              />
            </label>
            <label>
              <span>Your email</span>
              <input
                type="email"
                value={form.submitterEmail}
                onChange={(event) => updateField('submitterEmail', event.target.value)}
                maxLength="254"
                required
              />
            </label>
          </div>
        </fieldset>

        <label className="artisan-honeypot" aria-hidden="true">
          <span>Company</span>
          <input
            tabIndex="-1"
            autoComplete="off"
            value={form.company}
            onChange={(event) => updateField('company', event.target.value)}
          />
        </label>

        {error && <p className="artisan-message message-error" role="alert">{error}</p>}

        <div className="artisan-form-actions">
          <button type="submit" className="artisan-button button-primary" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit for review'}
          </button>
          <button type="button" className="artisan-button button-quiet" onClick={onCancel} disabled={submitting}>
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
    <form className="artisan-login" onSubmit={handleSubmit}>
      <div>
        <p className="artisan-eyebrow">Authorized users</p>
        <h2>Artisan directory sign in</h2>
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
      {error && <p className="artisan-message message-error" role="alert">{error}</p>}
      <button type="submit" className="artisan-button button-primary" disabled={submitting}>
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}

function ArtisanAdminPanel({
  session,
  sessionLoading,
  accessLoading,
  isAdmin,
  artisans,
  loading,
  error,
  onSignedIn,
  onSignOut,
  onChanged,
}) {
  const [activeStatus, setActiveStatus] = useState('pending')
  const [updatingId, setUpdatingId] = useState(null)
  const [notice, setNotice] = useState('')

  const statusCounts = useMemo(
    () => Object.fromEntries(
      reviewStatuses.map((status) => [
        status,
        artisans.filter((artisan) => artisan.status === status).length,
      ]),
    ),
    [artisans],
  )

  const visibleArtisans = useMemo(
    () => artisans.filter((artisan) => artisan.status === activeStatus),
    [activeStatus, artisans],
  )

  const updateStatus = async (artisan, status) => {
    setUpdatingId(artisan.id)
    setNotice('')
    const { error: updateError } = await supabase
      .from('artisans')
      .update({ status })
      .eq('id', artisan.id)

    if (updateError) {
      setNotice(`Could not update ${artisan.name}: ${updateError.message}`)
    } else {
      setNotice(`${artisan.name} was ${status === 'approved' ? 'approved' : 'rejected'}.`)
      await onChanged()
    }
    setUpdatingId(null)
  }

  const deleteArtisan = async (artisan) => {
    if (!window.confirm(`Permanently delete ${artisan.name}? This cannot be undone.`)) return

    setUpdatingId(artisan.id)
    setNotice('')
    const { data, error: deleteError } = await supabase
      .from('artisans')
      .delete()
      .eq('id', artisan.id)
      .select('id')
      .maybeSingle()

    if (deleteError || !data) {
      setNotice(`Could not delete ${artisan.name}: ${deleteError?.message || 'Access was denied.'}`)
    } else {
      const imagePaths = artisan.artisan_images?.map((image) => image.storage_path) ?? []
      const { error: imageCleanupError } = imagePaths.length > 0
        ? await supabase.storage.from(artisanWorkBucket).remove(imagePaths)
        : { error: null }

      setNotice(
        imageCleanupError
          ? `${artisan.name} was deleted, but one or more stored work photos could not be removed.`
          : `${artisan.name} was permanently deleted.`,
      )
      await onChanged()
    }
    setUpdatingId(null)
  }

  if (sessionLoading) return <p className="artisan-status" role="status">Checking access…</p>
  if (!session) return <AdminLogin onSignedIn={onSignedIn} />
  if (accessLoading) return <p className="artisan-status" role="status">Checking access…</p>

  if (!isAdmin) {
    return (
      <div className="artisan-access-denied" role="alert">
        <div>
          <strong>This account does not have artisan directory access.</strong>
          <p>Access is available to approved calendar administrators.</p>
        </div>
        <button type="button" className="artisan-button button-quiet" onClick={onSignOut}>Sign out</button>
      </div>
    )
  }

  return (
    <div>
      <div className="artisan-admin-account">
        <div>
          <p className="artisan-eyebrow">Artisan directory administrator</p>
          <strong>{session.user.email}</strong>
        </div>
        <button type="button" className="artisan-button button-quiet" onClick={onSignOut}>Sign out</button>
      </div>

      {notice && (
        <p
          className={`artisan-message${notice.startsWith('Could not') ? ' message-error' : ' message-success'}`}
          role="status"
        >
          {notice}
        </p>
      )}

      <div className="artisan-review-tabs" role="group" aria-label="Submission status">
        {reviewStatuses.map((status) => (
          <button
            type="button"
            className={activeStatus === status ? 'active' : undefined}
            aria-pressed={activeStatus === status}
            onClick={() => setActiveStatus(status)}
            key={status}
          >
            {status[0].toUpperCase() + status.slice(1)} <span>{statusCounts[status] ?? 0}</span>
          </button>
        ))}
      </div>

      {loading && <p className="artisan-status" role="status">Loading submissions…</p>}
      {error && <p className="artisan-message message-error" role="alert">{error}</p>}
      {!loading && !error && visibleArtisans.length === 0 && (
        <p className="artisan-empty">No {activeStatus} artisan profiles.</p>
      )}

      {!loading && !error && visibleArtisans.length > 0 && (
        <div className="artisan-review-list">
          {visibleArtisans.map((artisan) => {
            const contact = submissionContact(artisan)
            const isUpdating = updatingId === artisan.id

            return (
              <article className="artisan-review-card" key={artisan.id}>
                <div className="artisan-review-heading">
                  <div>
                    <p className="artisan-craft">{artisan.craft}</p>
                    <h3>{artisan.name}</h3>
                  </div>
                  <span className={`artisan-badge status-${artisan.status}`}>{artisan.status}</span>
                </div>
                <p><strong>Location:</strong> {artisan.location}</p>
                <p>{artisan.description}</p>
                <ArtisanWorkGallery artisan={artisan} review />
                {contact && (
                  <p className="artisan-submitter">
                    Submitted by {contact.contact_name} ·{' '}
                    <a href={`mailto:${contact.contact_email}`}>{contact.contact_email}</a>
                  </p>
                )}
                <div className="artisan-review-actions">
                  {artisan.status !== 'approved' && (
                    <button
                      type="button"
                      className="artisan-button button-primary"
                      onClick={() => updateStatus(artisan, 'approved')}
                      disabled={isUpdating}
                    >
                      {isUpdating ? 'Saving…' : 'Approve'}
                    </button>
                  )}
                  {artisan.status !== 'rejected' && (
                    <button
                      type="button"
                      className="artisan-button button-quiet"
                      onClick={() => updateStatus(artisan, 'rejected')}
                      disabled={isUpdating}
                    >
                      Reject
                    </button>
                  )}
                  <button
                    type="button"
                    className="artisan-button button-danger"
                    onClick={() => deleteArtisan(artisan)}
                    disabled={isUpdating}
                  >
                    {isUpdating ? 'Working…' : 'Delete'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ArtisanWorkGallery({ artisan, review = false }) {
  const images = (artisan.artisan_images ?? []).filter((image) => image.signed_url)
  if (images.length === 0) return null

  return (
    <div
      className={`artisan-gallery${review ? ' artisan-review-gallery' : ''}`}
      aria-label={`Work by ${artisan.name}`}
    >
      {images.map((image) => (
        <img
          src={image.signed_url}
          alt={image.alt_text}
          loading="lazy"
          decoding="async"
          key={image.id}
        />
      ))}
    </div>
  )
}

function PublicArtisanCard({ artisan }) {
  const websiteUrl = safeWebsiteUrl(artisan.website_url)

  return (
    <article className="artisan-card">
      <ArtisanWorkGallery artisan={artisan} />
      <div>
        <p className="artisan-craft">{artisan.craft}</p>
        <h2>{artisan.name}</h2>
        <p>{artisan.description}</p>
        <p className="artisan-location">{artisan.location}</p>
      </div>
      {(artisan.phone || artisan.artisan_email || websiteUrl) && (
        <div className="artisan-links">
          {artisan.phone && <a href={`tel:${artisan.phone.replace(/[^\d+]/g, '')}`}>{artisan.phone}</a>}
          {artisan.artisan_email && <a href={`mailto:${artisan.artisan_email}`}>Email</a>}
          {websiteUrl && <a href={websiteUrl} target="_blank" rel="noopener noreferrer">Website</a>}
        </div>
      )}
    </article>
  )
}

export default function ArtisanDirectory() {
  const [artisans, setArtisans] = useState([])
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [loadError, setLoadError] = useState('')
  const [submissionOpen, setSubmissionOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [session, setSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(isSupabaseConfigured)
  const [adminUserId, setAdminUserId] = useState(null)
  const [accessCheckedFor, setAccessCheckedFor] = useState(null)
  const [adminArtisans, setAdminArtisans] = useState([])
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState('')

  const isAdmin = Boolean(session?.user && adminUserId === session.user.id)
  const accessLoading = Boolean(session?.user && accessCheckedFor !== session.user.id)

  const loadArtisans = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setLoadError('')
    const { data, error } = await supabase
      .from('artisans')
      .select(`${artisanColumns},artisan_images(id,storage_path,alt_text,sort_order)`)
      .eq('status', 'approved')
      .order('name', { ascending: true })

    if (error) {
      setArtisans([])
      setLoadError(error.message)
    } else {
      setArtisans(await addSignedImageUrls(data ?? []))
    }
    setLoading(false)
  }, [])

  const loadAdminArtisans = useCallback(async () => {
    if (!supabase || !isAdmin) return
    setAdminLoading(true)
    setAdminError('')
    const { data, error } = await supabase
      .from('artisans')
      .select(`${artisanColumns},artisan_images(id,storage_path,alt_text,sort_order),artisan_submission_contacts(contact_name,contact_email,created_at)`)
      .order('created_at', { ascending: false })

    if (error) {
      setAdminArtisans([])
      setAdminError(error.message)
    } else {
      setAdminArtisans(await addSignedImageUrls(data ?? []))
    }
    setAdminLoading(false)
  }, [isAdmin])

  useEffect(() => {
    const loadTimer = window.setTimeout(loadArtisans, 0)
    return () => window.clearTimeout(loadTimer)
  }, [loadArtisans])

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
    const loadTimer = window.setTimeout(loadAdminArtisans, 0)
    return () => window.clearTimeout(loadTimer)
  }, [adminOpen, isAdmin, loadAdminArtisans])

  const handleChanged = async () => {
    await Promise.all([loadArtisans(), loadAdminArtisans()])
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setAdminArtisans([])
  }

  return (
    <section className="artisan-directory" aria-label="Lee County artisan directory">
      <div className="artisan-action-bar">
        <div>
          <strong>Are you a Lee County artist or maker?</strong>
          <span>Submit a free artisan profile for administrator review.</span>
        </div>
        <div className="artisan-action-buttons">
          <button
            type="button"
            className="artisan-button button-primary"
            onClick={() => {
              setSubmissionOpen((open) => !open)
              setNotice('')
            }}
            disabled={!isSupabaseConfigured}
          >
            {submissionOpen ? 'Close form' : 'Submit an artisan'}
          </button>
          <button
            type="button"
            className="artisan-button button-quiet"
            aria-expanded={adminOpen}
            aria-controls="artisan-admin-panel"
            onClick={() => setAdminOpen((open) => !open)}
            disabled={!isSupabaseConfigured}
          >
            {isAdmin ? 'Manage artisans' : 'Admin sign in'}
          </button>
        </div>
      </div>

      {!isSupabaseConfigured && (
        <div className="artisan-connection-notice" role="status">
          <strong>Connect Supabase to use artisan submissions.</strong>
          <span>Run the artisan SQL and add the Supabase project values to the environment.</span>
        </div>
      )}

      {notice && <p className="artisan-message message-success" role="status">{notice}</p>}

      {submissionOpen && isSupabaseConfigured && (
        <ArtisanSubmissionForm
          onCancel={() => setSubmissionOpen(false)}
          onSubmitted={(message) => {
            setSubmissionOpen(false)
            setNotice(message)
            if (isAdmin) loadAdminArtisans()
          }}
        />
      )}

      {adminOpen && isSupabaseConfigured && (
        <section id="artisan-admin-panel" className="artisan-admin-panel" aria-label="Artisan administration">
          <ArtisanAdminPanel
            session={session}
            sessionLoading={sessionLoading}
            accessLoading={accessLoading}
            isAdmin={isAdmin}
            artisans={adminArtisans}
            loading={adminLoading}
            error={adminError}
            onSignedIn={setSession}
            onSignOut={handleSignOut}
            onChanged={handleChanged}
          />
        </section>
      )}

      {loading && <p className="artisan-status" role="status">Loading approved artisans…</p>}
      {!loading && loadError && (
        <div className="artisan-empty" role="alert">
          <strong>Artisan profiles could not load.</strong>
          <p>{loadError}</p>
          <button type="button" className="artisan-button button-primary" onClick={loadArtisans}>Try again</button>
        </div>
      )}
      {!loading && !loadError && artisans.length === 0 && (
        <div className="artisan-empty">
          <h2>No approved artisan profiles yet</h2>
          <p>Submitted profiles will appear here after administrator approval.</p>
        </div>
      )}
      {!loading && !loadError && artisans.length > 0 && (
        <div className="artisan-grid">
          {artisans.map((artisan) => <PublicArtisanCard artisan={artisan} key={artisan.id} />)}
        </div>
      )}
    </section>
  )
}
