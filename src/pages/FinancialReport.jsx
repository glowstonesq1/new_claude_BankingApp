import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import useStore from '../store/useStore'
import { formatINR } from '../lib/formatCurrency'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, PieChart, Pie, Cell
} from 'recharts'

const INCOME_TYPES = ['deposit', 'interest_credit', 'investment_sell', 'fd_withdrawal', 'rd_withdrawal']
const INVEST_OUT_TYPES = ['investment_buy', 'fd_open', 'rd_installment']
const SPEND_TYPES = ['payment', 'withdrawal']

const PIE_COLORS = ['#7C3AED', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444']

function StatCard({ label, value, color }) {
  return (
    <div className={`rounded-2xl p-4 text-center ${color}`}>
      <p className="font-display font-700 text-xs uppercase tracking-wide opacity-70 mb-1">{label}</p>
      <p className="font-display font-900 text-xl">{value}</p>
    </div>
  )
}

export default function FinancialReport() {
  const { kidId } = useParams()
  const { profile, account } = useStore()
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState([])
  const [kidInfo, setKidInfo] = useState(null)
  const [loading, setLoading] = useState(true)

  const targetId = kidId || profile?.id

  useEffect(() => {
    if (!targetId) return
    loadReport()
  }, [targetId])

  const loadReport = async () => {
    const [txRes, infoRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', targetId)
        .order('created_at', { ascending: true }),
      kidId
        ? supabase.from('users').select('display_name, username').eq('id', targetId).single()
        : Promise.resolve({ data: null }),
    ])
    setTransactions(txRes.data || [])
    if (infoRes.data) setKidInfo(infoRes.data)
    setLoading(false)
  }

  const displayName = kidInfo?.display_name || profile?.display_name || 'Student'

  const { totalIncome, totalSpent, totalInvested, totalReturns, monthlyData, categoryData } = useMemo(() => {
    let income = 0, spent = 0, invested = 0, returns = 0
    const monthMap = {}
    const catMap = { Spending: 0, Investments: 0, 'FD/RD': 0 }

    transactions.forEach((tx) => {
      const d = new Date(tx.created_at)
      const key = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
      if (!monthMap[key]) monthMap[key] = { month: key, income: 0, spending: 0, investments: 0 }

      if (INCOME_TYPES.includes(tx.type)) {
        income += tx.amount
        monthMap[key].income += tx.amount
      } else if (SPEND_TYPES.includes(tx.type)) {
        spent += tx.amount
        monthMap[key].spending += tx.amount
        catMap['Spending'] += tx.amount
      } else if (INVEST_OUT_TYPES.includes(tx.type)) {
        invested += tx.amount
        monthMap[key].investments += tx.amount
        if (tx.type === 'investment_buy') catMap['Investments'] += tx.amount
        else catMap['FD/RD'] += tx.amount
      }
      if (tx.type === 'investment_sell') returns += tx.amount
    })

    return {
      totalIncome: income,
      totalSpent: spent,
      totalInvested: invested,
      totalReturns: returns,
      monthlyData: Object.values(monthMap).slice(-6),
      categoryData: Object.entries(catMap)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value })),
    }
  }, [transactions])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-5xl mb-3 animate-bounce">📊</div>
          <p className="font-display font-700 text-kidbank-purple">Loading report…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Screen-only header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10 print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="font-display font-700 text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Back
        </button>
        <h1 className="font-display font-900 text-gray-800 text-lg">Financial Journey 📊</h1>
        <button
          onClick={() => window.print()}
          className="bg-kidbank-purple text-white font-display font-700 px-4 py-2 rounded-xl text-sm active:scale-95 transition-all"
        >
          🖨️ Print / PDF
        </button>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block p-8 pb-4 text-center border-b border-gray-200">
        <img
          src="https://yt3.googleusercontent.com/NViANcNr_9xYoqoGY7if6hPZYIQ8cAD7Erxy1OoLBoCWDM-fI_13Gy37HNMDFKT8gfDdMWsv4Q=s900-c-k-c0x00ffffff-no-rj"
          alt="MuSo"
          className="w-16 h-16 rounded-2xl object-cover mx-auto mb-2"
        />
        <p className="font-display font-900 text-3xl text-kidbank-purple">MuSo</p>
        <h1 className="font-display font-900 text-2xl text-gray-800 mt-2">Financial Journey Report</h1>
        <p className="font-display font-700 text-gray-500 mt-1">
          {displayName} · Generated {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6 print:p-8 print:space-y-8">

        {/* Name badge */}
        <div className="bg-gradient-to-r from-kidbank-purple to-kidbank-pink rounded-3xl p-5 text-white print:rounded-2xl">
          <p className="font-display font-700 text-white/70 text-sm">Financial Summary for</p>
          <p className="font-display font-900 text-2xl">{displayName}</p>
          <p className="font-display font-700 text-white/70 text-sm mt-1">
            {transactions.length} total transactions
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total Received" value={formatINR(totalIncome)} color="bg-green-50 text-green-700" />
          <StatCard label="Total Spent" value={formatINR(totalSpent)} color="bg-red-50 text-red-700" />
          <StatCard label="Invested" value={formatINR(totalInvested)} color="bg-blue-50 text-blue-700" />
          <StatCard label="Returns" value={formatINR(totalReturns)} color="bg-purple-50 text-purple-700" />
        </div>

        {/* Monthly bar chart */}
        {monthlyData.length > 0 && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 print:border print:shadow-none">
            <h2 className="font-display font-800 text-gray-800 mb-4">Monthly Overview</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontFamily: 'Nunito', fontSize: 11 }} />
                <YAxis
                  tick={{ fontFamily: 'Nunito', fontSize: 10 }}
                  tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                  width={45}
                />
                <Tooltip
                  formatter={(v, name) => [formatINR(v), name]}
                  contentStyle={{ borderRadius: 12, fontFamily: 'Nunito', fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontFamily: 'Nunito', fontSize: 12 }} />
                <Bar dataKey="income" name="Income" fill="#22C55E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="spending" name="Spending" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="investments" name="Investments" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Category pie */}
        {categoryData.length > 0 && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 print:border print:shadow-none">
            <h2 className="font-display font-800 text-gray-800 mb-4">Where Your Money Goes</h2>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={160}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="value"
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ borderRadius: 12, fontFamily: 'Nunito', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {categoryData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <div>
                      <p className="font-display font-700 text-gray-700 text-sm">{item.name}</p>
                      <p className="font-display text-gray-400 text-xs">{formatINR(item.value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Transaction history */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 print:border print:shadow-none">
          <h2 className="font-display font-800 text-gray-800 mb-4">
            Transaction History ({transactions.length})
          </h2>
          <div className="space-y-1 max-h-80 overflow-auto print:max-h-none">
            {[...transactions].reverse().map((tx) => {
              const isCredit = INCOME_TYPES.includes(tx.type)
              return (
                <div key={tx.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="font-display font-700 text-gray-700 text-sm truncate">
                      {tx.description || tx.type}
                    </p>
                    <p className="font-display text-gray-400 text-xs">
                      {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <p className={`font-display font-800 text-sm flex-shrink-0 ${isCredit ? 'text-green-600' : 'text-red-500'}`}>
                    {isCredit ? '+' : '-'}{formatINR(tx.amount)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Print footer */}
        <div className="hidden print:block text-center pt-4 border-t border-gray-200">
          <p className="font-display text-gray-400 text-xs">
            MuSo · Financial Literacy Platform · Printed {new Date().toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page { margin: 1cm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  )
}
