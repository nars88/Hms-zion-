import type { Prisma } from '@prisma/client'

type AllocateBedInput = {
  visitId: string
  bedNumber: number
}

type AllocateBedResult = {
  bedId: string
  bedNumber: number
}

export async function allocateBedToVisit(
  tx: Prisma.TransactionClient,
  input: AllocateBedInput
): Promise<AllocateBedResult> {
  const occupied = await tx.visit.findFirst({
    where: {
      bedNumber: input.bedNumber,
      id: { not: input.visitId },
      status: { notIn: ['Discharged', 'COMPLETED'] },
    },
    select: { id: true },
  })

  if (occupied) {
    throw new Error('Selected ER bed is occupied.')
  }

  await tx.visit.update({
    where: { id: input.visitId },
    data: {
      bedNumber: input.bedNumber,
      updatedAt: new Date(),
    },
  })

  return { bedId: `BED-${input.bedNumber}`, bedNumber: input.bedNumber }
}

export async function releaseBedFromVisit(tx: Prisma.TransactionClient, visitId: string): Promise<void> {
  await tx.visit.update({
    where: { id: visitId },
    data: {
      bedNumber: null,
      updatedAt: new Date(),
    },
  })
}
