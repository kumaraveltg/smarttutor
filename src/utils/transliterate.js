import Sanscript from '@indic-transliteration/sanscript'

// Converts phonetic English typing into Tamil script.
// e.g. "tamil" -> தமிழ், "pAdam" -> பாடம்
export function toTamil(text) {
  if (!text) return ''
  try {
    return Sanscript.t(text, 'itrans', 'tamil')
  } catch {
    return text
  }
}