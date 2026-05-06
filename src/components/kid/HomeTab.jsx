import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import useStore from '../../store/useStore'
import TransactionList from '../shared/TransactionList'
import { formatINR, formatPercent, timeAgo } from '../../lib/formatCurrency'
import { getPortfolioValue, getPortfolioCost } from '../../lib/stockHelpers'

const AVATARS = ['🦁', '🐯', '🦊', '🐼', '🦝', '🐸', '🦄', '🐧']

function getAvatar(name) {
  if (!name) return '🦁'
  const idx = name.charCodeAt(0) % AVATARS.length
  return AVATARS[idx]
}

function OnboardingCard() {
  return (
    <div className="mx-4 mb-4 bg-gradient-to-br from-kidbank-purple to-purple-400 rounded-3xl p-5 text-white">
      <div className="text-4xl mb-3">👋</div>
      <h2 className="font-display font-900 text-xl mb-1">Welcome to MuSo!</h2>
      <p className="font-display font-700 text-white/80 text-sm mb-4">
        Your financial journey starts here! Ask your admin to add some money so you can start saving, investing, and learning about money. 🚀
      </p>
      <div className="flex gap-3 text-sm">
        <div className="bg-white/20 rounded-xl p-2 text-center flex-1">
          <div className="text-2xl">💰</div>
          <p className="font-display font-700 text-xs mt-1">Save Money</p>
        </div>
        <div className="bg-white/20 rounded-xl p-2 text-center flex-1">
          <div className="text-2xl">📈</div>
          <p className="font-display font-700 text-xs mt-1">Invest Stocks</p>
        </div>
        <div className="bg-white/20 rounded-xl p-2 text-center flex-1">
          <div className="text-2xl">🎯</div>
          <p className="font-display font-700 text-xs mt-1">Set Goals</p>
        </div>
      </div>
    </div>
  )
}

export default function HomeTab() {
  const { profile, account, stocks } = useStore()
  const [transactions, setTransactions] = useState([])
  const [portfolio, setPortfolio] = useState([])
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    loadData()
  }, [profile])

  const loadData = async () => {
    const [txResult, portResult, commentsResult] = await Promise.all([
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('portfolio')
        .select('*')
        .eq('user_id', profile.id)
        .gt('quantity', 0),
      supabase
        .from('kid_comments')
        .select('*')
        .eq('kid_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    setTransactions(txResult.data || [])
    setPortfolio(portResult.data || [])
    setComments(commentsResult.data || [])
    setLoading(false)
  }

  const balance = account?.balance || 0
  const isNewUser = balance === 0 && transactions.length === 0

  const portfolioValue = getPortfolioValue(portfolio, stocks)
  const portfolioCost = getPortfolioCost(portfolio)
  const portfolioGain = portfolioValue - portfolioCost
  const portfolioGainPct = portfolioCost > 0 ? (portfolioGain / portfolioCost) * 100 : 0

  return (
    <div className="pb-4">
      {/* Hero gradient card */}
      <div className="bg-gradient-to-br from-kidbank-purple via-purple-600 to-kidbank-pink px-4 pt-6 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">
            {getAvatar(profile?.display_name)}
          </div>
          <div>
            <p className="font-display font-700 text-white/80 text-sm">Good day,</p>
            <p className="font-display font-900 text-white text-xl">{profile?.display_name}!</p>
          </div>
        </div>

        <div className="bg-white/10 rounded-3xl p-5 text-center backdrop-blur-sm">
          <p className="font-display font-700 text-white/70 text-xs uppercase tracking-widest mb-1">
            Total Balance
          </p>
          <p className="font-display font-900 text-white text-4xl drop-shadow">
            {formatINR(balance)}
          </p>
        </div>
      </div>

      {/* Portfolio summary strip */}
      {portfolio.length > 0 && (
        <div className="mx-4 -mt-4 bg-white rounded-3xl shadow-sm border border-gray-100 p-4 flex gap-4">
          <div className="flex-1 text-center border-r border-gray-100">
            <p className="font-display font-700 text-gray-400 text-xs mb-0.5">Invested</p>
            <p className="font-display font-800 text-gray-800">{formatINR(portfolioCost, { compact: true })}</p>
          </div>
          <div className="flex-1 text-center border-r border-gray-100">
            <p className="font-display font-700 text-gray-400 text-xs mb-0.5">Current Value</p>
            <p className="font-display font-800 text-gray-800">{formatINR(portfolioValue, { compact: true })}</p>
          </div>
          <div className="flex-1 text-center">
            <p className="font-display font-700 text-gray-400 text-xs mb-0.5">Gain/Loss</p>
            <p className={`font-display font-800 text-sm ${portfolioGain >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {formatPercent(portfolioGainPct)}
            </p>
          </div>
        </div>
      )}

      {/* Admin suggestions */}
      {comments.length > 0 && (
        <div className="mx-4 mt-4">
          <h3 className="font-display font-800 text-gray-800 text-lg mb-3">💬 Suggestions from Admin</h3>
          <div className="space-y-2">
            {comments.map((c) => (
              <div key={c.id} className="bg-purple-50 rounded-2xl p-3 border-l-4 border-kidbank-purple">
                <p className="font-display font-700 text-gray-700 text-sm">{c.comment}</p>
                <p className="font-display text-gray-400 text-xs mt-1">{timeAgo(c.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Onboarding or transactions */}
      <div className="mt-4">
        {isNewUser ? (
          <OnboardingCard />
        ) : (
          <div className="mx-4">
            <h3 className="font-display font-800 text-gray-800 text-lg mb-3">Recent Activity</h3>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 px-4">
              <TransactionList transactions={transactions} loading={loading} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
