import { useState, useEffect, useRef, useCallback } from 'react'
import client from '../api/client'

export default function ProductSearch({ onProductSelect }) {
  const [query, setQuery] = useState('')
  const [barcode, setBarcode] = useState('')
  const [results, setResults] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)
  const wrapperRef = useRef(null)

  const searchProducts = useCallback(async (term) => {
    if (!term.trim()) {
      setResults([])
      setShowDropdown(false)
      return
    }
    setLoading(true)
    try {
      const res = await client.get('/products', { params: { search: term, limit: 10 } })
      setResults(res.data.data || [])
      setShowDropdown(true)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchProducts(query), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, searchProducts])

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleBarcode = async (e) => {
    e.preventDefault()
    if (!barcode.trim()) return
    try {
      const res = await client.get(`/products/barcode/${barcode.trim()}`)
      if (res.data) {
        onProductSelect(res.data)
        setBarcode('')
      }
    } catch {
      setBarcode('')
    }
  }

  const handleSelect = (product) => {
    onProductSelect(product)
    setQuery('')
    setShowDropdown(false)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1 font-medium">Search Product</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder="Search by name..."
            className="w-full h-12 px-4 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent"
          />
        </div>
        <form onSubmit={handleBarcode}>
          <label className="block text-xs text-gray-500 mb-1 font-medium">Barcode Scanner</label>
          <input
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Scan barcode..."
            className="w-full h-12 px-4 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent"
          />
        </form>
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
          {results.map((product) => (
            <button
              key={product.id}
              onClick={() => handleSelect(product)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left"
            >
              <div>
                <p className="font-medium text-gray-800">{product.name}</p>
                <p className="text-xs text-gray-500">{product.barcode}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-[#6C63FF]">Rs. {parseFloat(product.price).toFixed(2)}</p>
                <p className="text-xs text-gray-400">Stock: {product.quantity}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="absolute right-3 top-9">
          <div className="animate-spin h-5 w-5 border-2 border-[#6C63FF] border-t-transparent rounded-full" />
        </div>
      )}
    </div>
  )
}
