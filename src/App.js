import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'

import SignUp from './pages/SignUp'
import SignIn from './pages/SignIn'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Carriers from './pages/Carriers'
import Quote from './pages/Quote'
import Settings from './pages/Settings'
import Rules from './pages/Rules'
import Resources from './pages/Resources'
import Landing from './pages/Landing'
import Team from './pages/Team'
import PdfConverter from './pages/PdfConverter'
import SavedQuotes from './pages/SavedQuotes'
import Pricing from './pages/Pricing'
import BillingSuccess from './pages/BillingSuccess'

export default function App() {
  // Supabase invite links land at "/". Redirect to /reset-password preserving
  // the hash/params so the SDK can exchange the invite token there.
  if (window.location.pathname === '/') {
    const { hash, search } = window.location
    if (hash.includes('type=') || search.includes('type=')) {
      window.location.replace('/reset-password' + search + hash)
      return null
    }
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/carriers" element={<ProtectedRoute><Carriers /></ProtectedRoute>} />
          <Route path="/quote" element={<ProtectedRoute><Quote /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
          <Route path="/rules" element={<ProtectedRoute><Rules /></ProtectedRoute>} />
          <Route path="/resources" element={<ProtectedRoute><Resources /></ProtectedRoute>} />
          <Route path="/convert" element={<ProtectedRoute><PdfConverter /></ProtectedRoute>} />
          <Route path="/saved-quotes" element={<ProtectedRoute><SavedQuotes /></ProtectedRoute>} />
          <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
          <Route path="/billing/success" element={<ProtectedRoute><BillingSuccess /></ProtectedRoute>} />
          <Route path="/" element={<Landing />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
