import { QRCodeSVG } from 'qrcode.react'

interface PrintOptions {
  title: string
  patientName: string
  patientId?: string
  visitId?: string
  date?: string
  qrData?: string
}

export const printPrescription = (
  medications: Array<{ medicine: string; dosage: string; frequency: string; duration?: string; notes?: string }>,
  options: PrintOptions
) => {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const qrData = options.qrData || JSON.stringify({
    type: 'PRESCRIPTION',
    patientName: options.patientName,
    visitId: options.visitId,
    date: options.date || new Date().toISOString(),
  })

  const medicationsHTML = medications.map((med, idx) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${idx + 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${med.medicine}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${med.dosage}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${med.frequency}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${med.duration || 'As needed'}</td>
    </tr>
  `).join('')

  const printContent = getPrintTemplate({
    ...options,
    content: `
      <div style="margin: 20px 0;">
        <h3 style="font-size: 14pt; font-weight: 600; margin-bottom: 15px; color: #1a1a1a;">Prescribed Medications</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #1E40AF; width: 40px;">#</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #1E40AF;">Medication</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #1E40AF;">Dosage</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #1E40AF;">Frequency</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #1E40AF;">Duration</th>
            </tr>
          </thead>
          <tbody>
            ${medicationsHTML}
          </tbody>
        </table>
      </div>
      <div style="margin-top: 30px; padding: 15px; background: #f8f9fa; border-left: 4px solid #1E40AF;">
        <p style="font-size: 10pt; color: #666; margin-bottom: 5px;"><strong>Instructions:</strong></p>
        <p style="font-size: 10pt; color: #333; line-height: 1.6;">
          Please follow the prescribed dosage and frequency. If you experience any adverse effects, 
          contact your doctor immediately. Complete the full course of medication as prescribed.
        </p>
      </div>
      <div style="margin-top: 50px; display: flex; justify-content: space-between;">
        <div style="width: 200px; border-top: 2px solid #000; padding-top: 5px; text-align: center;">
          <p style="font-size: 9pt; color: #666;">Doctor's Signature</p>
        </div>
        <div style="width: 200px; border-top: 2px solid #000; padding-top: 5px; text-align: center;">
          <p style="font-size: 9pt; color: #666;">Date</p>
        </div>
      </div>
    `,
    qrData,
  })

  printWindow.document.write(printContent)
  printWindow.document.close()

  setTimeout(() => {
    printWindow.focus()
    printWindow.print()
    setTimeout(() => printWindow.close(), 1000)
  }, 500)
}

export const printLabResults = (
  results: Array<{ testName: string; result: string; referenceRange: string; status: string }>,
  options: PrintOptions
) => {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const qrData = options.qrData || JSON.stringify({
    type: 'LAB_RESULTS',
    patientName: options.patientName,
    visitId: options.visitId,
    date: options.date || new Date().toISOString(),
  })

  const resultsHTML = results.map((result) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${result.testName}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${result.result}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #666;">${result.referenceRange}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
        <span style="padding: 4px 8px; border-radius: 4px; font-size: 9pt; font-weight: 600; 
          ${result.status === 'Normal' ? 'background: #d1fae5; color: #065f46;' : 
            result.status === 'High' ? 'background: #fee2e2; color: #991b1b;' : 
            'background: #fef3c7; color: #92400e;'}">
          ${result.status}
        </span>
      </td>
    </tr>
  `).join('')

  const printContent = getPrintTemplate({
    ...options,
    content: `
      <div style="margin: 20px 0;">
        <h3 style="font-size: 14pt; font-weight: 600; margin-bottom: 15px; color: #1a1a1a;">Laboratory Test Results</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #1E40AF;">Test Name</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #1E40AF;">Result</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #1E40AF;">Reference Range</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #1E40AF;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${resultsHTML}
          </tbody>
        </table>
      </div>
    `,
    qrData,
  })

  printWindow.document.write(printContent)
  printWindow.document.close()

  setTimeout(() => {
    printWindow.focus()
    printWindow.print()
    setTimeout(() => printWindow.close(), 1000)
  }, 500)
}

export const printRadiologyReport = (
  findings: string,
  impression: string,
  procedureName: string,
  options: PrintOptions
) => {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const qrData = options.qrData || JSON.stringify({
    type: 'RADIOLOGY_REPORT',
    patientName: options.patientName,
    visitId: options.visitId,
    procedureName,
    date: options.date || new Date().toISOString(),
  })

  const printContent = getPrintTemplate({
    ...options,
    title: `${options.title} - ${procedureName}`,
    content: `
      <div style="margin: 20px 0;">
        <div style="margin-bottom: 25px;">
          <h3 style="font-size: 14pt; font-weight: 600; margin-bottom: 10px; color: #1a1a1a;">Procedure</h3>
          <p style="font-size: 11pt; color: #333; padding: 10px; background: #f8f9fa; border-left: 4px solid #1E40AF;">
            ${procedureName}
          </p>
        </div>
        
        <div style="margin-bottom: 25px;">
          <h3 style="font-size: 14pt; font-weight: 600; margin-bottom: 10px; color: #1a1a1a;">Findings</h3>
          <div style="padding: 15px; background: #f8f9fa; border-left: 4px solid #1E40AF; line-height: 1.8;">
            <p style="font-size: 11pt; color: #333; white-space: pre-wrap;">${findings}</p>
          </div>
        </div>
        
        <div style="margin-bottom: 25px;">
          <h3 style="font-size: 14pt; font-weight: 600; margin-bottom: 10px; color: #1a1a1a;">Impression</h3>
          <div style="padding: 15px; background: #fff3cd; border-left: 4px solid #f59e0b; line-height: 1.8;">
            <p style="font-size: 11pt; color: #333; white-space: pre-wrap; font-weight: 500;">${impression}</p>
          </div>
        </div>
      </div>
      
      <div style="margin-top: 50px; display: flex; justify-content: space-between;">
        <div style="width: 200px; border-top: 2px solid #000; padding-top: 5px; text-align: center;">
          <p style="font-size: 9pt; color: #666;">Radiologist Signature</p>
        </div>
        <div style="width: 200px; border-top: 2px solid #000; padding-top: 5px; text-align: center;">
          <p style="font-size: 9pt; color: #666;">Date</p>
        </div>
      </div>
    `,
    qrData,
  })

  printWindow.document.write(printContent)
  printWindow.document.close()

  setTimeout(() => {
    printWindow.focus()
    printWindow.print()
    setTimeout(() => printWindow.close(), 1000)
  }, 500)
}

export const printPharmacyDispensing = (
  medications: Array<{ medicineName: string; dosage: string; frequency: string; instructions?: string }>,
  options: PrintOptions
) => {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const qrData = options.qrData || JSON.stringify({
    type: 'PHARMACY_DISPENSING',
    patientName: options.patientName,
    visitId: options.visitId,
    date: options.date || new Date().toISOString(),
  })

  const medicationsHTML = medications.map((med, idx) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${idx + 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${med.medicineName}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${med.dosage}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${med.frequency}</td>
    </tr>
  `).join('')

  const printContent = getPrintTemplate({
    ...options,
    content: `
      <div style="margin: 20px 0;">
        <h3 style="font-size: 14pt; font-weight: 600; margin-bottom: 15px; color: #1a1a1a;">Dispensed Medications</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #1E40AF; width: 40px;">#</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #1E40AF;">Medication</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #1E40AF;">Dosage</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #1E40AF;">Frequency</th>
            </tr>
          </thead>
          <tbody>
            ${medicationsHTML}
          </tbody>
        </table>
      </div>
      <div style="margin-top: 30px; padding: 15px; background: #d1fae5; border-left: 4px solid #10b981;">
        <p style="font-size: 10pt; color: #065f46; margin-bottom: 5px;"><strong>Important Instructions:</strong></p>
        <ul style="font-size: 10pt; color: #065f46; line-height: 1.8; margin-left: 20px;">
          <li>Take medications exactly as prescribed by your doctor</li>
          <li>Complete the full course of medication</li>
          <li>Store medications in a cool, dry place</li>
          <li>Keep out of reach of children</li>
          <li>If you experience any side effects, contact your doctor immediately</li>
        </ul>
      </div>
      <div style="margin-top: 30px; padding: 15px; background: #f8f9fa; border-left: 4px solid #1E40AF;">
        <p style="font-size: 9pt; color: #666; margin-bottom: 5px;"><strong>Dispensed by:</strong> ZION Hospital Pharmacy</p>
        <p style="font-size: 9pt; color: #666;">Date: ${options.date || new Date().toLocaleDateString('en-US')}</p>
      </div>
    `,
    qrData,
  })

  printWindow.document.write(printContent)
  printWindow.document.close()

  setTimeout(() => {
    printWindow.focus()
    printWindow.print()
    setTimeout(() => printWindow.close(), 1000)
  }, 500)
}

export const printInvoice = (
  items: Array<{ department: string; description: string; quantity: number; unitPrice: number; total: number }>,
  subtotal: number,
  tax: number,
  discount: number,
  total: number,
  options: PrintOptions
) => {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const qrData = options.qrData || JSON.stringify({
    type: 'INVOICE',
    patientName: options.patientName,
    visitId: options.visitId,
    total,
    date: options.date || new Date().toISOString(),
  })

  const itemsHTML = items.map((item) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
        <div style="font-weight: 600;">${item.description}</div>
        <div style="font-size: 9pt; color: #666;">${item.department}</div>
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.unitPrice.toLocaleString()} IQD</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${item.total.toLocaleString()} IQD</td>
    </tr>
  `).join('')

  const printContent = getPrintTemplate({
    ...options,
    content: `
      <div style="margin: 20px 0;">
        <h3 style="font-size: 14pt; font-weight: 600; margin-bottom: 15px; color: #1a1a1a;">Invoice Items</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #1E40AF;">Description</th>
              <th style="padding: 10px; text-align: center; border-bottom: 2px solid #1E40AF; width: 80px;">Qty</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #1E40AF; width: 120px;">Unit Price</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #1E40AF; width: 120px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>
      </div>
      
      <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span style="font-size: 11pt; color: #666;">Subtotal:</span>
          <span style="font-size: 11pt; font-weight: 600;">${subtotal.toLocaleString()} IQD</span>
        </div>
        ${tax > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="font-size: 11pt; color: #666;">Tax:</span>
            <span style="font-size: 11pt; font-weight: 600;">${tax.toLocaleString()} IQD</span>
          </div>
        ` : ''}
        ${discount > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="font-size: 11pt; color: #666;">Discount:</span>
            <span style="font-size: 11pt; font-weight: 600; color: #10b981;">-${discount.toLocaleString()} IQD</span>
          </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; padding-top: 15px; border-top: 2px solid #1E40AF; margin-top: 15px;">
          <span style="font-size: 14pt; font-weight: 700; color: #1a1a1a;">Total Amount:</span>
          <span style="font-size: 16pt; font-weight: 700; color: #1E40AF;">${total.toLocaleString()} IQD</span>
        </div>
      </div>
      
      <div style="margin-top: 30px; padding: 15px; background: #dbeafe; border-left: 4px solid #1E40AF;">
        <p style="font-size: 10pt; color: #1e40af; line-height: 1.6;">
          <strong>Payment Information:</strong> This invoice includes all services provided during your visit: 
          Consultation, Laboratory Tests, Radiology/Imaging, and Pharmacy medications.
        </p>
      </div>
    `,
    qrData,
  })

  printWindow.document.write(printContent)
  printWindow.document.close()

  setTimeout(() => {
    printWindow.focus()
    printWindow.print()
    setTimeout(() => printWindow.close(), 1000)
  }, 500)
}

// ZION Med unified branding for all printed documents
const ZION_PRINT_HEADER = {
  name: 'ZION Med Hospital',
  subtitle: 'Premium Healthcare Services',
  address: 'Baghdad, Iraq | +964 XXX XXX XXXX',
}

// Shared print template: unified branding, white background, black text, signature footer
function getPrintTemplate({
  title,
  patientName,
  patientId,
  visitId,
  date,
  content,
  qrData,
}: PrintOptions & { content: string }): string {
  const qrSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" fill="white"/><text x="40" y="40" text-anchor="middle" font-size="8" fill="#333">QR</text></svg>`
  const printDate = date || new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return `
<!DOCTYPE html>
<html>
<head>
  <title>${title} - ${patientName}</title>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    @page { size: A4; margin: 15mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #000;
      background: #fff;
    }
    .print-header {
      border-bottom: 3px solid #1a1a1a;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .hospital-name { font-size: 22pt; font-weight: 700; color: #000; letter-spacing: 0.5px; margin-bottom: 4px; }
    .hospital-address { font-size: 9pt; color: #333; margin-bottom: 6px; }
    .document-title { font-size: 16pt; font-weight: 600; color: #1a1a1a; margin-top: 8px; }
    .print-date { font-size: 9pt; color: #333; text-align: right; margin-bottom: 12px; }
    .patient-info {
      display: flex; justify-content: space-between; margin: 20px 0;
      padding: 14px; background: #f5f5f5; border-left: 4px solid #1a1a1a;
    }
    .patient-info-right { text-align: right; }
    .info-label { font-size: 9pt; color: #555; margin-bottom: 2px; }
    .info-value { font-size: 11pt; font-weight: 600; color: #000; }
    .content-area { margin: 24px 0; min-height: 200px; }
    .print-footer {
      margin-top: 36px; padding-top: 20px; border-top: 2px solid #ddd;
      display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 24px;
    }
    .signature-line {
      width: 200px; border-top: 2px solid #000; padding-top: 6px; text-align: center;
      font-size: 9pt; color: #333;
    }
    .thank-you { font-size: 10pt; color: #333; font-weight: 500; margin-top: 8px; }
    .qr-container { text-align: center; }
    .qr-code { display: inline-block; padding: 6px; background: #fff; border: 1px solid #ccc; }
    .qr-label { font-size: 8pt; color: #555; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th, td { padding: 10px; text-align: left; border: 1px solid #ddd; color: #000; }
    th { background: #f0f0f0; font-weight: 600; color: #000; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .print-header, .content-area, .print-footer { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="print-header">
    <div class="hospital-name">${ZION_PRINT_HEADER.name}</div>
    <div class="hospital-address">${ZION_PRINT_HEADER.address}</div>
    <div class="document-title">${title}</div>
  </div>
  <div class="print-date">Date: ${printDate}</div>
  <div class="patient-info">
    <div>
      <div class="info-label">Patient Name</div>
      <div class="info-value">${patientName}</div>
      ${patientId ? `<div class="info-label" style="margin-top:6px">Patient ID</div><div class="info-value">${patientId}</div>` : ''}
    </div>
    <div class="patient-info-right">
      ${visitId ? `<div class="info-label">Visit ID</div><div class="info-value">${visitId}</div>` : ''}
      <div class="info-label" style="margin-top:${visitId ? '6px' : '0'}">Date</div>
      <div class="info-value">${typeof date === 'string' && date.length < 12 ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : printDate}</div>
    </div>
  </div>
  <div class="content-area">${content}</div>
  <div class="print-footer">
    <div>
      <div class="signature-line">Authorized signature</div>
      <div class="thank-you">Thank you for choosing ZION</div>
    </div>
    <div class="qr-container">
      <div class="qr-code">${qrSvg}</div>
      <div class="qr-label">Verification</div>
    </div>
  </div>
</body>
</html>
  `
}

export interface MedicalSummaryData {
  visitId: string
  patientName: string
  age: number | null
  gender: string
  chiefComplaint: string | null
  diagnosis: string | null
  visitDate: string
  bedNumber: number | null
  vitals: { bp: string; temperature: number; heartRate: number; weight: number } | null
  labResults: Array<{ testType?: string; result?: string; completedAt?: string }>
  radiologyResults: Array<{ testType?: string; result?: string; completedAt?: string }>
  sonarResults: Array<{ testType?: string; result?: string; completedAt?: string }>
  doctorMedications: string
  doctorLabTests: string
}

export function printMedicalSummary(data: MedicalSummaryData) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const sections: string[] = []

  if (data.vitals) {
    sections.push(`
      <div style="margin: 16px 0;">
        <h3 style="font-size: 12pt; font-weight: 600; margin-bottom: 8px; color: #1a1a1a;">Vitals</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 6px 8px; border: 1px solid #ddd;">BP</td><td style="padding: 6px 8px; border: 1px solid #ddd;">${data.vitals.bp}</td></tr>
          <tr><td style="padding: 6px 8px; border: 1px solid #ddd;">Temperature</td><td style="padding: 6px 8px; border: 1px solid #ddd;">${data.vitals.temperature} °C</td></tr>
          <tr><td style="padding: 6px 8px; border: 1px solid #ddd;">Heart rate</td><td style="padding: 6px 8px; border: 1px solid #ddd;">${data.vitals.heartRate} bpm</td></tr>
          <tr><td style="padding: 6px 8px; border: 1px solid #ddd;">Weight</td><td style="padding: 6px 8px; border: 1px solid #ddd;">${data.vitals.weight} kg</td></tr>
        </table>
      </div>
    `)
  }

  if (data.labResults?.length) {
    const rows = data.labResults.map((r) => `<tr><td style="padding: 6px 8px; border: 1px solid #ddd;">${r.testType || '—'}</td><td style="padding: 6px 8px; border: 1px solid #ddd;">${r.result || '—'}</td></tr>`).join('')
    sections.push(`<div style="margin: 16px 0;"><h3 style="font-size: 12pt; font-weight: 600; margin-bottom: 8px;">Lab results</h3><table style="width: 100%; border-collapse: collapse;"><thead><tr style="background: #f0f0f0;"><th style="padding: 6px 8px; border: 1px solid #ddd;">Test</th><th style="padding: 6px 8px; border: 1px solid #ddd;">Result</th></tr></thead><tbody>${rows}</tbody></table></div>`)
  }
  if (data.radiologyResults?.length) {
    const rows = data.radiologyResults.map((r) => `<tr><td style="padding: 6px 8px; border: 1px solid #ddd;">${r.testType || '—'}</td><td style="padding: 6px 8px; border: 1px solid #ddd;">${r.result || '—'}</td></tr>`).join('')
    sections.push(`<div style="margin: 16px 0;"><h3 style="font-size: 12pt; font-weight: 600; margin-bottom: 8px;">X-Ray / Radiology</h3><table style="width: 100%; border-collapse: collapse;"><thead><tr style="background: #f0f0f0;"><th style="padding: 6px 8px; border: 1px solid #ddd;">Study</th><th style="padding: 6px 8px; border: 1px solid #ddd;">Impression</th></tr></thead><tbody>${rows}</tbody></table></div>`)
  }
  if (data.sonarResults?.length) {
    const rows = data.sonarResults.map((r) => `<tr><td style="padding: 6px 8px; border: 1px solid #ddd;">${r.testType || '—'}</td><td style="padding: 6px 8px; border: 1px solid #ddd;">${r.result || '—'}</td></tr>`).join('')
    sections.push(`<div style="margin: 16px 0;"><h3 style="font-size: 12pt; font-weight: 600; margin-bottom: 8px;">Sonar</h3><table style="width: 100%; border-collapse: collapse;"><thead><tr style="background: #f0f0f0;"><th style="padding: 6px 8px; border: 1px solid #ddd;">Study</th><th style="padding: 6px 8px; border: 1px solid #ddd;">Result</th></tr></thead><tbody>${rows}</tbody></table></div>`)
  }

  if (data.chiefComplaint || data.diagnosis) {
    sections.push(`<div style="margin: 16px 0;"><h3 style="font-size: 12pt; font-weight: 600; margin-bottom: 8px;">Chief complaint / Diagnosis</h3><p style="padding: 8px; background: #f5f5f5; border-left: 4px solid #1a1a1a;">${data.chiefComplaint || '—'}${data.diagnosis ? '<br/><strong>Diagnosis:</strong> ' + data.diagnosis : ''}</p></div>`)
  }
  if (data.doctorMedications?.trim()) {
    sections.push(`<div style="margin: 16px 0;"><h3 style="font-size: 12pt; font-weight: 600; margin-bottom: 8px;">Doctor&apos;s medications</h3><pre style="padding: 8px; background: #f5f5f5; white-space: pre-wrap; font-size: 10pt;">${data.doctorMedications}</pre></div>`)
  }
  if (data.doctorLabTests?.trim()) {
    sections.push(`<div style="margin: 16px 0;"><h3 style="font-size: 12pt; font-weight: 600; margin-bottom: 8px;">Doctor&apos;s notes (tests)</h3><pre style="padding: 8px; background: #f5f5f5; white-space: pre-wrap; font-size: 10pt;">${data.doctorLabTests}</pre></div>`)
  }

  const content = sections.length ? sections.join('') : '<p style="color: #666;">No summary data recorded yet.</p>'
  const printContent = getPrintTemplate({
    title: 'Medical Summary',
    patientName: data.patientName,
    patientId: undefined,
    visitId: data.visitId,
    date: data.visitDate,
    content,
  })

  printWindow.document.write(printContent)
  printWindow.document.close()
  setTimeout(() => {
    printWindow.focus()
    printWindow.print()
    setTimeout(() => printWindow.close(), 1000)
  }, 500)
}

