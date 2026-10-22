import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { studentApi } from '../api/studentApi'

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

function statusText(s) {
  if (!s) return 'Not added yet'
  if (s.state === 'free') return 'Free (scholarship)'
  if (s.state === 'trial') return `Free trial, ${s.days_left} day(s) left`
  if (s.state === 'active') return `Paid, ${s.days_left} day(s) left`
  return 'Expired'
}

export default function PaymentPage() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState([])
  const [me, setMe] = useState(null)
  const [allSubjects, setAllSubjects] = useState([])
  const [planId, setPlanId] = useState(null)
  const [selected, setSelected] = useState([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    Promise.all([studentApi.plans(), studentApi.me(), studentApi.options()])
      .then(([p, m, o]) => {
        setPlans(p)
        setMe(m)
        setAllSubjects(o.subjects)
        if (p.length) setPlanId(p[0].plan_id)
        // Pre-select the student's subjects that are expired or about to expire.
        setSelected(
          m.subjects
            .filter((s) => s.state === 'expired' || (s.state !== 'free' && (s.days_left ?? 99) <= 5))
            .map((s) => s.subject_id)
        )
      })
      .catch(() => setMessage('Could not load payment details. Please refresh.'))
  }, [])

  const mine = Object.fromEntries((me?.subjects || []).map((s) => [s.subject_id, s]))
  const plan = plans.find((p) => p.plan_id === planId)
  const total = plan ? plan.amount * selected.length : 0

  function toggle(id) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  }

  async function pay() {
    if (!plan || selected.length === 0) {
      setMessage('Select at least one subject.')
      return
    }
    setMessage(null)
    setBusy(true)
    try {
      const ok = await loadRazorpayScript()
      if (!ok) throw new Error('script')

      const order = await studentApi.createOrder(plan.plan_id, selected)

      const checkout = new window.Razorpay({
        key: order.key_id,
        order_id: order.order_id,
        amount: order.amount,
        currency: order.currency,
        name: 'SmartTutor',
        description: `${plan.name} plan, ${selected.length} subject(s)`,
        handler: async (response) => {
          try {
            await studentApi.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
            navigate('/practice')
          } catch {
            setMessage('Payment received but could not be confirmed yet. Please refresh in a minute.')
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      })
      checkout.on('payment.failed', () => setMessage('Payment failed. Please try again.'))
      checkout.open()
    } catch {
      setMessage('Could not start the payment. Check your internet and try again.')
      setBusy(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-lg font-semibold text-slate-700 mb-1">Pay for subjects</h2>
      <p className="text-sm text-slate-500 mb-4">Each subject is paid separately. Tick the ones you want to pay for.</p>

      <div className="bg-white border border-slate-200 rounded-md divide-y divide-slate-100 mb-4">
        {allSubjects.map((s) => (
          <label key={s.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer">
            <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)}
              disabled={mine[s.id]?.state === 'free'} />
            <div>
              <div className="text-sm text-slate-800">{s.name}</div>
              <div className="text-xs text-slate-400">{statusText(mine[s.id])}</div>
            </div>
          </label>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        {plans.map((p) => (
          <button key={p.plan_id} type="button" onClick={() => setPlanId(p.plan_id)}
            className={`flex-1 border rounded-md px-3 py-2 text-sm text-left ${
              p.plan_id === planId ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-600'
            }`}>
            <div className="font-medium">{p.name}</div>
            <div className="text-xs">₹{p.amount} per subject, {p.duration_days} days</div>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-slate-700">
          Total: <span className="font-semibold">₹{total}</span>
          <span className="text-xs text-slate-400 ml-2">
            {plan ? `${selected.length} × ₹${plan.amount}` : ''}
          </span>
        </div>
        <button onClick={pay} disabled={busy || selected.length === 0}
          className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white px-4 py-2 rounded-md text-sm">
          {busy ? 'Opening…' : 'Pay'}
        </button>
      </div>

      {message && <p className="text-sm text-red-600 mt-4">{message}</p>}
    </div>
  )
}
