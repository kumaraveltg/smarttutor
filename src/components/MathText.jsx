import { convertLatexToMarkup } from 'mathlive'

// Questions are stored as plain text. A formula is written between dollar
// signs, e.g.  Find the zeroes of $x^2-5x+6$.  This file shows that text with
// the formulas drawn properly, and protects formulas during translation.

const MATH_RE = /\$([^$]+)\$/g

export function splitMath(text) {
  const parts = []
  let last = 0
  for (const m of text.matchAll(MATH_RE)) {
    if (m.index > last) parts.push({ type: 'text', value: text.slice(last, m.index) })
    parts.push({ type: 'math', value: m[1] })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) })
  return parts
}

// Swap each $formula$ for a placeholder so the translation service leaves it alone.
export function protectMath(text) {
  const formulas = []
  const masked = text.replace(MATH_RE, (m) => {
    formulas.push(m)
    return `[[M${formulas.length - 1}]]`
  })
  return { masked, formulas }
}

export function restoreMath(text, formulas) {
  return text.replace(/\[\[\s*M\s*(\d+)\s*\]\]/g, (m, i) => formulas[Number(i)] ?? m)
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function toMarkup(latex) {
  try {
    return convertLatexToMarkup(latex)
  } catch {
    return escapeHtml(latex)
  }
}

export default function MathText({ text, className = '' }) {
  return (
    <span className={`break-words whitespace-pre-wrap ${className}`}>
      {splitMath(text || '').map((part, i) =>
        part.type === 'math' ? (
          <span key={i} dangerouslySetInnerHTML={{ __html: toMarkup(part.value) }} />
        ) : (
          <span key={i}>{part.value}</span>
        )
      )}
    </span>
  )
}
