import { useState, useEffect } from 'react'
import client from '../api/client'

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    username: '', password: '', full_name: '', role: 'cashier', phone: ''
  })

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await client.get('/users')
      setUsers(res.data || [])
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const openAdd = () => {
    setEditing(null)
    setForm({ username: '', password: '', full_name: '', role: 'cashier', phone: '' })
    setShowModal(true)
  }

  const openEdit = (user) => {
    setEditing(user)
    setForm({
      username: user.username,
      password: '',
      full_name: user.full_name || '',
      role: user.role || 'cashier',
      phone: user.phone || ''
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...form }
      if (!payload.password) delete payload.password
      if (editing) {
        await client.put(`/users/${editing.id}`, payload)
      } else {
        await client.post('/users', payload)
      }
      setShowModal(false)
      fetchUsers()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save user')
    }
  }

  const handleToggleActive = async (user) => {
    try {
      await client.put(`/users/${user.id}`, { active: !user.active })
      fetchUsers()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user')
    }
  }

  const handleDelete = async (user) => {
    if (!confirm(`Delete user "${user.username}"?`)) return
    try {
      await client.delete(`/users/${user.id}`)
      fetchUsers()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Users</h1>
        <button onClick={openAdd} className="pos-btn flex items-center gap-1 text-sm">+ Add User</button>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="text-left py-3 px-4 font-medium">Username</th>
                <th className="text-left py-3 px-4 font-medium">Full Name</th>
                <th className="text-center py-3 px-4 font-medium">Role</th>
                <th className="text-center py-3 px-4 font-medium">Active</th>
                <th className="text-center py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">No users found</td></tr>
              ) : (
                users.map((user, idx) => (
                  <tr key={user.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-3 px-4 font-medium text-gray-800">{user.username}</td>
                    <td className="py-3 px-4 text-gray-600">{user.full_name || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={`text-xs px-3 py-1 rounded-full font-medium ${
                          user.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {user.active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => openEdit(user)} className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg">Edit</button>
                      <button onClick={() => handleDelete(user)} className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg ml-1">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">{editing ? 'Edit User' : 'Add User'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Username *</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                  disabled={!!editing}
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Password {editing ? '(leave blank to keep current)' : '*'}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editing}
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Role *</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] bg-white"
                  >
                    <option value="cashier">Cashier</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF]"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 h-11 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 h-11 bg-[#6C63FF] text-white rounded-lg hover:bg-[#5a52e0] font-medium">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
