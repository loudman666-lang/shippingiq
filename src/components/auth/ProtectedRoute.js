import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

// Requires user to be logged in
export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="auth-loading"><div className="spinner" /></div>
  if (!user) return <Navigate to="/signin" state={{ from: location }} replace />

  return children
}

// Requires user to be an admin
export function AdminRoute({ children }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="auth-loading"><div className="spinner" /></div>
  if (!user) return <Navigate to="/signin" state={{ from: location }} replace />
  if (profile?.role !== 'admin') return <Navigate to="/dashboard" replace />

  return children
}
