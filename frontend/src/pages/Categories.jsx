import { useState, useEffect } from 'react'
import client from '../api/client'

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [selected, setSelected] = useState(new Set())

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const res = await client.get('/categories')
      setCategories(res.data || [])
    } catch {
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCategories() }, [])

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', description: '' })
    setShowModal(true)
  }

  const openEdit = (cat) => {
    setEditing(cat)
    setForm({ name: cat.name, description: cat.description || '' })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        await client.put(`/categories/${editing.id}`, form)
      } else {
        await client.post('/categories', form)
      }
      setShowModal(false)
      fetchCategories()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save category')
    }
  }

  const handleDelete = async (cat) => {
    if (cat.product_count > 0) {
      if (!confirm(`Category "${cat.name}" has ${cat.product_count} product(s). Are you sure you want to delete it?`)) return
    } else {
      if (!confirm(`Delete category "${cat.name}"?`)) return
    }
    try {
      await client.delete(`/categories/${cat.id}`)
      fetchCategories()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete category')
    }
  }

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === categories.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(categories.map((c) => c.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    if (!confirm(`Delete ${selected.size} category(s)?`)) return
    try {
      await client.post('/categories/bulk-delete', { ids: [...selected] })
      setSelected(new Set())
      fetchCategories()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete categories')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Categories</h1>
        <button onClick={openAdd} className="pos-btn flex items-center gap-1 text-sm">+ Add Category</button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        {selected.size > 0 && (
          <button onClick={handleBulkDelete} className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium">
            🗑️ Delete ({selected.size})
          </button>
        )}
        <button onClick={() => setSelected(new Set())} className="text-sm text-gray-500 hover:text-gray-700 px-2">
          {selected.size > 0 ? 'Clear Selection' : ''}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="w-10 py-3 px-2 text-center">
                  <input
                    type="checkbox"
                    checked={categories.length > 0 && selected.size === categories.length}
                    onChange={toggleAll}
                    className="w-4 h-4 accent-[#6C63FF]"
                  />
                </th>
                <th className="text-left py-3 px-4 font-medium">Name</th>
                <th className="text-left py-3 px-4 font-medium">Description</th>
                <th className="text-center py-3 px-4 font-medium">Products</th>
                <th className="text-center py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : categories.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">No categories found</td></tr>
              ) : (
                categories.map((cat, idx) => (
                  <tr key={cat.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-3 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={selected.has(cat.id)}
                        onChange={() => toggleSelect(cat.id)}
                        className="w-4 h-4 accent-[#6C63FF]"
                      />
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-800">{cat.name}</td>
                    <td className="py-3 px-4 text-gray-500">{cat.description || '-'}</td>
                    <td className="py-3 px-4 text-center text-gray-600">{cat.product_count || 0}</td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => openEdit(cat)} className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg">Edit</button>
                      <button onClick={() => handleDelete(cat)} className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg ml-1">Delete</button>
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
              <h2 className="text-xl font-bold text-gray-800">{editing ? 'Edit Category' : 'Add Category'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
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
