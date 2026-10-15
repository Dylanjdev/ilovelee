export const BUSINESS_CSV_HEADERS = [
  'name',
  'category',
  'address',
  'phone',
  'email',
  'website',
  'description',
]

const HEADER_ALIASES = {
  name: 'name',
  business: 'name',
  business_name: 'name',
  category: 'category',
  business_category: 'category',
  address: 'address',
  business_address: 'address',
  street_address: 'address',
  phone: 'phone',
  business_phone: 'phone',
  email: 'business_email',
  business_email: 'business_email',
  public_email: 'business_email',
  website: 'website_url',
  website_url: 'website_url',
  url: 'website_url',
  description: 'description',
  business_description: 'description',
}

const CATEGORY_ALIASES = {
  restaurant: 'restaurants',
  dining: 'restaurants',
  shop: 'shops',
  shopping: 'shops',
  store: 'shops',
  grocery: 'groceries',
  hotel: 'lodging',
  hotels: 'lodging',
  accommodation: 'lodging',
  accommodations: 'lodging',
  service: 'services',
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

function comparableValue(value) {
  return value.trim().toLowerCase().replaceAll('&', 'and').replace(/\s+/g, ' ')
}

function normalizeCategory(value, categories) {
  const requestedCategory = comparableValue(value)
  if (!requestedCategory) throw new Error('Category is required.')

  const aliasedCategory = CATEGORY_ALIASES[requestedCategory] ?? requestedCategory
  const category = categories.find((option) => (
    comparableValue(option.id) === aliasedCategory
    || comparableValue(option.label) === aliasedCategory
  ))

  if (!category) {
    throw new Error(`Category must be one of: ${categories.map((option) => option.label).join(', ')}.`)
  }

  return category.id
}

function normalizeEmail(value) {
  const normalizedEmail = value.trim().toLowerCase()
  if (!normalizedEmail) return ''
  if (
    normalizedEmail.length > 254
    || !/^[^\s@]+@[^\s@]+$/.test(normalizedEmail)
  ) {
    throw new Error('Email must be a valid email address.')
  }
  return normalizedEmail
}

function normalizeWebsite(value) {
  const trimmedValue = value.trim()
  if (!trimmedValue) return ''
  if (trimmedValue.length > 500) throw new Error('Website must be 500 characters or fewer.')

  const candidate = /^https?:\/\//i.test(trimmedValue) ? trimmedValue : `https://${trimmedValue}`
  try {
    const url = new URL(candidate)
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error()
    return url.href
  } catch {
    throw new Error('Website must be a valid web address.')
  }
}

function validateLength(value, label, maxLength) {
  if (value.length > maxLength) throw new Error(`${label} must be ${maxLength} characters or fewer.`)
}

export function parseBusinessCsv(text, { categories, maxBusinesses }) {
  let rows
  try {
    rows = parseCsvRows(text)
  } catch (error) {
    return { businesses: [], errors: [error.message] }
  }

  const nonemptyRows = rows.filter((cells) => cells.some((cell) => cell.trim()))
  if (nonemptyRows.length === 0) return { businesses: [], errors: ['The CSV file is empty.'] }

  const canonicalHeaders = nonemptyRows[0].map((header) => (
    HEADER_ALIASES[normalizeHeader(header)] ?? null
  ))
  const errors = []

  for (const requiredHeader of ['name', 'category', 'address']) {
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
  if (dataRows.length === 0) errors.push('The CSV does not contain any business rows.')
  if (dataRows.length > maxBusinesses) {
    errors.push(`The CSV has ${dataRows.length} businesses; the maximum is ${maxBusinesses}.`)
  }
  if (errors.length > 0) return { businesses: [], errors }

  const businesses = []
  dataRows.slice(0, maxBusinesses).forEach((cells, dataIndex) => {
    const csvRow = dataIndex + 2
    const values = {}
    canonicalHeaders.forEach((header, columnIndex) => {
      if (header) values[header] = cells[columnIndex]?.trim() ?? ''
    })

    try {
      const name = values.name ?? ''
      const address = values.address ?? ''
      if (!name) throw new Error('Business name is required.')
      if (!address) throw new Error('Address is required.')

      validateLength(name, 'Business name', 140)
      validateLength(address, 'Address', 300)
      validateLength(values.phone ?? '', 'Phone', 50)
      validateLength(values.description ?? '', 'Description', 2000)

      businesses.push({
        csv_row: csvRow,
        name,
        category: normalizeCategory(values.category ?? '', categories),
        address,
        phone: values.phone ?? '',
        business_email: normalizeEmail(values.business_email ?? ''),
        website_url: normalizeWebsite(values.website_url ?? ''),
        description: values.description ?? '',
      })
    } catch (error) {
      errors.push(`Row ${csvRow}: ${error.message}`)
    }
  })

  return { businesses, errors }
}
