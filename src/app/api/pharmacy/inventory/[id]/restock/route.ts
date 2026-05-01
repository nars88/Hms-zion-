import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

// PATCH /api/pharmacy/inventory/[id]/restock – add quantity to existing drug
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['PHARMACIST', 'ADMIN'].includes(user.role)) return forbidden()

    const { id } = await params
    const body = await request.json()
    const add = Number(body.quantityToAdd ?? body.quantity ?? 0)
    if (!id || add <= 0) {
      return NextResponse.json(
        { error: 'id and quantityToAdd (positive number) required' },
        { status: 400 }
      )
    }
    const row = await prisma.inventory.findFirst({
      where: { id, deletedAt: null },
    })
    if (!row) return NextResponse.json({ error: 'Drug not found' }, { status: 404 })
    const updated = await prisma.inventory.update({
      where: { id },
      data: {
        currentStock: row.currentStock + add,
        updatedAt: new Date(),
      },
    })
    return NextResponse.json({
      id: updated.id,
      drugName: updated.drugName,
      currentStock: updated.currentStock,
      unit: updated.unit,
      pricePerUnit: Number(updated.pricePerUnit),
      minThreshold: updated.minThreshold,
    })
  } catch (e) {
    console.error('Restock error:', e)
    return NextResponse.json({ error: 'Failed to restock' }, { status: 500 })
  }
}
