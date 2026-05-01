import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

// PUT /api/pharmacy/inventory/[id] – update drug
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['PHARMACIST', 'ADMIN'].includes(user.role)) return forbidden()

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const row = await prisma.inventory.findUnique({ where: { id } })
    if (!row) return NextResponse.json({ error: 'Drug not found' }, { status: 404 })
    const body = await request.json()
    const {
      drugName,
      currentStock,
      unit,
      pricePerUnit,
      minThreshold,
      expiryDate,
      batchNumber,
      category,
    } = body
    const data: Record<string, unknown> = { updatedAt: new Date() }
    if (drugName != null && typeof drugName === 'string' && drugName.trim()) data.drugName = drugName.trim()
    if (currentStock != null) data.currentStock = Number(currentStock) || 0
    if (unit != null) data.unit = String(unit || 'unit').trim()
    if (pricePerUnit != null) data.pricePerUnit = Number(pricePerUnit) || 0
    if (minThreshold != null) data.minThreshold = Number(minThreshold) >= 0 ? Number(minThreshold) : 10
    if (expiryDate !== undefined) data.expiryDate = expiryDate ? new Date(expiryDate) : null
    if (batchNumber !== undefined) data.batchNumber = batchNumber != null && String(batchNumber).trim() !== '' ? String(batchNumber).trim() : null
    if (category !== undefined) data.category = category != null && String(category).trim() !== '' ? String(category).trim() : null
    const updated = await prisma.inventory.update({
      where: { id },
      data: data as Parameters<typeof prisma.inventory.update>[0]['data'],
    })
    return NextResponse.json({
      id: updated.id,
      drugName: updated.drugName,
      currentStock: updated.currentStock,
      unit: updated.unit,
      pricePerUnit: Number(updated.pricePerUnit),
      minThreshold: updated.minThreshold,
      expiryDate: updated.expiryDate?.toISOString?.()?.slice(0, 10) ?? null,
      batchNumber: updated.batchNumber ?? null,
      category: updated.category ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    })
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err?.code === 'P2002') return NextResponse.json({ error: 'Drug name already exists' }, { status: 409 })
    console.error('Inventory update error:', e)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

// PATCH /api/pharmacy/inventory/[id] – soft-delete (set deletedAt)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['PHARMACIST', 'ADMIN'].includes(user.role)) return forbidden()

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const row = await prisma.inventory.findUnique({ where: { id } })
    if (!row) return NextResponse.json({ error: 'Drug not found' }, { status: 404 })
    await prisma.inventory.update({
      where: { id },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    })
    return NextResponse.json({ success: true, message: 'Drug soft-deleted' })
  } catch (e) {
    console.error('Inventory delete error:', e)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
