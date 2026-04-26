import { PrismaClient, VisitStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const visitId = 'cmofgftkm00025esam58yvd21'

  const before = await prisma.visit.findUnique({
    where: { id: visitId },
    select: { id: true, status: true, updatedAt: true },
  })

  if (!before) {
    console.log('Visit not found:', visitId)
    return
  }

  await prisma.visit.update({
    where: { id: visitId },
    data: {
      status: VisitStatus.READY_FOR_REVIEW,
      updatedAt: new Date(),
    },
  })

  const after = await prisma.visit.findUnique({
    where: { id: visitId },
    select: { id: true, status: true, updatedAt: true },
  })

  console.log('Updated visit status:', { before, after })
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
