const BASE_URL = import.meta.env.VITE_API_BASE_URL

async function request(method, path, { params, body } = {}) {
  let url = `${BASE_URL}${path}`
  if (params) {
    const qs = new URLSearchParams(params).toString()
    if (qs) url += `?${qs}`
  }

  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // On a 401 (expired/invalid session), clear the token and send the user
  // back to login instead of letting every page handle this individually.
  if (res.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
    return
  }

  if (!res.ok) {
    const err = new Error(`Request failed: ${res.status}`)
    err.status = res.status
    try {
      err.data = await res.json()
    } catch {
      // response had no JSON body — ignore
    }
    throw err
  }

  if (res.status === 204) return null
  return res.json()
}
console.log('BASE_URL:', import.meta.env.VITE_API_BASE_URL)
const client = {
  get: (path, opts) => request('GET', path, opts),
  post: (path, body) => request('POST', path, { body }),
  put: (path, body) => request('PUT', path, { body }),
  delete: (path) => request('DELETE', path),
}

export default client
