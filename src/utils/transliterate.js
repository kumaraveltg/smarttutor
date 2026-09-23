// utils/transliterate.js
export async function toTamil(text) {
  if (!text) return ''
  try {
    const res = await fetch(
      `https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=ta-t-i0-und&num=1`
    )
    const data = await res.json()
    return data?.[1]?.[0]?.[1]?.[0] || text
  } catch {
    return text
  }
}