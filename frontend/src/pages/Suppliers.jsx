import { useState, useEffect, useCallback, Fragment } from 'react'
import client from '../api/client'

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', contact_person: '', phone: '', email: '', address: '' })
  const [expandedId, setExpandedId] = useState(null)
  const [payments, setPayments] = useState([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [paySupplier, setPaySupplier] = useState(null)
  const [payForm, setPayForm] = useState({ amount: '', payment_method: 'cash', notes: '' })
  const [selected, setSelected] = useState(new Set())

  const limit = 20

  const fetchSuppliers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await client.get('/suppliers', { params: { search, page } })
      setSuppliers(res.data.data || [])
      setTotal(res.data.total || 0)
    } catch {
      setSuppliers([])
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => { fetchSuppliers() }, [fetchSuppliers])

  const totalPages = Math.ceil(total / limit)

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', contact_person: '', phone: '', email: '', address: '' })
    setShowModal(true)
  }

  const openEdit = (supplier) => {
    setEditing(supplier)
    setForm({
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || ''
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        await client.put(`/suppliers/${editing.id}`, form)
      } else {
        await client.post('/suppliers', form)
      }
      setShowModal(false)
      fetchSuppliers()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save supplier')
    }
  }

  const toggleExpand = async (supplier) => {
    if (expandedId === supplier.id) {
      setExpandedId(null)
      setPayments([])
      return
    }
    setExpandedId(supplier.id)
    setPaymentsLoading(true)
    try {
      const res = await client.get(`/suppliers/${supplier.id}/payments`)
      setPayments(res.data || [])
    } catch {
      setPayments([])
    } finally {
      setPaymentsLoading(false)
    }
  }

  const openPay = (supplier, e) => {
    e.stopPropagation()
    setPaySupplier(supplier)
    setPayForm({ amount: '', payment_method: 'cash', notes: '' })
    setShowPayModal(true)
  }

  const handlePay = async (e) => {
    e.preventDefault()
    if (!paySupplier) return
    try {
      await client.post(`/suppliers/${paySupplier.id}/pay`, {
        amount: parseFloat(payForm.amount),
        payment_method: payForm.payment_method,
        notes: payForm.notes
      })
      setShowPayModal(false)
      setPaySupplier(null)
      fetchSuppliers()
      if (expandedId === paySupplier.id) {
        const res = await client.get(`/suppliers/${paySupplier.id}/payments`)
        setPayments(res.data || [])
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Payment failed')
    }
  }

  const toggleSelect = (id, e) => {
    e.stopPropagation()
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === suppliers.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(suppliers.map((s) => s.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    if (!confirm(`Delete ${selected.size} supplier(s)?`)) return
    try {
      await client.post('/suppliers/bulk-delete', { ids: [...selected] })
      setSelected(new Set())
      fetchSuppliers()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete suppliers')
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Suppliers</h1>
        <button onClick={openAdd} className="pos-btn flex items-center gap-1 text-sm">+ Add Supplier</button>
      </div>

      <div className="flex items-center gap-2 mb-2">
        {selected.size > 0 && (
          <button onClick={handleBulkDelete} className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium">
            🗑️ Delete ({selected.size})
          </button>
        )}
        <button onClick={() => setSelected(new Set())} className="text-sm text-gray-500 hover:text-gray-700 px-2">
          {selected.size > 0 ? 'Clear Selection' : ''}
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search by name or phone..."
          className="w-full max-w-md h-12 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="w-10 py-3 px-2 text-center">
                  <input
                    type="checkbox"
                    checked={suppliers.length > 0 && selected.size === suppliers.length}
                    onChange={toggleAll}
                    className="w-4 h-4 accent-[#6C63FF]"
                  />
                </th>
                <th className="text-left py-3 px-4 font-medium">Name</th>
                <th className="text-left py-3 px-4 font-medium">Contact Person</th>
                <th className="text-left py-3 px-4 font-medium">Phone</th>
                <th className="text-left py-3 px-4 font-medium">Email</th>
                <th className="text-right py-3 px-4 font-medium">Balance (owe)</th>
                <th className="text-center py-3 px-4 font-medium">Total Orders</th>
                <th className="text-center py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : suppliers.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">No suppliers found</td></tr>
              ) : (
                suppliers.map((supplier, idx) => (
                  <Fragment key={supplier.id}>
                    <tr
                      className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} cursor-pointer hover:bg-blue-50 ${expandedId === supplier.id ? 'bg-blue-50' : ''}`}
                      onClick={() => toggleExpand(supplier)}
                    >
                      <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(supplier.id)}
                          onChange={(e) => toggleSelect(supplier.id, e)}
                          className="w-4 h-4 accent-[#6C63FF]"
                        />
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-800">{supplier.name}</td>
                      <td className="py-3 px-4 text-gray-600">{supplier.contact_person || '-'}</td>
                      <td className="py-3 px-4 text-gray-600">{supplier.phone || '-'}</td>
                      <td className="py-3 px-4 text-gray-500">{supplier.email || '-'}</td>
                      <td className={`py-3 px-4 text-right font-medium ${parseFloat(supplier.balance || 0) > 0 ? 'text-red-500' : 'text-gray-700'}`}>
                        Rs. {parseFloat(supplier.balance || 0).toFixed(2)}
                        {parseFloat(supplier.balance || 0) > 0 && (
                          <button
                            onClick={(e) => openPay(supplier, e)}
                            className="ml-2 px-2 py-1 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600"
                          >
                            Pay
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-600">{supplier.total_orders || 0}</td>
                      <td className="py-3 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openEdit(supplier)} className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg">Edit</button>
                      </td>
                    </tr>
                    {expandedId === supplier.id && (
                      <tr key={`${supplier.id}-expanded`}>
                        <td colSpan={8} className="p-0">
                          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                            {paymentsLoading ? (
                              <p className="text-gray-400 text-center py-4">Loading payments...</p>
                            ) : payments.length === 0 ? (
                              <p className="text-gray-400 text-center py-4">No payment history</p>
                            ) : (
                              <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">Payment History</h3>
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-gray-500 border-b border-gray-200">
                                      <th className="text-left py-2 px-3 font-medium">Date</th>
                                      <th className="text-right py-2 px-3 font-medium">Amount</th>
                                      <th className="text-center py-2 px-3 font-medium">Method</th>
                                      <th className="text-left py-2 px-3 font-medium">Notes</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {payments.map((pmt, pIdx) => (
                                      <tr key={pmt.id} className={pIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="py-2 px-3 text-gray-500">{pmt.created_at ? new Date(pmt.created_at).toLocaleDateString() : '-'}</td>
                                        <td className="py-2 px-3 text-right font-medium text-gray-700">Rs. {parseFloat(pmt.amount).toFixed(2)}</td>
                                        <td className="py-2 px-3 text-center text-gray-600 capitalize">{pmt.payment_method}</td>
                                        <td className="py-2 px-3 text-gray-500">{pmt.notes || '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Prev</button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Next</button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">{editing ? 'Edit Supplier' : 'Add Supplier'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Contact Person</label>
                <input type="text" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
                <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Address</label>
                <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 h-11 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 h-11 bg-[#6C63FF] text-white rounded-lg hover:bg-[#5a52e0] font-medium">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPayModal && paySupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowPayModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Pay {paySupplier.name}</h2>
              <button onClick={() => setShowPayModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Balance: <span className="font-semibold text-red-500">Rs. {parseFloat(paySupplier.balance || 0).toFixed(2)}</span></p>
            <form onSubmit={handlePay} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Amount *</label>
                <input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} required step="0.01" min="0" className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Payment Method</label>
                <select value={payForm.payment_method} onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })} className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] bg-white">
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="credit">Credit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Notes</label>
                <textarea value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPayModal(false)} className="flex-1 h-11 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 h-11 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium">Pay</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
