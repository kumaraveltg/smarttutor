import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { studentApi } from "../api/studentApi";

// Shows when any subject is expired, or ends within 5 days (free month or paid plan).
export default function SubscriptionBanner() {
  const [me, setMe] = useState(null)

  useEffect(() => {
    studentApi.me().then(setMe).catch(() => {})
  }, [])

  if (!me || ['free', 'none'].includes(me.subscription.state)) return null

  const expired = me.subjects.filter((s) => s.state === 'expired')
  const soon = me.subjects.filter((s) => s.state !== 'expired' && s.state !== 'free' && s.days_left <= 5)
  if (expired.length === 0 && soon.length === 0) return null

  let text
  if (expired.length > 0) {
    text = `Payment needed for: ${expired.map((s) => s.name).join(', ')}.`
  } else {
    const days = Math.min(...soon.map((s) => s.days_left))
    text = `${soon.map((s) => s.name).join(', ')} ends in ${days} day(s).`
  }

  return (
    <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-md px-4 py-2 mb-4 flex items-center justify-between">
      <span>{text}</span>
      <Link to="/payment" className="text-brand-600 font-medium">Pay now</Link>
    </div>
  )
}
