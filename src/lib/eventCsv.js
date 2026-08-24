export const EVENT_CSV_HEADERS = [
  'title',
  'category',
  'start_date',
  'start_time',
  'end_date',
  'end_time',
  'all_day',
  'venue',
  'address',
  'website',
  'description',
]

const HEADER_ALIASES = {
  title: 'title',
  event_title: 'title',
  category: 'category',
  start_date: 'start_date',
  start_time: 'start_time',
  end_date: 'end_date',
  end_time: 'end_time',
  all_day: 'all_day',
  allday: 'all_day',
  venue: 'location_name',
  location: 'location_name',
  location_name: 'location_name',
  address: 'address',
  street_address: 'address',
  website: 'website_url',
  website_url: 'website_url',
  url: 'website_url',
  description: 'description',
}

function normalizeHeader(value) {
  return value
    .replace(/^\ufeff/, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

function parseCsvRows(text) {
  const rows = []
  let row = []
  let field = ''
  let insideQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]

    if (insideQuotes) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (character === '"') {
        insideQuotes = false
      } else {
        field += character
      }
      continue
    }

    if (character === '"' && field.length === 0) {
      insideQuotes = true
    } else if (character === ',') {
      row.push(field)
      field = ''
    } else if (character === '\n' || character === '\r') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      if (character === '\r' && text[index + 1] === '\n') index += 1
    } else {
      field += character
    }
  }

  if (insideQuotes) throw new Error('The CSV has an unclosed quoted field.')
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

function normalizeDate(value, label, required = false) {
  const trimmedValue = value.trim()
  if (!trimmedValue) {
    if (required) throw new Error(`${label} is required.`)
    return ''
  }

  let year
  let month
  let day
  const isoMatch = trimmedValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  const usMatch = trimmedValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)

  if (isoMatch) {
    ;[, year, month, day] = isoMatch.map(Number)
  } else if (usMatch) {
    ;[, month, day, year] = usMatch.map(Number)
  } else {
    throw new Error(`${label} must use YYYY-MM-DD or M/D/YYYY.`)
  }

  const parsedDate = new Date(Date.UTC(year, month - 1, day))
  if (
    parsedDate.getUTCFullYear() !== year
    || parsedDate.getUTCMonth() !== month - 1
    || parsedDate.getUTCDate() !== day
  ) {
    throw new Error(`${label} is not a valid date.`)
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function normalizeTime(value, label, required = false) {
  const trimmedValue = value.trim()
  if (!trimmedValue) {
    if (required) throw new Error(`${label} is required unless the event is all day.`)
    return ''
  }

  const match = trimmedValue.match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(a\.?m\.?|p\.?m\.?)?$/i)
  if (!match) throw new Error(`${label} must use a time such as 18:30 or 6:30 PM.`)

  let hour = Number(match[1])
  const minute = Number(match[2] ?? 0)
  const meridiem = match[3]?.toLowerCase().replaceAll('.', '')

  if (minute > 59) throw new Error(`${label} is not a valid time.`)

  if (meridiem) {
    if (hour < 1 || hour > 12) throw new Error(`${label} is not a valid time.`)
    if (hour === 12) hour = 0
    if (meridiem === 'pm') hour += 12
  } else if (hour > 23) {
    throw new Error(`${label} is not a valid time.`)
  }

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function normalizeBoolean(value) {
  const normalizedValue = value.trim().toLowerCase()
  if (!normalizedValue || ['no', 'false', '0', 'n'].includes(normalizedValue)) return false
  if (['yes', 'true', '1', 'y'].includes(normalizedValue)) return true
  throw new Error('All day must be Yes or No.')
}

function comparableCategory(value) {
  return value.trim().toLowerCase().replaceAll('&', 'and').replace(/\s+/g, ' ')
}

function normalizeCategory(value, categories) {
  if (!value.trim()) return 'Community'
  const requestedCategory = comparableCategory(value)
  const category = categories.find((option) => comparableCategory(option) === requestedCategory)
  if (!category) throw new Error(`Category must be one of: ${categories.join(', ')}.`)
  return category
}

function validateLength(value, label, maxLength) {
  if (value.length > maxLength) throw new Error(`${label} must be ${maxLength} characters or fewer.`)
}

export function parseEventCsv(text, { categories, maxEvents }) {
  let rows
  try {
    rows = parseCsvRows(text)
  } catch (error) {
    return { events: [], errors: [error.message] }
  }

  const nonemptyRows = rows.filter((cells) => cells.some((cell) => cell.trim()))
  if (nonemptyRows.length === 0) return { events: [], errors: ['The CSV file is empty.'] }

  const canonicalHeaders = nonemptyRows[0].map((header) => (
    HEADER_ALIASES[normalizeHeader(header)] ?? null
  ))
  const errors = []

  for (const requiredHeader of ['title', 'start_date']) {
    if (!canonicalHeaders.includes(requiredHeader)) {
      errors.push(`Missing required “${requiredHeader}” column.`)
    }
  }

  const duplicateHeaders = canonicalHeaders.filter((header, index) => (
    header && canonicalHeaders.indexOf(header) !== index
  ))
  if (duplicateHeaders.length > 0) {
    errors.push(`Duplicate column: ${[...new Set(duplicateHeaders)].join(', ')}.`)
  }

  const dataRows = nonemptyRows.slice(1)
  if (dataRows.length === 0) errors.push('The CSV does not contain any event rows.')
  if (dataRows.length > maxEvents) {
    errors.push(`The CSV has ${dataRows.length} events; the maximum is ${maxEvents}.`)
  }
  if (errors.length > 0) return { events: [], errors }

  const events = []
  dataRows.slice(0, maxEvents).forEach((cells, dataIndex) => {
    const csvRow = dataIndex + 2
    const values = {}
    canonicalHeaders.forEach((header, columnIndex) => {
      if (header) values[header] = cells[columnIndex]?.trim() ?? ''
    })

    try {
      const title = values.title ?? ''
      if (!title) throw new Error('Event title is required.')
      validateLength(title, 'Event title', 120)
      validateLength(values.description ?? '', 'Description', 4000)
      validateLength(values.location_name ?? '', 'Venue', 160)
      validateLength(values.address ?? '', 'Address', 240)
      validateLength(values.website_url ?? '', 'Website', 500)

      const allDay = normalizeBoolean(values.all_day ?? '')
      const startDate = normalizeDate(values.start_date ?? '', 'Start date', true)
      const startTime = normalizeTime(values.start_time ?? '', 'Start time', !allDay)
      let endDate = normalizeDate(values.end_date ?? '', 'End date')
      const endTime = normalizeTime(values.end_time ?? '', 'End time')
      if (!endDate && endTime) endDate = startDate

      events.push({
        csv_row: csvRow,
        title,
        description: values.description ?? '',
        start_date: startDate,
        start_time: startTime,
        end_date: endDate,
        end_time: endTime,
        all_day: allDay,
        location_name: values.location_name ?? '',
        address: values.address ?? '',
        website_url: values.website_url ?? '',
        category: normalizeCategory(values.category ?? '', categories),
        is_published: false,
        status: 'pending',
      })
    } catch (error) {
      errors.push(`Row ${csvRow}: ${error.message}`)
    }
  })

  return { events, errors }
}
