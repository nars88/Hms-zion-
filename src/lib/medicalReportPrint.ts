/**
 * Medical Report Print Utility
 * Generates clean, professional medical reports without prices
 */

export interface MedicalReportData {
  patientName: string
  patientId: string
  visitId?: string
  date: string
  reportType: 'Doctor' | 'Lab' | 'Radiology'
  content: {
    diagnosis?: string
    prescription?: string[]
    findings?: string
    impression?: string
    testResults?: Array<{
      testName: string
      result: string
      referenceRange?: string
      status?: string
    }>
  }
  doctorName?: string
  technicianName?: string
}

export function printMedicalReport(data: MedicalReportData) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  let contentHTML = ''

  // Doctor Report
  if (data.reportType === 'Doctor') {
    contentHTML = `
      <div class="section">
        <h3>Diagnosis</h3>
        <p>${data.content.diagnosis || 'No diagnosis recorded'}</p>
      </div>
      ${data.content.prescription && data.content.prescription.length > 0 ? `
      <div class="section">
        <h3>Prescription</h3>
        <ul>
          ${data.content.prescription.map(med => `<li>${med}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
    `
  }

  // Lab Report
  if (data.reportType === 'Lab' && data.content.testResults) {
    contentHTML = `
      <div class="section">
        <h3>Test Results</h3>
        <table class="results-table">
          <thead>
            <tr>
              <th>Test Name</th>
              <th>Result</th>
              <th>Reference Range</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.content.testResults.map(test => `
              <tr>
                <td>${test.testName}</td>
                <td>${test.result}</td>
                <td>${test.referenceRange || 'N/A'}</td>
                <td>${test.status || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
  }

  // Radiology Report
  if (data.reportType === 'Radiology') {
    contentHTML = `
      <div class="section">
        <h3>Findings</h3>
        <p>${data.content.findings || 'No findings available'}</p>
      </div>
      <div class="section">
        <h3>Impression</h3>
        <p>${data.content.impression || 'No impression available'}</p>
      </div>
    `
  }

  const reportHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Medical Report - ${data.patientName}</title>
      <style>
        @media print { @page { size: A4; margin: 15mm; } body { margin: 0; } }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; padding: 40px; color: #000; background: #fff; }
        .header { border-bottom: 3px solid #1a1a1a; padding-bottom: 16px; margin-bottom: 24px; }
        .hospital-name { font-size: 22pt; font-weight: 700; color: #000; letter-spacing: 0.5px; margin-bottom: 4px; }
        .hospital-address { font-size: 9pt; color: #333; margin-bottom: 6px; }
        .report-title { font-size: 16pt; font-weight: 600; color: #1a1a1a; margin-top: 8px; }
        .print-date { font-size: 9pt; color: #333; text-align: right; margin-bottom: 12px; }
        .patient-info { background: #f5f5f5; padding: 16px; border-left: 4px solid #1a1a1a; margin-bottom: 24px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .info-label { font-size: 9pt; color: #555; margin-bottom: 2px; }
        .info-value { font-size: 12pt; font-weight: 600; color: #000; }
        .section { margin-bottom: 24px; }
        .section h3 { font-size: 14pt; color: #000; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 2px solid #ddd; }
        .section p, .section li { font-size: 11pt; line-height: 1.7; color: #000; }
        .section ul { list-style: none; padding-left: 0; }
        .section li { padding: 6px 0; border-bottom: 1px solid #eee; }
        .results-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        .results-table th { background: #f0f0f0; padding: 10px; text-align: left; font-size: 11pt; font-weight: 600; color: #000; border: 1px solid #ddd; }
        .results-table td { padding: 10px; border: 1px solid #ddd; font-size: 11pt; color: #000; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #ddd; display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 20px; }
        .signature-line { width: 200px; border-top: 2px solid #000; padding-top: 6px; text-align: center; font-size: 9pt; color: #333; }
        .thank-you { font-size: 10pt; color: #333; font-weight: 500; margin-top: 8px; }
        .date { font-size: 9pt; color: #333; }
        @media print { .no-print { display: none !important; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="hospital-name">ZION Med Hospital</div>
        <div class="hospital-address">Baghdad, Iraq | +964 XXX XXX XXXX</div>
        <div class="report-title">${data.reportType} Report</div>
      </div>
      <div class="print-date">Date: ${new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}</div>
      <div class="patient-info">
        <div><span class="info-label">Patient Name</span><div class="info-value">${data.patientName}</div></div>
        <div><span class="info-label">Patient ID</span><div class="info-value">${data.patientId}</div></div>
        ${data.visitId ? `<div><span class="info-label">Visit ID</span><div class="info-value">${data.visitId}</div></div>` : ''}
        <div><span class="info-label">Date</span><div class="info-value">${data.date}</div></div>
      </div>
      ${contentHTML}
      <div class="footer">
        <div>
          ${data.doctorName ? `<div class="date">${data.doctorName}</div>` : data.technicianName ? `<div class="date">${data.technicianName}</div>` : ''}
          <div class="signature-line">${data.doctorName ? 'Doctor' : data.technicianName ? 'Technician' : 'Authorized'} signature</div>
          <div class="thank-you">Thank you for choosing ZION</div>
        </div>
      </div>
    </body>
    </html>
  `

  printWindow.document.write(reportHTML)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
    printWindow.close()
  }, 250)
}

