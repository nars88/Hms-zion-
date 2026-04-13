import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServicePrice, mapTestToServiceType, getDefaultPrice } from '@/lib/priceService'

export const dynamic = 'force-dynamic'

// POST /api/radiology/complete-report
// Completes a radiology report and adds the price to invoice
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { visitId, patientId, studyType, bodyPart, findings, impression, completedBy } = body

    if (!visitId || !patientId || !studyType || !completedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: visitId, patientId, studyType, completedBy' },
        { status: 400 }
      )
    }

    // Map study type to service type for price lookup
    const testName = `${studyType} - ${bodyPart}`
    const serviceType = mapTestToServiceType(testName, 'Radiology')
    
    // Get price from Admin Price Settings
    const priceInfo = await getServicePrice(serviceType)
    const price = priceInfo?.price || getDefaultPrice(serviceType)
    const serviceName = priceInfo?.serviceName || `${studyType} - ${bodyPart}`

    // Add to invoice
    const addItemRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/billing/invoice/add-item`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitId,
        patientId,
        department: 'Radiology',
        description: `Radiology Fee: ${serviceName}`,
        quantity: 1,
        unitPrice: price,
        total: price,
        addedBy: completedBy,
      }),
    })

    if (!addItemRes.ok) {
      const errorData = await addItemRes.json()
      throw new Error(errorData.error || 'Failed to add to invoice')
    }

    return NextResponse.json({
      success: true,
      message: 'Radiology report completed and added to invoice',
      price,
      serviceName,
    })
  } catch (error: any) {
    console.error('❌ Error completing radiology report:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to complete radiology report' },
      { status: 500 }
    )
  }
}

