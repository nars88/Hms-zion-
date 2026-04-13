import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/pharmacy/inventory – list all drugs (exclude soft-deleted)
export async function GET() {
  try {
    const list = await prisma.inventory.findMany({
      where: { deletedAt: null },
      orderBy: { drugName: 'asc' },
    })
    return NextResponse.json(
      list.map((row) => ({
        id: row.id,
        drugName: row.drugName,
        currentStock: row.currentStock,
        unit: row.unit,
        pricePerUnit: Number(row.pricePerUnit),
        minThreshold: row.minThreshold,
        expiryDate: row.expiryDate?.toISOString?.()?.slice(0, 10) ?? null,
        batchNumber: row.batchNumber ?? null,
        category: row.category ?? null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }))
    )
  } catch (e) {
    console.error('Inventory list error:', e)
    // For dashboards, return empty list instead of 500 so UI can show empty state
    return NextResponse.json([])
  }
}

// POST /api/pharmacy/inventory – create new drug
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      drugName,
      currentStock = 0,
      unit = 'unit',
      pricePerUnit = 0,
      minThreshold = 10,
      expiryDate,
      batchNumber,
      category,
    } = body
    if (!drugName || typeof drugName !== 'string' || !drugName.trim()) {
      return NextResponse.json({ error: 'drugName required' }, { status: 400 })
    }
    const created = await prisma.inventory.create({
      data: {
        drugName: drugName.trim(),
        currentStock: Number(currentStock) || 0,
        unit: String(unit || 'unit').trim(),
        pricePerUnit: Number(pricePerUnit) || 0,
        minThreshold: Number(minThreshold) >= 0 ? Number(minThreshold) : 10,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        batchNumber: batchNumber != null && String(batchNumber).trim() !== '' ? String(batchNumber).trim() : null,
        category: category != null && String(category).trim() !== '' ? String(category).trim() : null,
      },
    })
    return NextResponse.json({
      id: created.id,
      drugName: created.drugName,
      currentStock: created.currentStock,
      unit: created.unit,
      pricePerUnit: Number(created.pricePerUnit),
      minThreshold: created.minThreshold,
      expiryDate: created.expiryDate?.toISOString?.()?.slice(0, 10) ?? null,
      batchNumber: created.batchNumber ?? null,
      category: created.category ?? null,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    })
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err?.code === 'P2002') return NextResponse.json({ error: 'Drug name already exists' }, { status: 409 })
    console.error('Inventory create error:', e)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}
