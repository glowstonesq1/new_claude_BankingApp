import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import useStore from '../../store/useStore'
import QRScanner from '../shared/QRScanner'
import { formatINR, timeAgo } from '../../lib/formatCurrency'
import toast from 'react-hot-toast'

export default function PayTab() {
  const { profile, account, refreshAccount } = useStore()
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [payTo, setPayTo] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [recentPayments, setRecentPayments] = useState([])
  const [qrPayload, setQrPayload] = useState(null)

  useEffect(() => {
    loadPayments()
  }, [profile])

  const loadPayments = async () => {
    if (!profile) return
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', profile.id)
      .eq('type', 'payment')
      .order('created_at', { ascending: false })
      .limit(5)
    setRecentPayments(data || [])
  }

  const handleScan = (result) => {
    setQrPayload(result)
    const label = result.length > 30 ? result.substring(0, 30) + '…' : result
    setPayTo(label)
    setAmount('')
    setDescription('')
    setScanning(false)
    setScanned(true)
  }

  const handlePay = async () => {
    const amt = Number(amount)
    if (!payTo.trim()) { toast.error('Enter who to pay'); return }
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return }
    if (amt > (account?.balance || 0)) { toast.error('Insufficient balance! 😬'); return }

    setSubmitting(true)
    try {
      await supabase.from('transactions').insert({
        user_id: profile.id,
        type: 'payment',
        amount: amt,
        description: description || `Payment to ${payTo}`,
        qr_payload: qrPayload,
      })

      await supabase.from('accounts').update({
        balance: (account?.balance || 0) - amt,
        updated_at: new Date().toISOString(),
      }).eq('user_id', profile.id)

      await refreshAccount()
      await loadPayments()

      toast.success(`Paid ${formatINR(amt)} to ${payTo}! 💳`)
      setPayTo('')
      setAmount('')
      setDescription('')
      setQrPayload(null)
      setScanned(false)
    } catch (err) {
      toast.error('Payment failed. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-display font-900 text-gray-800 text-xl">Pay 💳</h2>

      {scanning ? (
        <div className="card">
          <h3 className="font-display font-800 text-gray-800 mb-4 text-center">Scan QR Code</h3>
          <QRScanner onScan={handleScan} onClose={() => setScanning(false)} />
        </div>
      ) : scanned ? (
        /* UPI-style post-scan: just enter amount */
        <div className="card space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-2">📷</div>
            <p className="font-display font-800 text-gray-800 text-lg">{payTo}</p>
            <p className="font-display text-gray-400 text-sm">QR scanned successfully</p>
          </div>

          <div>
            <label className="font-display font-700 text-gray-500 text-sm block mb-1">Enter Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-display font-800 text-gray-500 text-lg">₹</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="input-field pl-9 text-xl font-display font-800"
                autoFocus
              />
            </div>
          </div>

          <div className="flex gap-2">
            {[10, 20, 50, 100].map((a) => (
              <button key={a} onClick={() => setAmount(String(a))}
                className="flex-1 py-2 bg-gray-100 rounded-xl font-display font-700 text-gray-600 text-sm hover:bg-purple-100 hover:text-kidbank-purple transition-colors">
                ₹{a}
              </button>
            ))}
          </div>

          <div>
            <label className="font-display font-700 text-gray-500 text-sm block mb-1">Note (optional)</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Canteen lunch" className="input-field" />
          </div>

          <div className="flex justify-between text-sm">
            <span className="font-display text-gray-400">Balance</span>
            <span className="font-display font-700 text-gray-700">{formatINR(account?.balance || 0)}</span>
          </div>

          <button onClick={handlePay} disabled={!amount}
            className="w-full bg-gradient-to-r from-kidbank-purple to-kidbank-pink text-white font-display font-800 py-4 rounded-2xl active:scale-95 transition-all disabled:opacity-50 text-lg">
            Pay {amount ? formatINR(Number(amount)) : ''} 🚀
          </button>
          <button onClick={() => { setQrPayload(null); setPayTo(''); setAmount(''); setScanned(false) }}
            className="w-full text-gray-400 font-display font-700 text-sm py-2">
            Cancel
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={() => setScanning(true)}
            className="w-full bg-gradient-to-r from-kidbank-purple to-kidbank-pink text-white
                       font-display font-800 py-5 rounded-3xl shadow-lg active:scale-95 transition-all
                       flex items-center justify-center gap-3 text-lg"
          >
            <span className="text-3xl">📷</span>
            Scan QR to Pay
          </button>

          <div className="card space-y-3">
            <h3 className="font-display font-800 text-gray-800">Pay Manually</h3>

            <div>
              <label className="font-display font-700 text-gray-500 text-sm block mb-1">Pay to</label>
              <input type="text" value={payTo} onChange={(e) => setPayTo(e.target.value)}
                placeholder="Enter name" className="input-field" />
            </div>

            <div>
              <label className="font-display font-700 text-gray-500 text-sm block mb-1">Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-display font-700 text-gray-400">₹</span>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00" className="input-field pl-8" />
              </div>
            </div>

            <div className="flex gap-2">
              {[10, 20, 50, 100].map((a) => (
                <button key={a} onClick={() => setAmount(String(a))}
                  className="flex-1 py-2 bg-gray-100 rounded-xl font-display font-700 text-gray-600 text-sm hover:bg-purple-100 hover:text-kidbank-purple transition-colors">
                  ₹{a}
                </button>
              ))}
            </div>

            <div>
              <label className="font-display font-700 text-gray-500 text-sm block mb-1">Note (optional)</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Canteen lunch" className="input-field" />
            </div>

            <div className="flex justify-between text-sm">
              <span className="font-display text-gray-400">Your balance</span>
              <span className="font-display font-700 text-gray-700">{formatINR(account?.balance || 0)}</span>
            </div>

            <button onClick={handlePay} disabled={submitting || !payTo || !amount}
              className="w-full bg-kidbank-purple text-white font-display font-800 py-4 rounded-2xl active:scale-95 transition-all disabled:opacity-50 text-lg">
              {submitting ? 'Processing…' : `Pay ${amount ? formatINR(Number(amount)) : ''} 🚀`}
            </button>
          </div>
        </>
      )}

      {/* Recent payments */}
      {recentPayments.length > 0 && !scanning && (
        <div className="card">
          <h3 className="font-display font-800 text-gray-800 mb-3">Recent Payments</h3>
          <div className="space-y-3">
            {recentPayments.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center text-lg">💳</div>
                <div className="flex-1">
                  <p className="font-display font-700 text-gray-800 text-sm truncate">
                    {p.description || 'Payment'}
                  </p>
                  <p className="font-body text-gray-400 text-xs">{timeAgo(p.created_at)}</p>
                </div>
                <p className="font-display font-800 text-red-500 text-sm">-{formatINR(p.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
