import { useEffect, useRef } from 'react'
import 'mathlive' // side-effect import: registers the <math-field> custom element

// MathLive's <math-field> is a plain web component, not a React component —
// it has no onChange prop. We talk to it imperatively via a ref: read its
// .value on the 'input' event, and push external value changes back in
// (e.g. clearing it after send) with an effect. Everywhere else in the app
// just sees a string value in and a string value out, same as a text input.
export default function MathInput({ value, onChange, onEnter, disabled, placeholder }) {
  const fieldRef = useRef(null)

  useEffect(() => {
    const field = fieldRef.current
    if (!field) return

    // MathLive auto-converts letter sequences it recognises into symbols as
    // you type (e.g. "u" -> ∪, "d" + a variable -> a differential). That's
    // meant for people who already know LaTeX shorthand, but for a student
    // just writing plain algebra it silently changes what they typed into
    // something else. Disabling it means the field only does the things you
    // explicitly ask for (^ for power, _ for subscript, / for fraction, or
    // tapping a symbol on the on-screen keyboard) — never a surprise
    // substitution. If you want a couple of shortcuts back later (e.g. just
    // "pi" -> π), set field.inlineShortcuts = { pi: '\\pi' } instead of {}.
    field.inlineShortcuts = {}

    const handleInput = () => onChange(field.value)
    field.addEventListener('input', handleInput)

    const handleKeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        onEnter?.()
      }
    }
    field.addEventListener('keydown', handleKeydown)

    return () => {
      field.removeEventListener('input', handleInput)
      field.removeEventListener('keydown', handleKeydown)
    }
  }, [onChange, onEnter])

  // Keep the field's displayed content in sync when the parent clears or
  // sets the value from outside (e.g. after the message is sent).
  useEffect(() => {
    const field = fieldRef.current
    if (field && field.value !== (value || '')) field.value = value || ''
  }, [value])

  return (
    <math-field
      ref={fieldRef}
      class="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
      math-virtual-keyboard-policy="auto"
      placeholder={placeholder}
      {...(disabled ? { readonly: 'true' } : {})}
    />
  )
}
