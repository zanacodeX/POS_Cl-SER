import { useState, useEffect } from 'react'
import client from '../api/client'
import { useNavigate } from 'react-router-dom'

export default function License() {
  const [key, setKey] = useState('')
  const [mac, setMac] = useState('')
  const [deactivated, setDeactivated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    (async () => {
      try {
        const lic = await client.get('/license/status')
        if (lic.data.licensed && !lic.data.deactivated) {
          navigate('/dashboard')
          return
        }
        setMac(lic.data.mac)
        if (lic.data.deactivated) setDeactivated(true)
      } catch {
      } finally {
        setLoading(false)
      }
    })()
  }, [navigate])

  const handleActivate = async (e) => {
    e.preventDefault()
    setError('')
    if (!key.trim()) return
    setActivating(true)
    try {
      await client.post('/license/activate', { key: key.trim() })
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Activation failed')
    } finally {
      setActivating(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Loading...</div>

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Pixel Art POS</h1>
          <p className="text-gray-500 text-sm mt-1">License Activation Required</p>
        </div>

        <div className={`rounded-xl p-4 mb-6 text-sm ${deactivated ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
          {deactivated ? (
            <p className="text-red-600 font-medium mb-2">
              Your license has been deactivated. Enter a new product key to continue.
            </p>
          ) : (
            <p className="text-gray-600 mb-2">
              This software requires a valid product key. Please contact the developer to get your key.
            </p>
          )}
          <div className="text-xs text-gray-400 mt-3">
            <p>MAC Address:</p>
            <p className="font-mono text-gray-600 mt-0.5 select-all">{mac}</p>
            <p className="text-gray-400 mt-2">
              Send this MAC address to the developer to get your product key.
            </p>
          </div>
        </div>

        <form onSubmit={handleActivate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Product Key</label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className="w-full h-12 px-4 border border-gray-300 rounded-lg text-base font-mono text-center tracking-wider focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent"
              autoComplete="off"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={activating || !key.trim()}
            className="w-full h-12 bg-[#6C63FF] hover:bg-[#5a52e0] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
          >
            {activating ? 'Activating...' : 'Activate License'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          Zana Codex Creation | Contact: 0767714341
        </p>
      </div>
    </div>
  )
}
