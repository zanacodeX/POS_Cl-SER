import { useState, useEffect, useCallback, useRef } from 'react'
import client from '../api/client'
import JsBarcode from 'jsbarcode'
import dayjs from 'dayjs'

function BarcodeCell({ code }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    if (canvasRef.current && code) {
      try { JsBarcode(canvasRef.current, code, { height: 20, width: 1, displayValue: false }) } catch {}
    }
  }, [code])
  if (!code) return <span className="text-gray-400 font-mono text-xs">-</span>
  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} />
      <span className="text-gray-600 font-mono text-xs mt-0.5">{code}</span>
    </div>
  )
}

export default function Products() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [lowStock, setLowStock] = useState(false)
  const [hasDiscount, setHasDiscount] = useState(false)
  const limit = 15

  const [form, setForm] = useState({
    barcode: '', name: '', category_id: '', price: '', cost: '', quantity: '', low_stock_threshold: '',
    batch_no: '', expiry_date: '', mfg_date: '', discount_type: '', discount_value: '', discount_min_qty: 1,
    discount_valid_from: '', discount_valid_to: '', bundle_qty: '', bundle_price: ''
  })
  const [priceTiers, setPriceTiers] = useState([])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await client.get('/products', {
        params: { search, category_id: categoryFilter, page, limit, low_stock: lowStock || undefined, has_discount: hasDiscount || undefined }
      })
      setProducts(res.data.data || [])
      setTotal(res.data.total || 0)
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [search, categoryFilter, page, lowStock, hasDiscount])

  const fetchCategories = async () => {
    try {
      const res = await client.get('/categories')
      setCategories(res.data || [])
    } catch {
      setCategories([])
    }
  }

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [fetchProducts])

  const totalPages = Math.ceil(total / limit)

  const openAdd = () => {
    setEditing(null)
    setForm({ barcode: '', name: '', category_id: '', price: '', cost: '', quantity: '', low_stock_threshold: '',
      batch_no: '', expiry_date: '', mfg_date: '', discount_type: '', discount_value: '', discount_min_qty: 1,
      discount_valid_from: '', discount_valid_to: '', bundle_qty: '', bundle_price: ''
    })
    setPriceTiers([])
    setShowModal(true)
  }

  const openEdit = async (product) => {
    setEditing(product)
    setForm({
      barcode: product.barcode || '',
      name: product.name || '',
      category_id: product.category_id != null ? String(product.category_id) : '',
      price: product.price || '',
      cost: product.cost || '',
      quantity: product.quantity || '',
      low_stock_threshold: product.low_stock_threshold || '',
      batch_no: product.batch_no || '',
      expiry_date: product.expiry_date || '',
      mfg_date: product.mfg_date || '',
      discount_type: product.discount_type || '',
      discount_value: product.discount_value || '',
      discount_min_qty: product.discount_min_qty ?? 1,
      discount_valid_from: product.discount_valid_from || '',
      discount_valid_to: product.discount_valid_to || '',
      bundle_qty: product.bundle_qty || '',
      bundle_price: product.bundle_price || ''
    })
    try {
      const res = await client.get(`/products/${product.id}`)
      setPriceTiers(res.data.price_tiers || [])
    } catch {
      setPriceTiers([])
    }
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        cost: form.cost ? parseFloat(form.cost) : undefined,
        quantity: parseInt(form.quantity),
        low_stock_threshold: form.low_stock_threshold ? parseInt(form.low_stock_threshold) : undefined,
        category_id: form.category_id ? parseInt(form.category_id) : null,
        batch_no: form.batch_no || null,
        expiry_date: form.expiry_date || null,
        mfg_date: form.mfg_date || null,
        discount_type: form.discount_type || null,
        discount_value: form.discount_value ? parseFloat(form.discount_value) : null,
        discount_min_qty: form.discount_min_qty ? parseInt(form.discount_min_qty) : null,
        discount_valid_from: form.discount_valid_from || null,
        discount_valid_to: form.discount_valid_to || null,
        bundle_qty: form.bundle_qty ? parseInt(form.bundle_qty) : null,
        bundle_price: form.bundle_price ? parseFloat(form.bundle_price) : null
      }
      if (editing) {
        await client.put(`/products/${editing.id}`, payload)
        if (priceTiers.length > 0) {
          await client.put(`/price-tiers/${editing.id}`, { tiers: priceTiers })
        }
      } else {
        const res = await client.post('/products', payload)
        if (priceTiers.length > 0 && res.data?.id) {
          await client.put(`/price-tiers/${res.data.id}`, { tiers: priceTiers })
        }
      }
      setShowModal(false)
      fetchProducts()
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Failed to save product')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    try {
      await client.delete(`/products/${id}`)
      fetchProducts()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete product')
    }
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    if (!confirm(`Delete ${selected.size} product(s)?`)) return
    try {
      await client.post('/products/bulk-delete', { ids: [...selected] })
      setSelected(new Set())
      fetchProducts()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete products')
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
    if (selected.size === products.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(products.map((p) => p.id)))
    }
  }

  const renderBarcodeDataUrl = (code) => {
    const c = document.createElement('canvas')
    try { JsBarcode(c, code || '', { height: 40, width: 2, displayValue: true, fontSize: 12 }) } catch {}
    return c.toDataURL()
  }

  const printLabel = (product) => {
    printLabels([product])
  }

  const printLabels = (items) => {
    const labels = items.filter((p) => p.barcode)
    if (labels.length === 0) return
    const body = labels.map((p) => {
      const url = renderBarcodeDataUrl(p.barcode)
      return `<div class="label">
        <div class="name">${p.name}</div>
        <div class="price">Rs. ${parseFloat(p.price).toFixed(2)}</div>
        <img src="${url}" alt="" />
      </div>`
    }).join('')
    const win = window.open('', 'print-labels', `width=${Math.min(800, labels.length * 200 + 100)},height=600`)
    win.document.write(`<!DOCTYPE html><html><head><title>Print Labels</title>
<style>
  body { margin: 20px; font-family: Arial, sans-serif; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
  .label { text-align: center; border: 1px dashed #ccc; padding: 12px; page-break-inside: avoid; }
  .label .name { font-size: 13px; font-weight: bold; margin-bottom: 2px; }
  .label .price { font-size: 11px; color: #555; margin-bottom: 6px; }
  .label img { max-width: 100%; }
  .no-print { margin-bottom: 16px; }
  @media print { .no-print { display: none; } body { margin: 10mm; } .label { border: none; } }
</style></head><body>
<div class="no-print"><button onclick="window.print()" style="padding:10px 32px;font-size:16px;cursor:pointer">🖨️ Print Labels (${labels.length})</button></div>
<div class="grid">${body}</div>
</body></html>`)
    win.document.close()
  }

  const printSelected = () => {
    const items = products.filter((p) => selected.has(p.id))
    printLabels(items)
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Products</h1>
        <button onClick={openAdd} className="pos-btn flex items-center gap-1 text-sm">
          + Add Product
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search by name or barcode..."
          className="flex-1 h-12 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent"
        />
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
          className="h-12 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent bg-white"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <button
          onClick={() => { setLowStock(!lowStock); setPage(1) }}
          className={`h-12 px-4 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap ${
            lowStock
              ? 'bg-red-50 border-red-300 text-red-600'
              : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
            {lowStock ? '⚠️ Low Stock' : '📦 All Stock'}
        </button>
        <button
          onClick={() => { setHasDiscount(!hasDiscount); setPage(1) }}
          className={`h-12 px-4 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap ${
            hasDiscount
              ? 'bg-green-50 border-green-300 text-green-600'
              : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
            {hasDiscount ? '🏷️ Discounted' : '📋 All Products'}
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        {selected.size > 0 && (
          <>
            <button onClick={printSelected} className="pos-btn text-sm flex items-center gap-1">
              🏷️ Print Labels ({selected.size})
            </button>
            <button onClick={handleBulkDelete} className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium">
              🗑️ Delete ({selected.size})
            </button>
          </>
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
                    checked={products.length > 0 && selected.size === products.length}
                    onChange={toggleAll}
                    className="w-4 h-4 accent-[#6C63FF]"
                  />
                </th>
                <th className="text-left py-3 px-3 font-medium">Barcode</th>
                <th className="text-left py-3 px-3 font-medium">Name</th>
                <th className="text-left py-3 px-3 font-medium">Category</th>
                <th className="text-left py-3 px-3 font-medium">Batch</th>
                <th className="text-left py-3 px-3 font-medium">Expiry</th>
                <th className="text-right py-3 px-3 font-medium">Price</th>
                <th className="text-right py-3 px-3 font-medium">Stock</th>
                <th className="text-center py-3 px-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-gray-400">Loading...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-gray-400">No products found</td>
                </tr>
              ) : (
                products.map((product, idx) => (
                  <tr key={product.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-3 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={selected.has(product.id)}
                        onChange={() => toggleSelect(product.id)}
                        className="w-4 h-4 accent-[#6C63FF]"
                      />
                    </td>
                    <td className="py-3 px-3"><BarcodeCell code={product.barcode} /></td>
                    <td className="py-3 px-3 font-medium text-gray-800">{product.name}</td>
                    <td className="py-3 px-3 text-gray-500">{product.category_name || '-'}</td>
                    <td className="py-3 px-3 text-xs text-gray-500">{product.batch_no || '-'}</td>
                    <td className="py-3 px-3 text-xs text-gray-500">{product.expiry_date ? dayjs(product.expiry_date).format('DD/MM/YY') : '-'}</td>
                    <td className="py-3 px-3 text-right font-medium text-gray-800">Rs. {parseFloat(product.price).toFixed(2)}</td>
                    <td className="py-3 px-3 text-right">
                      <span className={`font-medium ${parseInt(product.quantity) <= parseInt(product.low_stock_threshold || 0) ? 'text-red-500' : 'text-gray-700'}`}>
                        {product.quantity}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <button onClick={() => openEdit(product)} className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg">Edit</button>
                      <button onClick={() => printLabel(product)} className="px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg ml-1">Label</button>
                      <button onClick={() => handleDelete(product.id)} className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg ml-1">Delete</button>
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
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            Prev
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">{editing ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Barcode / SKU</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.barcode}
                      onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                      className="flex-1 h-11 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const code = Math.floor(100000000000 + Math.random() * 900000000000).toString()
                        setForm({ ...form, barcode: code })
                      }}
                      className="h-11 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium whitespace-nowrap"
                    >
                      Generate
                    </button>
                  </div>
                  {form.barcode && (
                    <div className="mt-2 flex justify-center">
                      <canvas ref={(el) => { if (el) JsBarcode(el, form.barcode, { height: 30, width: 1.5, displayValue: true, fontSize: 11 }) }} />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Category</label>
                  <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] bg-white">
                    <option value="">Select</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Price * (Rs.)</label>
                  <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required step="0.01" min="0" className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Cost (Rs.)</label>
                  <input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} step="0.01" min="0" className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Quantity *</label>
                  <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required min="0" className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Low Stock Threshold</label>
                  <input type="number" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} min="0" className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
                </div>
              </div>
              <div className="border-t border-gray-200 pt-3 mt-2">
                <p className="font-medium text-gray-700 text-sm mb-2">Batch / Expiry</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Batch No.</label>
                    <input type="text" value={form.batch_no} onChange={(e) => setForm({...form, batch_no: e.target.value})} className="w-full h-11 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Mfg Date</label>
                    <input type="date" value={form.mfg_date} onChange={(e) => setForm({...form, mfg_date: e.target.value})} className="w-full h-11 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Expiry Date</label>
                    <input type="date" value={form.expiry_date} onChange={(e) => setForm({...form, expiry_date: e.target.value})} className="w-full h-11 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-3 mt-2">
                <p className="font-medium text-gray-700 text-sm mb-2">Discount Rules</p>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Type</label>
                    <select value={form.discount_type} onChange={(e) => setForm({...form, discount_type: e.target.value})} className="w-full h-11 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6C63FF] bg-white">
                      <option value="">None</option>
                      <option value="percentage">%</option>
                      <option value="flat">Flat</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Value</label>
                    <input type="number" value={form.discount_value} onChange={(e) => setForm({...form, discount_value: e.target.value})} step="0.01" min="0" className="w-full h-11 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Min Qty</label>
                    <input type="number" value={form.discount_min_qty} onChange={(e) => setForm({...form, discount_min_qty: e.target.value})} min="1" className="w-full h-11 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Valid To</label>
                    <input type="date" value={form.discount_valid_to} onChange={(e) => setForm({...form, discount_valid_to: e.target.value})} className="w-full h-11 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-3 mt-2">
                <p className="font-medium text-gray-700 text-sm mb-2">Bundle Pricing <span className="text-xs text-gray-400 font-normal">(e.g. 3 for Rs. 2000)</span></p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Bundle Qty</label>
                    <input type="number" value={form.bundle_qty} onChange={(e) => setForm({...form, bundle_qty: e.target.value})} min="2" placeholder="e.g. 3" className="w-full h-11 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Bundle Price (Rs.)</label>
                    <input type="number" value={form.bundle_price} onChange={(e) => setForm({...form, bundle_price: e.target.value})} step="0.01" min="0" placeholder="e.g. 2000" className="w-full h-11 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-3 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-gray-700 text-sm">Volume Pricing <span className="text-xs text-gray-400 font-normal">(tiered unit price by qty range)</span></p>
                  <button
                    type="button"
                    onClick={() => setPriceTiers([...priceTiers, { min_qty: '', max_qty: '', unit_price: '' }])}
                    className="text-xs px-2 py-1 rounded border border-[#6C63FF] text-[#6C63FF] hover:bg-[#6C63FF] hover:text-white font-medium"
                  >
                    + Add Tier
                  </button>
                </div>
                {priceTiers.length > 0 && (
                  <div className="space-y-2">
                    {priceTiers.map((tier, idx) => (
                      <div key={idx} className="grid grid-cols-4 gap-2 items-end">
                        <div>
                          <label className="block text-xs text-gray-400 mb-0.5">Min Qty</label>
                          <input type="number" value={tier.min_qty} onChange={(e) => {
                            const updated = [...priceTiers]
                            updated[idx] = { ...updated[idx], min_qty: e.target.value }
                            setPriceTiers(updated)
                          }} min="1" className="w-full h-9 px-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-0.5">Max Qty</label>
                          <input type="number" value={tier.max_qty} onChange={(e) => {
                            const updated = [...priceTiers]
                            updated[idx] = { ...updated[idx], max_qty: e.target.value }
                            setPriceTiers(updated)
                          }} placeholder="∞" className="w-full h-9 px-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-0.5">Unit Price</label>
                          <input type="number" value={tier.unit_price} onChange={(e) => {
                            const updated = [...priceTiers]
                            updated[idx] = { ...updated[idx], unit_price: e.target.value }
                            setPriceTiers(updated)
                          }} step="0.01" min="0" className="w-full h-9 px-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
                        </div>
                        <button
                          type="button"
                          onClick={() => setPriceTiers(priceTiers.filter((_, i) => i !== idx))}
                          className="h-9 text-red-400 hover:text-red-600 text-lg"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {priceTiers.length === 0 && (
                  <p className="text-xs text-gray-400">No volume tiers set. Standard price applies.</p>
                )}
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
