import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatINR, timeAgo } from '../../lib/formatCurrency'
import TransactionList from '../shared/TransactionList'
import toast from 'react-hot-toast'

function CreateKidModal({ onClose, onCreated }) {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!username.trim() || !displayName.trim() || !password) {
      toast.error('Fill all fields')
      return
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('create_kid_account', {
        p_username: username.trim().toLowerCase(),
        p_display_name: displayName.trim(),
        p_password: password,
      })

      if (error) throw error

      toast.success(`Account created for ${displayName}! 🎉`)
      onCreated()
      onClose()
    } catch (err) {
      toast.error(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-800 text-gray-800 text-xl">New Kid Account</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block font-display font-700 text-gray-500 text-sm mb-1">Display Name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Arjun Kumar"
              className="input-field"
            />
          </div>
          <div>
            <label className="block font-display font-700 text-gray-500 text-sm mb-1">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
              placeholder="e.g. arjun123"
              className="input-field"
              autoCapitalize="none"
            />
          </div>
          <div>
            <label className="block font-display font-700 text-gray-500 text-sm mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="input-field"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={handleCreate} disabled={loading} className="flex-1 btn-primary">
            {loading ? 'Creating…' : 'Create Account'}
          </button>
          <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  )
}

function KidProfileModal({ kid, onClose, onUpdate }) {
  const [transactions, setTransactions] = useState([])
  const [portfolio, setPortfolio] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(null) // 'freeze' | 'reset' | 'delete'

  useEffect(() => {
    Promise.all([
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', kid.id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('portfolio')
        .select('*, stocks(company_name, ticker, current_price)')
        .eq('user_id', kid.id)
        .gt('quantity', 0),
    ]).then(([txRes, portRes]) => {
      setTransactions(txRes.data || [])
      setPortfolio(portRes.data || [])
      setLoading(false)
    })
  }, [kid.id])

  const handleFreeze = async () => {
    await supabase.from('users').update({ is_frozen: !kid.is_frozen }).eq('id', kid.id)
    toast.success(kid.is_frozen ? 'Account unfrozen ✅' : 'Account frozen 🧊')
    onUpdate()
    onClose()
  }

  const handleReset = async () => {
    await supabase.from('accounts').update({ balance: 0 }).eq('user_id', kid.id)
    await supabase.from('portfolio').delete().eq('user_id', kid.id)
    await supabase.from('fixed_deposits').delete().eq('user_id', kid.id)
    await supabase.from('recurring_deposits').delete().eq('user_id', kid.id)
    await supabase.from('savings_goals').delete().eq('user_id', kid.id)
    await supabase.from('transactions').insert({
      user_id: kid.id,
      type: 'withdrawal',
      amount: 0,
      description: 'Account reset by admin',
    })
    toast.success('Account reset! 🔄')
    onUpdate()
    onClose()
  }

  const handleDelete = async () => {
    await supabase.from('portfolio').delete().eq('user_id', kid.id)
    await supabase.from('transactions').delete().eq('user_id', kid.id)
    await supabase.from('fixed_deposits').delete().eq('user_id', kid.id)
    await supabase.from('recurring_deposits').delete().eq('user_id', kid.id)
    await supabase.from('savings_goals').delete().eq('user_id', kid.id)
    await supabase.from('accounts').delete().eq('user_id', kid.id)
    await supabase.from('users').delete().eq('id', kid.id)
    toast.success('Account deleted')
    onUpdate()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
      <div className="bg-white rounded-t-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between rounded-t-3xl">
          <div>
            <h2 className="font-display font-800 text-gray-800">{kid.display_name}</h2>
            <p className="font-display text-gray-400 text-sm">@{kid.username} · {formatINR(kid.balance)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setConfirming('freeze')}
              className={`py-2.5 rounded-2xl font-display font-700 text-sm ${kid.is_frozen ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}
            >
              {kid.is_frozen ? '✅ Unfreeze' : '🧊 Freeze'}
            </button>
            <button
              onClick={() => setConfirming('reset')}
              className="py-2.5 rounded-2xl font-display font-700 text-sm bg-yellow-100 text-yellow-700"
            >
              🔄 Reset
            </button>
            <button
              onClick={() => setConfirming('delete')}
              className="py-2.5 rounded-2xl font-display font-700 text-sm bg-red-100 text-red-700"
            >
              🗑️ Delete
            </button>
          </div>

          {/* Confirm dialog */}
          {confirming && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="font-display font-700 text-red-800 mb-3">
                {confirming === 'freeze' && (kid.is_frozen ? 'Unfreeze this account?' : 'Freeze this account?')}
                {confirming === 'reset' && 'Reset account? This will zero the balance and clear all investments.'}
                {confirming === 'delete' && 'Permanently delete this account? This cannot be undone!'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={confirming === 'freeze' ? handleFreeze : confirming === 'reset' ? handleReset : handleDelete}
                  className="flex-1 bg-red-500 text-white font-display font-700 py-2 rounded-xl text-sm"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirming(null)}
                  className="flex-1 bg-gray-200 text-gray-700 font-display font-700 py-2 rounded-xl text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Portfolio */}
          {portfolio.length > 0 && (
            <div>
              <h3 className="font-display font-800 text-gray-700 mb-2">Portfolio</h3>
              <div className="space-y-2">
                {portfolio.map((h) => (
                  <div key={h.id} className="bg-gray-50 rounded-2xl p-3 flex justify-between text-sm">
                    <div>
                      <span className="font-display font-700 text-gray-800">{h.stocks?.company_name}</span>
                      <span className="ml-2 font-display text-gray-400">{h.stocks?.ticker}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-700 text-gray-700">{h.quantity} units</p>
                      <p className="font-display text-gray-400 text-xs">
                        {formatINR((h.stocks?.current_price || 0) * h.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Report Card */}
          <div className="bg-purple-50 rounded-2xl p-4">
            <h3 className="font-display font-800 text-gray-700 mb-3">📋 Financial Report Card</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="font-display font-900 text-2xl text-kidbank-purple">{portfolio.length}</p>
                <p className="font-display font-700 text-gray-500 text-xs">Stocks Owned</p>
              </div>
              <div>
                <p className="font-display font-900 text-2xl text-kidbank-purple">{transactions.length}</p>
                <p className="font-display font-700 text-gray-500 text-xs">Transactions</p>
              </div>
              <div>
                <p className="font-display font-900 text-2xl text-kidbank-purple">{formatINR(kid.balance, { compact: true })}</p>
                <p className="font-display font-700 text-gray-500 text-xs">Balance</p>
              </div>
            </div>
          </div>

          {/* Transactions */}
          <div>
            <h3 className="font-display font-800 text-gray-700 mb-2">Transaction History</h3>
            <div className="bg-white border border-gray-100 rounded-2xl px-3">
              <TransactionList transactions={transactions} loading={loading} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function KidsTab() {
  const [kids, setKids] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedKid, setSelectedKid] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadKids()
  }, [])

  const loadKids = async () => {
    const [kidsRes, accountsRes] = await Promise.all([
      supabase.from('users').select('*').eq('role', 'kid').order('created_at', { ascending: false }),
      supabase.from('accounts').select('user_id, balance'),
    ])

    const accounts = accountsRes.data || []
    const kidsWithBalance = (kidsRes.data || []).map((k) => ({
      ...k,
      balance: accounts.find((a) => a.user_id === k.id)?.balance || 0,
    }))

    setKids(kidsWithBalance)
    setLoading(false)
  }

  const filtered = kids.filter((k) =>
    k.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    k.username?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-900 text-2xl text-gray-800">Kids</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary py-2.5 px-4">
          + New Kid
        </button>
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search kids…"
        className="input-field"
      />

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-3xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-3">👧</div>
          <p className="font-display font-700 text-gray-400">No kids yet. Create one!</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((kid) => (
            <button
              key={kid.id}
              onClick={() => setSelectedKid(kid)}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 text-left hover:shadow-md transition-shadow w-full"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-2xl flex items-center justify-center font-display font-900 text-kidbank-purple">
                    {kid.display_name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-display font-800 text-gray-800">{kid.display_name}</p>
                    <p className="font-display text-gray-400 text-sm">@{kid.username}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display font-800 text-gray-800">{formatINR(kid.balance)}</p>
                  {kid.is_frozen && (
                    <span className="text-xs font-display font-700 text-blue-500">🧊 Frozen</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateKidModal onClose={() => setShowCreate(false)} onCreated={loadKids} />
      )}
      {selectedKid && (
        <KidProfileModal
          kid={selectedKid}
          onClose={() => setSelectedKid(null)}
          onUpdate={loadKids}
        />
      )}
    </div>
  )
}
