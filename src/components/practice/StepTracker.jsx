// Shows a running row of step numbers as the student progresses — ticked
// once confirmed correct, the current step outlined, nothing shown yet for
// steps not reached (total step count isn't known up front, since steps are
// checked on the fly rather than pre-defined on the client).
export default function StepTracker({ completedSteps, currentStep, complete }) {
  const items = complete ? completedSteps : [...completedSteps, currentStep]

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {items.map((step) => {
        const done = completedSteps.includes(step)
        const isCurrent = !complete && step === currentStep
        return (
          <div
            key={step}
            title={`Step ${step}`}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
              done
                ? 'bg-green-500 text-white'
                : isCurrent
                  ? 'border-2 border-brand-500 text-brand-600'
                  : 'bg-slate-200 text-slate-500'
            }`}
          >
            {done ? '✓' : step}
          </div>
        )
      })}
      {complete && <span className="text-sm text-green-600 font-medium ml-1">Solved</span>}
    </div>
  )
}
