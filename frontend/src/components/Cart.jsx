export default function Cart({ items = [], onUpdateQty, onRemove, onClear }) {
  const total = items.reduce((sum, item) => sum + parseFloat(item.price) * item.qty, 0)
  const totalDiscount = items.reduce((sum, item) => sum + (item.lineDiscount || 0), 0)

  if (items.length === 0) {
    return (
      <div className="pos-card text-center py-12">
        <p className="text-4xl mb-2">🛒</p>
        <p className="text-gray-500 text-lg">Cart is empty</p>
        <p className="text-gray-400 text-sm mt-1">Search and select products to add</p>
      </div>
    )
  }

  return (
    <div className="pos-card overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700">Cart ({items.length} items)</h3>
        <button
          onClick={onClear}
          className="text-sm text-red-500 hover:text-red-700 px-3 py-1.5 hover:bg-red-50 rounded-lg"
        >
          Clear All
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-2 px-2 font-medium text-gray-600">Product</th>
              <th className="text-right py-2 px-2 font-medium text-gray-600">Price</th>
              <th className="text-center py-2 px-2 font-medium text-gray-600 w-32">Qty</th>
              <th className="text-right py-2 px-2 font-medium text-gray-600">Disc</th>
              <th className="text-right py-2 px-2 font-medium text-gray-600">Subtotal</th>
              <th className="text-center py-2 px-2 font-medium text-gray-600 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const subtotal = parseFloat(item.price) * item.qty
              return (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-2">
                    <p className="font-medium text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.barcode}</p>
                  </td>
                  <td className="text-right py-2 px-2 font-medium text-gray-700">
                    {item.effectiveUnitPrice && Math.abs(item.effectiveUnitPrice - parseFloat(item.price)) > 0.01
                      ? <><span className="line-through text-gray-400 text-xs">Rs. {parseFloat(item.price).toFixed(2)}</span><br /><span className="text-[#6C63FF]">Rs. {item.effectiveUnitPrice.toFixed(2)}</span></>
                      : `Rs. ${parseFloat(item.price).toFixed(2)}`}
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onUpdateQty(item.id, item.qty - 1)}
                        className="w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg text-lg font-bold transition-colors"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-semibold text-base">{item.qty}</span>
                      <button
                        onClick={() => onUpdateQty(item.id, item.qty + 1)}
                        className="w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg text-lg font-bold transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="text-right py-2 px-2 text-green-600 text-xs font-medium">
                    {item.lineDiscount > 0 ? `-Rs. ${item.lineDiscount.toFixed(2)}` : '-'}
                  </td>
                  <td className="text-right py-2 px-2 font-semibold text-gray-800">
                    Rs. {(subtotal - (item.lineDiscount || 0)).toFixed(2)}
                  </td>
                  <td className="text-center py-2 px-2">
                    <button
                      onClick={() => onRemove(item.id)}
                      className="w-9 h-9 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
        <span className="text-lg font-bold text-gray-800">Total:</span>
        <div className="text-right">
          {totalDiscount > 0 && <p className="text-xs text-green-600">Discount: -Rs. {totalDiscount.toFixed(2)}</p>}
          <span className="text-2xl font-bold text-[#6C63FF]">Rs. {(total - totalDiscount).toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}
