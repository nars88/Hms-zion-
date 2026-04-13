'use client'

import { useState, useEffect } from 'react'
import { Search, Calendar, CreditCard, Banknote, FileText, DollarSign } from 'lucide-react'

interface Transaction {
  id: string
  receiptId: string
  patientName: string
  patientId: string
  visitId: string
  amount: number
  paymentMethod: 'Cash' | 'Card'
  date: string
  status: 'Paid'
}

// Mock data - In production, fetch from database
const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 't1',
    receiptId: 'ZM-1704123456789',
    patientName: 'John Doe',
    patientId: 'PT-001',
    visitId: 'V-2024-001',
    amount: 125.50,
    paymentMethod: 'Cash',
    date: new Date().toISOString(),
    status: 'Paid',
  },
  {
    id: 't2',
    receiptId: 'ZM-1704123456788',
    patientName: 'Jane Smith',
    patientId: 'PT-002',
    visitId: 'V-2024-002',
    amount: 89.75,
    paymentMethod: 'Card',
    date: new Date(Date.now() - 3600000).toISOString(),
    status: 'Paid',
  },
  {
    id: 't3',
    receiptId: 'ZM-1704123456787',
    patientName: 'Robert Johnson',
    patientId: 'PT-003',
    visitId: 'V-2024-003',
    amount: 156.25,
    paymentMethod: 'Cash',
    date: new Date(Date.now() - 7200000).toISOString(),
    status: 'Paid',
  },
]

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMethod, setFilterMethod] = useState<'All' | 'Cash' | 'Card'>('All')

  // Filter transactions
  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.visitId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.receiptId.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesMethod = filterMethod === 'All' || transaction.paymentMethod === filterMethod

    return matchesSearch && matchesMethod
  })

  const totalRevenue = filteredTransactions.reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-xl border border-slate-800/50 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-secondary">Total Revenue</p>
            <DollarSign size={18} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">${totalRevenue.toFixed(2)}</p>
          <p className="text-xs text-slate-600 mt-1">{filteredTransactions.length} transactions</p>
        </div>

        <div className="glass rounded-xl border border-slate-800/50 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-secondary">Cash Payments</p>
            <Banknote size={18} className="text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-blue-400">
            ${filteredTransactions.filter(t => t.paymentMethod === 'Cash').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
          </p>
          <p className="text-xs text-slate-600 mt-1">
            {filteredTransactions.filter(t => t.paymentMethod === 'Cash').length} transactions
          </p>
        </div>

        <div className="glass rounded-xl border border-slate-800/50 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-secondary">Card Payments</p>
            <CreditCard size={18} className="text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-purple-400">
            ${filteredTransactions.filter(t => t.paymentMethod === 'Card').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
          </p>
          <p className="text-xs text-slate-600 mt-1">
            {filteredTransactions.filter(t => t.paymentMethod === 'Card').length} transactions
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="glass rounded-xl border border-slate-800/50 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Name, ID, or Receipt..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/30 border border-slate-800/50 rounded-lg text-sm text-primary placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
            />
          </div>

          {/* Payment Method Filter */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterMethod('All')}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                filterMethod === 'All'
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'bg-slate-900/30 text-secondary border border-slate-800/50 hover:border-slate-700/50'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterMethod('Cash')}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                filterMethod === 'Cash'
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'bg-slate-900/30 text-secondary border border-slate-800/50 hover:border-slate-700/50'
              }`}
            >
              Cash
            </button>
            <button
              onClick={() => setFilterMethod('Card')}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                filterMethod === 'Card'
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'bg-slate-900/30 text-secondary border border-slate-800/50 hover:border-slate-700/50'
              }`}
            >
              Card
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass rounded-xl border border-slate-800/50 overflow-hidden">
        <div className="p-6 border-b border-slate-800/50">
          <h3 className="text-lg font-semibold text-primary">Recent Transactions</h3>
        </div>

        <div className="overflow-x-auto">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto mb-4 text-slate-600" />
              <p className="text-sm text-secondary">No transactions found</p>
              {searchQuery && (
                <p className="text-xs text-slate-600 mt-1">Try a different search term</p>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-900/30 border-b border-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wide">
                    Receipt ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wide">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wide">
                    Visit ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wide">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wide">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wide">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wide">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredTransactions.map((transaction) => {
                  const date = new Date(transaction.date)
                  const formattedDate = date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                  const formattedTime = date.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  return (
                    <tr key={transaction.id} className="hover:bg-slate-900/20 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-primary">{transaction.receiptId}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-primary">{transaction.patientName}</p>
                        <p className="text-xs text-secondary">{transaction.patientId}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-primary">{transaction.visitId}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-emerald-400">${transaction.amount.toFixed(2)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {transaction.paymentMethod === 'Cash' ? (
                            <Banknote size={16} className="text-blue-400" />
                          ) : (
                            <CreditCard size={16} className="text-purple-400" />
                          )}
                          <span className="text-sm text-secondary">{transaction.paymentMethod}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-slate-500" />
                          <div>
                            <p className="text-sm text-primary">{formattedDate}</p>
                            <p className="text-xs text-secondary">{formattedTime}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-xs text-emerald-400 font-medium">
                          {transaction.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

