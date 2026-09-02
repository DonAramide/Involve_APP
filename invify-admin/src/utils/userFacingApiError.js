const ENDPOINT_NOT_FOUND_COPY =
  'This section could not be loaded. Please refresh and try again.'

function rawApiMessage(error) {
  const data = error?.response?.data
  if (typeof data === 'string') {
    if (data.includes('<html')) {
      return 'The server is temporarily unavailable. Please try again in a moment.'
    }
    return data
  }
  if (data && typeof data === 'object') {
    if (typeof data.message === 'string' && data.message.trim()) return data.message
    if (typeof data.error === 'string' && data.error.trim()) return data.error
  }
  return ''
}

export function userFacingApiError(error, fallback = 'Something went wrong. Please try again.') {
  const raw = rawApiMessage(error).trim()
  if (/^endpoint not found$/i.test(raw)) return ENDPOINT_NOT_FOUND_COPY
  if (raw && raw.length < 240 && !/^ERR_/i.test(raw)) return raw
  return fallback
}
