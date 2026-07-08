import { useState, useEffect } from 'react'
import client from '../api/client'

const cards = [
  { key: 'today_sales', label: "Today's Sales", icon: '💰', color: 'border-l-[#6C63FF]' },
  { key: 'today_profit', label: "Today's Profit", icon: '📈', color: 'border-l-[#10b981]' },
  { key: 'today_orders', label: "Today's Orders", icon: '📋', color: 'border-l-[#3b82f6]' },
  { key: 'total_products', label: 'Total Products', icon: '📦', color: 'border-l-[#f59e0b]' },
  { key: 'discounted_products', label: 'Discounted Products', icon: '🏷️', color: 'border-l-[#8b5cf6]' },
  { key: 'low_stock_count', label: 'Low Stock', icon: '⚠️', color: 'border-l-[#ef4444]' },
  { key: 'due_customers', label: 'Customers with Due', icon: '💳', color: 'border-l-[#ec4899]' },
  { key: 'expiring_products', label: 'Expiring Soon (30d)', icon: '⏳', color: 'border-l-[#f97316]' },
]

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await client.get('/reports/dashboard')
        setData(res.data)
      } catch {
        setData(null)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-[#6C63FF] border-t-transparent rounded-full" />
      </div>
    )
  }

  const formatValue = (key, val) => {
    if (['today_sales', 'today_profit'].includes(key)) return `Rs. ${parseFloat(val || 0).toFixed(2)}`
    return val ?? 0
  }

  const maxSales = data?.weekly_sales?.length > 0
    ? Math.max(...data.weekly_sales.map(d => parseFloat(d.total)), 1) : 1
  const maxQty = data?.top_products?.length > 0
    ? Math.max(...data.top_products.map(p => parseInt(p.total_qty)), 1) : 1
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.key}
            className={`bg-white rounded-xl shadow-lg p-5 border-l-4 ${card.color}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{card.icon}</span>
              <span className="text-3xl font-bold text-gray-800">
                {formatValue(card.key, data?.[card.key])}
              </span>
            </div>
            <p className="text-gray-500 text-sm font-medium">{card.label}</p>
          </div>
        ))}
      </div>

      {data?.weekly_sales?.length > 0 && (
        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Weekly Sales Trend</h2>
          <div className="flex items-end gap-3 h-40">
            {data.weekly_sales.map((d, i) => {
              const pct = (parseFloat(d.total) / maxSales) * 100
              const day = new Date(d.date).getDay()
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500 font-medium">Rs.{parseFloat(d.total).toFixed(0)}</span>
                  <div className="w-full bg-purple-100 rounded-t-md relative" style={{ height: '160px' }}>
                    <div
                      className="absolute bottom-0 w-full bg-gradient-to-t from-[#6C63FF] to-[#8b5cf6] rounded-t-md transition-all duration-500"
                      style={{ height: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{weekDays[day]}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {data?.top_products?.length > 0 && (
        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Top Products Today</h2>
          <div className="space-y-3">
            {data.top_products.slice(0, 5).map((p, i) => {
              const pct = (parseInt(p.total_qty) / maxQty) * 100
              return (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700 truncate">{p.product_name}</span>
                    <span className="text-gray-500">{p.total_qty} sold</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-[#10b981] to-[#34d399] h-3 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 1)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {data?.due_customers > 0 && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-700 font-medium">
            💳 {data.due_customers} customer(s) have outstanding balances.
          </p>
        </div>
      )}
      {data?.expiring_products > 0 && (
        <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
          <p className="text-orange-700 font-medium">
            ⏳ {data.expiring_products} product(s) will expire within 30 days.
          </p>
        </div>
      )}
      {data?.low_stock_count > 0 && (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-amber-700 font-medium">
            ⚠️ {data.low_stock_count} product(s) are running low on stock. Visit{' '}
            <a href="/products" className="underline text-amber-800">Products</a> to manage inventory.
          </p>
        </div>
      )}
    </div>
  )
}