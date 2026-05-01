import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function BillingSuccess() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => navigate('/dashboard'), 4000)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', gap: '16px' }}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--ink)', margin: 0 }}>You're all set!</h1>
      <p style={{ fontSize: '15px', color: 'var(--ink-muted)', margin: 0 }}>Your subscription is active. Redirecting you to the dashboard…</p>
    </div>
  )
}
