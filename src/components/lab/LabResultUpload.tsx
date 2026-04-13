'use client'

import { useState } from 'react'
import { useLabResults } from '@/contexts/LabResultsContext'
import { useAuth } from '@/contexts/AuthContext'
import { Upload, CheckCircle, FlaskConical, Printer, Trash2 } from 'lucide-react'
import { getServicePrice, mapTestToServiceType, getDefaultPrice } from '@/lib/priceService'
import { printMedicalReport } from '@/lib/medicalReportPrint'

interface LabResultUploadProps {
  request: any
  onResultUploaded: () => void
}

export default function LabResultUpload({ request, onResultUploaded }: LabResultUploadProps) {
  const { updateLabResult } = useLabResults()
  const { user } = useAuth()
  const [result, setResult] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  const handleUpload = async () => {
    if (!result.trim()) {
      alert('Please enter a lab result')
      return
    }

    if (!request || !user) {
      alert('Missing request or user information')
      return
    }

    setIsUploading(true)

    try {
      // Get price from Admin Price Settings
      const serviceType = mapTestToServiceType(request.testType, request.department === 'Radiology' ? 'Radiology' : 'Lab')
      const priceInfo = await getServicePrice(serviceType)
      const price = priceInfo?.price || getDefaultPrice(serviceType)
      const serviceName = priceInfo?.serviceName || request.testType

      // Add to invoice via API
      await fetch('/api/billing/invoice/add-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId: request.visitId,
          patientId: request.patientId,
          department: request.department === 'Radiology' ? 'Radiology' : 'Laboratory',
          description: `${request.department === 'Radiology' ? 'Radiology' : 'Lab'} Fee: ${serviceName}`,
          quantity: 1,
          unitPrice: price,
          total: price,
          addedBy: user.id,
        }),
      })

      // Update lab result
      updateLabResult(request.id, result, user.id)

      setIsUploading(false)
      onResultUploaded()
      
      // Show success message
      alert(`✅ Lab result uploaded successfully!\n\n${serviceName} - ${price.toLocaleString()} IQD added to invoice.`)
    } catch (error: any) {
      console.error('Error uploading lab result:', error)
      alert(`❌ Error: ${error.message || 'Failed to upload result'}`)
      setIsUploading(false)
    }
  }

  if (!request) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <FlaskConical size={64} className="mx-auto mb-4 text-slate-600" />
          <h3 className="text-lg font-semibold text-primary mb-2">No Request Selected</h3>
          <p className="text-sm text-secondary">
            Select a lab request from the list to upload results
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-8">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-primary mb-1">Upload Lab Result</h2>
            <p className="text-sm text-secondary">Patient: {request.patientName}</p>
          </div>
          <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-xs text-secondary">Request ID</p>
            <p className="text-sm font-semibold text-amber-400">{request.id}</p>
          </div>
        </div>

        {/* Request Details */}
        <div className="glass rounded-xl border border-slate-800/50 overflow-hidden">
          <div className="p-6 border-b border-slate-800/50">
            <h3 className="text-lg font-semibold text-primary">Request Information</h3>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-secondary mb-1">Patient Name</p>
                <p className="text-sm font-medium text-primary">{request.patientName}</p>
              </div>
              <div>
                <p className="text-xs text-secondary mb-1">Test Type</p>
                <p className="text-sm font-medium text-primary">{request.testType}</p>
              </div>
              <div>
                <p className="text-xs text-secondary mb-1">Visit ID</p>
                <p className="text-sm font-medium text-primary">{request.visitId}</p>
              </div>
              <div>
                <p className="text-xs text-secondary mb-1">Requested At</p>
                <p className="text-sm font-medium text-primary">
                  {new Date(request.requestedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Result Input */}
        <div className="glass rounded-xl border border-slate-800/50 overflow-hidden">
          <div className="p-6 border-b border-slate-800/50">
            <h3 className="text-lg font-semibold text-primary">Lab Result</h3>
            <p className="text-xs text-secondary mt-1">Enter the test result (e.g., &apos;Normal&apos;, &apos;High Glucose&apos;)</p>
          </div>

          <div className="p-6">
            <textarea
              value={result}
              onChange={(e) => setResult(e.target.value)}
              placeholder="Enter lab result here... (e.g., Normal, High Glucose, Elevated WBC count)"
              rows={6}
              className="w-full px-4 py-3 bg-slate-900/30 border border-slate-800/50 rounded-lg text-primary placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all resize-none"
            />
            
            <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
              <p className="text-xs text-amber-400">
                💡 Tip: Be specific and clear. Examples: &quot;Normal&quot;, &quot;High Glucose (180 mg/dL)&quot;, &quot;Elevated WBC count&quot;
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end">
          <button
            onClick={handleUpload}
            disabled={isUploading || !result.trim()}
            className="px-6 py-3 bg-amber-500/10 text-amber-400 border-2 border-amber-500/30 rounded-lg font-semibold hover:bg-amber-500/15 hover:border-amber-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-amber-400 border-t-transparent"></div>
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload size={18} />
                <span>Upload Result</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

