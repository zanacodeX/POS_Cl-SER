const keys = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['0', '.', '⌫'],
]

export default function NumericPad({ onValueChange, value = '' }) {
  const handleClick = (key) => {
    if (key === '⌫') {
      onValueChange(value.slice(0, -1))
    } else if (key === '.') {
      if (!value.includes('.')) {
        onValueChange(value + '.')
      }
    } else {
      onValueChange(value + key)
    }
  }

  const handleClear = () => {
    onValueChange('')
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {keys.flat().map((key) => (
          <button
            key={key}
            onClick={() => handleClick(key)}
            className="min-w-[64px] h-16 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg text-xl font-semibold text-gray-800 transition-colors"
          >
            {key}
          </button>
        ))}
      </div>
      <button
        onClick={handleClear}
        className="w-full mt-2 h-12 bg-red-100 hover:bg-red-200 active:bg-red-300 rounded-lg text-sm font-semibold text-red-700 transition-colors"
      >
        Clear
      </button>
    </div>
  )
}
