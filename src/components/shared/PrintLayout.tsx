'use client'

import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useRef } from 'react'

interface PrintLayoutProps {
  title: string
  patientName: string
  patientId?: string
  visitId?: string
  date?: string
  children: React.ReactNode
  qrData?: string
  onPrintComplete?: () => void
}

export default function PrintLayout({
  title,
  patientName,
  patientId,
  visitId,
  date,
  children,
  qrData,
  onPrintComplete,
}: PrintLayoutProps) {
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Add print styles to document
    const style = document.createElement('style')
    style.textContent = `
      @media print {
        @page {
          size: A4;
          margin: 15mm;
        }
        body * {
          visibility: hidden;
        }
        .print-content, .print-content * {
          visibility: visible;
        }
        .print-content {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
        .no-print {
          display: none !important;
        }
        .print-only {
          display: block !important;
        }
      }
      @media screen {
        .print-only {
          display: none !important;
        }
      }
    `
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])

  const handlePrint = () => {
    if (!printRef.current) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const qrCodeData = qrData || JSON.stringify({
      patientName,
      patientId,
      visitId,
      date: date || new Date().toISOString(),
      title,
    })

    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <title>${title} - ${patientName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    @page {
      size: A4;
      margin: 15mm;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #000;
      background: white;
    }
    .print-header {
      border-bottom: 3px solid #1E40AF;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .hospital-name {
      font-size: 24pt;
      font-weight: 700;
      color: #1E40AF;
      letter-spacing: 1px;
      margin-bottom: 5px;
    }
    .hospital-subtitle {
      font-size: 9pt;
      color: #666;
      margin-bottom: 10px;
    }
    .document-title {
      font-size: 18pt;
      font-weight: 600;
      color: #1a1a1a;
      margin-top: 10px;
    }
    .patient-info {
      display: flex;
      justify-content: space-between;
      margin: 20px 0;
      padding: 15px;
      background: #f8f9fa;
      border-left: 4px solid #1E40AF;
    }
    .patient-info-left {
      flex: 1;
    }
    .patient-info-right {
      flex: 1;
      text-align: right;
    }
    .info-label {
      font-size: 9pt;
      color: #666;
      margin-bottom: 3px;
    }
    .info-value {
      font-size: 11pt;
      font-weight: 600;
      color: #000;
    }
    .content-area {
      margin: 25px 0;
      min-height: 400px;
    }
    .print-footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .footer-left {
      flex: 1;
    }
    .footer-right {
      flex: 0 0 auto;
    }
    .qr-container {
      text-align: center;
    }
    .qr-code {
      display: inline-block;
      padding: 8px;
      background: white;
      border: 1px solid #ddd;
    }
    .qr-label {
      font-size: 8pt;
      color: #666;
      margin-top: 5px;
    }
    .footer-text {
      font-size: 9pt;
      color: #666;
      margin-top: 5px;
    }
    .signature-area {
      margin-top: 50px;
      display: flex;
      justify-content: space-between;
    }
    .signature-box {
      width: 200px;
      border-top: 2px solid #000;
      padding-top: 5px;
      text-align: center;
      font-size: 9pt;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #1a1a1a;
    }
    .print-date {
      font-size: 9pt;
      color: #666;
      text-align: right;
      margin-bottom: 10px;
    }
  </style>
</head>
<body>
  <div class="print-header">
    <div class="hospital-name">ZION HOSPITAL</div>
    <div class="hospital-subtitle">Premium Healthcare Services</div>
    <div class="document-title">${title}</div>
  </div>

  <div class="print-date">
    Generated: ${date || new Date().toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}
  </div>

  <div class="patient-info">
    <div class="patient-info-left">
      <div class="info-label">Patient Name</div>
      <div class="info-value">${patientName}</div>
      ${patientId ? `
        <div class="info-label" style="margin-top: 8px;">Patient ID</div>
        <div class="info-value">${patientId}</div>
      ` : ''}
    </div>
    <div class="patient-info-right">
      ${visitId ? `
        <div class="info-label">Visit ID</div>
        <div class="info-value">${visitId}</div>
      ` : ''}
      <div class="info-label" style="margin-top: ${visitId ? '8px' : '0'};">
        Date
      </div>
      <div class="info-value">
        ${date || new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </div>
    </div>
  </div>

  <div class="content-area">
    ${printRef.current?.innerHTML || ''}
  </div>

  <div class="print-footer">
    <div class="footer-left">
      <div class="footer-text">ZION HOSPITAL</div>
      <div class="footer-text">This is an official medical document</div>
      <div class="footer-text">Please keep for your records</div>
    </div>
    <div class="footer-right">
      <div class="qr-container">
        <div class="qr-code">
          <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
            <!-- QR Code will be rendered here -->
          </svg>
        </div>
        <div class="qr-label">Verification QR Code</div>
      </div>
    </div>
  </div>
</body>
</html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()

    // Wait for content to load, then inject QR code and print
    setTimeout(() => {
      // Get QR SVG from current page
      const qrSvg = document.querySelector('.print-qr-target svg')
      if (qrSvg) {
        const qrSvgString = qrSvg.outerHTML
        printWindow.document.querySelector('.qr-code svg')?.replaceWith(
          printWindow.document.createRange().createContextualFragment(qrSvgString)
        )
      }

      printWindow.focus()
      printWindow.print()
      
      setTimeout(() => {
        printWindow.close()
        if (onPrintComplete) onPrintComplete()
      }, 1000)
    }, 500)
  }

  return (
    <div className="print-content" ref={printRef}>
      <style jsx>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      
      {/* Hidden QR Code for capture */}
      <div className="print-qr-target" style={{ position: 'absolute', left: '-9999px' }}>
        <QRCodeSVG
          value={qrData || JSON.stringify({ patientName, patientId, visitId, date, title })}
          size={80}
          level="H"
          includeMargin={true}
        />
      </div>

      {children}
    </div>
  )
}

// Export print function
export const triggerPrint = (printRef: React.RefObject<HTMLDivElement>) => {
  if (!printRef.current) return

  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const content = printRef.current.innerHTML
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Print</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @page { size: A4; margin: 15mm; }
        body { font-family: 'Inter', sans-serif; font-size: 11pt; }
      </style>
    </head>
    <body>${content}</body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
  setTimeout(() => printWindow.close(), 1000)
}

