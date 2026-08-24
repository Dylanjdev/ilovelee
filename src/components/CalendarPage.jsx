import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  completeInitialAuthCallback,
  initialAuthCallback,
  isSupabaseConfigured,
  supabase,
} from '../lib/supabase'
import { EVENT_CSV_HEADERS, parseEventCsv } from '../lib/eventCsv'
import './CalendarPage.css'

const EVENT_TIME_ZONE = 'America/New_York'
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const EVENT_CATEGORIES = [
  'Community',
  'Festival',
  'Live Music',
  'Arts & Culture',
  'Outdoors',
  'Family',
  'Government',
  'Other',
]
const EVENT_REVIEW_STATUSES = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
]
const MAX_BULK_EVENTS = 100
const MAX_CSV_FILE_BYTES = 2 * 1024 * 1024
const EVENT_COLUMNS = [
  'id',
  'title',
  'description',
  'start_at',
  'end_at',
  'all_day',
  'location_name',
  'address',
  'website_url',
  'category',
  'is_published',
  'status',
  'reviewed_at',
  'created_at',
].join(',')

const dateTimePartsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: EVENT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const eventDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: EVENT_TIME_ZONE,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const eventTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: EVENT_TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
})

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
})

const selectedDateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

const upcomingMonthFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: EVENT_TIME_ZONE,
  month: 'short',
})

const upcomingDayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: EVENT_TIME_ZONE,
  day: 'numeric',
})

function pad(value) {
  return String(value).padStart(2, '0')
}

function localDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function dateFromKey(key) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function partsInEventTimeZone(value) {
  const parts = dateTimePartsFormatter.formatToParts(new Date(value))
  return Object.fromEntries(parts.map((part) => [part.type, part.value]))
}

function eventDateKey(value) {
  const parts = partsInEventTimeZone(value)
  return `${parts.year}-${parts.month}-${parts.day}`
}

function zonedDateTimeToIso(date, time = '00:00') {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute)
  let guess = targetAsUtc

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = partsInEventTimeZone(guess)
    const displayedAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
    )
    guess += targetAsUtc - displayedAsUtc
  }

  return new Date(guess).toISOString()
}

function blankEvent(date = localDateKey(new Date())) {
  return {
    title: '',
    description: '',
    start_date: date,
    start_time: '18:00',
    end_date: '',
    end_time: '',
    all_day: false,
    location_name: '',
    address: '',
    website_url: '',
    category: 'Community',
    is_published: true,
    status: 'approved',
  }
}

function eventToForm(event) {
  const start = partsInEventTimeZone(event.start_at)
  const end = event.end_at ? partsInEventTimeZone(event.end_at) : null

  return {
    title: event.title ?? '',
    description: event.description ?? '',
    start_date: `${start.year}-${start.month}-${start.day}`,
    start_time: `${start.hour}:${start.minute}`,
    end_date: end ? `${end.year}-${end.month}-${end.day}` : '',
    end_time: end ? `${end.hour}:${end.minute}` : '',
    all_day: Boolean(event.all_day),
    location_name: event.location_name ?? '',
    address: event.address ?? '',
    website_url: event.website_url ?? '',
    category: event.category ?? 'Community',
    is_published: Boolean(event.is_published),
    status: event.status ?? 'approved',
  }
}

function eventPayload(form) {
  const startTime = form.all_day ? '00:00' : form.start_time
  const endTime = form.all_day ? '23:59' : form.end_time || form.start_time

  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    start_at: zonedDateTimeToIso(form.start_date, startTime),
    end_at: form.end_date ? zonedDateTimeToIso(form.end_date, endTime) : null,
    all_day: form.all_day,
    location_name: form.location_name.trim() || null,
    address: form.address.trim() || null,
    website_url: normalizeWebsiteUrl(form.website_url),
    category: form.category,
    is_published: form.status === 'approved' && form.is_published,
    status: form.status,
  }
}

function publicSubmissionPayload(form) {
  const payload = eventPayload(form)
  if (payload.end_at && new Date(payload.end_at) <= new Date(payload.start_at)) {
    throw new Error('The event end must be after its start.')
  }

  return {
    title: payload.title,
    description: payload.description,
    start_at: payload.start_at,
    end_at: payload.end_at,
    all_day: payload.all_day,
    location_name: payload.location_name,
    address: payload.address,
    website_url: payload.website_url,
    category: payload.category,
  }
}

function formatCsvSchedule(event) {
  if (event.all_day) {
    return event.end_date && event.end_date !== event.start_date
      ? `${event.start_date} – ${event.end_date} · All day`
      : `${event.start_date} · All day`
  }

  const start = `${event.start_date} at ${event.start_time}`
  if (!event.end_date) return start
  if (event.end_date === event.start_date) {
    return event.end_time ? `${start}–${event.end_time}` : start
  }
  return `${start} – ${event.end_date}${event.end_time ? ` at ${event.end_time}` : ''}`
}

function getCalendarDays(month) {
  const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1)
  const gridStart = new Date(firstOfMonth)
  gridStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay())

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    return date
  })
}

function formatEventSchedule(event) {
  const startDate = eventDateFormatter.format(new Date(event.start_at))
  const endDate = event.end_at ? eventDateFormatter.format(new Date(event.end_at)) : null

  if (event.all_day) {
    return endDate && endDate !== startDate ? `${startDate} – ${endDate}` : `${startDate} · All day`
  }

  const startTime = eventTimeFormatter.format(new Date(event.start_at))
  if (!event.end_at) return `${startDate} · ${startTime}`

  const endTime = eventTimeFormatter.format(new Date(event.end_at))
  return endDate === startDate
    ? `${startDate} · ${startTime}–${endTime}`
    : `${startDate}, ${startTime} – ${endDate}, ${endTime}`
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
    throw new Error('Enter a valid event website.')
  }

  return normalizedUrl
}

function eventSubmissionContact(event) {
  const contact = event.event_submission_contacts
  return Array.isArray(contact) ? contact[0] : contact
}

