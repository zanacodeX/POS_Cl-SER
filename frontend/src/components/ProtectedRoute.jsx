import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import useAuthStore from '../store/auth'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { token, user, checkAuth } = useAuthStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token && !user) {
      checkAuth().finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token, user, checkAuth])

  if (!token) return <Navigate to="/login" replace />

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#1a1a2e]">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/pos" replace />
  }

  return children
}
