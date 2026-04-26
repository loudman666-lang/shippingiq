import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Auth.css'

export default function SignUp() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    fullName: '',
    storeName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.fullName || !form.storeName || !form.email || !form.password) {
      return setError('Please fill in all fields.')
    }

    if (form.password.length < 8) {
      return setError('Password must be at least 8 characters.')
    }

    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match.')
    }

    setLoading(true)
    try {
      await signUp({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        storeName: form.storeName
      })
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-dot" />
          ShippingIQ
        </div>

        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Start for free — no credit card required</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="fullName">Your name</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Dave Bishop"
                value={form.fullName}
                onChange={handleChange}
                autoComplete="name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="storeName">Store name</label>
              <input
                id="storeName"
                name="storeName"
                type="text"
                placeholder="My Furniture"
                value={form.storeName}
                onChange={handleChange}
                autoComplete="organization"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@yourstore.com.au"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Repeat your password"
              value={form.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/signin">Sign in</Link>
        </p>

        <p className="auth-terms">
          By creating an account you agree to our{' '}
          <a href="/terms">Terms of Service</a> and{' '}
          <a href="/privacy">Privacy Policy</a>.
        </p>
      </div>
    </div>
  )
}