function EventInformationFields({ form, updateField, showReviewControls = false }) {
  return (
    <div className="event-form-grid">
      <label className="field-wide">
        <span>Event title</span>
        <input
          type="text"
          value={form.title}
          onChange={(event) => updateField('title', event.target.value)}
          required
          maxLength="120"
        />
      </label>

      <label>
        <span>Category</span>
        <select
          value={form.category}
          onChange={(event) => updateField('category', event.target.value)}
        >
          {EVENT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
        </select>
      </label>

      <label className="event-check-field">
        <input
          type="checkbox"
          checked={form.all_day}
          onChange={(event) => updateField('all_day', event.target.checked)}
        />
        <span>All-day event</span>
      </label>

      <label>
        <span>Start date</span>
        <input
          type="date"
          value={form.start_date}
          onChange={(event) => updateField('start_date', event.target.value)}
          required
        />
      </label>

      {!form.all_day && (
        <label>
          <span>Start time</span>
          <input
            type="time"
            value={form.start_time}
            onChange={(event) => updateField('start_time', event.target.value)}
            required
          />
        </label>
      )}

      <label>
        <span>End date <small>(optional)</small></span>
        <input
          type="date"
          value={form.end_date}
          min={form.start_date}
          onChange={(event) => updateField('end_date', event.target.value)}
        />
      </label>

      {!form.all_day && (
        <label>
          <span>End time <small>(optional)</small></span>
          <input
            type="time"
            value={form.end_time}
            onChange={(event) => updateField('end_time', event.target.value)}
          />
        </label>
      )}

      <label>
        <span>Venue</span>
        <input
          type="text"
          value={form.location_name}
          onChange={(event) => updateField('location_name', event.target.value)}
          maxLength="160"
          placeholder="Lee Theatre"
        />
      </label>

      <label>
        <span>Street address</span>
        <input
          type="text"
          value={form.address}
          onChange={(event) => updateField('address', event.target.value)}
          maxLength="240"
          placeholder="41676 W Morgan Avenue, Pennington Gap, VA"
        />
      </label>

      <label className="field-wide">
        <span>Event website</span>
        <input
          type="text"
          inputMode="url"
          value={form.website_url}
          onChange={(event) => updateField('website_url', event.target.value)}
          maxLength="500"
          placeholder="https://example.com/event"
        />
      </label>

      <label className="field-wide">
        <span>Description</span>
        <textarea
          value={form.description}
          onChange={(event) => updateField('description', event.target.value)}
          rows="5"
          maxLength="4000"
        />
      </label>

      {showReviewControls && (
        <>
          <label>
            <span>Review status</span>
            <select
              value={form.status}
              onChange={(event) => updateField('status', event.target.value)}
            >
              {EVENT_REVIEW_STATUSES.map((status) => (
                <option value={status.id} key={status.id}>{status.label}</option>
              ))}
            </select>
          </label>

          <label className="event-check-field">
            <input
              type="checkbox"
              checked={form.is_published}
              disabled={form.status !== 'approved'}
              onChange={(event) => updateField('is_published', event.target.checked)}
            />
            <span>
              {form.status === 'approved'
                ? 'Published and visible to visitors'
                : 'Approve this event before publishing'}
            </span>
          </label>
        </>
      )}
    </div>
  )
}

function EventSubmissionForm({ initialDate, onCancel, onSubmitted }) {
  const [submissionMode, setSubmissionMode] = useState('single')
  const [form, setForm] = useState(() => blankEvent(initialDate))
  const [csvEvents, setCsvEvents] = useState([])
  const [csvErrors, setCsvErrors] = useState([])
  const [csvFileName, setCsvFileName] = useState('')
  const [contact, setContact] = useState({
    submitter_name: '',
    submitter_email: '',
    company: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const updateContactField = (field, value) => {
    setContact((current) => ({ ...current, [field]: value }))
  }

  const changeMode = (mode) => {
    setSubmissionMode(mode)
    setError('')
  }

  const handleCsvFile = async (changeEvent) => {
    const [file] = changeEvent.target.files
    setCsvEvents([])
    setCsvErrors([])
    setCsvFileName(file?.name ?? '')
    setError('')

    if (!file) return
    if (file.size > MAX_CSV_FILE_BYTES) {
      setCsvErrors(['The CSV file must be 2 MB or smaller.'])
      return
    }

    try {
      const parsed = parseEventCsv(await file.text(), {
        categories: EVENT_CATEGORIES,
        maxEvents: MAX_BULK_EVENTS,
      })
      const validatedEvents = []
      const validationErrors = [...parsed.errors]

      parsed.events.forEach((csvEvent) => {
        try {
          publicSubmissionPayload(csvEvent)
          validatedEvents.push(csvEvent)
        } catch (validationError) {
          validationErrors.push(`Row ${csvEvent.csv_row}: ${validationError.message}`)
        }
      })

      setCsvEvents(validatedEvents)
      setCsvErrors(validationErrors)
    } catch (fileError) {
      setCsvErrors([fileError.message || 'The CSV file could not be read.'])
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    try {
      const forms = submissionMode === 'csv' ? csvEvents : [form]
      if (submissionMode === 'csv' && csvErrors.length > 0) {
        throw new Error('Fix the CSV errors and upload the file again before submitting.')
      }
      if (forms.length === 0) {
        throw new Error('Choose a CSV file containing at least one event.')
      }

      setSubmitting(true)

      // A filled honeypot is treated as a successful submission without writing spam.
      if (contact.company) {
        onSubmitted(forms.length)
        return
      }

      const payloads = forms.map((eventForm, index) => {
        try {
          return publicSubmissionPayload(eventForm)
        } catch (payloadError) {
          const eventLabel = submissionMode === 'csv'
            ? `CSV row ${eventForm.csv_row}`
            : `Event ${index + 1}`
          throw new Error(`${eventLabel}: ${payloadError.message}`, { cause: payloadError })
        }
      })

      const contactPayload = {
        p_submitter_name: contact.submitter_name.trim(),
        p_submitter_email: contact.submitter_email.trim(),
      }

      const request = payloads.length === 1
        ? supabase.rpc('submit_calendar_event', {
            p_title: payloads[0].title,
            p_description: payloads[0].description,
            p_start_at: payloads[0].start_at,
            p_end_at: payloads[0].end_at,
            p_all_day: payloads[0].all_day,
            p_location_name: payloads[0].location_name,
            p_address: payloads[0].address,
            p_website_url: payloads[0].website_url,
            p_category: payloads[0].category,
            ...contactPayload,
          })
        : supabase.rpc('submit_calendar_events', {
            p_events: payloads,
            ...contactPayload,
          })

      const { error: submitError } = await request

      if (submitError) throw submitError
      onSubmitted(forms.length)
    } catch (submitError) {
      setError(submitError.message || 'The events could not be submitted.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="event-editor event-submission" aria-labelledby="event-submission-title">
      <div className="event-editor-heading">
        <div>
          <p className="calendar-eyebrow">Community calendar</p>
          <h2 id="event-submission-title">Submit events</h2>
          <p>Enter one event or upload a CSV spreadsheet with up to {MAX_BULK_EVENTS} events.</p>
        </div>
        <button type="button" className="calendar-button button-quiet" onClick={onCancel}>
          Close
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="event-submission-modes" role="group" aria-label="Event submission method">
          <button
            type="button"
            className={submissionMode === 'single' ? 'active' : undefined}
            aria-pressed={submissionMode === 'single'}
            onClick={() => changeMode('single')}
          >
            Enter one event
          </button>
          <button
            type="button"
            className={submissionMode === 'csv' ? 'active' : undefined}
            aria-pressed={submissionMode === 'csv'}
            onClick={() => changeMode('csv')}
          >
            Upload CSV
          </button>
        </div>

        {submissionMode === 'single' ? (
          <EventInformationFields form={form} updateField={updateField} />
        ) : (
          <section className="event-csv-panel" aria-labelledby="event-csv-title">
            <div className="event-csv-heading">
              <div>
                <h3 id="event-csv-title">Upload your event spreadsheet</h3>
                <p>
                  The template includes an example row—replace or delete it before submitting.
                  Use the headers exactly. Dates may use YYYY-MM-DD or M/D/YYYY; times may
                  use 18:30 or 6:30 PM. Title and start date are required, along with a start
                  time unless all_day is Yes.
                </p>
              </div>
              <a
                className="calendar-button button-quiet"
                href={`${import.meta.env.BASE_URL}event-upload-template.csv`}
                download
              >
                Download CSV template
              </a>
            </div>

            <p className="event-csv-columns">
              <strong>Columns:</strong> {EVENT_CSV_HEADERS.join(', ')}
            </p>

            <label className="event-csv-file-field">
              <span>Choose CSV file</span>
              <input type="file" accept=".csv,text/csv" onChange={handleCsvFile} />
              <small>Maximum {MAX_BULK_EVENTS} events and 2 MB.</small>
            </label>

            {csvErrors.length > 0 && (
              <div className="event-csv-errors" role="alert">
                <strong>{csvFileName || 'CSV'} could not be submitted:</strong>
                <ul>
                  {csvErrors.map((csvError) => <li key={csvError}>{csvError}</li>)}
                </ul>
              </div>
            )}

            {csvEvents.length > 0 && (
              <div className="event-csv-preview">
                <div className="event-csv-preview-heading">
                  <div>
                    <strong>{csvFileName}</strong>
                    <span>{csvEvents.length} event{csvEvents.length === 1 ? '' : 's'} ready</span>
                  </div>
                  {csvErrors.length === 0 && <span className="event-csv-ready">Ready to submit</span>}
                </div>
                <div className="event-csv-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Row</th>
                        <th scope="col">Event</th>
                        <th scope="col">Schedule</th>
                        <th scope="col">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvEvents.map((csvEvent) => (
                        <tr key={csvEvent.csv_row}>
                          <td>{csvEvent.csv_row}</td>
                          <td>
                            <strong>{csvEvent.title}</strong>
                            {csvEvent.location_name && <span>{csvEvent.location_name}</span>}
                          </td>
                          <td>{formatCsvSchedule(csvEvent)}</td>
                          <td>{csvEvent.category}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        <fieldset className="event-submitter-fields">
          <legend>Your contact information</legend>
          <p>This information is only visible to calendar administrators.</p>
          <div className="event-form-grid">
            <label>
              <span>Your name</span>
              <input
                type="text"
                value={contact.submitter_name}
                onChange={(event) => updateContactField('submitter_name', event.target.value)}
                maxLength="140"
                required
              />
            </label>
            <label>
              <span>Your email</span>
              <input
                type="email"
                value={contact.submitter_email}
                onChange={(event) => updateContactField('submitter_email', event.target.value)}
                maxLength="254"
                required
              />
            </label>
          </div>
        </fieldset>

        <label className="event-honeypot" aria-hidden="true">
          <span>Company</span>
          <input
            type="text"
            value={contact.company}
            onChange={(event) => updateContactField('company', event.target.value)}
            tabIndex="-1"
            autoComplete="off"
          />
        </label>

        {error && <p className="calendar-message message-error" role="alert">{error}</p>}

        <div className="event-form-actions">
          <button
            className="calendar-button button-primary"
            type="submit"
            disabled={submitting || (submissionMode === 'csv' && (csvEvents.length === 0 || csvErrors.length > 0))}
          >
            {submitting
              ? 'Sending…'
              : submissionMode === 'csv'
                ? `Submit ${csvEvents.length} event${csvEvents.length === 1 ? '' : 's'} for approval`
                : 'Submit event for approval'}
          </button>
          <button className="calendar-button button-quiet" type="button" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  )
}

function EventForm({ event, initialDate, onCancel, onSaved }) {
  const [form, setForm] = useState(() => (event ? eventToForm(event) : blankEvent(initialDate)))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'status' && value !== 'approved' ? { is_published: false } : {}),
    }))
  }

  const handleSubmit = async (submitEvent) => {
    submitEvent.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload = eventPayload(form)

      if (payload.end_at && new Date(payload.end_at) <= new Date(payload.start_at)) {
        throw new Error('The event end must be after its start.')
      }

      const query = event
        ? supabase.from('events').update(payload).eq('id', event.id)
        : supabase.from('events').insert(payload)
      const { error: saveError } = await query

      if (saveError) throw saveError
      onSaved(event ? 'Event updated.' : 'Event created.')
    } catch (saveError) {
      setError(saveError.message || 'The event could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="event-editor" aria-labelledby="event-editor-title">
      <div className="event-editor-heading">
        <div>
          <p className="calendar-eyebrow">Calendar editor</p>
          <h2 id="event-editor-title">{event ? 'Edit event' : 'Add an event'}</h2>
        </div>
        <button type="button" className="calendar-button button-quiet" onClick={onCancel}>
          Close
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <EventInformationFields
          form={form}
          updateField={updateField}
          showReviewControls
        />

        {error && <p className="calendar-message message-error" role="alert">{error}</p>}

        <div className="event-form-actions">
          <button className="calendar-button button-primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : event ? 'Save changes' : 'Create event'}
          </button>
          <button className="calendar-button button-quiet" type="button" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  )
}

function EventReviewQueue({ events, loading, error, onEdit, onStatusChange, onDelete }) {
  const [activeStatus, setActiveStatus] = useState('pending')
  const [updatingId, setUpdatingId] = useState(null)

  const statusCounts = useMemo(
    () => Object.fromEntries(
      EVENT_REVIEW_STATUSES.map((status) => [
        status.id,
        events.filter((event) => event.status === status.id).length,
      ]),
    ),
    [events],
  )

  const visibleEvents = useMemo(
    () => events.filter((event) => event.status === activeStatus),
    [activeStatus, events],
  )

  const changeStatus = async (event, status) => {
    setUpdatingId(event.id)
    await onStatusChange(event, status)
    setUpdatingId(null)
  }

  const deleteEvent = async (event) => {
    setUpdatingId(event.id)
    await onDelete(event)
    setUpdatingId(null)
  }

  return (
    <section className="event-review-queue" aria-labelledby="event-review-title">
      <div className="event-review-heading">
        <div>
          <p className="calendar-eyebrow">Community submissions</p>
          <h2 id="event-review-title">Review events</h2>
        </div>
        <span>{statusCounts.pending ?? 0} pending</span>
      </div>

      <div className="event-review-tabs" role="group" aria-label="Event submission status">
        {EVENT_REVIEW_STATUSES.map((status) => (
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

      {loading && <p className="admin-access-status" role="status">Loading event submissions…</p>}
      {error && <p className="calendar-message message-error" role="alert">{error}</p>}

      {!loading && !error && visibleEvents.length === 0 && (
        <div className="event-review-empty">
          <h3>No {activeStatus} events</h3>
          <p>Events with this status will appear here.</p>
        </div>
      )}

      {!loading && !error && visibleEvents.length > 0 && (
        <div className="event-review-list">
          {visibleEvents.map((event) => {
            const contact = eventSubmissionContact(event)
            const isUpdating = updatingId === event.id

            return (
              <article className="event-review-card" key={event.id}>
                <div className="event-review-card-heading">
                  <div>
                    <p className="event-category">{event.category}</p>
                    <h3>{event.title}</h3>
                  </div>
                  <span className={`event-status-badge status-${event.status}`}>{event.status}</span>
                </div>
                <p className="event-schedule">{formatEventSchedule(event)}</p>
                {event.location_name && <p><strong>{event.location_name}</strong></p>}
                {event.address && <p>{event.address}</p>}
                {event.description && <p className="event-review-description">{event.description}</p>}
                {contact && (
                  <p className="event-review-submitter">
                    Submitted by {contact.contact_name} ·{' '}
                    <a href={`mailto:${contact.contact_email}`}>{contact.contact_email}</a>
                  </p>
                )}
                <div className="event-card-actions">
                  <button
                    type="button"
                    className="calendar-button button-quiet"
                    onClick={() => onEdit(event)}
                    disabled={isUpdating}
                  >
                    Edit information
                  </button>
                  {event.status !== 'approved' && (
                    <button
                      type="button"
                      className="calendar-button button-approve"
                      onClick={() => changeStatus(event, 'approved')}
                      disabled={isUpdating}
                    >
                      {isUpdating ? 'Saving…' : 'Approve & publish'}
                    </button>
                  )}
                  {event.status !== 'rejected' && (
                    <button
                      type="button"
                      className="calendar-button button-reject"
                      onClick={() => changeStatus(event, 'rejected')}
                      disabled={isUpdating}
                    >
                      Reject
                    </button>
                  )}
                  <button
                    type="button"
                    className="calendar-button button-danger"
                    onClick={() => deleteEvent(event)}
                    disabled={isUpdating}
                  >
                    {isUpdating ? 'Working…' : 'Delete event'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

function AdminAccess({
  session,
  sessionLoading,
  isAdmin,
  accessLoading,
  passwordSetupReason,
  authCallbackError,
  onPasswordSet,
  onSignedIn,
  onSignOut,
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleLogin = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setMessage('')

    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password })

    if (loginError) {
      setError(
        loginError.code === 'invalid_credentials'
          ? 'The email or password is incorrect. If you accepted an invitation but never created a password, use “Set or reset password” below.'
          : loginError.message,
      )
    } else {
      setPassword('')
      onSignedIn(data.session)
    }
    setSubmitting(false)
  }

  const handlePasswordReset = async () => {
    const normalizedEmail = email.trim()
    setError('')
    setMessage('')

    if (!normalizedEmail) {
      setError('Enter your email address first, then choose “Set or reset password.”')
      return
    }

    setSubmitting(true)
    const redirectTo = `${window.location.origin}${window.location.pathname}`
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo,
    })

    if (resetError) {
      setError(resetError.message)
    } else {
      setMessage('Check your email for a link to choose your password.')
    }
    setSubmitting(false)
  }

  const handlePasswordSetup = async (event) => {
    event.preventDefault()
    setError('')

    if (newPassword.length < 12) {
      setError('Use a password with at least 12 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }

    setSubmitting(true)
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })

    if (updateError) {
      setError(updateError.message)
    } else {
      setNewPassword('')
      setConfirmPassword('')
      onPasswordSet()
    }
    setSubmitting(false)
  }

  if (sessionLoading) {
    return <p className="admin-access-status" role="status">Checking calendar access…</p>
  }

  if (session && passwordSetupReason) {
    const isRecovery = passwordSetupReason === 'recovery'

    return (
      <form className="admin-login-form password-setup-form" onSubmit={handlePasswordSetup}>
        <div className="admin-login-copy">
          <p className="calendar-eyebrow">{isRecovery ? 'Password recovery' : 'Invitation accepted'}</p>
          <h2>{isRecovery ? 'Choose a new password' : 'Create your password'}</h2>
          <p>
            {isRecovery
              ? `Choose a new password for ${session.user.email}.`
              : `Set a password for ${session.user.email} to finish creating your calendar account.`}
          </p>
        </div>
        <label>
          <span>New password</span>
          <input
            type="password"
            autoComplete="new-password"
            autoFocus
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            minLength="12"
            required
          />
        </label>
        <label>
          <span>Confirm password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength="12"
            required
          />
        </label>
        {error && <p className="calendar-message message-error" role="alert">{error}</p>}
        <button className="calendar-button button-primary" type="submit" disabled={submitting}>
          {submitting ? 'Saving password…' : 'Create password'}
        </button>
      </form>
    )
  }

  if (session && accessLoading) {
    return <p className="admin-access-status" role="status">Checking calendar access…</p>
  }

  if (session && isAdmin) {
    return (
      <div className="admin-signed-in">
        <div>
          <p className="calendar-eyebrow">Signed in</p>
          <strong>{session.user.email}</strong>
          <span>Your session is saved on this device.</span>
        </div>
        <button type="button" className="calendar-button button-quiet" onClick={onSignOut}>Sign out</button>
      </div>
    )
  }

  if (session && !isAdmin) {
    return (
      <div className="admin-denied" role="alert">
        <div>
          <strong>This account does not have calendar access.</strong>
          <p>Add {session.user.email} to <code>calendar_admins</code> in Supabase, then sign in again.</p>
        </div>
        <button type="button" className="calendar-button button-quiet" onClick={onSignOut}>Sign out</button>
      </div>
    )
  }

  return (
    <form className="admin-login-form" onSubmit={handleLogin}>
      <div className="admin-login-copy">
        <p className="calendar-eyebrow">Authorized users</p>
        <h2>Calendar sign in</h2>
        <p>Sign in to create, edit, publish, and remove events.</p>
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
      {authCallbackError && (
        <p className="calendar-message message-error" role="alert">{authCallbackError}</p>
      )}
      {error && <p className="calendar-message message-error" role="alert">{error}</p>}
      {message && <p className="calendar-message message-success" role="status">{message}</p>}
      <div className="admin-login-actions">
        <button className="calendar-button button-primary" type="submit" disabled={submitting}>
          {submitting ? 'Please wait…' : 'Sign in'}
        </button>
        <button
          className="calendar-button button-quiet"
          type="button"
          disabled={submitting}
          onClick={handlePasswordReset}
        >
          Set or reset password
        </button>
      </div>
    </form>
  )
}

function EventDetails({ event, isAdmin, onEdit, onDelete }) {
  const websiteUrl = safeWebsiteUrl(event.website_url)

  return (
    <article className={`calendar-event-card${event.is_published ? '' : ' is-draft'}`}>
      <div className="event-card-topline">
        <span className="event-category">{event.category}</span>
        {!event.is_published && <span className="event-draft-badge">Draft</span>}
      </div>
      <h3>{event.title}</h3>
      <p className="event-schedule">{formatEventSchedule(event)}</p>
      {event.location_name && <p className="event-location"><strong>{event.location_name}</strong></p>}
      {event.address && <p className="event-address">{event.address}</p>}
      {event.description && <p className="event-description">{event.description}</p>}
      <div className="event-card-actions">
        {websiteUrl && (
          <a className="calendar-button button-primary" href={websiteUrl} target="_blank" rel="noopener noreferrer">
            Event website
          </a>
        )}
        {isAdmin && (
          <>
            <button type="button" className="calendar-button button-quiet" onClick={() => onEdit(event)}>Edit</button>
            <button type="button" className="calendar-button button-danger" onClick={() => onDelete(event)}>Delete</button>
          </>
        )}
      </div>
    </article>
  )
}

function UpcomingEventItem({ event, onSelect }) {
  const startDate = new Date(event.start_at)

  return (
    <button type="button" className="upcoming-event-item" onClick={() => onSelect(event)}>
      <span className="upcoming-date-tile" aria-hidden="true">
        <span>{upcomingMonthFormatter.format(startDate)}</span>
        <strong>{upcomingDayFormatter.format(startDate)}</strong>
      </span>
      <span className="upcoming-event-copy">
        <span className="upcoming-event-meta">
          {event.category}
          {!event.is_published && <span className="upcoming-draft-label">Draft</span>}
        </span>
        <strong>{event.title}</strong>
        <span>{formatEventSchedule(event)}</span>
        {event.location_name && <span>{event.location_name}</span>}
      </span>
    </button>
  )
}

function CalendarPage() {
  const today = useMemo(() => new Date(), [])
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(() => localDateKey(today))
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [loadError, setLoadError] = useState('')
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [upcomingLoading, setUpcomingLoading] = useState(isSupabaseConfigured)
  const [upcomingError, setUpcomingError] = useState('')
  const [upcomingExpanded, setUpcomingExpanded] = useState(false)
  const [submissionOpen, setSubmissionOpen] = useState(false)
  const [session, setSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(isSupabaseConfigured)
  const [adminUserId, setAdminUserId] = useState(null)
  const [accessCheckedFor, setAccessCheckedFor] = useState(null)
  const [passwordSetupReason, setPasswordSetupReason] = useState(
    () => (
      ['invite', 'recovery'].includes(initialAuthCallback.type) && !initialAuthCallback.errorDescription
        ? initialAuthCallback.type
        : null
    ),
  )
  const [adminOpen, setAdminOpen] = useState(
    () => initialAuthCallback.hasAuthParams || ['invite', 'recovery'].includes(initialAuthCallback.type),
  )
  const [passwordModalDismissed, setPasswordModalDismissed] = useState(false)
  const [authCallbackError, setAuthCallbackError] = useState(() => (
    initialAuthCallback.errorDescription
      ? `The email link could not be used: ${initialAuthCallback.errorDescription}`
      : ''
  ))
  const [editingEvent, setEditingEvent] = useState(null)
  const [creatingEvent, setCreatingEvent] = useState(false)
  const [reviewEvents, setReviewEvents] = useState([])
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [notice, setNotice] = useState('')
  const isAdmin = Boolean(session?.user && adminUserId === session.user.id)
  const accessLoading = Boolean(session?.user && accessCheckedFor !== session.user.id)
  const passwordModalOpen = Boolean(
    isSupabaseConfigured && passwordSetupReason && !passwordModalDismissed,
  )
  const upcomingStart = useMemo(
    () => zonedDateTimeToIso(eventDateKey(today)),
    [today],
  )

  const calendarDays = useMemo(() => getCalendarDays(month), [month])
  const visibleRange = useMemo(() => {
    const start = calendarDays[0]
    const end = new Date(calendarDays[calendarDays.length - 1])
    end.setDate(end.getDate() + 1)
    return {
      start: zonedDateTimeToIso(localDateKey(start)),
      end: zonedDateTimeToIso(localDateKey(end)),
    }
  }, [calendarDays])

  const loadEvents = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setLoadError('')

    let query = supabase
      .from('events')
      .select(EVENT_COLUMNS)
      .eq('status', 'approved')
      .lt('start_at', visibleRange.end)
      .or(`end_at.gte.${visibleRange.start},and(end_at.is.null,start_at.gte.${visibleRange.start})`)
      .order('start_at', { ascending: true })

    if (!isAdmin) query = query.eq('is_published', true)

    const { data, error } = await query
    if (error) {
      setLoadError(error.message)
      setEvents([])
    } else {
      setEvents(data ?? [])
    }
    setLoading(false)
  }, [isAdmin, visibleRange])

  const loadUpcomingEvents = useCallback(async () => {
    if (!supabase) return
    setUpcomingLoading(true)
    setUpcomingError('')

    let query = supabase
      .from('events')
      .select(EVENT_COLUMNS)
      .eq('status', 'approved')
      .or(`start_at.gte.${upcomingStart},end_at.gte.${upcomingStart}`)
      .order('start_at', { ascending: true })

    if (!isAdmin) query = query.eq('is_published', true)

    const { data, error } = await query
    if (error) {
      setUpcomingError(error.message)
      setUpcomingEvents([])
    } else {
      setUpcomingEvents(data ?? [])
    }
    setUpcomingLoading(false)
  }, [isAdmin, upcomingStart])

  const loadReviewEvents = useCallback(async () => {
    if (!supabase || !isAdmin) return
    setReviewLoading(true)
    setReviewError('')

    const { data, error } = await supabase
      .from('events')
      .select(`${EVENT_COLUMNS},event_submission_contacts(contact_name,contact_email,created_at)`)
      .order('created_at', { ascending: false })

    if (error) {
      setReviewEvents([])
      setReviewError(error.message)
    } else {
      setReviewEvents(data ?? [])
    }
    setReviewLoading(false)
  }, [isAdmin])

  useEffect(() => {
    if (!supabase) return undefined

    let active = true
    const { data: authListener } = supabase.auth.onAuthStateChange((authEvent, nextSession) => {
      setSession(nextSession)
      setSessionLoading(false)
      if (authEvent === 'PASSWORD_RECOVERY') {
        setPasswordSetupReason('recovery')
        setPasswordModalDismissed(false)
        setAdminOpen(true)
      }
      if (
        authEvent === 'SIGNED_IN' &&
        !initialAuthCallback.type &&
        initialAuthCallback.hasAuthParams &&
        nextSession?.user.invited_at
      ) {
        setPasswordSetupReason('invite')
        setPasswordModalDismissed(false)
        setAdminOpen(true)
      }
      if (!nextSession) {
        setAdminUserId(null)
        setAccessCheckedFor(null)
      }
    })

    const initializeSession = async () => {
      const { data: callbackData, error: callbackError } = await completeInitialAuthCallback()
      if (!active) return

      if (callbackError) {
        setPasswordSetupReason(null)
        setAuthCallbackError(
          `The email link could not be used: ${callbackError.message}. It may have expired or already been used.`,
        )
      }

      const { data, error: sessionError } = await supabase.auth.getSession()
      if (!active) return

      const nextSession = callbackData.session ?? data.session
      setSession(nextSession)
      setSessionLoading(false)

      if (sessionError) {
        setAuthCallbackError(`Calendar sign-in could not be completed: ${sessionError.message}`)
      } else if (
        initialAuthCallback.hasAuthParams &&
        !initialAuthCallback.errorDescription &&
        !callbackError &&
        !nextSession
      ) {
        setPasswordSetupReason(null)
        setAuthCallbackError(
          'This invitation link did not create a sign-in session. It may have expired or already been used. Enter your email below and choose “Set or reset password.”',
        )
      } else if (
        nextSession?.user.invited_at &&
        initialAuthCallback.hasAuthParams &&
        !['invite', 'recovery'].includes(initialAuthCallback.type)
      ) {
        setPasswordSetupReason('invite')
        setPasswordModalDismissed(false)
        setAdminOpen(true)
      }
    }

    initializeSession()

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
    if (!passwordModalOpen) return undefined

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return
      setPasswordModalDismissed(true)
      setAdminOpen(false)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [passwordModalOpen])

  useEffect(() => {
    const loadTimer = window.setTimeout(loadEvents, 0)
    return () => window.clearTimeout(loadTimer)
  }, [loadEvents])

  useEffect(() => {
    const loadTimer = window.setTimeout(loadUpcomingEvents, 0)
    return () => window.clearTimeout(loadTimer)
  }, [loadUpcomingEvents])

  useEffect(() => {
    if (!isAdmin || !adminOpen) return undefined

    const loadTimer = window.setTimeout(loadReviewEvents, 0)
    return () => window.clearTimeout(loadTimer)
  }, [adminOpen, isAdmin, loadReviewEvents])

  const eventsByDate = useMemo(() => {
    const grouped = new Map()
    const firstVisibleKey = localDateKey(calendarDays[0])
    const lastVisibleKey = localDateKey(calendarDays[calendarDays.length - 1])

    events.forEach((event) => {
      const eventStartKey = eventDateKey(event.start_at)
      const eventEndKey = event.end_at ? eventDateKey(event.end_at) : eventStartKey
      const firstEventKey = eventStartKey < firstVisibleKey ? firstVisibleKey : eventStartKey
      const lastEventKey = eventEndKey > lastVisibleKey ? lastVisibleKey : eventEndKey
      const cursor = dateFromKey(firstEventKey)
      const lastEventDate = dateFromKey(lastEventKey)

      while (cursor <= lastEventDate) {
        const key = localDateKey(cursor)
        grouped.set(key, [...(grouped.get(key) ?? []), event])
        cursor.setDate(cursor.getDate() + 1)
      }
    })
    return grouped
  }, [calendarDays, events])

  const selectedEvents = eventsByDate.get(selectedDate) ?? []
  const visibleUpcomingEvents = upcomingExpanded ? upcomingEvents : upcomingEvents.slice(0, 3)

  const changeMonth = (offset) => {
    const nextMonth = new Date(month.getFullYear(), month.getMonth() + offset, 1)
    setMonth(nextMonth)
    setSelectedDate(localDateKey(nextMonth))
    setNotice('')
  }

  const goToToday = () => {
    const now = new Date()
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelectedDate(localDateKey(now))
  }

  const selectUpcomingEvent = (event) => {
    const key = eventDateKey(event.start_at)
    const date = dateFromKey(key)
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    setSelectedDate(key)
  }

  const handleSaved = async (message) => {
    setEditingEvent(null)
    setCreatingEvent(false)
    setNotice(message)
    await Promise.all([loadEvents(), loadUpcomingEvents(), loadReviewEvents()])
  }

  const handleDelete = async (event) => {
    if (!window.confirm(`Delete “${event.title}”? This cannot be undone.`)) return

    const { error } = await supabase.from('events').delete().eq('id', event.id)
    if (error) {
      setNotice(`Could not delete event: ${error.message}`)
      return
    }

    if (editingEvent?.id === event.id) setEditingEvent(null)
    setNotice('Event deleted.')
    await Promise.all([loadEvents(), loadUpcomingEvents(), loadReviewEvents()])
  }

  const handleReviewStatus = async (event, status) => {
    const { error } = await supabase
      .from('events')
      .update({
        status,
        is_published: status === 'approved',
      })
      .eq('id', event.id)

    if (error) {
      setNotice(`Could not update “${event.title}”: ${error.message}`)
      return
    }

    setNotice(
      status === 'approved'
        ? `“${event.title}” was approved and published.`
        : `“${event.title}” was rejected.`,
    )
    await Promise.all([loadEvents(), loadUpcomingEvents(), loadReviewEvents()])
  }

  const handleSubmitted = (eventCount) => {
    setSubmissionOpen(false)
    setNotice(
      eventCount === 1
        ? 'Your event was submitted for review. It will appear after an administrator approves it.'
        : `${eventCount} events were submitted for review. They will appear after an administrator approves them.`,
    )
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setEditingEvent(null)
    setCreatingEvent(false)
    setAdminUserId(null)
    setAccessCheckedFor(null)
    setReviewEvents([])
    setReviewError('')
  }

  const handlePasswordSet = () => {
    setPasswordSetupReason(null)
    setPasswordModalDismissed(false)
    setAuthCallbackError('')
    setNotice('Your password was created. You are signed in and can manage the calendar.')
    window.history.replaceState({}, document.title, window.location.pathname)
  }

  const handleAdminToggle = () => {
    if (passwordSetupReason) {
      setPasswordModalDismissed(false)
      setAdminOpen(true)
      return
    }

    setAdminOpen((open) => !open)
  }

  const handlePasswordModalClose = () => {
    setPasswordModalDismissed(true)
    setAdminOpen(false)
  }

  return (
    <div className="calendar-app">
      <div className="calendar-admin-toggle-row">
        <p>All event times are shown in Eastern Time.</p>
        <div className="calendar-top-actions">
          <button
            type="button"
            className="calendar-button button-primary"
            aria-expanded={submissionOpen}
            aria-controls="event-submission-form"
            disabled={!isSupabaseConfigured}
            onClick={() => {
              setSubmissionOpen((open) => !open)
              setEditingEvent(null)
              setCreatingEvent(false)
              setNotice('')
            }}
          >
            {submissionOpen ? 'Close event form' : 'Submit events'}
          </button>
          <button
            type="button"
            className="calendar-button button-quiet"
            aria-expanded={adminOpen || passwordModalOpen}
            aria-controls={passwordSetupReason ? 'calendar-password-modal' : 'calendar-admin-panel'}
            onClick={handleAdminToggle}
          >
            {isAdmin ? 'Manage calendar' : 'Admin sign in'}
          </button>
        </div>
      </div>

      {!isSupabaseConfigured && (
        <div className="calendar-connection-notice" role="status">
          <strong>Calendar preview</strong>
          <span>Connect Supabase to load events, accept submissions, and enable sign in.</span>
        </div>
      )}

      {adminOpen && !isSupabaseConfigured && (
        <section id="calendar-admin-panel" className="calendar-setup-card" role="status">
          <p className="calendar-eyebrow">Connection required</p>
          <h2>Finish Supabase setup to sign in</h2>
          <p>
            Add values after <code>VITE_SUPABASE_URL=</code> and
            <code> VITE_SUPABASE_PUBLISHABLE_KEY=</code> in <code>.env</code>, then restart the
            development server. The full instructions are in <code>SUPABASE_SETUP.md</code>.
          </p>
        </section>
      )}

      {passwordModalOpen && (
        <div className="calendar-auth-backdrop">
          <section
            id="calendar-password-modal"
            className="calendar-auth-modal"
            role="dialog"
            aria-modal="true"
            aria-label={passwordSetupReason === 'recovery' ? 'Reset your password' : 'Create your password'}
          >
            <button
              type="button"
              className="calendar-auth-modal-close"
              aria-label="Close password setup"
              onClick={handlePasswordModalClose}
            >
              &times;
            </button>
            <AdminAccess
              session={session}
              sessionLoading={sessionLoading}
              isAdmin={isAdmin}
              accessLoading={accessLoading}
              passwordSetupReason={passwordSetupReason}
              authCallbackError={authCallbackError}
              onPasswordSet={handlePasswordSet}
              onSignedIn={setSession}
              onSignOut={handleSignOut}
            />
          </section>
        </div>
      )}

      {adminOpen && isSupabaseConfigured && !passwordSetupReason && (
        <section id="calendar-admin-panel" className="calendar-admin-panel">
          <AdminAccess
            session={session}
            sessionLoading={sessionLoading}
            isAdmin={isAdmin}
            accessLoading={accessLoading}
            passwordSetupReason={passwordSetupReason}
            authCallbackError={authCallbackError}
            onPasswordSet={handlePasswordSet}
            onSignedIn={setSession}
            onSignOut={handleSignOut}
          />
          {isAdmin && !accessLoading && !passwordSetupReason && (
            <>
              <button
                type="button"
                className="calendar-button button-primary admin-add-button"
                onClick={() => {
                  setSubmissionOpen(false)
                  setEditingEvent(null)
                  setCreatingEvent(true)
                  setNotice('')
                }}
              >
                Add event
              </button>
              <EventReviewQueue
                events={reviewEvents}
                loading={reviewLoading}
                error={reviewError}
                onEdit={(event) => {
                  setSubmissionOpen(false)
                  setCreatingEvent(false)
                  setEditingEvent(event)
                  setNotice('')
                }}
                onStatusChange={handleReviewStatus}
                onDelete={handleDelete}
              />
            </>
          )}
        </section>
      )}

      {notice && (
        <p
          className={`calendar-message ${notice.startsWith('Could not') ? 'message-error' : 'message-success'}`}
          role="status"
        >
          {notice}
        </p>
      )}

      {submissionOpen && isSupabaseConfigured && (
        <div id="event-submission-form">
          <EventSubmissionForm
            initialDate={selectedDate}
            onCancel={() => setSubmissionOpen(false)}
            onSubmitted={handleSubmitted}
          />
        </div>
      )}

      {isAdmin && (creatingEvent || editingEvent) && (
        <EventForm
          key={editingEvent?.id ?? 'new-event'}
          event={editingEvent}
          initialDate={selectedDate}
          onCancel={() => {
            setEditingEvent(null)
            setCreatingEvent(false)
          }}
          onSaved={handleSaved}
        />
      )}

      <div className="calendar-toolbar">
        <div className="month-navigation">
          <button type="button" className="month-arrow" onClick={() => changeMonth(-1)} aria-label="Previous month">‹</button>
          <h2 aria-live="polite">{monthFormatter.format(month)}</h2>
          <button type="button" className="month-arrow" onClick={() => changeMonth(1)} aria-label="Next month">›</button>
        </div>
        <button type="button" className="calendar-button button-quiet" onClick={goToToday}>Today</button>
      </div>

      {loadError && (
        <div className="calendar-load-error" role="alert">
          <strong>Events could not be loaded.</strong>
          <span>{loadError}</span>
          <button type="button" className="calendar-button button-quiet" onClick={loadEvents}>Try again</button>
        </div>
      )}

      <div className="calendar-layout">
        <section className="month-calendar" aria-label={`${monthFormatter.format(month)} event calendar`}>
          <div className="weekday-row" aria-hidden="true">
            {WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}
          </div>
          <div className={`calendar-grid${loading ? ' is-loading' : ''}`}>
            {calendarDays.map((date) => {
              const key = localDateKey(date)
              const dayEvents = eventsByDate.get(key) ?? []
              const isOutsideMonth = date.getMonth() !== month.getMonth()
              const isToday = key === localDateKey(today)
              const isSelected = key === selectedDate

              return (
                <button
                  type="button"
                  className={[
                    'calendar-day',
                    isOutsideMonth ? 'is-outside' : '',
                    isToday ? 'is-today' : '',
                    isSelected ? 'is-selected' : '',
                  ].filter(Boolean).join(' ')}
                  key={key}
                  aria-label={`${selectedDateFormatter.format(date)}, ${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}`}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedDate(key)}
                >
                  <span className="day-number">{date.getDate()}</span>
                  <span className="day-event-list">
                    {dayEvents.slice(0, 2).map((event) => (
                      <span className={`day-event${event.is_published ? '' : ' is-draft'}`} key={event.id}>
                        {event.all_day ? event.title : `${eventTimeFormatter.format(new Date(event.start_at))} ${event.title}`}
                      </span>
                    ))}
                    {dayEvents.length > 2 && <span className="more-events">+{dayEvents.length - 2} more</span>}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <aside className="selected-day-panel" aria-labelledby="selected-day-title">
          <div className="selected-day-heading">
            <div>
              <p className="calendar-eyebrow">Selected date</p>
              <h2 id="selected-day-title">{selectedDateFormatter.format(dateFromKey(selectedDate))}</h2>
            </div>
            {isAdmin && (
              <button
                type="button"
                className="calendar-button button-primary"
                onClick={() => {
                  setSubmissionOpen(false)
                  setAdminOpen(true)
                  setEditingEvent(null)
                  setCreatingEvent(true)
                  setNotice('')
                }}
              >
                Add event
              </button>
            )}
          </div>

          {loading ? (
            <p className="selected-day-empty" role="status">Loading events…</p>
          ) : selectedEvents.length ? (
            <div className="selected-event-list">
              {selectedEvents.map((event) => (
                <EventDetails
                  event={event}
                  isAdmin={isAdmin}
                  key={event.id}
                  onEdit={(selectedEvent) => {
                    setSubmissionOpen(false)
                    setAdminOpen(true)
                    setCreatingEvent(false)
                    setEditingEvent(selectedEvent)
                    setNotice('')
                  }}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <p className="selected-day-empty">No events are scheduled for this date.</p>
          )}

          <section className="upcoming-events-section" aria-labelledby="upcoming-events-title">
            <div className="upcoming-events-heading">
              <div>
                <p className="calendar-eyebrow">Plan ahead</p>
                <h2 id="upcoming-events-title">Upcoming events</h2>
              </div>
              {!upcomingLoading && <span>{upcomingEvents.length}</span>}
            </div>

            {upcomingLoading ? (
              <p className="upcoming-events-status" role="status">Loading upcoming events…</p>
            ) : upcomingError ? (
              <div className="upcoming-events-status" role="alert">
                <span>Upcoming events could not be loaded.</span>
                <button type="button" className="calendar-button button-quiet" onClick={loadUpcomingEvents}>
                  Try again
                </button>
              </div>
            ) : upcomingEvents.length ? (
              <>
                <div className="upcoming-events-list">
                  {visibleUpcomingEvents.map((event) => (
                    <UpcomingEventItem event={event} key={event.id} onSelect={selectUpcomingEvent} />
                  ))}
                </div>
                {upcomingEvents.length > 3 && (
                  <button
                    type="button"
                    className="calendar-button button-quiet upcoming-expand-button"
                    aria-expanded={upcomingExpanded}
                    onClick={() => setUpcomingExpanded((expanded) => !expanded)}
                  >
                    {upcomingExpanded ? 'Show fewer' : `Show all ${upcomingEvents.length} events`}
                  </button>
                )}
              </>
            ) : (
              <p className="upcoming-events-status">No upcoming events have been added yet.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}

export default CalendarPage
