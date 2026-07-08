import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/auth'

import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

import Login from './pages/Login'
import License from './pages/License'
import Pos from './pages/Pos'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Categories from './pages/Categories'
import Customers from './pages/Customers'
import Orders from './pages/Orders'
import Users from './pages/Users'
import Suppliers from './pages/Suppliers'
import PurchaseOrders from './pages/PurchaseOrders'

function RootRedirect() {
  const { token, user, checkAuth } = useAuthStore()

  useEffect(() => {
    if (token && !user) {
      checkAuth()
    }
  }, [token, user, checkAuth])

  if (!token) return <Navigate to="/login" replace />
  if (user?.role === 'admin') return <Navigate to="/dashboard" replace />
  return <Navigate to="/pos" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/license" element={<License />} />

      <Route
        path="/pos"
        element={
          <ProtectedRoute>
            <Layout>
              <Pos />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/products"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <Products />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/categories"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <Categories />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/customers"
        element={
          <ProtectedRoute>
            <Layout>
              <Customers />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/orders"
        element={
          <ProtectedRoute>
            <Layout>
              <Orders />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <Users />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/suppliers"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <Suppliers />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/purchase-orders"
        element={
          <ProtectedRoute adminOnly>
            <Layout>
              <PurchaseOrders />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<RootRedirect />} />

      <Route
        path="*"
        element={
          <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
            <div className="text-center text-white">
              <h1 className="text-6xl font-bold mb-2">404</h1>
              <p className="text-gray-400 mb-4">Page not found</p>
              <a href="/" className="text-[#6C63FF] hover:underline">Go Home</a>
            </div>
          </div>
        }
      />
    </Routes>
  )
}
