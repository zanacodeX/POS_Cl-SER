import { useState, useEffect, useCallback } from 'react'
import client from '../api/client'
import dayjs from 'dayjs'

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  received: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function PurchaseOrders() {
  const [pos, setPos] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showDetail, setShowDetail] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [selected, setSelected] = useState(new Set())

  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [supplierId, setSupplierId] = useState('')
  const [items, setItems] = useState([{ productId: '', productName: '', quantity: 1, unitCost: 0, isNew: false }])
  const [discount, setDiscount] = useState(0)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchPOs = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page }
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      const res = await client.get('/purchase-orders', { params })
      setPos(res.data.data || [])
      setTotal(res.data.total || 0)
    } catch {
      setPos([])
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, page])

  useEffect(() => { fetchPOs() }, [fetchPOs])

  const totalPages = Math.ceil(total / 20)

  const openCreate = async () => {
    try {
      const [supRes, prodRes] = await Promise.all([
        client.get('/suppliers'),
        client.get('/products', { params: { limit: 200 } }),
      ])
      setSuppliers(supRes.data?.data || supRes.data || [])
      setProducts(prodRes.data?.data || prodRes.data || [])
    } catch {
      setSuppliers([])
      setProducts([])
    }
    setSupplierId('')
    setItems([{ productId: '', productName: '', quantity: 1, unitCost: 0, isNew: false }])
    setDiscount(0)
    setNotes('')
    setShowCreate(true)
  }

  const viewDetail = async (po) => {
    try {
      const res = await client.get(`/purchase-orders/${po.id}`)
      setShowDetail(res.data.po || res.data)
    } catch {
      setShowDetail(po)
    }
  }

  const handleReceive = async (id) => {
    try {
      await client.post(`/purchase-orders/${id}/receive`)
      fetchPOs()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to receive')
    }
  }

  const handleCancel = async (id) => {
    if (!confirm('Cancel this purchase order?')) return
    try {
      await client.put(`/purchase-orders/${id}/cancel`)
      setShowDetail(null)
      fetchPOs()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this purchase order permanently?')) return
    try {
      await client.delete(`/purchase-orders/${id}`)
      setShowDetail(null)
      fetchPOs()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete')
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
    if (selected.size === pos.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(pos.map((p) => p.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    if (!confirm(`Cancel ${selected.size} purchase order(s)?`)) return
    try {
      await client.post('/purchase-orders/bulk-delete', { ids: [...selected] })
      setSelected(new Set())
      fetchPOs()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel purchase orders')
    }
  }

  const getFilteredProducts = (rowIdx) => {
    const selectedIds = items
      .filter((_, i) => i !== rowIdx && !items[i].isNew)
      .map((i) => i.productId)
      .filter(Boolean)
    return products.filter((p) => !selectedIds.includes(p.id))
  }

  const handleItemChange = (idx, field, value) => {
    const updated = [...items]
    if (field === 'productId') {
      const prod = products.find((p) => p.id === Number(value))
      updated[idx] = {
        ...updated[idx],
        productId: value,
        productName: prod ? prod.name : value,
        isNew: false,
        unitCost: prod ? parseFloat(prod.cost_price || prod.price || 0) : updated[idx].unitCost,
      }
    } else if (field === 'isNew') {
      updated[idx] = {
        productId: '',
        productName: '',
        quantity: 1,
        unitCost: 0,
        isNew: true,
      }
    } else if (field === 'productName') {
      updated[idx] = { ...updated[idx], productName: value }
    } else {
      updated[idx][field] = value
    }
    setItems(updated)
  }

  const addItem = () => {
    setItems([...items, { productId: '', productName: '', quantity: 1, unitCost: 0, isNew: false }])
  }

  const removeItem = (idx) => {
    if (items.length === 1) return
    const updated = items.filter((_, i) => i !== idx)
    setItems(updated)
  }

  const handleSubmit = async () => {
    if (!supplierId) return alert('Select a supplier')
    if (items.some((i) => (i.isNew ? !i.productName.trim() : !i.productId))) return alert('Fill all item fields')
    setSubmitting(true)
    try {
      const payload = {
        supplier_id: Number(supplierId),
        items: items.map((i) => ({
          product_id: i.isNew ? null : Number(i.productId),
          product_name: i.isNew ? i.productName.trim() : null,
          quantity: Number(i.quantity),
          unit_cost: Number(i.unitCost),
        })),
        discount: Number(discount) || 0,
        notes: notes.trim(),
      }
      await client.post('/purchase-orders', payload)
      setShowCreate(false)
      fetchPOs()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create PO')
    } finally {
      setSubmitting(false)
    }
  }

  const itemSubtotal = (item) => (Number(item.quantity) || 0) * (Number(item.unitCost) || 0)
  const itemsTotal = items.reduce((sum, i) => sum + itemSubtotal(i), 0)
  const grandTotal = Math.max(0, itemsTotal - (Number(discount) || 0))

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Purchase Orders</h1>
        <button onClick={openCreate} className="pos-btn text-sm">+ New Purchase Order</button>
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

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search by PO number..."
          className="flex-1 h-12 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="h-12 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent bg-white"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="w-10 py-3 px-2 text-center">
                  <input
                    type="checkbox"
                    checked={pos.length > 0 && selected.size === pos.length}
                    onChange={toggleAll}
                    className="w-4 h-4 accent-[#6C63FF]"
                  />
                </th>
                <th className="text-left py-3 px-3 font-medium">PO No</th>
                <th className="text-left py-3 px-3 font-medium">Supplier</th>
                <th className="text-right py-3 px-3 font-medium">Total</th>
                <th className="text-center py-3 px-3 font-medium">Status</th>
                <th className="text-right py-3 px-3 font-medium">Date</th>
                <th className="text-center py-3 px-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : pos.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">No purchase orders found</td></tr>
              ) : (
                pos.map((po, idx) => (
                  <tbody key={po.id}>
                    <tr className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                      <td className="py-3 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={selected.has(po.id)}
                          onChange={(e) => toggleSelect(po.id, e)}
                          className="w-4 h-4 accent-[#6C63FF]"
                        />
                      </td>
                      <td className="py-3 px-3 font-mono text-xs text-gray-700 font-medium">{po.po_number || po.id}</td>
                      <td className="py-3 px-3 text-gray-700">{po.supplier_name || '-'}</td>
                      <td className="py-3 px-3 text-right font-semibold text-gray-800">Rs. {parseFloat(po.total || po.grand_total || 0).toFixed(2)}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusColors[po.status] || 'bg-gray-100 text-gray-600'}`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-gray-500 text-xs">{dayjs(po.created_at).format('DD/MM/YYYY hh:mm A')}</td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => viewDetail(po)}
                            className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium"
                          >
                            View
                          </button>
                          {po.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleReceive(po.id)}
                                className="px-2 py-1 text-xs rounded bg-green-50 text-green-600 hover:bg-green-100 font-medium"
                              >
                                Receive
                              </button>
                              <button
                                onClick={() => handleCancel(po.id)}
                                className="px-2 py-1 text-xs rounded bg-yellow-50 text-yellow-600 hover:bg-yellow-100 font-medium"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(po.id)}
                            className="px-2 py-1 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === po.id && (
                      <tr className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td colSpan={7} className="px-6 py-3">
                          <div className="text-sm text-gray-600 mb-2 font-medium">Items</div>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-gray-500 border-b">
                                <th className="text-left py-1 font-medium">Product</th>
                                <th className="text-right py-1 font-medium">Qty</th>
                                <th className="text-right py-1 font-medium">Unit Cost</th>
                                <th className="text-right py-1 font-medium">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(po.items || []).map((item, i) => (
                                <tr key={i}>
                                  <td className="py-1 text-gray-700">{item.product_name}</td>
                                  <td className="py-1 text-right text-gray-600">{item.quantity}</td>
                                  <td className="py-1 text-right text-gray-600">Rs. {parseFloat(item.unit_cost || item.unitCost || 0).toFixed(2)}</td>
                                  <td className="py-1 text-right text-gray-700 font-medium">Rs. {((item.quantity || 0) * parseFloat(item.unit_cost || item.unitCost || 0)).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {po.discount > 0 && (
                            <div className="flex justify-end text-xs mt-1 text-red-500">Discount: -Rs. {parseFloat(po.discount).toFixed(2)}</div>
                          )}
                          {po.notes && (
                            <div className="mt-1 text-xs text-gray-500">Notes: {po.notes}</div>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
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

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">New Purchase Order</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent bg-white"
              >
                <option value="">Select supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Items</label>
                <button onClick={addItem} className="text-xs px-3 py-1 rounded border border-[#6C63FF] text-[#6C63FF] hover:bg-[#6C63FF] hover:text-white font-medium">+ Add Item</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 text-xs">
                      <th className="text-left py-2 px-2 font-medium w-1/3">Product</th>
                      <th className="text-center py-2 px-2 font-medium w-16">Qty</th>
                      <th className="text-right py-2 px-2 font-medium w-24">Unit Cost</th>
                      <th className="text-right py-2 px-2 font-medium w-24">Subtotal</th>
                      <th className="text-center py-2 px-2 font-medium w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-1 px-2">
                          {item.isNew ? (
                            <input
                              type="text"
                              value={item.productName}
                              onChange={(e) => handleItemChange(idx, 'productName', e.target.value)}
                              placeholder="New product name..."
                              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent"
                            />
                          ) : (
                            <select
                              value={item.productId}
                              onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                              className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent bg-white"
                            >
                              <option value="">Select...</option>
                              {getFilteredProducts(idx).map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          )}
                          <button
                            onClick={() => handleItemChange(idx, 'isNew', true)}
                            className="text-xs text-[#6C63FF] hover:underline mt-1"
                            hidden={item.isNew}
                          >
                            + New product
                          </button>
                        </td>
                        <td className="py-1 px-2">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent"
                          />
                        </td>
                        <td className="py-1 px-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitCost}
                            onChange={(e) => handleItemChange(idx, 'unitCost', e.target.value)}
                            className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent"
                          />
                        </td>
                        <td className="py-1 px-2 text-right text-sm font-medium text-gray-700">
                          Rs. {itemSubtotal(item).toFixed(2)}
                        </td>
                        <td className="py-1 px-2 text-center">
                          <button
                            onClick={() => removeItem(idx)}
                            className="text-red-400 hover:text-red-600 text-lg"
                            disabled={items.length === 1}
                          >
                            &times;
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="sm:w-1/3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount (Rs.)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent"
                />
              </div>
              <div className="sm:w-2/3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent resize-none"
                />
              </div>
            </div>

            <div className="flex justify-between text-sm font-semibold text-gray-800 mb-4 pt-2 border-t border-gray-200">
              <span>Total</span>
              <span>Rs. {grandTotal.toFixed(2)}</span>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="pos-btn w-full text-sm"
            >
              {submitting ? 'Submitting...' : 'Create Purchase Order'}
            </button>
          </div>
        </div>
      )}

      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowDetail(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">PO #{showDetail.po_number || showDetail.id}</h2>
              <button onClick={() => setShowDetail(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="text-sm text-gray-600 mb-4 space-y-1">
              <p>Supplier: <span className="font-medium text-gray-800">{showDetail.supplier_name || '-'}</span></p>
              <p>Date: {dayjs(showDetail.created_at).format('DD/MM/YYYY hh:mm A')}</p>
              <p>
                Status:{' '}
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusColors[showDetail.status] || 'bg-gray-100 text-gray-600'}`}>
                  {showDetail.status}
                </span>
              </p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-left py-2 px-2 font-medium">Item</th>
                  <th className="text-center py-2 px-2 font-medium">Qty</th>
                  <th className="text-right py-2 px-2 font-medium">Unit Cost</th>
                  <th className="text-right py-2 px-2 font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(showDetail.items || []).map((item, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-2 px-2 text-gray-800">{item.product_name}</td>
                    <td className="py-2 px-2 text-center text-gray-600">{item.quantity}</td>
                    <td className="py-2 px-2 text-right text-gray-600">Rs. {parseFloat(item.unit_cost || item.unitCost || 0).toFixed(2)}</td>
                    <td className="py-2 px-2 text-right font-medium">Rs. {((item.quantity || 0) * parseFloat(item.unit_cost || item.unitCost || 0)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {showDetail.discount > 0 && (
              <div className="flex justify-between text-sm mt-2 text-red-500">
                <span>Discount</span>
                <span>-Rs. {parseFloat(showDetail.discount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-gray-200">
              <span>Total</span>
              <span>Rs. {parseFloat(showDetail.total || showDetail.grand_total || 0).toFixed(2)}</span>
            </div>
            {showDetail.notes && (
              <div className="mt-2 text-sm text-gray-500">Notes: {showDetail.notes}</div>
            )}
            {showDetail.status === 'pending' && (
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => { handleReceive(showDetail.id); setShowDetail(null) }}
                  className="flex-1 h-10 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium"
                >
                  Receive
                </button>
                <button
                  onClick={() => handleCancel(showDetail.id)}
                  className="flex-1 h-10 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleDelete(showDetail.id)}
                className="flex-1 h-10 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
