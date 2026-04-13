'use client'

import { useState, useEffect } from 'react'
import { Search, X, User, Phone } from 'lucide-react'
import { searchPatients } from '@/lib/patientSearch'

interface ManualPatientSearchProps {
  onPatientSelect: (patient: { id: string; name: string; phone: string }) => void
  placeholder?: string
}

export default function ManualPatientSearch({ onPatientSelect, placeholder = 'Search by Name or Phone...' }: ManualPatientSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    if (searchQuery.length < 2) {
      setResults([])
      setShowResults(false)
      return
    }

    const performSearch = async () => {
      setIsSearching(true)
      const searchResults = await searchPatients(searchQuery)
      setResults(searchResults)
      setShowResults(true)
      setIsSearching(false)
    }

    const timer = setTimeout(performSearch, 300) // Debounce
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleSelect = (patient: any) => {
    onPatientSelect({
      id: patient.id,
      name: `${patient.firstName} ${patient.lastName}`,
      phone: patient.phone,
    })
    setSearchQuery('')
    setShowResults(false)
  }

  const handleClear = () => {
    setSearchQuery('')
    setResults([])
    setShowResults(false)
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 bg-slate-900/50 border border-slate-800/50 rounded-lg text-primary placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all text-sm"
        />
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute z-50 w-full mt-2 bg-slate-900 border border-slate-800/50 rounded-lg shadow-xl max-h-64 overflow-y-auto">
          {isSearching ? (
            <div className="p-4 text-center text-secondary text-sm">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-secondary text-sm">No patients found</div>
          ) : (
            <div className="py-2">
              {results.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => handleSelect(patient)}
                  className="w-full px-4 py-3 text-left hover:bg-slate-800/50 transition-colors border-b border-slate-800/30 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <User size={18} className="text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary truncate">
                        {patient.firstName} {patient.lastName}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Phone size={12} className="text-secondary" />
                        <p className="text-xs text-secondary">{patient.phone}</p>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

