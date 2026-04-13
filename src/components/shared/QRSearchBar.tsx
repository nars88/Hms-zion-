'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, QrCode } from 'lucide-react'
import { useQRScanner } from '@/contexts/QRScannerContext'

interface QRSearchBarProps {
  placeholder?: string
  onSearch?: (value: string) => void
  autoFocus?: boolean
  className?: string
  showHelper?: boolean
}

export default function QRSearchBar({
  placeholder = 'Search Patient or Scan QR Code',
  onSearch,
  autoFocus = true,
  className = '',
  showHelper = true,
}: QRSearchBarProps) {
  const [searchValue, setSearchValue] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { lastScannedId, isScanning: scannerActive } = useQRScanner()

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  // Display scanned ID in search bar
  useEffect(() => {
    if (lastScannedId) {
      setSearchValue(lastScannedId)
      setIsScanning(true)
      
      // Clear after showing for a moment
      setTimeout(() => {
        setSearchValue('')
        setIsScanning(false)
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 1500) // Show for 1.5 seconds
    }
  }, [lastScannedId])

  // Sync with scanner active state
  useEffect(() => {
    if (scannerActive) {
      setIsScanning(true)
    } else {
      setTimeout(() => setIsScanning(false), 500)
    }
  }, [scannerActive])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchValue(value)
    if (onSearch) {
      onSearch(value)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchValue.trim()) {
      if (onSearch) {
        onSearch(searchValue.trim())
      }
    }
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        {/* Search Icon */}
        <Search
          className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${
            isScanning ? 'text-cyan-400' : 'text-slate-400'
          }`}
        />
        
        {/* QR Icon */}
        <QrCode
          className={`absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-all ${
            isScanning
              ? 'text-cyan-400 animate-pulse'
              : 'text-slate-500 opacity-50'
          }`}
        />

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={searchValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full pl-12 pr-12 py-3 bg-slate-900/50 border-2 rounded-lg text-primary placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
            isScanning
              ? 'border-cyan-500/50 focus:border-cyan-500 focus:ring-cyan-500/20 bg-cyan-500/5'
              : 'border-slate-800/50 focus:border-slate-700 focus:ring-slate-700/20'
          } ${className}`}
          autoFocus={autoFocus}
        />

        {/* Scanning Indicator */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-cyan-500/10 rounded-lg animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="flex items-center gap-2 px-3 py-1 bg-cyan-500/20 border border-cyan-500/40 rounded-full">
                <div className="h-2 w-2 bg-cyan-400 rounded-full animate-pulse" />
                <span className="text-xs font-semibold text-cyan-300">
                  Scanning...
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Helper Text (optional) */}
      {showHelper && (
        <p className="mt-2 text-xs text-slate-500 text-center">
          {isScanning
            ? 'QR Code detected! Redirecting...'
            : 'Type to search or scan QR code with USB scanner'}
        </p>
      )}
    </div>
  )
}

