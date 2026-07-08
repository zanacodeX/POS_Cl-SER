import { create } from 'zustand'
import client from '../api/client'

const useAuthStore = create((set, get) => ({
  token: localStorage.getItem('token') || null,
  user: null,

  login: async (username, password) => {
    const res = await client.post('/auth/login', { username, password })
    const { token, user } = res.data
    localStorage.setItem('token', token)
    set({ token, user })
    return user
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ token: null, user: null })
    window.location.href = '/login'
  },

  checkAuth: async () => {
    const token = get().token
    if (!token) return false
    try {
      const res = await client.get('/auth/me')
      set({ user: res.data })
      return true
    } catch {
      localStorage.removeItem('token')
      set({ token: null, user: null })
      return false
    }
  },

  get isAdmin() {
    return get().user?.role === 'admin'
  }
}))

export default useAuthStore
