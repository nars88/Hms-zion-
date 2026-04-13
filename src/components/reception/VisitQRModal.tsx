'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Printer, X, QrCode } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

interface VisitQRModalProps {
  visitId: string
  patientName: string
  patientId?: string
  doctorName: string
  department?: string
  appointmentDate: string
  appointmentTime: string
  queueNumber?: number
  onClose: () => void
  onDone: () => void
}

export default function VisitQRModal({
  visitId,
  patientName,
  patientId,
  doctorName,
  department,
  appointmentDate,
  appointmentTime,
  queueNumber,
  onClose,
  onDone,
}: VisitQRModalProps) {
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(true)

  useEffect(() => {
    // Hide animation after 2 seconds
    const timer = setTimeout(() => {
      setShowSuccessAnimation(false)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  // Format date for display
  const formattedDate = new Date(appointmentDate).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  // QR Code data - encodes Visit ID
  const qrCodeData = JSON.stringify({
    visitId,
    patientName,
    patientId: patientId || undefined,
    doctorName,
    department: department || undefined,
    appointmentDate,
    appointmentTime,
    type: 'ZION_VISIT_TICKET',
  })

  const handlePrint = () => {
    // Create print window
    const printWindow = window.open('', '_blank', 'width=300,height=600')
    if (!printWindow) return

    // Get QR code SVG from the modal
    const qrSvg = document.querySelector('.qr-print-target svg')
    const qrSvgString = qrSvg ? qrSvg.outerHTML : ''

    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <title>ZION Hospital - Patient Ticket</title>
  <style>
    @media print {
      @page {
        size: 80mm auto;
        margin: 5mm;
      }
      body {
        margin: 0;
        padding: 0;
      }
    }
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      padding: 10px;
      max-width: 70mm;
      margin: 0 auto;
      background: white;
      color: black;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .hospital-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 5px;
      letter-spacing: 1px;
    }
    .subtitle {
      font-size: 10px;
      color: #666;
    }
    .qr-container {
      text-align: center;
      margin: 15px 0;
      padding: 10px;
      border: 1px dashed #000;
    }
    .qr-code {
      display: inline-block;
      padding: 5px;
      background: white;
    }
    .info-section {
      margin: 15px 0;
      padding: 10px 0;
      border-top: 1px solid #ddd;
      border-bottom: 1px solid #ddd;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin: 8px 0;
      font-size: 11px;
    }
    .info-label {
      font-weight: bold;
      color: #333;
    }
    .info-value {
      text-align: right;
      color: #000;
    }
    .visit-id {
      font-family: 'Courier New', monospace;
      font-size: 14px;
      font-weight: bold;
      letter-spacing: 1px;
      text-align: center;
      margin: 10px 0;
      padding: 8px;
      background: #f0f0f0;
      border: 1px solid #000;
    }
    .queue-number {
      text-align: center;
      font-size: 24px;
      font-weight: bold;
      margin: 15px 0;
      padding: 10px;
      background: #000;
      color: white;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #ddd;
      font-size: 9px;
      color: #666;
    }
    .instructions {
      margin-top: 15px;
      padding: 10px;
      background: #f9f9f9;
      border: 1px solid #ddd;
      font-size: 10px;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="hospital-name">ZION HOSPITAL</div>
    <div class="subtitle">Patient Visit Ticket</div>
  </div>

  <div class="visit-id">${visitId}</div>

  ${queueNumber ? `<div class="queue-number">Queue #${queueNumber}</div>` : ''}

  <div class="qr-container">
    <div class="qr-code">
      ${qrSvgString || '<p>QR Code</p>'}
    </div>
  </div>

  <div class="info-section">
    <div class="info-row">
      <span class="info-label">Patient:</span>
      <span class="info-value">${patientName}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Doctor:</span>
      <span class="info-value">${doctorName}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Date:</span>
      <span class="info-value">${formattedDate}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Time:</span>
      <span class="info-value">${appointmentTime}</span>
    </div>
  </div>

  <div class="instructions">
    <strong>Instructions:</strong><br>
    • Present this ticket at reception<br>
    • Keep your QR code visible<br>
    • Arrive 10 minutes before appointment
  </div>

  <div class="footer">
    <div>ZION HOSPITAL</div>
    <div>Generated: ${new Date().toLocaleString('en-US')}</div>
    <div>Thank you for choosing ZION</div>
  </div>
</body>
</html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()

    // Wait for QR code to render, then print
    setTimeout(() => {
      // Create a canvas to render QR code
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // We'll use a simple approach: embed the QR as an image
      // For now, we'll use a data URL approach
      printWindow.document.body.innerHTML = printContent.replace(
        '<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150">',
        `<img src="data:image/svg+xml;base64,${btoa(`
          <svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150">
            <!-- QR Code SVG will be generated here -->
          </svg>
        `)}" width="150" height="150" />`
      )

      printWindow.focus()
      printWindow.print()
      printWindow.close()
    }, 500)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass rounded-2xl border border-slate-800/50 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden bg-[#0f172a]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800/50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <QrCode size={24} className="text-cyan-400" />
            <h2 className="text-xl font-bold text-primary">Visit Ticket</h2>
          </div>
          <button
            onClick={onClose}
            className="text-secondary hover:text-primary text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800/50 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Success Animation */}
          {showSuccessAnimation && (
            <div className="flex flex-col items-center justify-center py-8 mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping"></div>
                <div className="relative bg-emerald-500/20 rounded-full p-4">
                  <CheckCircle size={64} className="text-emerald-400" />
                </div>
              </div>
              <p className="text-lg font-semibold text-emerald-400 mt-4">Appointment Confirmed!</p>
            </div>
          )}

          {/* QR Code Section */}
          <div className="bg-white rounded-xl p-6 flex flex-col items-center mb-6">
            <p className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">
              Visit Identity QR Code
            </p>
            <div className="qr-print-target p-4 bg-white rounded-lg border-2 border-slate-200">
              <QRCodeSVG
                value={qrCodeData}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>
            <p className="text-xs text-slate-500 mt-3 text-center max-w-xs">
              Scan this QR code at reception or during your visit
            </p>
          </div>

          {/* Visit ID */}
          <div className="bg-slate-900/50 rounded-xl p-4 mb-6 border border-slate-700/50">
            <p className="text-xs text-slate-400 mb-2">Visit ID</p>
            <p className="text-lg font-mono font-bold text-cyan-400 text-center tracking-wider">
              {visitId}
            </p>
          </div>

          {/* Appointment Summary */}
          <div className="bg-slate-900/50 rounded-xl p-6 mb-6 border border-slate-700/50">
            <h3 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-400" />
              Appointment Details
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-xs text-slate-400">Patient Name:</span>
                <span className="text-sm font-semibold text-primary text-right">{patientName}</span>
              </div>
              {patientId ? (
                <div className="flex justify-between items-start">
                  <span className="text-xs text-slate-400">Patient ID:</span>
                  <span className="text-sm font-semibold text-primary text-right font-mono">{patientId}</span>
                </div>
              ) : null}
              <div className="flex justify-between items-start">
                <span className="text-xs text-slate-400">Doctor:</span>
                <span className="text-sm font-semibold text-primary text-right">{doctorName}</span>
              </div>
              {department ? (
                <div className="flex justify-between items-start">
                  <span className="text-xs text-slate-400">Department:</span>
                  <span className="text-sm font-semibold text-primary text-right">{department}</span>
                </div>
              ) : null}
              <div className="flex justify-between items-start">
                <span className="text-xs text-slate-400">Date:</span>
                <span className="text-sm font-semibold text-primary text-right">{formattedDate}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-xs text-slate-400">Time:</span>
                <span className="text-sm font-semibold text-primary text-right">{appointmentTime}</span>
              </div>
              {queueNumber && (
                <div className="flex justify-between items-start pt-2 border-t border-slate-700/50">
                  <span className="text-xs text-slate-400">Queue Number:</span>
                  <span className="text-lg font-bold text-cyan-400">#{queueNumber}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 p-6 pt-4 border-t border-slate-800/50 bg-slate-900/30 space-y-3">
          <button
            onClick={handlePrint}
            className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold hover:from-cyan-600 hover:to-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-cyan-500/20"
          >
            <Printer size={20} />
            <span>Print Patient Ticket</span>
          </button>
          <button
            onClick={onDone}
            className="w-full px-6 py-3 bg-slate-800/50 text-slate-300 border border-slate-700/50 rounded-xl font-semibold hover:bg-slate-700/50 hover:text-slate-100 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

