import { useState, useCallback, useRef, useEffect } from 'react'
import ProductSearch from '../components/ProductSearch'
import Cart from '../components/Cart'
import NumericPad from '../components/NumericPad'
import client from '../api/client'
import dayjs from 'dayjs'

export default function Pos() {
  const [cartItems, setCartItems] = useState([])
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerName, setCustomerName] = useState('Walk-in Customer')
  const [customerId, setCustomerId] = useState(null)
  const [customerBalance, setCustomerBalance] = useState(0)
  const [customerResults, setCustomerResults] = useState([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const customerRef = useRef(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountTendered, setAmountTendered] = useState('')
  const [discount, setDiscount] = useState('')
  const [discountType, setDiscountType] = useState('fixed')
  const [discountPercent, setDiscountPercent] = useState('')
  const [completeModal, setCompleteModal] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const receiptRef = useRef(null)

  const subtotal = cartItems.reduce((sum, item) => sum + parseFloat(item.price) * item.qty, 0)
  const itemsDiscount = cartItems.reduce((sum, item) => sum + (item.lineDiscount || 0), 0)
  const afterItemsDiscount = subtotal - itemsDiscount
  const discountVal = discountType === 'fixed'
    ? (parseFloat(discount) || 0)
    : parseFloat((afterItemsDiscount * (parseFloat(discountPercent) || 0) / 100).toFixed(2))
  const netTotal = Math.max(0, afterItemsDiscount - discountVal)
  const tendered = parseFloat(amountTendered) || 0
  const change = tendered > netTotal ? tendered - netTotal : 0

  const todayLocal = () => { const d = new Date(); d.setHours(0,0,0,0); return d }

  const calcEffectiveTotal = (item) => {
    // Volume pricing tiers (e.g. 1-4=750, 5-9=650, 10-15=550, 16+=450)
    if (item.price_tiers && item.price_tiers.length > 0) {
      const sorted = [...item.price_tiers].sort((a, b) => a.min_qty - b.min_qty)
      for (const tier of sorted) {
        if (item.qty >= tier.min_qty && (!tier.max_qty || item.qty <= tier.max_qty)) {
          return tier.unit_price * item.qty
        }
      }
      const last = sorted[sorted.length - 1]
      return last.unit_price * item.qty
    }
    // Bundle pricing (e.g. 3 for 2000 — 7 qty = 2 bundles×2000 + 1×750)
    if (item.bundle_qty && item.bundle_price) {
      const bundles = Math.floor(item.qty / item.bundle_qty)
      const remainder = item.qty % item.bundle_qty
      return bundles * item.bundle_price + remainder * item.price
    }
    return item.price * item.qty
  }

  const calcLineDiscount = (item) => {
    const standardTotal = item.price * item.qty
    const effectiveTotal = calcEffectiveTotal(item)
    let discount = standardTotal - effectiveTotal
    // Additional percentage/flat promotional discount on top of effective price
    if (item.discount_type && item.discount_value) {
      if (!item.discount_min_qty || item.qty >= item.discount_min_qty) {
        const today = todayLocal()
        if (!item.discount_valid_from || new Date(item.discount_valid_from + 'T00:00:00') <= today) {
          if (!item.discount_valid_to || new Date(item.discount_valid_to + 'T00:00:00') >= today) {
            if (item.discount_type === 'percentage') discount += effectiveTotal * (item.discount_value / 100)
            else discount += item.discount_value * item.qty
          }
        }
      }
    }
    return discount
  }

  const recalcDiscounts = (items) =>
    items.map((item) => {
      const effectiveTotal = calcEffectiveTotal(item)
      return {
        ...item,
        lineDiscount: calcLineDiscount({ ...item }),
        effectiveUnitPrice: effectiveTotal / item.qty
      }
    })

  const handleProductSelect = useCallback((product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id)
      if (existing) {
        return recalcDiscounts(prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        ))
      }
      return recalcDiscounts([...prev, { ...product, qty: 1, lineDiscount: 0 }])
    })
  }, [])

  const handleUpdateQty = (productId, qty) => {
    if (qty < 1) {
      handleRemove(productId)
      return
    }
    setCartItems((prev) =>
      recalcDiscounts(prev.map((item) =>
        item.id === productId ? { ...item, qty } : item
      ))
    )
  }

  const handleRemove = (productId) => {
    setCartItems((prev) => prev.filter((item) => item.id !== productId))
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (customerRef.current && !customerRef.current.contains(e.target)) {
        setShowCustomerDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchCustomer = async (q) => {
    setCustomerQuery(q)
    if (!q.trim()) {
      setCustomerResults([])
      setShowCustomerDropdown(false)
      return
    }
    try {
      const res = await client.get('/customers/search', { params: { q: q.trim() } })
      setCustomerResults(res.data || [])
      setShowCustomerDropdown(true)
    } catch {
      setCustomerResults([])
    }
  }

  const selectCustomer = (cust) => {
    setCustomerName(cust.name)
    setCustomerId(cust.id)
    setCustomerQuery(`${cust.name} (${cust.phone || 'no phone'})`)
    setShowCustomerDropdown(false)
    client.get(`/customers/${cust.id}`)
      .then((res) => setCustomerBalance(parseFloat(res.data.balance || 0)))
      .catch(() => setCustomerBalance(0))
  }

  const clearCustomer = () => {
    setCustomerQuery('')
    setCustomerName('Walk-in Customer')
    setCustomerId(null)
    setCustomerBalance(0)
    setCustomerResults([])
    setShowCustomerDropdown(false)
  }

  const handleClear = () => {
    setCartItems([])
    setAmountTendered('')
    setDiscount('')
    setDiscountPercent('')
    setDiscountType('fixed')
    clearCustomer()
  }

  const handleCompleteSale = async () => {
    if (cartItems.length === 0) return
    const expiredItems = cartItems.filter(item => item.expiry_date && new Date(item.expiry_date) < new Date(new Date().toDateString()))
    if (expiredItems.length > 0) {
      if (!confirm(`⚠️ WARNING: ${expiredItems.map(i => i.name).join(', ')} ${expiredItems.length > 1 ? 'are' : 'is'} expired! Sell anyway?`)) {
        setSubmitting(false)
        return
      }
    }
    setSubmitting(true)
    try {
      const payload = {
        items: cartItems.map((item) => ({
          product_id: item.id,
          quantity: item.qty,
          price: item.price,
          line_discount: item.lineDiscount || 0,
        })),
        customer_id: customerId,
        payment_method: paymentMethod,
        amount_tendered: paymentMethod === 'credit' ? 0 : tendered,
      }
      if (discountType === 'percentage' && parseFloat(discountPercent) > 0) {
        payload.discount = itemsDiscount + discountVal
        payload.discount_percentage = parseFloat(discountPercent)
      } else if (discountVal > 0) {
        payload.discount = itemsDiscount + discountVal
      } else {
        payload.discount = itemsDiscount
      }
      const res = await client.post('/orders', payload)
      setCompleteModal(res.data)
      setShowReceipt(true)
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Failed to complete sale')
    } finally {
      setSubmitting(false)
    }
  }

  const handleNewSale = () => {
    handleClear()
    setCompleteModal(null)
    setShowReceipt(false)
  }

  const handlePrint = () => {
    const t = document.title
    document.title = ''
    window.print()
    document.title = t
  }

  if (completeModal) {
    return (
      <>
        <style media="print">{`
          @page { margin: 0; }
          body * { visibility: hidden !important; }
          #receipt-content, #receipt-content * { visibility: visible !important; }
          #receipt-content { position: absolute; left: 0; top: 0; width: 80mm; padding: 10px; border: 1px solid #000; }
        `}</style>
      <div className="max-w-2xl mx-auto">
        <div className="pos-card text-center py-8">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Sale Complete!</h2>
          <p className="text-gray-500 mb-6">
            Invoice #{completeModal.invoice_number || completeModal.id}
          </p>

          {showReceipt && (
            <div
              ref={receiptRef}
              id="receipt-content"
              className="bg-gray-50 rounded-xl p-6 mb-6 text-left max-w-sm mx-auto text-sm"
            >
              <div className="text-center mb-3">
                <h3 className="font-bold text-lg">Pixel Art</h3>
                <p className="text-gray-500">Sales Receipt</p>
              </div>
              <div className="border-t border-dashed border-gray-300 my-2" />
              <p className="text-gray-500 text-xs">
                {dayjs(completeModal.created_at).format('DD/MM/YYYY hh:mm A')}
              </p>
              <p className="text-gray-500 text-xs mb-2">
                Invoice: {completeModal.invoice_number || completeModal.id}
              </p>
              <div className="border-t border-dashed border-gray-300 my-2" />
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-dashed border-gray-200">
                    <th className="text-left py-1 font-medium">Item</th>
                    <th className="text-center py-1 font-medium">Qty</th>
                    <th className="text-right py-1 font-medium">Unit Price</th>
                    <th className="text-right py-1 font-medium">Disc</th>
                    <th className="text-right py-1 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {completeModal.items?.map((item, idx) => {
                    const lineDisc = parseFloat(item.line_discount || 0)
                    const unitPrice = parseFloat(item.unit_price)
                    const qty = item.quantity
                    const discountedTotal = unitPrice * qty - lineDisc
                    return (
                      <tr key={idx} className="border-b border-dashed border-gray-100">
                        <td className="py-1.5 pr-1">
                          <p className="font-medium text-gray-800 truncate max-w-[80px]">{item.product_name || item.name}</p>
                        </td>
                        <td className="text-center py-1.5 text-gray-700">{qty}</td>
                        <td className="text-right py-1.5 text-gray-600">
                          {lineDisc > 0
                            ? <><span className="line-through text-gray-300">Rs.{unitPrice.toFixed(2)}</span><br /><span className="text-green-600">Rs.{(discountedTotal / qty).toFixed(2)}</span></>
                            : `Rs.${unitPrice.toFixed(2)}`}
                        </td>
                        <td className="text-right py-1.5 text-green-600">
                          {lineDisc > 0 ? `-Rs.${lineDisc.toFixed(2)}` : '-'}
                        </td>
                        <td className="text-right py-1.5 font-semibold text-gray-800">Rs.{discountedTotal.toFixed(2)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="border-t border-dashed border-gray-300 my-2" />
              <div className="space-y-1">
                <div className="flex justify-between text-gray-600 text-sm">
                  <span>Subtotal</span>
                  <span>Rs. {parseFloat(completeModal.subtotal || 0).toFixed(2)}</span>
                </div>
                {parseFloat(completeModal.items_discount_total || 0) > 0 && (
                  <div className="flex justify-between text-green-600 text-sm">
                    <span>Item Discounts</span>
                    <span>-Rs. {parseFloat(completeModal.items_discount_total).toFixed(2)}</span>
                  </div>
                )}
                {parseFloat(completeModal.order_discount || 0) > 0 && (
                  <div className="flex justify-between text-orange-500 text-sm">
                    <span>Order Discount</span>
                    <span>-Rs. {parseFloat(completeModal.order_discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-800 text-base border-t border-gray-200 pt-1">
                  <span>Total</span>
                  <span>Rs. {parseFloat(completeModal.total || netTotal).toFixed(2)}</span>
                </div>
              </div>
              <div className="border-t border-dashed border-gray-300 my-2" />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Paid ({paymentMethod})</span>
                  <span>Rs. {parseFloat(completeModal.amount_tendered || tendered).toFixed(2)}</span>
                </div>
                {(parseFloat(completeModal.total || netTotal) - parseFloat(completeModal.amount_tendered || 0)) > 0 ? (
                  <div className="flex justify-between text-red-500 font-medium">
                    <span>Remaining</span>
                    <span>Rs. {(parseFloat(completeModal.total || netTotal) - parseFloat(completeModal.amount_tendered || 0)).toFixed(2)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Change</span>
                    <span>Rs. {parseFloat(completeModal.change || change).toFixed(2)}</span>
                  </div>
                )}
              </div>
              {(parseFloat(completeModal.total || netTotal) - parseFloat(completeModal.amount_tendered || 0)) > 0 && customerId && (
                <div className="flex justify-between text-red-500 font-medium text-sm mt-1">
                  <span>Due</span>
                  <span>Rs. {(parseFloat(completeModal.total || netTotal) - parseFloat(completeModal.amount_tendered || 0)).toFixed(2)}</span>
                </div>
              )}
              <p className="text-center text-gray-400 text-xs mt-4">Thank you for your purchase!</p>
            </div>
          )}

          <div className="flex gap-2 justify-center mb-3">
            <button
              onClick={() => setShowReceipt(!showReceipt)}
              className="px-4 py-2 text-sm text-[#6C63FF] hover:bg-purple-50 rounded-lg"
            >
              {showReceipt ? 'Hide Receipt' : 'Show Receipt'}
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-sm bg-[#6C63FF] text-white hover:bg-[#5a52e0] rounded-lg"
            >
              🖨️ Print Receipt
            </button>
          </div>

          <button onClick={handleNewSale} className="pos-btn w-full max-w-xs mx-auto block text-center">
            New Sale
          </button>
        </div>
      </div>
      </>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">POS Terminal</h1>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 space-y-4">
          <ProductSearch onProductSelect={handleProductSelect} />
          <Cart
            items={cartItems}
            onUpdateQty={handleUpdateQty}
            onRemove={handleRemove}
            onClear={handleClear}
          />
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="pos-card" ref={customerRef}>
            <h3 className="font-semibold text-gray-700 mb-3">Customer</h3>
            <div className="relative">
              <input
                type="text"
                value={customerQuery}
                onChange={(e) => searchCustomer(e.target.value)}
                onFocus={() => customerResults.length > 0 && setShowCustomerDropdown(true)}
                placeholder="Search customer by name or phone..."
                className="w-full h-12 px-4 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent"
              />
              {customerId && (
                <button
                  onClick={clearCustomer}
                  className="absolute right-3 top-3 text-gray-400 hover:text-red-500 text-lg"
                  title="Clear customer"
                >
                  &times;
                </button>
              )}
              {showCustomerDropdown && customerResults.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {customerResults.map((cust) => (
                    <button
                      key={cust.id}
                      onClick={() => selectCustomer(cust)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left"
                    >
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{cust.name}</p>
                        <p className="text-xs text-gray-500">{cust.phone || 'no phone'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {customerId ? `👤 ${customerName}` : 'Walk-in Customer'}
              {customerBalance > 0 && <span className="ml-2 text-red-500 font-medium">(Due: Rs. {customerBalance.toFixed(2)})</span>}
              {paymentMethod === 'credit' && customerId && (
                <span className="ml-2 text-amber-600 font-medium">(will add Rs. {netTotal.toFixed(2)} to balance)</span>
              )}
            </p>
          </div>

          <div className="pos-card">
            <h3 className="font-semibold text-gray-700 mb-3">Payment Method</h3>
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: 'cash', label: 'Cash', icon: '💵' },
                { key: 'card', label: 'Card', icon: '💳' },
                { key: 'transfer', label: 'Transfer', icon: '🏦' },
                { key: 'credit', label: 'Credit', icon: '📝' },
              ].map((method) => (
                <button
                  key={method.key}
                  onClick={() => setPaymentMethod(method.key)}
                  className={`h-14 flex flex-col items-center justify-center rounded-lg border-2 transition-all ${
                    paymentMethod === method.key
                      ? 'border-[#6C63FF] bg-purple-50 text-[#6C63FF]'
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="text-lg">{method.icon}</span>
                  <span className="text-xs font-medium">{method.label}</span>
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === 'credit' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              Full amount will be added to customer's balance.
            </div>
          )}
          {paymentMethod !== 'credit' && customerId && parseFloat(amountTendered) > 0 && parseFloat(amountTendered) < netTotal && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
              Partial payment — Rs. {(netTotal - parseFloat(amountTendered)).toFixed(2)} will be added to customer's due.
            </div>
          )}

          <div className="pos-card">
            <h3 className="font-semibold text-gray-700 mb-3">Payment</h3>
            <div className="space-y-3">
              {paymentMethod !== 'credit' && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Amount Tendered (Rs.)</label>
                <input
                  type="number"
                  value={amountTendered}
                  onChange={(e) => setAmountTendered(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full h-12 px-4 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent"
                />
              </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Discount</label>
                <div className="flex gap-1 mb-2">
                  <button
                    onClick={() => setDiscountType('fixed')}
                    className={`flex-1 h-8 text-xs font-medium rounded-lg transition-colors ${
                      discountType === 'fixed'
                        ? 'bg-[#6C63FF] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Rs.
                  </button>
                  <button
                    onClick={() => setDiscountType('percentage')}
                    className={`flex-1 h-8 text-xs font-medium rounded-lg transition-colors ${
                      discountType === 'percentage'
                        ? 'bg-[#6C63FF] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    %
                  </button>
                </div>
                {discountType === 'fixed' ? (
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full h-12 px-4 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(e.target.value)}
                      placeholder="0"
                      min="0"
                      max="100"
                      className="flex-1 h-12 px-4 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent"
                    />
                    <span className="text-gray-500 font-medium">%</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pos-card bg-gray-50">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>Rs. {subtotal.toFixed(2)}</span>
              </div>
              {itemsDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Item Discounts</span>
                  <span>-Rs. {itemsDiscount.toFixed(2)}</span>
                </div>
              )}
              {discountVal > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Order Discount</span>
                  <span>-Rs. {discountVal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-gray-800 border-t border-gray-200 pt-2">
                <span>Net Total</span>
                <span>Rs. {netTotal.toFixed(2)}</span>
              </div>
              {tendered > 0 && tendered >= netTotal && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Change</span>
                  <span>Rs. {change.toFixed(2)}</span>
                </div>
              )}
              {tendered > 0 && tendered < netTotal && (
                <div className="flex justify-between text-red-500 font-medium">
                  <span>Remaining</span>
                  <span>Rs. {(netTotal - tendered).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleCompleteSale}
            disabled={cartItems.length === 0 || submitting}
            className="w-full h-14 bg-[#10b981] hover:bg-[#059669] active:bg-[#047857] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              'Complete Sale'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
