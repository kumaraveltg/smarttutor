import { useEffect, useState } from 'react'
import { practiceApi } from '../../api/practiceApi'
import { useAuth } from '../../auth/AuthContext'
import MathInput from '../../components/practice/MathInput'

export default function ChatPage() {
  const { user } = useAuth()
  const [question, setQuestion] = useState(null)
  // step: { text, status: 'editing'|'checking'|'correct'|'incorrect',
  //         hint: string|null,       <- a real suggestion, safe to insert
  //         hintError: string|null } <- a fetch failure message, DISPLAY ONLY,
  //                                      never offered as something to insert
  const [steps, setSteps] = useState([])
  const [methodId, setMethodId] = useState(null)
  const [complete, setComplete] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [mathMode, setMathMode] = useState(false)

  const activeIndex = complete ? -1 : steps.length - 1
  const activeStep = activeIndex >= 0 ? steps[activeIndex] : null

  function applyQuestion(q, mocked = false) {
    setQuestion({ ...q, mocked })
    setSteps([{ text: '', status: 'editing', hint: null, hintError: null }])
    setMethodId(null)
    setComplete(false)
  }

  useEffect(() => {
    // Placeholder starting question ID — replace with a real chapter/question
    // picker once the practice service exposes one.
    practiceApi
      .getQuestion(1)
      .then((q) => applyQuestion(q))
      .catch(() => applyQuestion({ id: 1, body: 'What is the expansion of (a+b)^2 and (a-b)^2?' }, true))
  }, [])

  function updateStepText(index, text) {
    // Typing further clears any pending hint/error for that line.
    setSteps((prev) => prev.map((st, i) => (i === index ? { ...st, text, hint: null, hintError: null } : st)))
  }

  async function checkStepAt(index) {
    const step = steps[index]
    if (!step || !step.text.trim() || step.status === 'checking' || !question) return

    setSteps((prev) => prev.map((st, i) => (i === index ? { ...st, status: 'checking' } : st)))

    let result = null
    try {
      result = await practiceApi.checkStep(question.id, index + 1, step.text.trim(), methodId, user?.id)
      if (result.method_id && !methodId) setMethodId(result.method_id)
    } catch (err) {
      result = null // couldn't reach the backend — still let the student keep writing
    }

    const isCorrect = !!result?.correct
    const isComplete = isCorrect && !!result?.complete

    const updated = steps.map((st, i) =>
      i === index
        ? { ...st, status: isCorrect ? 'correct' : 'incorrect', hint: null, hintError: null, enteredWithMath: mathMode }
        : st
    )

    if (isComplete) {
      setComplete(true)
      setSteps(updated)
    } else if (index === steps.length - 1) {
      // Always open the next line, correct or not — writing continues like
      // a notebook. Wrong steps stay marked ✗ and can be fixed later via Edit.
      setSteps([...updated, { text: '', status: 'editing', hint: null, hintError: null }])
    } else {
      setSteps(updated)
    }
  }

  function editStepAt(index) {
    // Going back to change an earlier step invalidates every step built on
    // top of it, so those get cleared — the student re-answers from here.
    setSteps((prev) =>
      prev.slice(0, index + 1).map((st, i) => (i === index ? { ...st, status: 'editing', hint: null, hintError: null } : st))
    )
    setComplete(false)
  }

  async function requestHint() {
    if (activeIndex < 0 || !question) return
    try {
      const result = await practiceApi.getHint(question.id, activeIndex + 1, methodId, user?.id)
      const hintText = result.hint || "Here's a hint."
      setSteps((prev) => prev.map((st, i) => (i === activeIndex ? { ...st, hint: hintText, hintError: null } : st)))
    } catch (err) {
      // IMPORTANT: the failure message goes in hintError, never in hint —
      // hint is treated as safe-to-insert text, hintError is display-only.
      setSteps((prev) =>
        prev.map((st, i) =>
          i === activeIndex ? { ...st, hint: null, hintError: 'Could not fetch a hint right now.' } : st
        )
      )
    }
  }

  function acceptHint() {
    if (!activeStep?.hint) return
    setSteps((prev) => prev.map((st, i) => (i === activeIndex ? { ...st, text: st.hint, hint: null } : st)))
  }

  async function handleSubmit() {
    setAdvancing(true)
    try {
      const next = await practiceApi.getNextQuestion(question.id)
      applyQuestion(next)
    } catch (err) {
      // Placeholder fallback until the backend's "next question" endpoint
      // exists, so this is still testable end to end.
      applyQuestion({ id: question.id + 1, body: 'What is the expansion of (a-b)^3?' }, true)
    } finally {
      setAdvancing(false)
    }
  }

  if (!question) return <div className="p-8 text-slate-400">Loading…</div>

  return (
    <div className="max-w-3xl mx-auto p-6 pb-10 overflow-x-hidden">
      <div className="bg-white rounded-lg shadow-sm p-5 mb-4">
        <div className="text-xs text-slate-400 mb-1">Question</div>
        <div className="text-lg text-slate-800">
          {question.body}
          {question.mocked && <span className="text-sm text-slate-400"> (mock question — API not connected yet)</span>}
        </div>
      </div>

      {/* Single toolbar — hint, show-keyboard, and the math-keyboard toggle
          all live here together. Nothing floating, nothing per-line. */}
      <div className="flex items-center justify-end gap-3 mb-3 flex-wrap">
        {activeIndex >= 0 && (
          <button
            type="button"
            onClick={requestHint}
            className="text-sm px-3 py-1.5 rounded-md border border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            💡 Hint
          </button>
        )}
        {mathMode && (
          <button
            type="button"
            onClick={() => {
              const vk = window.mathVirtualKeyboard
              if (!vk) return
              // Focus the currently active (editable) field first so the
              // keyboard's keypresses actually land in it.
              document.querySelector('math-field:not([readonly])')?.focus()
              vk.visible = !vk.visible
            }}
            className="text-sm px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100"
          >
            ⌨ Show keyboard
          </button>
        )}
        <span className="text-xs text-slate-500">Math keyboard</span>
        <button
          type="button"
          onClick={() => setMathMode((v) => !v)}
          aria-pressed={mathMode}
          className={`relative w-9 h-5 rounded-full transition-colors ${mathMode ? 'bg-brand-500' : 'bg-slate-300'}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
              mathMode ? 'translate-x-4' : ''
            }`}
          />
        </button>
      </div>

      {/* The hint (or a fetch-failure notice) for the active line shows
          right under the toolbar — the hint chip is clickable (fills the
          suggestion into the box), the error notice is plain text, never
          clickable, so a failed fetch can never get typed in as an answer. */}
      {activeStep?.hint && (
        <div className="mb-3 flex justify-end">
          <button
            onClick={acceptHint}
            className="text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-md px-3 py-2 hover:bg-amber-100 max-w-full break-words text-left"
          >
            💡 {activeStep.hint} <span className="text-brand-600 ml-1">— tap to use this</span>
          </button>
        </div>
      )}
      {activeStep?.hintError && (
        <div className="mb-3 flex justify-end">
          <span className="text-sm text-slate-400">{activeStep.hintError}</span>
        </div>
      )}

      {/* One continuous ruled box — line-number gutter + rows, no separate
          bordered card per step. min-w-0 on every flex child in the row is
          what stops a long unbroken answer from stretching the page
          sideways; break-words + wrapping textarea handle the rest. */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`flex items-stretch border-b border-slate-100 last:border-b-0 min-w-0 ${
              step.status === 'correct' ? 'bg-green-50/50' : step.status === 'incorrect' ? 'bg-amber-50/50' : ''
            }`}
          >
            <div className="w-12 shrink-0 flex items-center justify-center text-slate-300 text-sm border-r border-slate-100 select-none">
              {index + 1}
            </div>

            <div className="flex-1 min-w-0 flex items-center gap-2 px-4 py-2.5">
              {step.status === 'correct' || step.status === 'incorrect' ? (
                step.enteredWithMath ? (
                  <MathInput
                    value={step.text}
                    onChange={() => {}}
                    disabled
                    className={`flex-1 min-w-0 border-0 text-lg bg-transparent ${
                      step.status === 'correct' ? 'text-green-800' : 'text-amber-800'
                    }`}
                  />
                ) : (
                  <div
                    className={`flex-1 min-w-0 text-lg break-words whitespace-pre-wrap py-1 ${
                      step.status === 'correct' ? 'text-green-800' : 'text-amber-800'
                    }`}
                  >
                    {step.text}
                  </div>
                )
              ) : mathMode ? (
                <MathInput
                  value={step.text}
                  onChange={(text) => updateStepText(index, text)}
                  onEnter={() => checkStepAt(index)}
                  disabled={step.status === 'checking'}
                  placeholder="Write this step…"
                  className="flex-1 min-w-0 border-0 text-lg bg-transparent"
                />
              ) : (
                <textarea
                  rows={1}
                  className="flex-1 min-w-0 bg-transparent text-lg outline-none resize-none overflow-y-auto max-h-40 break-words py-1"
                  value={step.text}
                  onChange={(e) => {
                    updateStepText(index, e.target.value)
                    e.target.style.height = 'auto'
                    e.target.style.height = `${e.target.scrollHeight}px`
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      checkStepAt(index)
                    }
                  }}
                  disabled={step.status === 'checking'}
                  placeholder="Write this step…"
                />
              )}

              {step.status === 'correct' && (
                <span className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0 text-base">
                  ✓
                </span>
              )}
              {step.status === 'incorrect' && (
                <span
                  className="w-8 h-8 rounded-full bg-amber-400 text-white flex items-center justify-center shrink-0 text-base"
                  title="Not quite — you can fix this later with Edit"
                >
                  ✗
                </span>
              )}
              {(step.status === 'correct' || step.status === 'incorrect') && (
                <button
                  onClick={() => editStepAt(index)}
                  title="Edit this step"
                  className="text-sm text-slate-400 hover:text-slate-600 shrink-0"
                >
                  Edit
                </button>
              )}
              {step.status === 'checking' && <span className="text-slate-400 shrink-0">…</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!complete || advancing}
          className={`px-5 py-2.5 rounded-md text-sm ${
            complete
              ? 'bg-brand-500 hover:bg-brand-600 text-white'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {advancing ? 'Loading…' : complete ? 'Submit — Next question →' : 'Submit'}
        </button>
      </div>
    </div>
  )
}
