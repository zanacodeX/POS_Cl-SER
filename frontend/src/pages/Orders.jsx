import { useState, useEffect, useCallback } from 'react'
import client from '../api/client'
import dayjs from 'dayjs'
import useAuthStore from '../store/auth'

export default function Orders() {
  const { user } = useAuthStore()
  const [orders, setOrders] = useState([])
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [selected, setSelected] = useState(new Set())

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page }
      if (search) params.search = search
      if (dateFilter) params.date = dateFilter
      const res = await client.get('/orders', { params })
      setOrders(res.data.data || [])
      setTotal(res.data.total || 0)
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [search, dateFilter, page])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const totalPages = Math.ceil(total / 20)

  const viewDetail = async (order) => {
    try {
      const res = await client.get(`/orders/${order.id}`)
      setSelectedOrder(res.data.order || res.data)
      setShowDetail(true)
    } catch {
      setSelectedOrder(order)
      setShowDetail(true)
    }
  }

  const handleDelete = async (order) => {
    if (!confirm(`Delete order #${order.invoice_number || order.id}? This will restore stock.`)) return
    try {
      await client.delete(`/orders/${order.id}`)
      setShowDetail(false)
      setSelectedOrder(null)
      fetchOrders()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete order')
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
    if (selected.size === orders.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(orders.map((o) => o.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    if (!confirm(`Delete ${selected.size} order(s)? This will restore stock.`)) return
    try {
      await client.post('/orders/bulk-delete', { ids: [...selected] })
      setSelected(new Set())
      fetchOrders()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete orders')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Orders</h1>

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

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search by invoice number..."
          className="flex-1 h-12 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent"
        />
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => { setDateFilter(e.target.value); setPage(1) }}
          className="h-12 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent"
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
                    checked={orders.length > 0 && selected.size === orders.length}
                    onChange={toggleAll}
                    className="w-4 h-4 accent-[#6C63FF]"
                  />
                </th>
                <th className="text-left py-3 px-3 font-medium">Invoice #</th>
                <th className="text-left py-3 px-3 font-medium">Cashier</th>
                <th className="text-left py-3 px-3 font-medium">Customer</th>
                <th className="text-right py-3 px-3 font-medium">Total</th>
                <th className="text-right py-3 px-3 font-medium">Profit</th>
                <th className="text-center py-3 px-3 font-medium">Payment</th>
                <th className="text-right py-3 px-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">No orders found</td></tr>
              ) : (
                orders.map((order, idx) => (
                  <tr
                    key={order.id}
                    className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} cursor-pointer hover:bg-blue-50`}
                    onClick={() => viewDetail(order)}
                  >
                    <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(order.id)}
                        onChange={(e) => toggleSelect(order.id, e)}
                        className="w-4 h-4 accent-[#6C63FF]"
                      />
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-gray-700 font-medium">{order.invoice_number || order.id}</td>
                    <td className="py-3 px-3 text-gray-700">{order.cashier_name || order.user_name || '-'}</td>
                    <td className="py-3 px-3 text-gray-600">{order.customer_name || 'Walk-in'}</td>
                    <td className="py-3 px-3 text-right font-semibold text-gray-800">Rs. {parseFloat(order.total).toFixed(2)}</td>
                    <td className="py-3 px-3 text-right font-medium text-green-600">Rs. {parseFloat(order.profit || 0).toFixed(2)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="capitalize text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{order.payment_method}</span>
                    </td>
                    <td className="py-3 px-3 text-right text-gray-500 text-xs">{dayjs(order.created_at).format('DD/MM/YYYY hh:mm A')}</td>
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

      {showDetail && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowDetail(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Order #{selectedOrder.invoice_number || selectedOrder.id}</h2>
              <button onClick={() => setShowDetail(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="text-sm text-gray-600 mb-4 space-y-1">
              <p>Date: {dayjs(selectedOrder.created_at).format('DD/MM/YYYY hh:mm A')}</p>
              <p>Cashier: {selectedOrder.cashier_name || selectedOrder.user_name || '-'}</p>
              <p>Customer: {selectedOrder.customer_name || 'Walk-in'}</p>
              <p>Payment: <span className="capitalize">{selectedOrder.payment_method}</span></p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-left py-2 px-2 font-medium">Item</th>
                  <th className="text-center py-2 px-2 font-medium">Qty</th>
                  <th className="text-right py-2 px-2 font-medium">Price</th>
                  <th className="text-right py-2 px-2 font-medium">Profit</th>
                  <th className="text-right py-2 px-2 font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(selectedOrder.items || []).map((item, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-2 px-2 text-gray-800">{item.product_name || item.name}</td>
                    <td className="py-2 px-2 text-center text-gray-600">{item.quantity}</td>
                    <td className="py-2 px-2 text-right text-gray-600">Rs. {parseFloat(item.price).toFixed(2)}</td>
                    <td className="py-2 px-2 text-right text-green-600">Rs. {parseFloat(item.profit || 0).toFixed(2)}</td>
                    <td className="py-2 px-2 text-right font-medium">Rs. {(parseFloat(item.price) * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {selectedOrder.discount > 0 && (
              <div className="flex justify-between text-sm mt-2 text-red-500">
                <span>Discount</span>
                <span>-Rs. {parseFloat(selectedOrder.discount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-gray-200">
              <span>Total</span>
              <span>Rs. {parseFloat(selectedOrder.total).toFixed(2)}</span>
            </div>
            {user?.role === 'admin' && (
              <button
                onClick={() => handleDelete(selectedOrder)}
                className="mt-4 w-full h-10 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium"
              >
                Delete Order
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
