import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import useStore from './store/useStore'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import KidDashboard from './pages/KidDashboard'

function ProtectedRoute({ children, role }) {
  const { session, profile, loading } = useStore()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center">
          <img
            src="https://yt3.googleusercontent.com/NViANcNr_9xYoqoGY7if6hPZYIQ8cAD7Erxy1OoLBoCWDM-fI_13Gy37HNMDFKT8gfDdMWsv4Q=s900-c-k-c0x00ffffff-no-rj"
            alt="MuSo"
            className="w-20 h-20 rounded-3xl object-cover mx-auto mb-4 animate-bounce"
          />
          <p className="font-display font-700 text-kidbank-purple text-xl">Loading MuSo…</p>
        </div>
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  if (role && profile?.role !== role) {
    return <Navigate to={profile?.role === 'admin' ? '/admin' : '/dashboard'} replace />
  }

  return children
}

export default function App() {
  const { initAuth } = useStore()

  useEffect(() => {
    initAuth()
  }, [initAuth])

  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          className: 'font-display font-700 text-sm',
          style: { borderRadius: '16px', padding: '12px 16px' },
          success: { duration: 3000 },
          error: { duration: 4000 },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute role="kid">
              <KidDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
