import { useState, useEffect, useCallback } from 'react'
import client from '../api/client'
import dayjs from 'dayjs'
import useAuthStore from '../store/auth'

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [purchases, setPurchases] = useState([])
  const [showPurchases, setShowPurchases] = useState(false)

  const { user } = useAuthStore()

  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', balance: '' })

  const [showPayment, setShowPayment] = useState(false)
  const [payCustomer, setPayCustomer] = useState(null)
  const [payAmount, setPayAmount] = useState('')
  const [selected, setSelected] = useState(new Set())

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await client.get('/customers', { params: { search, page } })
      setCustomers(res.data.data || [])
      setTotal(res.data.total || 0)
    } catch {
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  const totalPages = Math.ceil(total / 20)

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', phone: '', email: '', address: '' })
    setShowModal(true)
  }

  const openEdit = (customer) => {
    setEditing(customer)
    setForm({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || ''
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        await client.put(`/customers/${editing.id}`, form)
      } else {
        await client.post('/customers', form)
      }
      setShowModal(false)
      fetchCustomers()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save customer')
    }
  }

  const viewPurchases = async (customer) => {
    setSelectedCustomer(customer)
    setShowPurchases(true)
    try {
      const res = await client.get('/orders', { params: { customer_id: customer.id, limit: 50 } })
      setPurchases(res.data.data || [])
    } catch {
      setPurchases([])
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
    if (selected.size === customers.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(customers.map((c) => c.id)))
    }
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this customer?')) return
    try {
      await client.delete(`/customers/${id}`)
      fetchCustomers()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete customer')
    }
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    if (!confirm(`Delete ${selected.size} customer(s)?`)) return
    try {
      await client.post('/customers/bulk-delete', { ids: [...selected] })
      setSelected(new Set())
      fetchCustomers()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete customers')
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Customers</h1>
        <button onClick={openAdd} className="pos-btn flex items-center gap-1 text-sm">+ Add Customer</button>
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
                    checked={customers.length > 0 && selected.size === customers.length}
                    onChange={toggleAll}
                    className="w-4 h-4 accent-[#6C63FF]"
                  />
                </th>
                <th className="text-left py-3 px-4 font-medium">Name</th>
                <th className="text-left py-3 px-4 font-medium">Phone</th>
                <th className="text-right py-3 px-4 font-medium">Balance</th>
                <th className="text-left py-3 px-4 font-medium">Email</th>
                <th className="text-left py-3 px-4 font-medium">Since</th>
                <th className="text-center py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">No customers found</td></tr>
              ) : (
                customers.map((customer, idx) => (
                  <tr
                    key={customer.id}
                    className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} cursor-pointer hover:bg-blue-50`}
                    onClick={() => viewPurchases(customer)}
                  >
                    <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(customer.id)}
                        onChange={(e) => toggleSelect(customer.id, e)}
                        className="w-4 h-4 accent-[#6C63FF]"
                      />
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-800">{customer.name}</td>
                    <td className="py-3 px-4 text-gray-600">{customer.phone || '-'}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-medium ${parseFloat(customer.balance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        Rs. {parseFloat(customer.balance || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500">{customer.email || '-'}</td>
                    <td className="py-3 px-4 text-gray-500">{customer.created_at ? dayjs(customer.created_at).format('DD/MM/YYYY') : '-'}</td>
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openEdit(customer)} className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg">Edit</button>
                      {parseFloat(customer.balance || 0) > 0 && (
                        <button onClick={(e) => { e.stopPropagation(); setPayCustomer(customer); setPayAmount(''); setShowPayment(true) }} className="px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg ml-1">Pay</button>
                      )}
                      <button onClick={(e) => handleDelete(customer.id, e)} className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg ml-1">Delete</button>
                    </td>
                  </tr>
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
              <h2 className="text-xl font-bold text-gray-800">{editing ? 'Edit Customer' : 'Add Customer'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
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

      {showPurchases && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowPurchases(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">{selectedCustomer.name} - Due: Rs. {parseFloat(selectedCustomer.balance).toFixed(2)}</h2>
              <button onClick={() => setShowPurchases(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            {purchases.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No purchase history</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="text-left py-2 px-3 font-medium">Invoice</th>
                    <th className="text-right py-2 px-3 font-medium">Total</th>
                    <th className="text-center py-2 px-3 font-medium">Payment</th>
                    <th className="text-right py-2 px-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((order, idx) => (
                    <tr key={order.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="py-2 px-3 font-mono text-xs text-gray-600">{order.invoice_number || order.id}</td>
                      <td className="py-2 px-3 text-right font-medium">Rs. {parseFloat(order.total).toFixed(2)}</td>
                      <td className="py-2 px-3 text-center text-gray-600 capitalize">{order.payment_method}</td>
                      <td className="py-2 px-3 text-right text-gray-500 text-xs">{dayjs(order.created_at).format('DD/MM/YYYY hh:mm A')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
      {showPayment && payCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowPayment(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Collect Payment</h3>
            <p className="text-sm text-gray-500 mb-4">Customer: <strong>{payCustomer.name}</strong> | Due: <strong className="text-red-600">Rs. {parseFloat(payCustomer.balance).toFixed(2)}</strong></p>
            <form onSubmit={async (e) => {
              e.preventDefault()
              if (!payAmount || parseFloat(payAmount) <= 0) return
              try {
                await client.post('/customer-payments', { customer_id: payCustomer.id, amount: parseFloat(payAmount), payment_method: 'cash' })
                setShowPayment(false)
                fetchCustomers()
              } catch (err) { alert(err.response?.data?.error || 'Payment failed') }
            }}>
              <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="Amount" step="0.01" min="0.01" max={payCustomer.balance} className="w-full h-12 px-4 border border-gray-300 rounded-lg mb-4 text-base" autoFocus />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowPayment(false)} className="flex-1 h-11 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 h-11 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">Receive Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
